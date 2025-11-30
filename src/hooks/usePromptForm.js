import { useState } from 'react';

/**
 * usePromptForm - Custom hook for managing prompt builder form state.
 * 
 * Encapsulates all form inputs, toggles, and dropdown states used in the
 * main prompt building interface.
 * 
 * @returns {Object} Form state and setters
 */
export default function usePromptForm() {
  // Core form inputs
  const [inputText, setInputText] = useState('');
  const [selectedOutputType, setSelectedOutputType] = useState('doc');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [selectedStyle, setSelectedStyle] = useState('direct');
  const [selectedLength, setSelectedLength] = useState('medium');
  const [selectedFormat, setSelectedFormat] = useState('paragraph');
  const [contextConstraints, setContextConstraints] = useState('');
  const [notes, setNotes] = useState('');

  // Toggle options
  const [allowPlaceholders, setAllowPlaceholders] = useState(false);
  const [stripMeta, setStripMeta] = useState(true);
  const [aestheticMode, setAestheticMode] = useState(false);

  // Dropdown UI states
  const [toneDropdownOpen, setToneDropdownOpen] = useState(false);
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const [hoveredOutputType, setHoveredOutputType] = useState(null);

  // Reset form to defaults
  const resetForm = () => {
    setInputText('');
    setSelectedOutputType('doc');
    setSelectedTone('professional');
    setSelectedStyle('direct');
    setSelectedLength('medium');
    setSelectedFormat('paragraph');
    setContextConstraints('');
    setNotes('');
    setAllowPlaceholders(false);
    setStripMeta(true);
    setAestheticMode(false);
  };

  // Load form from history item
  const loadFromHistory = (historyItem) => {
    if (!historyItem) return;
    
    setInputText(historyItem.inputText || '');
    setSelectedOutputType(historyItem.outputType || 'doc');
    setSelectedTone(historyItem.tone || 'professional');
    setSelectedFormat(historyItem.format || 'paragraph');
    
    // Optional fields
    if (historyItem.style) setSelectedStyle(historyItem.style);
    if (historyItem.length) setSelectedLength(historyItem.length);
    if (historyItem.contextConstraints) setContextConstraints(historyItem.contextConstraints);
    if (historyItem.notes) setNotes(historyItem.notes);
  };

  // Get current form state as object (for saving to history)
  const getFormState = () => ({
    inputText,
    outputType: selectedOutputType,
    tone: selectedTone,
    style: selectedStyle,
    length: selectedLength,
    format: selectedFormat,
    contextConstraints,
    notes,
    allowPlaceholders,
    stripMeta,
    aestheticMode
  });

  return {
    // Core inputs
    inputText,
    setInputText,
    selectedOutputType,
    setSelectedOutputType,
    selectedTone,
    setSelectedTone,
    selectedStyle,
    setSelectedStyle,
    selectedLength,
    setSelectedLength,
    selectedFormat,
    setSelectedFormat,
    contextConstraints,
    setContextConstraints,
    notes,
    setNotes,

    // Toggles
    allowPlaceholders,
    setAllowPlaceholders,
    stripMeta,
    setStripMeta,
    aestheticMode,
    setAestheticMode,

    // Dropdown states
    toneDropdownOpen,
    setToneDropdownOpen,
    formatDropdownOpen,
    setFormatDropdownOpen,
    hoveredOutputType,
    setHoveredOutputType,

    // Utility functions
    resetForm,
    loadFromHistory,
    getFormState
  };
}
