"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const API_KEY = "8a861615ffmsh66b922b5d300103p18a62ajsn09144303544c";
const API_HOST = "tasty.p.rapidapi.com";

export default function GourmetExplorer() {
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
  const [showFilters, setShowFilters] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [showSavedRecipes, setShowSavedRecipes] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const searchInputRef = useRef(null);
  const observer = useRef(null);

  useEffect(() => {
    fetchTags();
    const saved = localStorage.getItem("savedRecipes");
    if (saved) {
      setSavedRecipes(JSON.parse(saved));
    }
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode) {
      setDarkMode(JSON.parse(savedMode));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("savedRecipes", JSON.stringify(savedRecipes));
  }, [savedRecipes]);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

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
      showToast("Error", "Failed to fetch tags. Please try again later.");
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
      showToast("Error", "Failed to fetch recipes. Please try again.");
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
      showToast("Error", "Failed to fetch recipe details. Please try again.");
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
        showToast(
          "Recipe Removed",
          `${recipe.name} has been removed from your saved recipes.`
        );
        return prev.filter((r) => r.id !== recipe.id);
      } else {
        showToast(
          "Recipe Saved",
          `${recipe.name} has been added to your saved recipes.`
        );
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
        showToast("Error", "Speech recognition failed. Please try again.");
      };
      recognition.start();
    } else {
      setIsListening(false);
      showToast(
        "Error",
        "Speech recognition is not supported in your browser."
      );
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

  const showToast = (title, message) => {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg z-50 ${
      darkMode ? "dark" : ""
    }`;
    toast.innerHTML = `
      <h3 class="font-bold">${title}</h3>
      <p>${message}</p>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
      <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 min-h-screen">
        <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
              {" "}
              Gorumet Explorer {" "}
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSavedRecipes(!showSavedRecipes)}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                aria-label={
                  showSavedRecipes ? "Hide saved recipes" : "Show saved recipes"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                aria-label={
                  darkMode ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                {darkMode ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
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
          <AnimatePresence mode="wait">
            {showSavedRecipes ? (
              <motion.div
                key="saved-recipes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => setShowSavedRecipes(false)}
                  className="mb-4 flex items-center text-blue-500 hover:text-blue-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Back to Search
                </button>
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
                  Saved Recipes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {savedRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onViewDetails={() => fetchRecipeDetails(recipe.id)}
                      onSave={() => saveRecipe(recipe)}
                      isSaved={true}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
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
                      className="w-full p-4 pl-12 rounded-lg shadow-md focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Search for recipes or ingredients"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 absolute left-4 top-4 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
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
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
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
                  </div>

                  {autoCompleteResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                      <div className="max-h-64 overflow-y-auto">
                        {autoCompleteResults.map((result, index) => (
                          <button
                            key={index}
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                            onClick={() => {
                              setSearchTerm(result.display);
                              setAutoCompleteResults([]);
                            }}
                          >
                            {result.display}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex space-x-4">
                    <button
                      onClick={handleVoiceSearch}
                      className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300"
                      disabled={isListening}
                    >
                      {isListening ? (
                        <div className="animate-pulse">Listening...</div>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                            />
                          </svg>
                          Voice Search
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-300"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
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
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                    {showFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4 flex flex-wrap gap-2"
                      >
                        {tags.slice(0, 15).map((tag) => (
                          <button
                            key={tag.id}
                            className={`px-4 py-2 rounded-full text-sm ${
                              selectedTags.includes(tag.name)
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                            }`}
                            onClick={() =>
                              setSelectedTags((prev) =>
                                prev.includes(tag.name)
                                  ? prev.filter((t) => t !== tag.name)
                                  : [...prev, tag.name]
                              )
                            }
                          >
                            {tag.display_name}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  <button
                    onClick={() => searchRecipes()}
                    className="mt-6 w-full sm:w-auto px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                        Searching...
                      </div>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
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
                  <p className="text-red-500 mb-4 dark:text-red-400">{error}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {recipes.map((recipe, index) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onViewDetails={() => fetchRecipeDetails(recipe.id)}
                      onSave={() => saveRecipe(recipe)}
                      isSaved={isRecipeSaved(recipe.id)}
                      ref={
                        index === recipes.length - 1
                          ? lastRecipeElementRef
                          : null
                      }
                    />
                  ))}
                </div>

                {loading && (
                  <p className="text-center mt-4">Loading more recipes...</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {selectedRecipe && (
            <RecipeModal
              recipe={selectedRecipe}
              onClose={() => setSelectedRecipe(null)}
              cookingTips={cookingTips}
              similarRecipes={similarRecipes}
              onSave={() => saveRecipe(selectedRecipe)}
              isSaved={isRecipeSaved(selectedRecipe.id)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

const RecipeCard = React.forwardRef(
  ({ recipe, onViewDetails, onSave, isSaved }, ref) => {
    return (
      <div
        ref={ref}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105"
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
            className="absolute top-2 right-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-opacity-80 transition-colors duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill={isSaved ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              className={`w-5 h-5 ${
                isSaved ? "text-blue-500" : "text-gray-500 dark:text-gray-400"
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
          <h2 className="text-2xl font-semibold mb-2 text-gray-800 dark:text-white">
            {recipe.name}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
            {recipe.description}
          </p>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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
            <div className="flex items-center text-gray-500 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-300 flex items-center justify-center"
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
}) {
  const [activeTab, setActiveTab] = useState("ingredients");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">
              {recipe.name}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={onSave}
                className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors duration-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill={isSaved ? "currentColor" : "none"}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className={`w-5 h-5 ${
                    isSaved
                      ? "text-blue-500"
                      : "text-gray-500 dark:text-gray-400"
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
                className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full transition-colors duration-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-500 dark:text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            {recipe.description}
          </p>
          <div className="mb-6">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                className={`px-4 py-2 ${
                  activeTab === "ingredients"
                    ? "border-b-2 border-blue-500 text-blue-500"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                onClick={() => setActiveTab("ingredients")}
              >
                Ingredients
              </button>
              <button
                className={`px-4 py-2 ${
                  activeTab === "instructions"
                    ? "border-b-2 border-blue-500 text-blue-500"
                    : "text-gray-500 dark:text-gray-400"
                }`}
                onClick={() => setActiveTab("instructions")}
              >
                Instructions
              </button>
              {cookingTips.length > 0 && (
                <button
                  className={`px-4 py-2 ${
                    activeTab === "tips"
                      ? "border-b-2 border-blue-500 text-blue-500"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                  onClick={() => setActiveTab("tips")}
                >
                  Cooking Tips
                </button>
              )}
            </div>
            <div className="mt-4">
              {activeTab === "ingredients" && (
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                  {recipe.sections[0].components.map((component, index) => (
                    <li key={index}>{component.raw_text}</li>
                  ))}
                </ul>
              )}
              {activeTab === "instructions" && (
                <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index}>{instruction.display_text}</li>
                  ))}
                </ol>
              )}
              {activeTab === "tips" && (
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                  {cookingTips.map((tip, index) => (
                    <li key={index}>{tip.tip}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {similarRecipes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">
                Similar Recipes
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {similarRecipes.slice(0, 3).map((similarRecipe) => (
                  <div
                    key={similarRecipe.id}
                    className="bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-md"
                  >
                    <img
                      src={similarRecipe.thumbnail_url}
                      alt={similarRecipe.name}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-2">
                      <h4 className="text-sm font-medium text-gray-800 dark:text-white">
                        {similarRecipe.name}
                      </h4>
                    </div>
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
