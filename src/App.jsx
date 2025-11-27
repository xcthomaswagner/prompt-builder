import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  History,
  Settings2,
  FileText,
  Layout,
  Code,
  MessageSquare,
  Database,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Zap,
  EyeOff,
  X,
  Search,
  Beaker,
  Lightbulb
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { getAuth, signInWithPopup, GoogleAuthProvider, OAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import buildPromptPlan from './lib/promptAssembler';
import PROMPT_SPECS from './lib/promptSpecs';
import ExperimentMode from './components/ExperimentMode';

// New Evolution Components
import TypeSpecificForm from './components/TypeSpecificForms/index.jsx';
import QualityFeedback from './components/QualityFeedback.jsx';
import ReasoningPanel from './components/ReasoningPanel.jsx';
import TemplateSelector, { CompactTemplateSelector } from './components/TemplateSelector.jsx';
import OutcomeFeedback from './components/OutcomeFeedback.jsx';

// New Evolution Modules
import { runPipeline } from './lib/pipeline/index.js';
import { createSpec, mergeSpec } from './lib/promptSpecs/index.js';
import { quickQualityCheck } from './lib/quality/index.js';
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

// --- Token Estimation Function ---
// Simple token estimation: ~4 characters per token on average for English text
// This is a rough approximation similar to GPT tokenization
const estimateTokens = (text) => {
  if (!text) return 0;
  // More accurate estimation: split by whitespace and punctuation
  const words = text.trim().split(/\s+/);
  const tokens = words.reduce((count, word) => {
    // Average: 1 word ≈ 1.3 tokens (accounting for punctuation and subword tokens)
    return count + Math.ceil(word.length / 4);
  }, 0);
  return tokens;
};

// --- Gemini API Configuration ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const openAiEnvKey = import.meta.env.VITE_OPENAI_API_KEY;

const callGemini = async (prompt, systemInstruction, apiKey) => {
  if (!apiKey) throw new Error("Gemini API Key is missing");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        required: ["analysis", "reverse_prompting", "final_output"],
        properties: {
          analysis: {
            type: "OBJECT",
            required: ["detected_domain", "input_quality_score", "is_vague_or_short"],
            properties: {
              detected_domain: { type: "STRING" },
              input_quality_score: { type: "INTEGER" }, // 1-10
              is_vague_or_short: { type: "BOOLEAN" }
            }
          },
          reverse_prompting: {
            type: "OBJECT",
            required: ["was_triggered", "refined_task_text", "reasoning"],
            properties: {
              was_triggered: { type: "BOOLEAN" },
              refined_task_text: { type: "STRING" },
              reasoning: { type: "STRING" }
            }
          },
          final_output: {
            type: "OBJECT",
            required: ["expanded_prompt_text", "enrichment_attributes_used"],
            properties: {
              expanded_prompt_text: { type: "STRING" }, // The big cohesive text
              enrichment_attributes_used: { type: "ARRAY", items: { type: "STRING" } }
            }
          }
        }
      }
    }
  };

  let attempts = 0;
  const delays = [1000, 2000, 4000, 8000, 16000];

  while (attempts <= 5) {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);

        // Handle specific error codes
        if (response.status === 503) {
          throw new Error("Gemini API is temporarily unavailable (503). Please try again in a few moments.");
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment and try again.");
        } else if (response.status === 400) {
          throw new Error("Invalid request to Gemini API. Please check your input.");
        }

        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data);

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("No response text from API");
      }

      return JSON.parse(text);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error("Request timed out after 30 seconds. Please try again.");
      }

      // For 503 errors, don't retry as much
      if (error.message?.includes("503") || error.message?.includes("unavailable")) {
        attempts++;
        if (attempts > 2) throw error; // Only retry twice for 503
        console.log(`API unavailable, retry attempt ${attempts} after error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delays[attempts - 1]));
        continue;
      }

      attempts++;
      if (attempts > 5) throw error;
      console.log(`Retry attempt ${attempts} after error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delays[attempts - 1]));
    }
  }
};

