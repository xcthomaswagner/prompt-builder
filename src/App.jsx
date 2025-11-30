import { useState, useEffect, useRef, useMemo } from 'react';
import { estimateTokens } from './lib/tokenEstimator';
import { generateSignature } from './lib/utils';
import usePromptForm from './hooks/usePromptForm';
import useApiSettings from './hooks/useApiSettings';
import useAuth from './hooks/useAuth';
import usePromptHistory from './hooks/usePromptHistory';
import useVersionHistory from './hooks/useVersionHistory';
import {
  Sparkles,
  History,
  Settings2,
  Copy as CopyIcon,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wand2,
  AlertCircle,
  Eye,
  Zap,
  EyeOff,
  X,
  Search,
  Beaker,
  Lightbulb,
  Undo2,
  RefreshCw,
  PanelRightClose,
  PanelRight,
  Sun,
  Moon
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  serverTimestamp,
  arrayUnion
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import buildPromptPlan from './lib/promptAssembler';
import ExperimentMode from './components/ExperimentMode';
import SettingsModal from './components/SettingsModal';
import {
  OPENAI_MODELS,
  CLAUDE_MODELS,
  GEMINI_MODELS,
  callGemini,
  callGeminiText,
  callOpenAI,
  callAnthropic,
  extractExpandedPrompt
} from './lib/llmService';
import {
  TONES,
  OUTPUT_TYPES,
  FORMATS,
  LENGTHS,
  STYLES
} from './lib/constants';

// New Evolution Components
import TypeSpecificForm from './components/TypeSpecificForms/index.jsx';
import QualityFeedback from './components/QualityFeedback.jsx';
import ReasoningPanel from './components/ReasoningPanel.jsx';
import TemplateSelector from './components/TemplateSelector.jsx';
import OutcomeFeedback from './components/OutcomeFeedback.jsx';

// New Evolution Modules
// Note: runPipeline is available for future split-pipeline mode
// import { runPipeline } from './lib/pipeline/index.js';
import { createSpec, mergeSpec } from './lib/promptSpecs/index.js';
import { assessQuality, quickQualityCheck } from './lib/quality/index.js';
import { recordOutcome, learnFromOutcome } from './lib/learning/index.js';

// --- Firebase Configuration ---
// Note: In a real app, these come from import.meta.env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase only if config is present to prevent crashes during initial setup
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase not initialized. Check your .env file.");
}

const appId = firebaseConfig.appId || 'default-app-id';

// --- API Configuration ---
const claudeFunctionUrl = import.meta.env.VITE_CLAUDE_FUNCTION_URL;



