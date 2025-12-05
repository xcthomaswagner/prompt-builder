import { useState, useEffect } from 'react';
import { OPENAI_MODELS, CLAUDE_MODELS, GEMINI_MODELS } from '../lib/llmService';

// Environment API key (fallback)
const envGeminiKey = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * useApiSettings - Custom hook for managing API keys and provider settings.
 * 
 * Handles localStorage persistence for all API-related settings including
 * provider selection, API keys, and model choices.
 * 
 * @returns {Object} API settings state and setters
 */
export default function useApiSettings() {
  // Provider selection - default to ChatGPT
  const [selectedProvider, setSelectedProvider] = useState(
    localStorage.getItem('selectedProvider') || 'chatgpt'
  );

  // API Keys
  const [chatgptApiKey, setChatgptApiKey] = useState(() => {
    const stored = localStorage.getItem('chatgptApiKey');
    // Handle legacy 'null' string
    if (stored === 'null' || stored === 'undefined') return '';
    return stored || '';
  });

  const [claudeApiKey, setClaudeApiKey] = useState(
    localStorage.getItem('claudeApiKey') || ''
  );

  const [geminiApiKey, setGeminiApiKey] = useState(
    localStorage.getItem('geminiApiKey') || envGeminiKey || ''
  );

  // Model selections
  const [selectedOpenAIModel, setSelectedOpenAIModel] = useState(
    localStorage.getItem('selectedOpenAIModel') || OPENAI_MODELS[0].id
  );

  const [selectedClaudeModel, setSelectedClaudeModel] = useState(
    localStorage.getItem('selectedClaudeModel') || CLAUDE_MODELS[0].id
  );

  const [selectedGeminiModel, setSelectedGeminiModel] = useState(
    localStorage.getItem('selectedGeminiModel') || GEMINI_MODELS[0].id
  );

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem('selectedProvider', selectedProvider);
    localStorage.setItem('chatgptApiKey', chatgptApiKey);
    localStorage.setItem('claudeApiKey', claudeApiKey);
    localStorage.setItem('geminiApiKey', geminiApiKey);
    localStorage.setItem('selectedOpenAIModel', selectedOpenAIModel);
    localStorage.setItem('selectedClaudeModel', selectedClaudeModel);
    localStorage.setItem('selectedGeminiModel', selectedGeminiModel);
  }, [selectedProvider, chatgptApiKey, claudeApiKey, geminiApiKey, selectedOpenAIModel, selectedClaudeModel, selectedGeminiModel]);

  // Get current API key based on selected provider
  const getCurrentApiKey = () => {
    switch (selectedProvider) {
      case 'chatgpt': return chatgptApiKey;
      case 'claude': return claudeApiKey;
      default: return geminiApiKey;
    }
  };

  // Get current model based on selected provider
  const getCurrentModel = () => {
    switch (selectedProvider) {
      case 'chatgpt': return selectedOpenAIModel;
      case 'claude': return selectedClaudeModel;
      default: return selectedGeminiModel;
    }
  };

  // Check if current provider has a valid API key
  const hasValidApiKey = () => {
    const key = getCurrentApiKey();
    return key && key.trim().length > 0;
  };

  return {
    // Provider
    selectedProvider,
    setSelectedProvider,

    // API Keys
    chatgptApiKey,
    setChatgptApiKey,
    claudeApiKey,
    setClaudeApiKey,
    geminiApiKey,
    setGeminiApiKey,

    // Model selections
    selectedOpenAIModel,
    setSelectedOpenAIModel,
    selectedClaudeModel,
    setSelectedClaudeModel,
    selectedGeminiModel,
    setSelectedGeminiModel,

    // Utility functions
    getCurrentApiKey,
    getCurrentModel,
    hasValidApiKey
  };
}
