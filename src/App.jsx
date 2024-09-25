import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API_KEY = "8a861615ffmsh66b922b5d300103p18a62ajsn09144303544c";
const API_HOST = "tasty.p.rapidapi.com";

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoCompleteResults, setAutoCompleteResults] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [similarRecipes, setSimilarRecipes] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [cookingTips, setCookingTips] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [showSavedRecipes, setShowSavedRecipes] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isListening, setIsListening] = useState(false);

  const searchInputRef = useRef(null);
  const observer = useRef(null);

  useEffect(() => {
    fetchTags();
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode) {
      setDarkMode(JSON.parse(savedMode));
    }
    const saved = localStorage.getItem("savedRecipes");
    if (saved) {
      setSavedRecipes(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("savedRecipes", JSON.stringify(savedRecipes));
  }, [savedRecipes]);

  const fetchTags = async () => {
    try {
      const response = await axios.request({
        method: "GET",
        url: "https://tasty.p.rapidapi.com/tags/list",
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": API_HOST,
        },
      });
      setTags(response.data.results);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const searchRecipes = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.request({
        method: "GET",
        url: "https://tasty.p.rapidapi.com/recipes/list",
        params: {
          from: ((page - 1) * 20).toString(),
          size: "20",
          q: searchTerm,
          tags: selectedTags.join(","),
        },
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": API_HOST,
        },
      });
      setRecipes((prevRecipes) =>
        page === 1
          ? response.data.results
          : [...prevRecipes, ...response.data.results]
      );
      setTotalPages(Math.ceil(response.data.count / 20));
      setCurrentPage(page);
    } catch (error) {
      setError("Failed to fetch recipes. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoComplete = async (value) => {
    if (value.length > 2) {
      try {
        const response = await axios.request({
          method: "GET",
          url: "https://tasty.p.rapidapi.com/recipes/auto-complete",
          params: { prefix: value },
          headers: {
            "x-rapidapi-key": API_KEY,
            "x-rapidapi-host": API_HOST,
          },
        });
        setAutoCompleteResults(response.data.results);
      } catch (error) {
        console.error("Auto-complete error:", error);
      }
    } else {
      setAutoCompleteResults([]);
    }
  };

  const fetchRecipeDetails = async (id) => {
    try {
      const response = await axios.request({
        method: "GET",
        url: "https://tasty.p.rapidapi.com/recipes/get-more-info",
        params: { id },
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": API_HOST,
        },
      });
      setSelectedRecipe(response.data);
      fetchSimilarRecipes(id);
      fetchCookingTips(id);
    } catch (error) {
      console.error("Error fetching recipe details:", error);
    }
  };

  const fetchSimilarRecipes = async (id) => {
    try {
      const response = await axios.request({
        method: "GET",
        url: "https://tasty.p.rapidapi.com/recipes/list-similarities",
        params: { recipe_id: id },
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": API_HOST,
        },
      });
      setSimilarRecipes(response.data.results);
    } catch (error) {
      console.error("Error fetching similar recipes:", error);
    }
  };

  const fetchCookingTips = async (id) => {
    try {
      const response = await axios.request({
        method: "GET",
        url: "https://tasty.p.rapidapi.com/tips/list",
        params: { id },
        headers: {
          "x-rapidapi-key": API_KEY,
          "x-rapidapi-host": API_HOST,
        },
      });
      setCookingTips(response.data.results);
    } catch (error) {
      console.error("Error fetching cooking tips:", error);
    }
  };

  const saveRecipe = (recipe) => {
    setSavedRecipes((prev) => {
      if (prev.some((r) => r.id === recipe.id)) {
        return prev.filter((r) => r.id !== recipe.id);
      } else {
        return [...prev, recipe];
      }
    });
  };

  const isRecipeSaved = (id) => {
    return savedRecipes.some((r) => r.id === id);
  };

  const handleVoiceSearch = () => {
    setIsListening(true);
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchTerm(transcript);
        setIsListening(false);
        searchRecipes();
      };
      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      recognition.start();
    } else {
      alert("Speech recognition is not supported in your browser");
      setIsListening(false);
    }
  };

  const lastRecipeElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && currentPage < totalPages) {
          searchRecipes(currentPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, currentPage, totalPages]
  );

  return (
    <div
      className={`min-h-screen ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      <header
        className={`sticky top-0 z-50 ${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow-md`}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gourmet Explorer</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowSavedRecipes(!showSavedRecipes)}
              className={`p-2 rounded-full ${
                darkMode
                  ? "bg-gray-700 text-white"
                  : "bg-gray-200 text-gray-800"
              } hover:bg-opacity-80`}
              aria-label={
                showSavedRecipes ? "Hide saved recipes" : "Show saved recipes"
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full ${
                darkMode
                  ? "bg-gray-700 text-white"
                  : "bg-gray-200 text-gray-800"
              } hover:bg-opacity-80`}
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {darkMode ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showSavedRecipes ? (
          <div>
            <button
              onClick={() => setShowSavedRecipes(false)}
              className="mb-4 flex items-center text-blue-500 hover:text-blue-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-5 h-5 mr-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Search
            </button>
            <h2 className="text-2xl font-bold mb-4">Saved Recipes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {savedRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onViewDetails={() => fetchRecipeDetails(recipe.id)}
                  onSave={() => saveRecipe(recipe)}
                  isSaved={true}
                  darkMode={darkMode}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    handleAutoComplete(e.target.value);
                  }}
                  ref={searchInputRef}
                  className={`w-full p-4 pl-12 rounded-lg shadow-md focus:ring-2 focus:ring-blue-400 ${
                    darkMode
                      ? "bg-gray-700 text-white border-gray-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  placeholder="Search for recipes or ingredients"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="absolute left-4 top-4 w-6 h-6 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
                {autoCompleteResults.length > 0 && (
                  <ul
                    className={`absolute z-10 w-full bg-white dark:bg-gray-700 border ${
                      darkMode ? "border-gray-600" : "border-gray-300"
                    } rounded-lg shadow-lg mt-1`}
                  >
                    {autoCompleteResults.map((result, index) => (
                      <li
                        key={index}
                        className={`p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                        onClick={() => {
                          setSearchTerm(result.display);
                          setAutoCompleteResults([]);
                        }}
                      >
                        {result.display}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 flex space-x-4">
                <button
                  onClick={handleVoiceSearch}
                  className={`flex items-center justify-center p-2 ${
                    darkMode
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-blue-500 hover:bg-blue-600"
                  } text-white rounded-full transition-colors duration-300`}
                  disabled={isListening}
                >
                  {isListening ? (
                    <svg
                      className="animate-spin h-6 w-6 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center ${
                    darkMode
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-600 hover:text-gray-800"
                  } transition-colors duration-300`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="w-5 h-5 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  <span className="mr-2">Filters</span>
                  {showFilters ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  )}
                </button>
                {showFilters && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.slice(0, 15).map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() =>
                          setSelectedTags((prev) =>
                            prev.includes(tag.name)
                              ? prev.filter((t) => t !== tag.name)
                              : [...prev, tag.name]
                          )
                        }
                        className={`px-4 py-2 rounded-full text-sm transition-colors duration-300 ${
                          selectedTags.includes(tag.name)
                            ? "bg-blue-500 text-white"
                            : `${
                                darkMode
                                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`
                        }`}
                      >
                        {tag.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => searchRecipes()}
                className={`mt-6 ${
                  darkMode
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-500 hover:bg-blue-600"
                } text-white p-4 rounded-lg transition duration-300 flex items-center justify-center w-full sm:w-auto`}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Searching...
                  </span>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-6 h-6 mr-2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Discover Recipes
                  </>
                )}
              </button>
            </div>

            {error && (
              <p
                className={`text-red-500 mb-4 ${
                  darkMode ? "dark:text-red-400" : ""
                }`}
              >
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recipes.map((recipe, index) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onViewDetails={() => fetchRecipeDetails(recipe.id)}
                  onSave={() => saveRecipe(recipe)}
                  isSaved={isRecipeSaved(recipe.id)}
                  darkMode={darkMode}
                  ref={
                    index === recipes.length - 1 ? lastRecipeElementRef : null
                  }
                />
              ))}
            </div>

            {loading && (
              <p className="text-center mt-4">Loading more recipes...</p>
            )}
          </>
        )}

        {selectedRecipe && (
          <RecipeModal
            recipe={selectedRecipe}
            onClose={() => setSelectedRecipe(null)}
            cookingTips={cookingTips}
            similarRecipes={similarRecipes}
            onSave={() => saveRecipe(selectedRecipe)}
            isSaved={isRecipeSaved(selectedRecipe.id)}
            darkMode={darkMode}
          />
        )}
      </main>
    </div>
  );
}

const RecipeCard = React.forwardRef(
  ({ recipe, onViewDetails, onSave, isSaved, darkMode }, ref) => {
    return (
      <div
        ref={ref}
        className={`${
          darkMode ? "bg-gray-800" : "bg-white"
        } rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105`}
      >
        <div className="relative">
          <img
            src={recipe.thumbnail_url}
            alt={recipe.name}
            className="w-full h-56 object-cover"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            className={`absolute top-2 right-2 p-2 ${
              darkMode ? "bg-gray-800" : "bg-white"
            } rounded-full shadow-md hover:bg-opacity-80 transition-colors duration-300`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill={isSaved ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              className={`w-5 h-5 ${
                isSaved
                  ? "text-blue-500"
                  : darkMode
                  ? "text-gray-400"
                  : "text-gray-500"
              }`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <h2
            className={`text-2xl font-semibold mb-2 ${
              darkMode ? "text-white" : "text-gray-800"
            }`}
          >
            {recipe.name}
          </h2>
          <p
            className={`${
              darkMode ? "text-gray-300" : "text-gray-600"
            } mb-4 line-clamp-2`}
          >
            {recipe.description}
          </p>
          <div className="flex items-center justify-between mb-4">
            <div
              className={`flex items-center ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-4 h-4 mr-1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{recipe.total_time_minutes || "N/A"} mins</span>
            </div>
            <div
              className={`flex items-center ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-4 h-4 mr-1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>{recipe.num_servings || "N/A"} servings</span>
            </div>
          </div>
          <button
            onClick={onViewDetails}
            className={`w-full ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-blue-500 hover:bg-blue-600"
            } text-white px-4 py-2 rounded-lg transition duration-300 flex items-center justify-center`}
          >
            View Recipe
          </button>
        </div>
      </div>
    );
  }
);

function RecipeModal({
  recipe,
  onClose,
  cookingTips,
  similarRecipes,
  onSave,
  isSaved,
  darkMode,
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className={`${
          darkMode ? "bg-gray-800" : "bg-white"
        } rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto`}
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2
              className={`text-3xl font-bold mb-4 ${
                darkMode ? "text-white" : "text-gray-800"
              }`}
            >
              {recipe.name}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={onSave}
                className={`p-2 ${
                  darkMode
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-200 hover:bg-gray-300"
                } rounded-full transition-colors duration-300`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill={isSaved ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className={`w-5 h-5 ${
                    isSaved
                      ? "text-blue-500"
                      : darkMode
                      ? "text-gray-400"
                      : "text-gray-500"
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </button>
              <button
                onClick={onClose}
                className={`${
                  darkMode
                    ? "text-gray-400 hover:text-gray-200"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
          <img
            src={recipe.thumbnail_url}
            alt={recipe.name}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
          <div
            className={`mb-6 ${darkMode ? "text-gray-300" : "text-gray-600"}`}
          >
            <p>{recipe.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div
              className={`${
                darkMode ? "bg-gray-700" : "bg-gray-100"
              } p-4 rounded-lg`}
            >
              <h3
                className={`text-lg font-semibold mb-2 ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                Ingredients
              </h3>
              <ul
                className={`list-disc list-inside ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {recipe.sections[0].components.map((component, index) => (
                  <li key={index}>{component.raw_text}</li>
                ))}
              </ul>
            </div>
            <div
              className={`${
                darkMode ? "bg-gray-700" : "bg-gray-100"
              } p-4 rounded-lg`}
            >
              <h3
                className={`text-lg font-semibold mb-2 ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                Instructions
              </h3>
              <ol
                className={`list-decimal list-inside ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {recipe.instructions.map((instruction, index) => (
                  <li key={index}>{instruction.display_text}</li>
                ))}
              </ol>
            </div>
          </div>
          {cookingTips.length > 0 && (
            <div className="mb-6">
              <h3
                className={`text-lg font-semibold mb-2 ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                Cooking Tips
              </h3>
              <ul
                className={`list-disc list-inside ${
                  darkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {cookingTips.map((tip, index) => (
                  <li key={index}>{tip.tip}</li>
                ))}
              </ul>
            </div>
          )}
          {similarRecipes.length > 0 && (
            <div>
              <h3
                className={`text-lg font-semibold mb-2 ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                Similar Recipes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {similarRecipes.slice(0, 3).map((similarRecipe) => (
                  <div
                    key={similarRecipe.id}
                    className={`${
                      darkMode ? "bg-gray-700" : "bg-gray-100"
                    } p-4 rounded-lg`}
                  >
                    <img
                      src={similarRecipe.thumbnail_url}
                      alt={similarRecipe.name}
                      className="w-full h-32 object-cover rounded-lg mb-2"
                    />
                    <h4
                      className={`text-sm font-semibold ${
                        darkMode ? "text-white" : "text-gray-800"
                      }`}
                    >
                      {similarRecipe.name}
                    </h4>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