export default function App() {
  // Auth state (from custom hook)
  const {
    user,
    isTestMode,
    authError,
    setAuthError,
    handleGoogleSignIn,
    handleMicrosoftSignIn,
    handleSignOut
  } = useAuth(app);

  // History state (from custom hook)
  const {
    promptHistory,
    filteredHistory,
    isHistoryLoading,
    historySearchQuery,
    setHistorySearchQuery,
    handleDeleteHistory,
    handleTogglePrivate
  } = usePromptHistory(db, user);

  // Form State (from custom hook)
  const {
    inputText, setInputText,
    selectedOutputType, setSelectedOutputType,
    selectedTone, setSelectedTone,
    selectedStyle, setSelectedStyle,
    selectedLength, setSelectedLength,
    selectedFormat, setSelectedFormat,
    contextConstraints, setContextConstraints,
    notes, setNotes,
    allowPlaceholders, setAllowPlaceholders,
    stripMeta, setStripMeta,
    aestheticMode, setAestheticMode,
    toneDropdownOpen, setToneDropdownOpen,
    formatDropdownOpen, setFormatDropdownOpen,
    hoveredOutputType, setHoveredOutputType,
    loadFromHistory: loadFormFromHistory
  } = usePromptForm();

  // UI State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [reversePromptTriggered, setReversePromptTriggered] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState(null);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [activeVersionHistoryId, setActiveVersionHistoryId] = useState(null);
  const generationRunRef = useRef(0);
  const generationAbortRef = useRef(null);

  // Mode toggle: 'builder' or 'experiment'
  const [appMode, setAppMode] = useState('builder');

  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Theme state
  const [darkMode, setDarkMode] = useState(false);

  // Experiment history state (lifted from ExperimentMode for sidebar rendering)
  const [experimentHistory, setExperimentHistory] = useState(null);

  // Memoized token count to avoid recalculating on every render
  const inputTokenCount = useMemo(() => estimateTokens(inputText), [inputText]);

  // Evolution Features State
  const [promptSpec, setPromptSpec] = useState(null);
  const [qualityResult, setQualityResult] = useState(null);
  const [reasoning, setReasoning] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showOutcomeFeedback, setShowOutcomeFeedback] = useState(false);
  const [lastGeneratedPromptId, setLastGeneratedPromptId] = useState(null);

  // Auto-Improve State
  const [isImproving, setIsImproving] = useState(false);
  const [enableQualityAssessment, setEnableQualityAssessment] = useState(true);
  
  // Version history (from custom hook)
  const {
    promptVersions,
    saveVersion,
    undoVersion,
    resetVersionHistory,
    canImprove,
    canUndo,
    versionCount,
    maxIterations: MAX_IMPROVE_ITERATIONS
  } = useVersionHistory(3);

  // Iterate & Refine State
  const [refinementInstructions, setRefinementInstructions] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Handle template selection
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setSelectedOutputType(template.outputType);
    if (template.exampleInput) {
      setInputText(template.exampleInput);
    }
    // Apply template defaults to spec
    const spec = createSpec(template.outputType);
    const mergedSpec = mergeSpec(spec, template.defaults || {});
    setPromptSpec(mergedSpec);
    setShowTemplates(false);
  };

  // Handle spec field changes from type-specific forms
  const handleSpecChange = (field, value) => {
    setPromptSpec(prev => {
      if (!prev) {
        const newSpec = createSpec(selectedOutputType);
        return mergeSpec(newSpec, { [field]: value });
      }
      return mergeSpec(prev, { [field]: value });
    });
  };

  // Handle outcome feedback submission
  const handleOutcomeSubmit = async (outcome) => {
    if (!db || !user) return;
    try {
      await recordOutcome(db, user.uid, outcome);
      await learnFromOutcome(db, user.uid, outcome);
    } catch (error) {
      console.error('Failed to record outcome:', error);
    }
  };

  // Auto-improve the generated prompt based on quality feedback
  const handleAutoImprove = async () => {
    if (!generatedResult || !qualityResult?.improvements?.length) return;
    if (!geminiApiKey) {
      setErrorMsg('Gemini API Key is required for auto-improve.');
      return;
    }

    // Check iteration limit
    if (!canImprove) {
      setErrorMsg(`Maximum of ${MAX_IMPROVE_ITERATIONS} improvement iterations reached.`);
      return;
    }

    setIsImproving(true);
    setErrorMsg('');

    try {
      const currentSpec = promptSpec || createSpec(selectedOutputType);
      
      const systemPrompt = `You are a prompt refinement expert. Your task is to improve the given prompt based on specific feedback.

RULES:
- Address ALL the improvement points provided
- Maintain the original intent and structure
- Keep the same output type and tone
- Return ONLY the improved prompt text, no explanations or meta-commentary
- The result should be a complete, ready-to-use prompt`;

      const userPrompt = `## Current Prompt
${generatedResult}

## Improvements Needed
${qualityResult.improvements.map((imp, idx) => `${idx + 1}. ${imp}`).join('\n')}

## Context
- Output Type: ${currentSpec.outputType || selectedOutputType}
- Tone: ${selectedTone}
- Format: ${selectedFormat}

Generate an improved version of the prompt that addresses all the feedback points above.`;

      const improvedText = await callGeminiText(userPrompt, systemPrompt, geminiApiKey);

      if (!improvedText || improvedText.trim().length === 0) {
        throw new Error('No improved prompt returned');
      }

      // Save current version to history before updating
      saveVersion(generatedResult, qualityResult);

      // Update to improved version
      setGeneratedResult(improvedText.trim());

      // Re-run quality assessment on improved version
      const quickCheck = quickQualityCheck(improvedText.trim(), currentSpec);
      if (enableQualityAssessment) {
        setQualityResult({ ...quickCheck, assessing: true });
        const callLLM = (prompt, systemPrompt) => callGeminiText(prompt, systemPrompt, geminiApiKey);
        assessQuality(improvedText.trim(), currentSpec, callLLM)
          .then(newQuality => setQualityResult(newQuality))
          .catch(() => setQualityResult(quickCheck));
      } else {
        setQualityResult(quickCheck);
      }

    } catch (err) {
      console.error('Auto-improve failed:', err);
      setErrorMsg(`Failed to improve prompt: ${err.message}`);
    } finally {
      setIsImproving(false);
    }
  };

  // Undo to a previous version
  const handleUndoImprove = () => {
    const previousVersion = undoVersion();
    if (previousVersion) {
      setGeneratedResult(previousVersion.text);
      setQualityResult(previousVersion.quality);
    }
  };


  // Iterate & Refine the prompt based on user instructions
  const handleRefinePrompt = async () => {
    if (!generatedResult || !refinementInstructions.trim()) return;
    if (!geminiApiKey) {
      setErrorMsg('Gemini API Key is required for refinement.');
      return;
    }

    setIsRefining(true);
    setErrorMsg('');

    try {
      const systemPrompt = `You are a prompt refinement expert. Your task is to modify the given prompt based on the user's specific instructions.

RULES:
- Follow the user's refinement instructions exactly
- Maintain the overall structure and format of the prompt unless told otherwise
- Keep the prompt's core purpose intact
- Return ONLY the refined prompt text, no explanations or meta-commentary
- The result should be a complete, ready-to-use prompt`;

      const userPrompt = `## Current Prompt
${generatedResult}

## Refinement Instructions
${refinementInstructions}

Apply the refinement instructions above to modify the prompt. Return only the updated prompt.`;

      const refinedText = await callGeminiText(userPrompt, systemPrompt, geminiApiKey);

      if (!refinedText || refinedText.trim().length === 0) {
        throw new Error('No refined prompt returned');
      }

      // Save current version to history before updating
      saveVersion(generatedResult);

      // Update to refined version
      setGeneratedResult(refinedText.trim());
      
      // Clear the refinement instructions
      setRefinementInstructions('');

    } catch (err) {
      console.error('Refinement failed:', err);
      setErrorMsg(`Failed to refine prompt: ${err.message}`);
    } finally {
      setIsRefining(false);
    }
  };

  // API Settings (from custom hook)
  const {
    selectedProvider, setSelectedProvider,
    chatgptApiKey, setChatgptApiKey,
    claudeApiKey, setClaudeApiKey,
    geminiApiKey, setGeminiApiKey,
    selectedOpenAIModel, setSelectedOpenAIModel,
    selectedClaudeModel, setSelectedClaudeModel,
    selectedGeminiModel, setSelectedGeminiModel
  } = useApiSettings();

  // --- Hybrid Logic Rules (Reactive) ---
  useEffect(() => {
    const fmt = FORMATS.find(f => f.id === selectedFormat);
    if (fmt?.isSafeJson) {
      setStripMeta(true);
    }
  }, [selectedFormat]);

  // --- Cancel Generation ---
  const handleCancelGeneration = () => {
    if (generationAbortRef.current) {
      generationAbortRef.current.abort();
    }
    generationRunRef.current = 0; // Invalidate current run
    setIsGenerating(false);
    setErrorMsg('Generation cancelled');
  };

  // --- Core Logic: Prompt Construction ---
  const handleGenerate = async () => {
    // Create new AbortController for this generation
    generationAbortRef.current = new AbortController();

    const currentSpec = promptSpec || createSpec(selectedOutputType);
    const requestState = {
      originalText: inputText,
      outputType: selectedOutputType,
      tone: selectedTone,
      style: selectedStyle,
      format: selectedFormat,
      length: selectedLength,
      contextConstraints: contextConstraints,
      notes: notes,
      toggles: {
        allowPlaceholders,
        stripMeta,
        aestheticMode
      },
      typeSpecific: currentSpec.typeSpecific || {}
    };
    const historySnapshot = promptHistory;
    const historyIdSnapshot = currentHistoryId;
    const runId = Date.now();
    generationRunRef.current = runId;

    setIsGenerating(true);
    setGeneratedResult(null);
    setReversePromptTriggered(false);
    setErrorMsg('');
    setIsSavingHistory(false);
    resetVersionHistory();

    let finalPromptText = '';
    let isReverse = false;
    let generationFailed = false;

    try {
      // currentSpec already defined above in requestState
      const toneObj = TONES.find(t => t.id === selectedTone);
      const styleObj = STYLES.find(s => s.id === selectedStyle);
      const typeObj = OUTPUT_TYPES.find(t => t.id === selectedOutputType);
      const formatObj = FORMATS.find(f => f.id === selectedFormat);
      const lengthObj = LENGTHS.find(t => t.id === selectedLength);

      // Use the new assembler for ALL types
      const plan = buildPromptPlan({
        specId: selectedOutputType,
        userInput: inputText,
        tone: toneObj,
        style: styleObj,
        outputType: typeObj,
        format: formatObj,
        length: lengthObj,
        notes,
        contextConstraints,
        toggles: {
          allowPlaceholders,
          stripMeta,
          aestheticMode
        },
        typeSpecific: currentSpec.typeSpecific // Pass type-specific form data (e.g., copy_type, emotional_appeal)
      });

      const systemPrompt = `${plan.systemPrompt}

CRITICAL JSON RESPONSE CONTRACT:
You MUST return a complete JSON object with ALL THREE sections below. Do not omit any section.

REQUIRED STRUCTURE:
{
  "analysis": {
    "detected_domain": string,
    "input_quality_score": integer,
    "is_vague_or_short": boolean
  },
  "reverse_prompting": {
    "was_triggered": boolean,
    "refined_task_text": string,
    "reasoning": string
  },
  "final_output": {
    "expanded_prompt_text": string,
    "enrichment_attributes_used": string[]
  }
}

CRITICAL: The "final_output" section is MANDATORY. The "expanded_prompt_text" field must contain the final expanded prompt or blueprint following the STRUCTURAL TEMPLATE and rules above. This field cannot be empty.`;

      const userPromptForModel = plan.userPrompt || inputText;

      let aiData;
      // Test mode bypass - return mock response for E2E tests
      if (isTestMode) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate brief delay
        aiData = {
          analysis: {
            detected_domain: 'test',
            input_quality_score: 8,
            is_vague_or_short: false
          },
          reverse_prompting: {
            was_triggered: false,
            refined_task_text: '',
            reasoning: ''
          },
          final_output: {
            expanded_prompt_text: `# Generated Prompt for Testing\n\nThis is a mock expanded prompt generated for Playwright E2E testing.\n\n## Context\nOriginal input: "${inputText}"\nOutput type: ${selectedOutputType}\nTone: ${selectedTone}\nFormat: ${selectedFormat}\n\n## Instructions\nThis mock response validates that the prompt generation flow works correctly without requiring actual API calls.\n\n## Expected Behavior\nThe UI should display this content in the output area, allowing tests to verify copy functionality, history saving, and other features.`,
            enrichment_attributes_used: ['test_mode', 'mock_response']
          }
        };
      } else if (selectedProvider === 'chatgpt') {
        if (!chatgptApiKey) throw new Error("OpenAI API Key is missing. Please add it in Settings.");
        aiData = await callOpenAI(userPromptForModel, systemPrompt, chatgptApiKey, selectedOpenAIModel);
      } else if (selectedProvider === 'claude') {
        if (!claudeApiKey) throw new Error("Claude API Key is missing. Please add it in Settings.");
        aiData = await callAnthropic(userPromptForModel, systemPrompt, claudeApiKey, selectedClaudeModel, claudeFunctionUrl);
      } else {
        if (!geminiApiKey) throw new Error("Gemini API Key is missing. Please add it in Settings.");
        aiData = await callGemini(userPromptForModel, systemPrompt, geminiApiKey, selectedGeminiModel);
      }

      isReverse = aiData.reverse_prompting?.was_triggered || false;
      finalPromptText = extractExpandedPrompt(aiData);

      if (!finalPromptText) {
        console.error("No final prompt text in response:", aiData);
        throw new Error("Failed to generate expanded prompt text.");
      }

      setReversePromptTriggered(isReverse);
      setGeneratedResult(finalPromptText);

      // Run quality assessment (currentSpec already defined at top of try block)
      const quickCheck = quickQualityCheck(finalPromptText, currentSpec);
      
      if (enableQualityAssessment) {
        // Start with quick check while LLM assesses
        setQualityResult({ ...quickCheck, assessing: true });
        
        // Run full LLM assessment in background
        const callLLM = (prompt, systemPrompt) => callGeminiText(prompt, systemPrompt, geminiApiKey);
        assessQuality(finalPromptText, currentSpec, callLLM)
          .then(qualityCheck => setQualityResult(qualityCheck))
          .catch(err => {
            console.error('Quality assessment failed:', err);
            setQualityResult(quickCheck);
          });
      } else {
        // Just use quick heuristic check
        setQualityResult(quickCheck);
      }

      // Set reasoning from analysis if available
      if (aiData.reverse_prompting?.reasoning) {
        setReasoning({
          analysis: aiData.reverse_prompting.reasoning,
          tone: `Selected ${selectedTone} tone for this ${selectedOutputType}`,
          format: `Using ${selectedFormat} format`,
        });
      }

    } catch (err) {
      console.error("Prompt generation error:", err);

      if (err.message?.includes("API Key")) {
        setErrorMsg("API Key is missing or invalid. Please check your configuration.");
      } else if (err.message?.includes("HTTP error")) {
        setErrorMsg("Failed to connect to Gemini API. Please check your internet connection.");
      } else if (err.message?.includes("Failed to generate")) {
        setErrorMsg("The AI couldn't generate a prompt. The response format was unexpected. Please try again.");
      } else {
        setErrorMsg(`Failed to generate prompt: ${err.message || "Unknown error"}. Please try again.`);
      }

      generationFailed = true;
    } finally {
      setIsGenerating(false);
    }

    if (generationFailed || !finalPromptText) {
      setIsSavingHistory(false);
      return;
    }

    if (!user) {
      setIsSavingHistory(false);
      return;
    }

    if (!db) {
      console.error("Save skipped: Firestore DB not initialized");
      setIsSavingHistory(false);
      return;
    }

    setIsSavingHistory(true);
    const signature = generateSignature(requestState.originalText);

    const saveTask = async () => {
      try {
        let existingItem = historyIdSnapshot
          ? historySnapshot.find(item => item.id === historyIdSnapshot)
          : null;

        if (!existingItem) {
          existingItem = historySnapshot.find(item => item.signature === signature);
        }

        const newVersionData = {
          originalText: requestState.originalText,
          finalPrompt: finalPromptText,
          outputType: requestState.outputType,
          tone: requestState.tone,
          format: requestState.format,
          length: requestState.length,
          notes: requestState.notes || '',
          toggles: requestState.toggles || {},
          typeSpecific: requestState.typeSpecific || {},
          createdAt: new Date().toISOString(),
          isReversePrompted: isReverse,
          signature
        };

        if (existingItem) {
          const docRef = doc(db, 'users', user.uid, 'prompt_history', existingItem.id);
          await updateDoc(docRef, {
            ...newVersionData,
            createdAt: serverTimestamp(),
            version: (existingItem.version || 1) + 1,
            versions: arrayUnion(newVersionData),
            signature
          });
          return existingItem.id;
        } else {
          const collectionRef = collection(db, 'users', user.uid, 'prompt_history');
          const docRef = await addDoc(collectionRef, {
            ...newVersionData,
            createdAt: serverTimestamp(),
            isPrivate: false,
            version: 1,
            versions: [newVersionData],
            signature
          });
          return docRef.id;
        }
      } catch (error) {
        console.error("Error saving to Firestore:", error);
        throw error;
      }
    };

    // Save to Firestore (relies on Firestore's own timeout behavior)
    saveTask()
      .then((savedId) => {
        if (generationRunRef.current !== runId) {
          setIsSavingHistory(false);
          return;
        }
        if (savedId) {
          setCurrentHistoryId(savedId);
          setLastGeneratedPromptId(savedId);
        }
        setIsSavingHistory(false);
      })
      .catch((dbError) => {
        if (generationRunRef.current !== runId) {
          setIsSavingHistory(false);
          return;
        }
        console.error("Failed to save to history:", dbError.code || dbError.message);
        setIsSavingHistory(false);
      });
  };



  const loadFromHistory = (item, versionData = null) => {
    const data = versionData || item;
    setCurrentHistoryId(item.id); // Always keep the parent ID
    setInputText(data.originalText);
    resetVersionHistory(); // Clear auto-improve version history
    setSelectedOutputType(data.outputType || 'doc');
    setSelectedTone(data.tone || 'professional');
    setSelectedStyle(data.style || 'direct');
    setSelectedFormat(data.format || 'paragraph');
    setSelectedLength(data.length || 'medium');
    
    // Restore context and notes
    setContextConstraints(data.contextConstraints || '');
    setNotes(data.notes || '');
    
    // Restore toggles
    if (data.toggles) {
      setAllowPlaceholders(data.toggles.allowPlaceholders || false);
      setStripMeta(data.toggles.stripMeta !== false); // Default true
      setAestheticMode(data.toggles.aestheticMode || false);
    }
    
    // Restore typeSpecific via promptSpec
    if (data.typeSpecific && Object.keys(data.typeSpecific).length > 0) {
      const spec = createSpec(data.outputType || 'doc');
      setPromptSpec(mergeSpec(spec, { typeSpecific: data.typeSpecific }));
    } else {
      setPromptSpec(null);
    }
    
    // Load the generated prompt result
    if (data.finalPrompt) {
      setGeneratedResult(data.finalPrompt);
    }
  };

  const handleCopy = async () => {
    if (!generatedResult) return;
    try {
      await navigator.clipboard.writeText(generatedResult);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Unable to copy', err);
      setErrorMsg("Failed to copy to clipboard.");
    }
  };

  // Show sign-in screen if not authenticated
  if (!user) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 text-slate-900 font-sans overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {/* Logo and Title */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-200 mx-auto mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h1 className={`font-bold text-3xl mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Intelligent Prompt Builder</h1>
              <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Transform your ideas into powerful prompts</p>
            </div>

            {/* Sign-in Card */}
            <div className={`rounded-2xl shadow-xl border p-8 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <h2 className={`text-xl font-bold mb-2 text-center ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Sign in to continue</h2>
              <p className={`text-sm mb-6 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Choose your preferred authentication method</p>

              {errorMsg && (
                <div className={`mb-4 p-3 rounded-lg text-sm border flex items-center gap-2 ${darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  <AlertCircle className="w-4 h-4" />
                  {errorMsg}
                </div>
              )}

              <div className="space-y-3">
                {/* Google Sign-in */}
                <button
                  onClick={handleGoogleSignIn}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-3 border-2 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:border-slate-500' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>

                {/* Microsoft Sign-in */}
                <button
                  onClick={handleMicrosoftSignIn}
                  className={`w-full flex items-center justify-center gap-3 px-6 py-3 border-2 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 hover:border-slate-500' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'}`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 23 23">
                    <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  Continue with Microsoft
                </button>
              </div>

              <p className={`text-xs text-center mt-6 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper for date formatting
  const formatVersionDate = (ver) => {
    try {
      let date;
      if (ver.createdAt?.seconds) {
        date = new Date(ver.createdAt.seconds * 1000);
      } else if (ver.createdAt) {
        date = new Date(ver.createdAt);
      }
      if (date && !isNaN(date.getTime())) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) { console.warn("Date parse error", e); }
    return '';
  };

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100 selection:bg-cyan-800 selection:text-cyan-100' : 'bg-slate-50 text-slate-900 selection:bg-cyan-100 selection:text-cyan-900'}`}>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className={`h-16 border-b flex items-center justify-between px-6 shadow-sm z-10 transition-colors ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-white font-bold shadow-cyan-200 shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className={`font-bold text-xl tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>Intelligent Prompt Builder</h1>
            </div>

            {/* Mode Toggle Tabs */}
            <div className={`flex items-center rounded-lg p-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <button
                onClick={() => setAppMode('builder')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${appMode === 'builder'
                  ? darkMode ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Wand2 className="w-4 h-4" />
                Builder
              </button>
              <button
                onClick={() => setAppMode('experiment')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${appMode === 'experiment'
                  ? darkMode ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-slate-800 shadow-sm'
                  : darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                <Beaker className="w-4 h-4" />
                Experiment
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`w-8 h-8 rounded-full overflow-hidden border ${darkMode ? 'bg-slate-600 border-slate-500' : 'bg-slate-200 border-slate-300'}`}>
                <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'default'}`} alt="avatar" />
              </div>
              <div className="hidden md:block">
                <div className={`text-xs font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{user?.displayName || 'User'}</div>
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email || ''}</div>
              </div>
              <button
                onClick={handleSignOut}
                className={`text-xs font-medium px-2 py-1 rounded transition-colors ${darkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Work Area */}
        <div className={`flex-1 overflow-y-auto p-4 md:p-8 transition-colors ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
          {appMode === 'experiment' ? (
            <div className="max-w-6xl mx-auto pb-20">
              <ExperimentMode
                callLLM={async (userPrompt, systemPrompt) => {
                  // Use the currently selected provider and model
                  if (selectedProvider === 'chatgpt') {
                    if (!chatgptApiKey) throw new Error("OpenAI API Key is missing");
                    return callOpenAI(userPrompt, systemPrompt, chatgptApiKey, selectedOpenAIModel);
                  } else if (selectedProvider === 'claude') {
                    if (!claudeApiKey) throw new Error("Claude API Key is missing");
                    return callAnthropic(userPrompt, systemPrompt, claudeApiKey, selectedClaudeModel, claudeFunctionUrl);
                  } else {
                    if (!geminiApiKey) throw new Error("Gemini API Key is missing");
                    return callGemini(userPrompt, systemPrompt, geminiApiKey, selectedGeminiModel);
                  }
                }}
                defaultOutputType={selectedOutputType}
                db={db}
                user={user}
                apiKeys={{
                  gemini: geminiApiKey,
                  openai: chatgptApiKey,
                  anthropic: claudeApiKey
                }}
                firebaseApp={app}
                onHistoryChange={setExperimentHistory}
                darkMode={darkMode}
                typeSpecific={promptSpec?.typeSpecific || {}}
              />
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-6 pb-20">

              {/* Quick Start Templates Toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${showTemplates
                    ? 'bg-indigo-100 text-indigo-700'
                    : darkMode ? 'bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <Lightbulb className="w-4 h-4" />
                  Quick Start Templates
                  {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {selectedTemplate && (
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    Using: {selectedTemplate.label}
                  </span>
                )}
              </div>

              {/* Template Selector */}
              {showTemplates && (
                <div className={`rounded-xl shadow-sm border p-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <TemplateSelector
                    onSelect={handleTemplateSelect}
                    selectedId={selectedTemplate?.id}
                    darkMode={darkMode}
                  />
                </div>
              )}

              {/* Input Section */}
              <div className={`rounded-xl shadow-sm border p-6 transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                    className={`text-xs flex items-center gap-1 ${darkMode ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}
                  >
                    {showSystemPrompt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showSystemPrompt ? 'Hide System Prompt' : 'Show System Prompt'}
                  </button>
                </div>

                {showSystemPrompt && (
                  <div className={`mb-6 p-4 rounded-lg border text-xs font-mono overflow-auto max-h-64 ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                    <h3 className={`font-bold mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>System Prompt Preview:</h3>
                    <pre className="whitespace-pre-wrap">
                      {(() => {
                        try {
                          const toneObj = TONES.find(t => t.id === selectedTone);
                          const styleObj = STYLES.find(s => s.id === selectedStyle);
                          const typeObj = OUTPUT_TYPES.find(t => t.id === selectedOutputType);
                          const formatObj = FORMATS.find(f => f.id === selectedFormat);
                          const lengthObj = LENGTHS.find(t => t.id === selectedLength);

                          const currentSpec = promptSpec || createSpec(selectedOutputType);
                          const plan = buildPromptPlan({
                            specId: selectedOutputType,
                            userInput: inputText || "(User Input)",
                            tone: toneObj,
                            style: styleObj,
                            outputType: typeObj,
                            format: formatObj,
                            length: lengthObj,
                            notes,
                            contextConstraints,
                            toggles: { allowPlaceholders, stripMeta, aestheticMode },
                            typeSpecific: currentSpec.typeSpecific
                          });
                          return plan.systemPrompt;
                        } catch (e) {
                          return "Error generating preview: " + e.message;
                        }
                      })()}
                    </pre>
                  </div>
                )}

                <div className="flex justify-between items-center mb-3">
                  <label htmlFor="prompt-input" className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Your Original Prompt</label>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>{inputText.length} chars</span>
                    <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>•</span>
                    <span className="text-cyan-600 font-semibold">{inputTokenCount} tokens</span>
                    <span className={darkMode ? 'text-slate-600' : 'text-slate-300'}>•</span>
                    <button
                      onClick={() => {
                        setInputText('');
                        setSelectedOutputType('doc');
                        setSelectedTone('professional');
                        setSelectedStyle('direct');
                        setSelectedFormat('paragraph');
                        setSelectedLength('medium');
                        setContextConstraints('');
                        setNotes('');
                        setAllowPlaceholders(false);
                        setStripMeta(true);
                        setAestheticMode(false);
                        setGeneratedResult(null);
                        setCurrentHistoryId(null);
                        // Reset evolution state
                        setPromptSpec(null);
                        setQualityResult(null);
                        setReasoning({});
                        setSelectedTemplate(null);
                        setShowTemplates(false);
                        setLastGeneratedPromptId(null);
                        resetVersionHistory();
                      }}
                      className={`font-sans text-xs px-2 py-0.5 rounded transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <textarea
                  id="prompt-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="e.g., Make me a deck about Andrej Karpathy software 3.0"
                  className={`w-full h-32 resize-none outline-none text-sm bg-transparent ${darkMode ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-300'}`}
                />

                {/* Token Bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Token Usage</span>
                    <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>{inputTokenCount} / 2000 tokens</span>
                  </div>
                  <div className={`h-1.5 w-full rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${inputTokenCount > 1500 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                      style={{ width: `${Math.min(100, (inputTokenCount / 2000) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Output Type Selector */}
              <div className="relative">
                <label className={`text-sm font-semibold mb-3 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Output Type</label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {OUTPUT_TYPES.filter(type => type.id !== 'json').map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedOutputType === type.id;
                    return (
                      <div key={type.id} className="relative">
                        <button
                          onClick={() => {
                            setHoveredOutputType(null);
                            if (type.id !== selectedOutputType) {
                              setSelectedOutputType(type.id);
                              // Reset spec when output type changes to avoid stale typeSpecific data
                              setPromptSpec(createSpec(type.id));
                            }
                          }}
                          onMouseEnter={() => setHoveredOutputType(type.id)}
                          onMouseLeave={() => setHoveredOutputType(null)}
                          className={`w-full flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${isSelected
                            ? 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm ring-1 ring-cyan-200'
                            : darkMode ? 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:border-slate-500' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                        >
                          <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-cyan-600' : darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                          <span className="text-xs font-medium">{type.label}</span>
                        </button>
                        {/* Tooltip */}
                        {hoveredOutputType === type.id && type.tooltip && (
                          <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-4 rounded-lg shadow-xl border z-20 animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'}`}>
                            {/* Arrow */}
                            <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 ${darkMode ? 'bg-slate-700 border-l border-t border-slate-600' : 'bg-white border-l border-t border-slate-200'}`} />
                            <div className="text-cyan-600 font-semibold text-sm mb-1">{type.tooltip.title}</div>
                            <div className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{type.tooltip.desc}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Type-Specific Form */}
              <TypeSpecificForm
                outputType={selectedOutputType}
                spec={promptSpec || createSpec(selectedOutputType)}
                onChange={handleSpecChange}
                darkMode={darkMode}
              />

              {/* Action Button (clickable to cancel when generating) */}
              <button
                onClick={isGenerating ? handleCancelGeneration : handleGenerate}
                disabled={!inputText.trim() && !isGenerating}
                title={isGenerating ? 'Click to cancel' : undefined}
                className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] ${
                  isGenerating
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 cursor-pointer'
                    : !inputText.trim()
                      ? darkMode ? 'bg-slate-700 cursor-not-allowed shadow-none' : 'bg-slate-300 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-cyan-200 hover:shadow-xl'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                    <span className="text-sm font-normal opacity-75">(click to cancel)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 text-yellow-300 fill-current" />
                    Generate Expanded Prompt
                  </>
                )}
              </button>

              {isSavingHistory && (
                <div className={`mt-3 flex items-center gap-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <div className={`w-4 h-4 border-2 border-t-cyan-500 rounded-full animate-spin ${darkMode ? 'border-slate-600' : 'border-slate-200'}`} />
                  Saving to history...
                </div>
              )}

              {errorMsg && (
                <div className={`p-4 rounded-lg text-sm border flex items-center gap-2 ${darkMode ? 'bg-red-900/30 text-red-400 border-red-800' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  <AlertCircle className="w-4 h-4" />
                  {errorMsg}
                </div>
              )}

              {/* Advanced Settings */}
              <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`w-full flex items-center justify-between p-4 transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-50 hover:bg-slate-100'}`}
                >
                  <div className={`flex items-center gap-2 text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    <Settings2 className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    Advanced Configuration (optional)
                  </div>
                  {showAdvanced ? <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} /> : <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />}
                </button>

                {showAdvanced && (
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Tone */}
                      <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tone</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setToneDropdownOpen(!toneDropdownOpen)}
                            onBlur={() => setTimeout(() => setToneDropdownOpen(false), 150)}
                            className={`w-full flex items-center gap-2 border text-sm py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                          >
                            {(() => {
                              const currentTone = TONES.find(t => t.id === selectedTone);
                              const Icon = currentTone?.icon;
                              return (
                                <>
                                  {Icon && <Icon className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />}
                                  <span className="flex-1 text-left">{currentTone?.label}</span>
                                </>
                              );
                            })()}
                            <ChevronDown className={`w-4 h-4 transition-transform ${toneDropdownOpen ? 'rotate-180' : ''} ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                          </button>
                          {toneDropdownOpen && (
                            <div className={`absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border shadow-lg overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                              {TONES.map(t => {
                                const Icon = t.icon;
                                const isSelected = t.id === selectedTone;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedTone(t.id);
                                      setToneDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                                      isSelected 
                                        ? darkMode ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-50 text-cyan-700' 
                                        : darkMode 
                                          ? 'text-slate-200 hover:bg-cyan-900/30' 
                                          : 'text-slate-700 hover:bg-cyan-50'
                                    }`}
                                  >
                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-600' : darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                                    {t.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Style */}
                      <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Style</label>
                        <div className="relative">
                          <select
                            value={selectedStyle}
                            onChange={(e) => setSelectedStyle(e.target.value)}
                            className={`w-full appearance-none border text-sm py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                          >
                            {STYLES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                          <ChevronDown className={`absolute right-3 top-3 w-4 h-4 pointer-events-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        </div>
                      </div>
                      {/* Format */}
                      <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Format</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setFormatDropdownOpen(!formatDropdownOpen)}
                            onBlur={() => setTimeout(() => setFormatDropdownOpen(false), 150)}
                            className={`w-full flex items-center gap-2 border text-sm py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                          >
                            {(() => {
                              const currentFormat = FORMATS.find(f => f.id === selectedFormat);
                              const Icon = currentFormat?.icon;
                              return (
                                <>
                                  {Icon && <Icon className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />}
                                  <span className="flex-1 text-left">{currentFormat?.label}</span>
                                </>
                              );
                            })()}
                            <ChevronDown className={`w-4 h-4 transition-transform ${formatDropdownOpen ? 'rotate-180' : ''} ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                          </button>
                          {formatDropdownOpen && (
                            <div className={`absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border shadow-lg overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                              {FORMATS.map(f => {
                                const Icon = f.icon;
                                const isSelected = f.id === selectedFormat;
                                return (
                                  <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedFormat(f.id);
                                      setFormatDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
                                      isSelected 
                                        ? darkMode ? 'bg-cyan-900/50 text-cyan-300' : 'bg-cyan-50 text-cyan-700' 
                                        : darkMode 
                                          ? 'text-slate-200 hover:bg-cyan-900/30' 
                                          : 'text-slate-700 hover:bg-cyan-50'
                                    }`}
                                  >
                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-600' : darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                                    {f.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Context & Constraints */}
                    <div className="space-y-2">
                      <label className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Context & Constraints</label>
                      <textarea
                        value={contextConstraints}
                        onChange={(e) => setContextConstraints(e.target.value)}
                        placeholder="Business context, technical limitations, compliance requirements, budget/timeline constraints..."
                        className={`w-full h-16 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none resize-none ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <label className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Additional Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Audience details, links, references..."
                        className={`w-full h-16 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none resize-none ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                      />
                    </div>

                    {/* Detail - Horizontal Radio Buttons */}
                    <div className="space-y-2">
                      <label className={`text-xs font-bold uppercase tracking-wide ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Detail</label>
                      <div className="flex flex-wrap gap-2">
                        {LENGTHS.map(length => {
                          const isSelected = length.id === selectedLength;
                          return (
                            <label
                              key={length.id}
                              className={`flex-1 min-w-[100px] cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-all text-center ${
                                isSelected
                                  ? darkMode
                                    ? 'border-cyan-500 bg-cyan-900/50 text-cyan-300'
                                    : 'border-cyan-500 bg-cyan-50 text-cyan-700'
                                  : darkMode
                                    ? 'border-slate-600 bg-slate-700 text-slate-200 hover:border-slate-500'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="detail"
                                value={length.id}
                                checked={isSelected}
                                onChange={() => setSelectedLength(length.id)}
                                className="sr-only"
                              />
                              {length.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className={`space-y-4 pt-2 border-t ${darkMode ? 'border-slate-600' : 'border-slate-100'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Allow [Illustrative] placeholders</span>
                        <button
                          onClick={() => setAllowPlaceholders(!allowPlaceholders)}
                          className={`w-11 h-6 rounded-full relative transition-colors ${allowPlaceholders ? 'bg-cyan-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${allowPlaceholders ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Strip meta-commentary</span>
                        <button
                          onClick={() => !FORMATS.find(f => f.id === selectedFormat)?.isSafeJson && setStripMeta(!stripMeta)}
                          disabled={FORMATS.find(f => f.id === selectedFormat)?.isSafeJson}
                          className={`w-11 h-6 rounded-full relative transition-colors ${stripMeta ? 'bg-cyan-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300'} ${FORMATS.find(f => f.id === selectedFormat)?.isSafeJson ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${stripMeta ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Emphasize aesthetics</span>
                        <button
                          onClick={() => setAestheticMode(!aestheticMode)}
                          className={`w-11 h-6 rounded-full relative transition-colors ${aestheticMode ? 'bg-cyan-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${aestheticMode ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>AI Quality Assessment</span>
                          <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Uses extra API call</span>
                        </div>
                        <button
                          onClick={() => setEnableQualityAssessment(!enableQualityAssessment)}
                          className={`w-11 h-6 rounded-full relative transition-colors ${enableQualityAssessment ? 'bg-cyan-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${enableQualityAssessment ? 'left-6' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded Prompt Result - Inline Display */}
              {generatedResult && (
                <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  {/* Header */}
                  <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Expanded Prompt</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Copy Button */}
                      <button
                        onClick={handleCopy}
                        className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                        title="Copy to clipboard"
                      >
                        <CopyIcon className="w-4 h-4" />
                      </button>
                      {/* Download Button */}
                      <button
                        onClick={() => {
                          const blob = new Blob([generatedResult], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'expanded-prompt.md';
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className={`p-2 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                        title="Download as markdown file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      {/* ChatGPT Button - Uses ?q= parameter to prefill prompt */}
                      <a
                        href={`https://chat.openai.com/?q=${encodeURIComponent(generatedResult)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${darkMode ? 'text-slate-300 bg-slate-700 hover:bg-slate-600' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'}`}
                        title="Opens ChatGPT with prompt pre-filled"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
                        </svg>
                        ChatGPT
                      </a>
                      {/* Claude Button - Uses ?q= parameter to prefill prompt */}
                      <a
                        href={`https://claude.ai/new?q=${encodeURIComponent(generatedResult)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${darkMode ? 'text-slate-300 bg-slate-700 hover:bg-slate-600' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'}`}
                        title="Opens Claude with prompt pre-filled"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M4.709 15.955l4.72-2.647.08-.08 2.109-3.94 1.079 1.953-1.327 2.477-.039.04-4.254 4.409c-.956.99-2.634.263-2.634-1.14v-.462c0-.229.096-.448.266-.61zm8.837-5.092l3.785-7.082c.593-1.11 2.217-1.11 2.81 0l3.603 6.74a1.652 1.652 0 01-1.456 2.45h-1.867l-5.796.002-1.08-2.11zm-4.14 7.748l3.248-3.369h8.292c.78 0 1.249.862.819 1.51l-2.381 3.586c-.298.45-.805.72-1.349.72H10.97c-.95 0-1.82-.535-2.246-1.383l-.637-1.174.32.11zM.81 9.885a1.652 1.652 0 01-.019-1.648L3.86 2.604c.593-1.11 2.217-1.11 2.81 0L9.19 7.01l-1.078 1.979L5.066 3.69 2.39 8.69l3.782 6.954-.003.003-.32-.11-1.08.562-3.96-6.214z" />
                        </svg>
                        Claude
                      </a>
                      {/* Gemini Button - Uses ?prompt= parameter to prefill prompt */}
                      <a
                        href={`https://gemini.google.com/app?prompt=${encodeURIComponent(generatedResult)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${darkMode ? 'text-slate-300 bg-slate-700 hover:bg-slate-600' : 'text-slate-700 bg-slate-100 hover:bg-slate-200'}`}
                        title="Opens Gemini with prompt pre-filled"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C9.284 3.478 5.522 5.463 0 5.463v2.182C5.522 7.645 9.284 9.63 12 13.108c2.716-3.478 6.478-5.463 12-5.463V5.463C18.478 5.463 14.716 3.478 12 0zm0 10.892C9.284 14.37 5.522 16.355 0 16.355v2.182C5.522 18.537 9.284 20.522 12 24c2.716-3.478 6.478-5.463 12-5.463v-2.182c-5.522 0-9.284-1.985-12-5.463z" />
                        </svg>
                        Gemini
                      </a>
                    </div>
                  </div>

                  {/* Prompt Content */}
                  <div className={`p-6 ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    {/* Version Info Bar */}
                    {promptVersions.length > 0 && (
                      <div className="flex items-center justify-between mb-3 px-2">
                        <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <RefreshCw className="w-4 h-4 text-indigo-500" />
                          <span>
                            Version {promptVersions.length + 1} 
                            <span className={`ml-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              (improved {promptVersions.length} time{promptVersions.length > 1 ? 's' : ''})
                            </span>
                          </span>
                        </div>
                        <button
                          onClick={handleUndoImprove}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${darkMode ? 'text-slate-300 bg-slate-700 border border-slate-600 hover:bg-slate-600' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'}`}
                          title="Revert to previous version"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          Undo
                        </button>
                      </div>
                    )}
                    <div className={`rounded-lg border p-5 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <pre className={`whitespace-pre-wrap font-mono text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {generatedResult}
                      </pre>
                    </div>
                  </div>

                  {/* Iterate & Refine Section */}
                  <div className="px-6 pb-6">
                    <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <div className={`px-4 py-3 border-b ${darkMode ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          <RefreshCw className={`w-4 h-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                          <span className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            Iterate & Refine Your Prompt
                          </span>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <textarea
                          value={refinementInstructions}
                          onChange={(e) => setRefinementInstructions(e.target.value)}
                          placeholder="Enter your refinement instructions... e.g., 'Make it more concise', 'Add a section about error handling', 'Change the tone to be more formal'"
                          className={`w-full px-3 py-2 rounded-lg border text-sm resize-none transition-colors ${
                            darkMode 
                              ? 'bg-slate-900 border-slate-600 text-slate-200 placeholder-slate-500 focus:border-cyan-500' 
                              : 'bg-white border-slate-300 text-slate-700 placeholder-slate-400 focus:border-cyan-500'
                          } focus:outline-none focus:ring-1 focus:ring-cyan-500`}
                          rows={3}
                        />
                        <div className="flex items-center justify-between">
                          <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Describe how you'd like to modify the expanded prompt
                          </p>
                          <button
                            onClick={handleRefinePrompt}
                            disabled={isRefining || !refinementInstructions.trim()}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              isRefining || !refinementInstructions.trim()
                                ? darkMode ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 shadow-sm hover:shadow'
                            }`}
                          >
                            {isRefining ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Refining...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4" />
                                Refine Prompt
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* HIDDEN - Quality Feedback - pending removal in future release */}
                  {false && qualityResult && (
                    <div className="px-6 pb-6">
                      <QualityFeedback 
                        quality={qualityResult} 
                        onImprove={qualityResult.improvements?.length > 0 ? handleAutoImprove : undefined}
                        isImproving={isImproving}
                        darkMode={darkMode}
                      />
                      {/* Distinctiveness warning after improvements */}
                      {promptVersions.length > 0 && promptVersions.length < MAX_IMPROVE_ITERATIONS && (
                        <p className={`mt-2 text-xs flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          <AlertCircle className="w-3 h-3" />
                          Note: Further improvements may reduce the prompt's distinctiveness.
                        </p>
                      )}
                      {/* Iteration limit warning */}
                      {promptVersions.length >= MAX_IMPROVE_ITERATIONS && qualityResult.improvements?.length > 0 && (
                        <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Maximum improvement iterations reached. Generate a new prompt to continue.
                        </p>
                      )}
                    </div>
                  )}

                  {/* HIDDEN - Reasoning Panel (Why these Settings) - pending removal in future release */}
                  {false && reasoning && Object.keys(reasoning).length > 0 && (
                    <div className="px-6 pb-6">
                      <ReasoningPanel
                        reasoning={reasoning}
                        inferredSettings={{
                          tone: selectedTone,
                          format: selectedFormat,
                          length: selectedLength,
                        }}
                        darkMode={darkMode}
                      />
                    </div>
                  )}

                  {/* Feedback Button */}
                  <div className="px-6 pb-6 flex justify-end">
                    <button
                      onClick={() => setShowOutcomeFeedback(true)}
                      className={`text-sm flex items-center gap-1 ${darkMode ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}
                    >
                      How did this work for you?
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* Sidebar - History (only shown in Builder mode) */}
      {appMode !== 'experiment' && (
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-[335px]'} border-l flex flex-col hidden md:flex z-10 shadow-sm transition-all duration-300 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-200'}`}>
          <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
            {!sidebarCollapsed && (
              <div className={`flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <History className="w-4 h-4" />
                <h2 className="font-bold text-sm">Prompt History</h2>
              </div>
            )}
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'w-full justify-center' : ''}`}>
              {!sidebarCollapsed && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${darkMode ? 'text-slate-400 bg-slate-700' : 'text-slate-400 bg-slate-100'}`}>
                  {promptHistory.length}
                </span>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <PanelRight className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                ) : (
                  <PanelRightClose className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                )}
              </button>
            </div>
          </div>

          {!sidebarCollapsed && (
            <>
              {/* Search Bar */}
              <div className={`p-3 border-b ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <div className="relative">
                  <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    placeholder="Search prompts..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className={`w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${darkMode ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isHistoryLoading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
              </div>
            ) : promptHistory.length === 0 ? (
              <div className={`text-center mt-10 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No history yet.</div>
            ) : (
              promptHistory
                .filter(item => {
                  if (!historySearchQuery) return true;
                  const query = historySearchQuery.toLowerCase();

                  // Check current version
                  const currentMatch = (
                    item.originalText?.toLowerCase().includes(query) ||
                    item.outputType?.toLowerCase().includes(query) ||
                    item.tone?.toLowerCase().includes(query) ||
                    item.format?.toLowerCase().includes(query)
                  );
                  if (currentMatch) return true;

                  // Check history versions
                  if (item.versions && item.versions.length > 0) {
                    return item.versions.some(v => (
                      v.originalText?.toLowerCase().includes(query) ||
                      v.outputType?.toLowerCase().includes(query) ||
                      v.tone?.toLowerCase().includes(query) ||
                      v.format?.toLowerCase().includes(query)
                    ));
                  }

                  return false;
                })
                .map((item) => {
                  // Calculate match details for display
                  let matchBadge = null;
                  if (historySearchQuery) {
                    const query = historySearchQuery.toLowerCase();
                    const currentMatch = (
                      item.originalText?.toLowerCase().includes(query) ||
                      item.outputType?.toLowerCase().includes(query) ||
                      item.tone?.toLowerCase().includes(query) ||
                      item.format?.toLowerCase().includes(query)
                    );

                    if (!currentMatch && item.versions) {
                      const matchingVer = [...item.versions].reverse().find(v => (
                        v.originalText?.toLowerCase().includes(query) ||
                        v.outputType?.toLowerCase().includes(query) ||
                        v.tone?.toLowerCase().includes(query) ||
                        v.format?.toLowerCase().includes(query)
                      ));

                      if (matchingVer) {
                        // Find the index to calculate version number
                        const verIndex = item.versions.indexOf(matchingVer);
                        const verNum = verIndex + 1; // 1-based index
                        matchBadge = (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium border border-amber-200">
                            Found in v{verNum}
                          </span>
                        );
                      }
                    }
                  }

                  return (
                    <div key={item.id} className={`group p-3 rounded-lg border transition-all cursor-pointer relative ${item.isPrivate ? (darkMode ? 'bg-slate-700 border-slate-600 opacity-75' : 'bg-slate-50 border-slate-100 opacity-75') : (darkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-slate-500' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200')}`}>
                      <div onClick={() => loadFromHistory(item)}>
                        <div className={`font-medium text-sm truncate pr-16 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.originalText || "Untitled Prompt"}</div>

                        {/* Metadata Tags */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${darkMode ? 'text-slate-400 bg-slate-600' : 'text-slate-500 bg-slate-100'}`}>{item.outputType}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${darkMode ? 'text-slate-400 bg-slate-600' : 'text-slate-500 bg-slate-100'}`}>{item.format}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${darkMode ? 'text-slate-400 bg-slate-600' : 'text-slate-500 bg-slate-100'}`}>{item.length}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${darkMode ? 'text-slate-400 bg-slate-600' : 'text-slate-500 bg-slate-100'}`}>{item.tone}</span>
                          {matchBadge}
                        </div>

                        {/* Date & Version */}
                        <div className={`text-[10px] mt-2 flex items-center gap-1.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          <span>
                            {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Just now'}
                            {item.createdAt?.seconds && `, ${new Date(item.createdAt.seconds * 1000).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
                          </span>
                          <span>•</span>
                          <span>•</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVersionHistoryId(activeVersionHistoryId === item.id ? null : item.id);
                            }}
                            className="hover:text-indigo-600 hover:underline cursor-pointer transition-colors"
                          >
                            {item.version || 1} version{item.version !== 1 ? 's' : ''}
                          </button>
                          {item.isReversePrompted && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 flex items-center gap-0.5" title="Reverse Prompting Used">
                                <Sparkles className="w-2.5 h-2.5" />
                                <span className="font-bold">RP</span>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Version History Popover */}
                        {activeVersionHistoryId === item.id && Array.isArray(item.versions) && item.versions.length > 0 && (
                          <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg shadow-xl border z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}>
                            <div className={`px-3 py-2 border-b flex justify-between items-center ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-100'}`}>
                              <span className={`text-xs font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Version History</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setActiveVersionHistoryId(null); }}
                                className={darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              {[...item.versions].reverse().map((ver, idx) => {
                                const verNum = item.versions.length - idx;
                                const dateStr = formatVersionDate(ver);

                                return (
                                  <div
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      loadFromHistory(item, ver);
                                      setActiveVersionHistoryId(null);
                                    }}
                                    className={`px-3 py-2 cursor-pointer border-b last:border-0 flex items-center justify-between group/ver ${darkMode ? 'hover:bg-slate-700 border-slate-700' : 'hover:bg-slate-50 border-slate-50'}`}
                                  >
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`text-xs font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>v{verNum}</span>
                                        <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                          {dateStr}
                                        </span>
                                      </div>
                                      <div className="flex gap-1 mt-0.5">
                                        <span className={`text-[9px] px-1 rounded ${darkMode ? 'bg-slate-600 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{ver.tone}</span>
                                        <span className={`text-[9px] px-1 rounded ${darkMode ? 'bg-slate-600 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{ver.format}</span>
                                      </div>
                                    </div>
                                    <div className="opacity-0 group-hover/ver:opacity-100 text-indigo-600 text-[10px] font-medium">
                                      Load
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className={`absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm rounded-lg p-0.5 ${darkMode ? 'bg-slate-700/80' : 'bg-white/80'}`}>
                        <button
                          onClick={(e) => handleTogglePrivate(e, item)}
                          className={`p-1 rounded ${item.isPrivate ? 'text-indigo-500' : darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                          title="Private"
                        >
                          {item.isPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => handleDeleteHistory(e, item.id)}
                          className={`p-1 rounded transition-colors ${darkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
            )}
              </div>
              <div className={`p-4 border-t flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <div className="text-xs text-slate-400">
                  Signed in as: {user?.displayName || user?.email || 'User'}
                </div>
                <button
                  onClick={() => setShowSettings(true)}
                  className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                  title="Settings"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sidebar - Experiment History (only shown in Experiment mode) */}
      {appMode === 'experiment' && experimentHistory && (
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-[335px]'} ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-200'} border-l flex flex-col hidden md:flex z-10 shadow-sm transition-all duration-300`}>
          <div className={`p-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
            {!sidebarCollapsed && (
              <div className={`flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <History className="w-4 h-4" />
                <h2 className="font-bold text-sm">Experiment History</h2>
              </div>
            )}
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'w-full justify-center' : ''}`}>
              {!sidebarCollapsed && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${darkMode ? 'text-slate-400 bg-slate-700' : 'text-slate-400 bg-slate-100'}`}>
                  {experimentHistory.experiments?.length || 0}
                </span>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`p-1 rounded transition-colors ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <PanelRight className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                ) : (
                  <PanelRightClose className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                )}
              </button>
            </div>
          </div>

          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {experimentHistory.loadingHistory ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
              </div>
            ) : experimentHistory.experiments?.length === 0 ? (
              <div className="text-center text-slate-400 mt-10 text-sm">No experiments yet.</div>
            ) : (
              experimentHistory.experiments?.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => experimentHistory.handleLoadExperiment(exp.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all group ${experimentHistory.currentExperimentId === exp.id
                    ? darkMode ? 'bg-cyan-900/30 border-cyan-700' : 'bg-cyan-50 border-cyan-200'
                    : darkMode ? 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-slate-500' : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {exp.originalPrompt?.substring(0, 40) || 'Untitled'}
                        {exp.originalPrompt?.length > 40 ? '...' : ''}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span>{exp.totalCells || 0} cells</span>
                        <span>•</span>
                        <span className={
                          exp.status === 'complete' ? 'text-green-500' :
                            exp.status === 'running' ? 'text-cyan-500' :
                              exp.status === 'failed' ? 'text-red-500' : ''
                        }>
                          {exp.status || 'unknown'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {exp.createdAt?.seconds
                          ? new Date(exp.createdAt.seconds * 1000).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })
                          : 'Just now'}
                      </div>
                    </div>
                    <button
                      onClick={(e) => experimentHistory.handleDeleteExperiment(exp.id, e)}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete experiment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        darkMode={darkMode}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        chatgptApiKey={chatgptApiKey}
        setChatgptApiKey={setChatgptApiKey}
        claudeApiKey={claudeApiKey}
        setClaudeApiKey={setClaudeApiKey}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={setGeminiApiKey}
        selectedOpenAIModel={selectedOpenAIModel}
        setSelectedOpenAIModel={setSelectedOpenAIModel}
        selectedClaudeModel={selectedClaudeModel}
        setSelectedClaudeModel={setSelectedClaudeModel}
        selectedGeminiModel={selectedGeminiModel}
        setSelectedGeminiModel={setSelectedGeminiModel}
      />

      {/* Outcome Feedback Modal */}
      {showOutcomeFeedback && generatedResult && (
        <OutcomeFeedback
          promptId={lastGeneratedPromptId}
          spec={promptSpec}
          onSubmit={handleOutcomeSubmit}
          onDismiss={() => setShowOutcomeFeedback(false)}
          isOpen={showOutcomeFeedback}
          darkMode={darkMode}
        />
      )}

    </div>
  );
}