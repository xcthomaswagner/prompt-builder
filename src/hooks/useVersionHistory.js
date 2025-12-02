import { useState, useCallback } from 'react';

/**
 * useVersionHistory - Custom hook for managing prompt version history.
 * 
 * Tracks versions of generated prompts for undo/redo functionality
 * during auto-improve and refinement operations.
 * 
 * @param {number} maxIterations - Maximum number of improvement iterations allowed
 * @returns {Object} Version history state and handlers
 */
export default function useVersionHistory(maxIterations = 3) {
  const [promptVersions, setPromptVersions] = useState([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  
  // Store maxIterations for reference
  const maxIterationsRef = maxIterations;

  // Save current version before making changes
  const saveVersion = useCallback((text, quality = null) => {
    const newVersion = {
      text,
      quality,
      timestamp: Date.now()
    };
    setPromptVersions(prev => [...prev, newVersion]);
    setCurrentVersionIndex(prev => prev + 1);
  }, []);

  // Undo to previous version
  const undoVersion = useCallback(() => {
    if (promptVersions.length === 0) return null;
    
    const previousVersion = promptVersions[promptVersions.length - 1];
    setPromptVersions(prev => prev.slice(0, -1));
    setCurrentVersionIndex(prev => prev - 1);
    
    return previousVersion;
  }, [promptVersions]);

  // Reset version history (e.g., when generating new prompt)
  const resetVersionHistory = useCallback(() => {
    setPromptVersions([]);
    setCurrentVersionIndex(-1);
  }, []);

  // Check if we've hit the iteration limit
  const canImprove = promptVersions.length < maxIterationsRef;

  // Check if we can undo
  const canUndo = promptVersions.length > 0;

  // Get version count
  const versionCount = promptVersions.length;

  return {
    promptVersions,
    currentVersionIndex,
    saveVersion,
    undoVersion,
    resetVersionHistory,
    canImprove,
    canUndo,
    versionCount,
    maxIterations
  };
}