const callOpenAI = async (prompt, systemInstruction, apiKey) => {
  if (!apiKey) throw new Error("OpenAI API Key is missing");

  const url = "https://api.openai.com/v1/chat/completions";

  const payload = {
    model: "gpt-5.1",
    messages: [
      { role: "system", content: systemInstruction + "\n\nIMPORTANT: You must return valid JSON only." },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    return JSON.parse(text);
  } catch (error) {
    console.error("OpenAI Call Failed:", error);
    throw error;
  }
};

const callAnthropic = async (prompt, systemInstruction, apiKey) => {
  if (!apiKey) throw new Error("Claude API Key is missing");

  // Note: Calling Anthropic directly from browser requires a proxy or dangerously-allow-browser header
  // For this local app, we'll use the header, but in production this should go through a backend
  const url = "https://api.anthropic.com/v1/messages";

  const payload = {
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4096,
    system: systemInstruction + "\n\nIMPORTANT: You must return valid JSON only.",
    messages: [
      { role: "user", content: prompt }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Anthropic API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.content[0].text;
    return JSON.parse(text);
  } catch (error) {
    console.error("Anthropic Call Failed:", error);
    throw error;
  }
};

const extractExpandedPrompt = (response) => {
  if (!response) return '';
  if (typeof response === 'string') {
    return response.trim();
  }

  const readPath = (obj, path) => {
    let current = obj;
    for (const segment of path) {
      if (current == null) return '';
      current = current[segment];
    }
    if (typeof current === 'string') {
      return current.trim();
    }
    if (current && typeof current === 'object') {
      try {
        return JSON.stringify(current);
      } catch (err) {
        return '';
      }
    }
    return '';
  };

  const candidatePaths = [
    ['final_output', 'expanded_prompt_text'],
    ['final_output', 'expandedPromptText'],
    ['final_output', 'expanded_prompt', 'text'],
    ['final_output', 'expandedPrompt', 'text'],
    ['final_output', 'expanded_prompt'],
    ['final_output', 'expandedPrompt'],
    ['final_output', 'text'],
    ['final_output', 'prompt'],
    ['expanded_prompt_text'],
    ['expandedPromptText'],
    ['expanded_prompt'],
    ['expandedPrompt'],
    ['finalPrompt'],
    ['final_prompt_text'],
    ['final_prompt']
  ];

  for (const path of candidatePaths) {
    const value = readPath(response, path);
    if (value) return value;
  }

  const finalOutput = response.final_output;
  if (typeof finalOutput === 'string') {
    return finalOutput.trim();
  }

  if (finalOutput && typeof finalOutput === 'object') {
    try {
      const serialized = JSON.stringify(finalOutput);
      if (serialized) return serialized;
    } catch (err) {
      console.warn('Failed to stringify final_output', err);
    }
  }

  try {
    const serialized = JSON.stringify(response);
    return serialized || '';
  } catch (err) {
    console.warn('Failed to stringify AI response', err);
    return '';
  }
};

// --- Lookup Data ---

const TONES = [
  { id: 'professional', label: 'Professional', prompt: 'formal, objective, and expert' },
  { id: 'creative', label: 'Creative', prompt: 'imaginative, evocative, and storytelling' },
  { id: 'academic', label: 'Academic', prompt: 'rigorous, citation-focused, and analytical' },
  { id: 'casual', label: 'Casual', prompt: 'friendly, conversational, and accessible' },
  { id: 'instructive', label: 'Instructive', prompt: 'didactic, step-by-step teacher' }
];

const OUTPUT_TYPES = [
  { id: 'deck', label: 'Deck', icon: Layout, context: 'Slide Deck Outline (Titles, Visuals, Notes)' },
  { id: 'doc', label: 'Doc', icon: FileText, context: 'Comprehensive Written Document' },
  { id: 'data', label: 'Data', icon: Database, context: 'Structured Data / Tables' },
  { id: 'code', label: 'Code', icon: Code, context: 'Production-Ready Code' },
  { id: 'copy', label: 'Copy', icon: Copy, context: 'Marketing Copy / Creative Writing' },
  { id: 'comms', label: 'Comms', icon: MessageSquare, context: 'Email / Communication' },
  { id: 'json', label: 'JSON', icon: Code, context: 'Canonical Prompt Blueprint (JSON object)' }
];

const FORMATS = [
  { id: 'paragraph', label: 'Paragraph', prompt: 'Flowing, cohesive narrative' },
  { id: 'bullets', label: 'Bullet Points', prompt: 'Concise bulleted list' },
  { id: 'numbered', label: 'Numbered List', prompt: 'Sequential numbered list' },
  { id: 'steps', label: 'Step-by-Step', prompt: 'Clear, actionable steps' },
  { id: 'sections', label: 'Structured Sections', prompt: 'Clear, hierarchical sections with headings' },
  { id: 'json', label: 'JSON', prompt: 'Valid, parseable JSON object', isSafeJson: true },
  { id: 'email', label: 'Email', prompt: 'Professional email format' },
  { id: 'table', label: 'Table', prompt: 'Structured table with headers' },
  { id: 'qa', label: 'Q&A', prompt: 'Question and Answer session' }
];

const LENGTHS = [
  { id: 'short', label: 'Short', prompt: 'Concise and high-level' },
  { id: 'medium', label: 'Medium', prompt: 'Balanced detail' },
  { id: 'long', label: 'Long', prompt: 'Exhaustive and detailed' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [promptHistory, setPromptHistory] = useState([]);

  // Form State
  const [inputText, setInputText] = useState('');
  const [selectedOutputType, setSelectedOutputType] = useState('doc');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [selectedLength, setSelectedLength] = useState('medium');
  const [selectedFormat, setSelectedFormat] = useState('paragraph');
  const [notes, setNotes] = useState('');

  // Toggles
  const [allowPlaceholders, setAllowPlaceholders] = useState(false);
  const [stripMeta, setStripMeta] = useState(true);
  const [aestheticMode, setAestheticMode] = useState(false);

  // UI State
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [reversePromptTriggered, setReversePromptTriggered] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [currentHistoryId, setCurrentHistoryId] = useState(null);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [activeVersionHistoryId, setActiveVersionHistoryId] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const generationRunRef = useRef(0);

  // Mode toggle: 'builder' or 'experiment'
  const [appMode, setAppMode] = useState('builder');

  // Experiment history state (lifted from ExperimentMode for sidebar rendering)
  const [experimentHistory, setExperimentHistory] = useState(null);

  // Evolution Features State
  const [promptSpec, setPromptSpec] = useState(null);
  const [qualityResult, setQualityResult] = useState(null);
  const [reasoning, setReasoning] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showOutcomeFeedback, setShowOutcomeFeedback] = useState(false);
  const [lastGeneratedPromptId, setLastGeneratedPromptId] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  // Helper: Generate a hash signature for the prompt (first 60 chars)
  const generateSignature = (text) => {
    const prefix = text.trim().substring(0, 60).toLowerCase();
    let hash = 0;
    for (let i = 0; i < prefix.length; i++) {
      const char = prefix.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  };

  // Settings State
  const [selectedProvider, setSelectedProvider] = useState(localStorage.getItem('selectedProvider') || 'gemini');
  const [chatgptApiKey, setChatgptApiKey] = useState(() => {
    const stored = localStorage.getItem('chatgptApiKey');
    if (stored && !stored.startsWith('VITE_')) {
      return stored;
    }
    return openAiEnvKey || stored || '';
  });
  const [claudeApiKey, setClaudeApiKey] = useState(localStorage.getItem('claudeApiKey') || '');
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('geminiApiKey') || apiKey || '');

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('selectedProvider', selectedProvider);
    localStorage.setItem('chatgptApiKey', chatgptApiKey);
    localStorage.setItem('claudeApiKey', claudeApiKey);
    localStorage.setItem('geminiApiKey', geminiApiKey);
  }, [selectedProvider, chatgptApiKey, claudeApiKey, geminiApiKey]);

  // --- History Functions ---
  const handleDeleteHistory = async (e, itemId) => {
    e.stopPropagation();
    if (!db || !user) return;
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'prompt_history', itemId));
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  const handleTogglePrivate = async (e, item) => {
    e.stopPropagation();
    if (!db || !user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'prompt_history', item.id), {
        isPrivate: !item.isPrivate
      });
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  // --- Auth & Data Loading ---
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- Auth Functions ---
  const handleGoogleSignIn = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setErrorMsg("Failed to sign in with Google. Please try again.");
    }
  };

  const handleMicrosoftSignIn = async () => {
    if (!auth) return;
    const provider = new OAuthProvider('microsoft.com');
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Microsoft sign-in failed:", error);
      setErrorMsg("Failed to sign in with Microsoft. Please try again.");
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-out failed:", error);
    }
  };

  useEffect(() => {
    if (!user || !db) return;
    setIsHistoryLoading(true);
    console.log("Setting up history listener for user:", user.uid);

    // REMOVED orderBy to avoid index issues. Sorting client-side instead.
    const q = query(
      collection(db, 'users', user.uid, 'prompt_history')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("History snapshot received. Size:", snapshot.size);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side sort (Newest first)
      items.sort((a, b) => {
        // Handle Firestore Timestamps, strings, or nulls (pending writes)
        const getMillis = (item) => {
          if (!item.createdAt) return Date.now(); // Pending write = now
          if (item.createdAt.toMillis) return item.createdAt.toMillis();
          if (item.createdAt.seconds) return item.createdAt.seconds * 1000;
          return new Date(item.createdAt).getTime();
        };
        return getMillis(b) - getMillis(a);
      });

      console.log("History items sorted:", items.length);
      setPromptHistory(items);
      setIsHistoryLoading(false);
    }, (error) => {
      console.error("Error fetching history:", error);
      setIsHistoryLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Hybrid Logic Rules (Reactive) ---
  useEffect(() => {
    const fmt = FORMATS.find(f => f.id === selectedFormat);
    if (fmt?.isSafeJson) {
      setStripMeta(true);
    }
  }, [selectedFormat]);

  // --- Core Logic: Prompt Construction ---
  const handleGenerate = async () => {
    const requestState = {
      originalText: inputText,
      outputType: selectedOutputType,
      tone: selectedTone,
      format: selectedFormat,
      length: selectedLength
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

    let finalPromptText = '';
    let isReverse = false;
    let generationFailed = false;

    try {
      const toneObj = TONES.find(t => t.id === selectedTone);
      const typeObj = OUTPUT_TYPES.find(t => t.id === selectedOutputType);
      const formatObj = FORMATS.find(f => f.id === selectedFormat);
      const lengthObj = LENGTHS.find(t => t.id === selectedLength);

      // Use the new assembler for ALL types
      const plan = buildPromptPlan({
        specId: selectedOutputType,
        userInput: inputText,
        tone: toneObj,
        outputType: typeObj,
        format: formatObj,
        length: lengthObj,
        notes,
        toggles: {
          allowPlaceholders,
          stripMeta,
          aestheticMode
        }
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
      if (selectedProvider === 'chatgpt') {
        if (!chatgptApiKey) throw new Error("OpenAI GPT-5.1 API Key is missing. Please add it in Settings.");
        aiData = await callOpenAI(userPromptForModel, systemPrompt, chatgptApiKey);
      } else if (selectedProvider === 'claude') {
        if (!claudeApiKey) throw new Error("Claude API Key is missing. Please add it in Settings.");
        aiData = await callAnthropic(userPromptForModel, systemPrompt, claudeApiKey);
      } else {
        if (!geminiApiKey) throw new Error("Gemini API Key is missing. Please add it in Settings.");
        aiData = await callGemini(userPromptForModel, systemPrompt, geminiApiKey);
      }
      console.log("AI Data received:", aiData);

      isReverse = aiData.reverse_prompting?.was_triggered || false;
      finalPromptText = extractExpandedPrompt(aiData);

      if (!finalPromptText) {
        console.error("No final prompt text in response:", aiData);
        throw new Error("Failed to generate expanded prompt text.");
      }

      console.log("Setting result...");
      setReversePromptTriggered(isReverse);
      setGeneratedResult(finalPromptText);
      console.log("Result set successfully");

      // Run quick quality check
      const currentSpec = promptSpec || createSpec(selectedOutputType);
      const qualityCheck = quickQualityCheck(finalPromptText, currentSpec);
      setQualityResult(qualityCheck);

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
      console.log("Setting isGenerating to false");
      setIsGenerating(false);
      console.log("isGenerating set to false");
    }

    if (generationFailed || !finalPromptText) {
      console.log("Save skipped: Generation failed or no prompt text");
      setIsSavingHistory(false);
      return;
    }

    if (!user) {
      console.log("Save skipped: No user logged in");
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
    console.log("Attempting to save task...", { signature, user: user.uid });

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
          createdAt: new Date().toISOString(),
          isReversePrompted: isReverse,
          signature
        };

        if (existingItem) {
          console.log("Updating existing prompt version:", existingItem.id);
          const docRef = doc(db, 'users', user.uid, 'prompt_history', existingItem.id);
          await updateDoc(docRef, {
            ...newVersionData,
            createdAt: serverTimestamp(),
            version: (existingItem.version || 1) + 1,
            versions: arrayUnion(newVersionData),
            signature
          });
          console.log("Update successful");
          return existingItem.id;
        } else {
          console.log("Creating new prompt history item");
          const collectionRef = collection(db, 'users', user.uid, 'prompt_history');
          const docRef = await addDoc(collectionRef, {
            ...newVersionData,
            createdAt: serverTimestamp(),
            isPrivate: false,
            version: 1,
            versions: [newVersionData],
            signature
          });
          console.log("Create successful, ID:", docRef.id);
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
        }
        console.log("Saved to history");
        setIsSavingHistory(false);
      })
      .catch((dbError) => {
        if (generationRunRef.current !== runId) {
          setIsSavingHistory(false);
          return;
        }
        console.error("Failed to save to history:", dbError);
        console.error("Error code:", dbError.code);
        console.error("Error message:", dbError.message);
        console.error("Full error:", JSON.stringify(dbError, null, 2));
        setIsSavingHistory(false);
      });
  };



  const loadFromHistory = (item, versionData = null) => {
    const data = versionData || item;
    setCurrentHistoryId(item.id); // Always keep the parent ID
    setInputText(data.originalText);
    setSelectedOutputType(data.outputType || 'doc');
    setSelectedTone(data.tone || 'professional');
    setSelectedFormat(data.format || 'paragraph');
    setSelectedLength(data.length || 'medium');
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
              <h1 className="font-bold text-3xl text-slate-800 mb-2">Intelligent Prompt Builder</h1>
              <p className="text-slate-600">Transform your ideas into powerful prompts</p>
            </div>

            {/* Sign-in Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Sign in to continue</h2>
              <p className="text-sm text-slate-500 mb-6 text-center">Choose your preferred authentication method</p>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {errorMsg}
                </div>
              )}

              <div className="space-y-3">
                {/* Google Sign-in */}
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md"
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
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow-md"
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

              <p className="text-xs text-slate-400 text-center mt-6">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-white font-bold shadow-cyan-200 shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-xl text-slate-800 tracking-tight">Intelligent Prompt Builder</h1>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setAppMode('builder')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  appMode === 'builder'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                Builder
              </button>
              <button
                onClick={() => setAppMode('experiment')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  appMode === 'experiment'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Beaker className="w-4 h-4" />
                Experiment
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-sm text-slate-500 hover:text-indigo-600 font-medium hidden md:block">Documentation</a>
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300">
                <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'default'}`} alt="avatar" />
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-700">{user?.displayName || 'User'}</div>
                <div className="text-xs text-slate-500">{user?.email || ''}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="text-xs text-slate-500 hover:text-red-600 font-medium px-2 py-1 hover:bg-red-50 rounded transition-colors"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Work Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
          {appMode === 'experiment' ? (
            <div className="max-w-6xl mx-auto pb-20">
              <ExperimentMode
                callLLM={async (userPrompt, systemPrompt) => {
                  // Use the currently selected provider
                  if (selectedProvider === 'chatgpt') {
                    if (!chatgptApiKey) throw new Error("OpenAI API Key is missing");
                    return callOpenAI(userPrompt, systemPrompt, chatgptApiKey);
                  } else if (selectedProvider === 'claude') {
                    if (!claudeApiKey) throw new Error("Claude API Key is missing");
                    return callAnthropic(userPrompt, systemPrompt, claudeApiKey);
                  } else {
                    if (!geminiApiKey) throw new Error("Gemini API Key is missing");
                    return callGemini(userPrompt, systemPrompt, geminiApiKey);
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
              />
            </div>
          ) : (
          <div className="max-w-6xl mx-auto space-y-6 pb-20">

            {/* Quick Start Templates Toggle */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  showTemplates
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <TemplateSelector
                  onSelect={handleTemplateSelect}
                  selectedId={selectedTemplate?.id}
                />
              </div>
            )}

            {/* Input Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                  className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1"
                >
                  {showSystemPrompt ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showSystemPrompt ? 'Hide System Prompt' : 'Show System Prompt'}
                </button>
              </div>

              {showSystemPrompt && (
                <div className="mb-6 p-4 bg-slate-100 rounded-lg border border-slate-200 text-xs font-mono text-slate-600 overflow-auto max-h-64">
                  <h3 className="font-bold mb-2 text-slate-700">System Prompt Preview:</h3>
                  <pre className="whitespace-pre-wrap">
                    {(() => {
                      try {
                        const toneObj = TONES.find(t => t.id === selectedTone);
                        const typeObj = OUTPUT_TYPES.find(t => t.id === selectedOutputType);
                        const formatObj = FORMATS.find(f => f.id === selectedFormat);
                        const lengthObj = LENGTHS.find(t => t.id === selectedLength);

                        const plan = buildPromptPlan({
                          specId: selectedOutputType,
                          userInput: inputText || "(User Input)",
                          tone: toneObj,
                          outputType: typeObj,
                          format: formatObj,
                          length: lengthObj,
                          notes,
                          toggles: { allowPlaceholders, stripMeta, aestheticMode }
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
                <label className="text-sm font-semibold text-slate-700">Your Original Prompt</label>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">{inputText.length} chars</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-cyan-600 font-semibold">{estimateTokens(inputText)} tokens</span>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={() => {
                      setInputText('');
                      setSelectedOutputType('doc');
                      setSelectedTone('professional');
                      setSelectedFormat('paragraph');
                      setSelectedLength('medium');
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
                    }}
                    className="text-slate-500 hover:text-slate-700 font-sans text-xs px-2 py-0.5 rounded hover:bg-slate-100 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g., Make me a deck about Andrej Karpathy software 3.0"
                className="w-full h-32 resize-none outline-none text-sm text-slate-700 placeholder:text-slate-300"
              />

              {/* Token Bar */}
              <div className="mt-4 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Token Usage</span>
                  <span className="text-slate-400">{estimateTokens(inputText)} / 2000 tokens</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${estimateTokens(inputText) > 1500 ? 'bg-amber-400' : 'bg-cyan-400'}`}
                    style={{ width: `${Math.min(100, (estimateTokens(inputText) / 2000) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Output Type Selector */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-3 block">Output Type</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {OUTPUT_TYPES.filter(type => type.id !== 'json').map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedOutputType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedOutputType(type.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 ${isSelected
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm ring-1 ring-cyan-200'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type-Specific Form */}
            <TypeSpecificForm
              outputType={selectedOutputType}
              spec={promptSpec || createSpec(selectedOutputType)}
              onChange={handleSpecChange}
            />

            {/* Action Button */}
            <button
              onClick={handleGenerate}
              disabled={!inputText.trim() || isGenerating}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] ${!inputText.trim()
                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-cyan-200 hover:shadow-xl'
                }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-yellow-300 fill-current" />
                  Generate Expanded Prompt
                </>
              )}
            </button>

            {isSavingHistory && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <div className="w-4 h-4 border-2 border-slate-200 border-t-cyan-500 rounded-full animate-spin" />
                Saving to history...
              </div>
            )}

            {errorMsg && (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errorMsg}
              </div>
            )}

            {/* Advanced Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Settings2 className="w-4 h-4 text-slate-500" />
                  Advanced Configuration
                </div>
                {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showAdvanced && (
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Tone */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tone</label>
                      <div className="relative">
                        <select
                          value={selectedTone}
                          onChange={(e) => setSelectedTone(e.target.value)}
                          className="w-full appearance-none bg-slate-50 border border-slate-200 text-sm text-slate-700 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    {/* Length */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Length</label>
                      <div className="relative">
                        <select
                          value={selectedLength}
                          onChange={(e) => setSelectedLength(e.target.value)}
                          className="w-full appearance-none bg-slate-50 border border-slate-200 text-sm text-slate-700 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          {LENGTHS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    {/* Format */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Format</label>
                      <div className="relative">
                        <select
                          value={selectedFormat}
                          onChange={(e) => setSelectedFormat(e.target.value)}
                          className="w-full appearance-none bg-slate-50 border border-slate-200 text-sm text-slate-700 py-2.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        >
                          {FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notes (Audience, Constraints)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional context, audience details, or specific links..."
                      className="w-full h-20 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-cyan-500 outline-none resize-none"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">Allow [Illustrative] placeholders</span>
                      <button
                        onClick={() => setAllowPlaceholders(!allowPlaceholders)}
                        className={`w-11 h-6 rounded-full relative transition-colors ${allowPlaceholders ? 'bg-cyan-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${allowPlaceholders ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">Strip meta-commentary</span>
                      <button
                        onClick={() => !FORMATS.find(f => f.id === selectedFormat)?.isSafeJson && setStripMeta(!stripMeta)}
                        disabled={FORMATS.find(f => f.id === selectedFormat)?.isSafeJson}
                        className={`w-11 h-6 rounded-full relative transition-colors ${stripMeta ? 'bg-cyan-500' : 'bg-slate-300'} ${FORMATS.find(f => f.id === selectedFormat)?.isSafeJson ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${stripMeta ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">Emphasize aesthetics</span>
                      <button
                        onClick={() => setAestheticMode(!aestheticMode)}
                        className={`w-11 h-6 rounded-full relative transition-colors ${aestheticMode ? 'bg-cyan-500' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${aestheticMode ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Expanded Prompt Result - Inline Display */}
            {generatedResult && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-800">Expanded Prompt</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Copy Button */}
                    <button
                      onClick={handleCopy}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
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
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Download as markdown file"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    {/* ChatGPT Button */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedResult);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                        window.open('https://chat.openai.com/', '_blank');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Opens ChatGPT and copies prompt to clipboard"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
                      </svg>
                      ChatGPT
                    </button>
                    {/* Claude Button */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedResult);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                        window.open('https://claude.ai/new', '_blank');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Opens Claude and copies prompt to clipboard"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.45 15.18l-5.45-9.45-5.45 9.45h10.9zm-5.45-11.18c.55 0 1.05.22 1.41.59l7.07 7.07c.37.36.59.86.59 1.41s-.22 1.05-.59 1.41l-7.07 7.07c-.36.37-.86.59-1.41.59s-1.05-.22-1.41-.59l-7.07-7.07c-.37-.36-.59-.86-.59-1.41s.22-1.05.59-1.41l7.07-7.07c.36-.37.86-.59 1.41-.59z" />
                      </svg>
                      Claude
                    </button>
                  </div>
                </div>

                {/* Prompt Content */}
                <div className="p-6 bg-slate-50">
                  <div className="bg-white rounded-lg border border-slate-200 p-5">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed">
                      {generatedResult}
                    </pre>
                  </div>
                </div>

                {/* Quality Feedback */}
                {qualityResult && (
                  <div className="px-6 pb-6">
                    <QualityFeedback
                      quality={qualityResult}
                      onImprove={() => {
                        // TODO: Implement auto-improve based on feedback
                        console.log('Auto-improve requested');
                      }}
                    />
                  </div>
                )}

                {/* Reasoning Panel */}
                {reasoning && Object.keys(reasoning).length > 0 && (
                  <div className="px-6 pb-6">
                    <ReasoningPanel
                      reasoning={reasoning}
                      inferredSettings={{
                        tone: selectedTone,
                        format: selectedFormat,
                        length: selectedLength,
                      }}
                    />
                  </div>
                )}

                {/* Feedback Button */}
                <div className="px-6 pb-6 flex justify-end">
                  <button
                    onClick={() => setShowOutcomeFeedback(true)}
                    className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1"
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
      <div className="w-80 bg-slate-50/50 border-l border-slate-200 flex flex-col hidden md:flex z-10 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-700">
            <History className="w-4 h-4" />
            <h2 className="font-bold text-sm">Prompt History</h2>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {promptHistory.length}
          </span>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isHistoryLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
            </div>
          ) : promptHistory.length === 0 ? (
            <div className="text-center text-slate-400 mt-10 text-sm">No history yet.</div>
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
                  <div key={item.id} className={`group p-3 rounded-lg border transition-all cursor-pointer relative ${item.isPrivate ? 'bg-slate-50 border-slate-100 opacity-75' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                    <div onClick={() => loadFromHistory(item)}>
                      <div className="font-medium text-slate-800 text-sm truncate pr-16">{item.originalText || "Untitled Prompt"}</div>

                      {/* Metadata Tags */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded capitalize">{item.outputType}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded capitalize">{item.format}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded capitalize">{item.length}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded capitalize">{item.tone}</span>
                        {matchBadge}
                      </div>

                      {/* Date & Version */}
                      <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5">
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
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-700">Version History</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveVersionHistoryId(null); }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {[...item.versions].reverse().map((ver, idx) => {
                              const verNum = item.versions.length - idx;
                              // Robust date parsing
                              let dateStr = '';
                              try {
                                let date;
                                if (ver.createdAt?.seconds) {
                                  date = new Date(ver.createdAt.seconds * 1000);
                                } else if (ver.createdAt) {
                                  date = new Date(ver.createdAt);
                                }
                                if (date && !isNaN(date.getTime())) {
                                  dateStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                              } catch (e) { console.warn("Date parse error", e); }

                              return (
                                <div
                                  key={idx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadFromHistory(item, ver);
                                    setActiveVersionHistoryId(null);
                                  }}
                                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between group/ver"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-slate-700">v{verNum}</span>
                                      <span className="text-[10px] text-slate-400">
                                        {dateStr}
                                      </span>
                                    </div>
                                    <div className="flex gap-1 mt-0.5">
                                      <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-500">{ver.tone}</span>
                                      <span className="text-[9px] px-1 rounded bg-slate-100 text-slate-500">{ver.format}</span>
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
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-lg p-0.5">
                      <button
                        onClick={(e) => handleTogglePrivate(e, item)}
                        className={`p-1 rounded hover:bg-slate-100 ${item.isPrivate ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Private"
                      >
                        {item.isPrivate ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={(e) => handleDeleteHistory(e, item.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Signed in as: {user?.displayName || user?.email || 'User'}
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}

      {/* Sidebar - Experiment History (only shown in Experiment mode) */}
      {appMode === 'experiment' && experimentHistory && (
      <div className="w-80 bg-slate-50/50 border-l border-slate-200 flex flex-col hidden md:flex z-10 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-700">
            <History className="w-4 h-4" />
            <h2 className="font-bold text-sm">Experiment History</h2>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {experimentHistory.experiments?.length || 0}
          </span>
        </div>

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
                className={`p-3 rounded-lg border cursor-pointer transition-all group ${
                  experimentHistory.currentExperimentId === exp.id
                    ? 'bg-cyan-50 border-cyan-200'
                    : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-700 truncate">
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
      </div>
      )}

      {/* Settings Modal */}
      {
        showSettings && (
          <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Settings2 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Settings</h2>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* AI Provider Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">AI Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setSelectedProvider('chatgpt')}
                      className={`p-3 rounded-lg border-2 transition-all ${selectedProvider === 'chatgpt'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      <div className="text-xs font-semibold text-left leading-tight">OpenAI GPT-5.1</div>
                    </button>
                    <button
                      onClick={() => setSelectedProvider('claude')}
                      className={`p-3 rounded-lg border-2 transition-all ${selectedProvider === 'claude'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      <div className="text-xs font-semibold">Claude</div>
                    </button>
                    <button
                      onClick={() => setSelectedProvider('gemini')}
                      className={`p-3 rounded-lg border-2 transition-all ${selectedProvider === 'gemini'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                    >
                      <div className="text-xs font-semibold">Gemini</div>
                    </button>
                  </div>
                </div>

                {/* API Keys */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-700">API Keys</h3>

                  {/* OpenAI API Key */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">OpenAI API Key</label>
                    <input
                      type="password"
                      value={chatgptApiKey}
                      onChange={(e) => setChatgptApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Claude API Key */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Claude API Key</label>
                    <input
                      type="password"
                      value={claudeApiKey}
                      onChange={(e) => setClaudeApiKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Gemini API Key */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Gemini API Key</label>
                    <input
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AIza..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-700">
                    <strong>Note:</strong> API keys are stored locally in your browser and never sent to our servers.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Outcome Feedback Modal */}
      {showOutcomeFeedback && generatedResult && (
        <OutcomeFeedback
          promptId={lastGeneratedPromptId}
          spec={promptSpec}
          onSubmit={handleOutcomeSubmit}
          onDismiss={() => setShowOutcomeFeedback(false)}
          isOpen={showOutcomeFeedback}
        />
      )}

    </div>
  );
}
