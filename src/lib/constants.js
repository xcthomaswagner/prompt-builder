/**
 * constants.js – Shared UI constants for prompt builder.
 * 
 * Centralizes TONES, OUTPUT_TYPES, FORMATS, LENGTHS, STYLES
 * to avoid duplication across App.jsx, ExperimentSettings, and experimentRunner.
 */

import {
  Briefcase,
  Smile,
  Coffee,
  Building,
  GraduationCap,
  Lightbulb,
  Layout,
  FileText,
  Database,
  Code,
  Copy,
  MessageSquare,
  List,
  ListOrdered,
  Mail,
  Table
} from 'lucide-react';

/**
 * Tone options for prompt generation
 */
export const TONES = [
  { id: 'professional', label: 'Professional', prompt: 'formal, objective, and expert', icon: Briefcase },
  { id: 'friendly', label: 'Friendly', prompt: 'warm, approachable, and conversational', icon: Smile },
  { id: 'casual', label: 'Casual', prompt: 'relaxed, informal, and easy-going', icon: Coffee },
  { id: 'executive', label: 'Executive', prompt: 'concise, strategic, and high-level', icon: Building },
  { id: 'academic', label: 'Academic', prompt: 'rigorous, citation-focused, and analytical', icon: GraduationCap },
  { id: 'creative', label: 'Creative', prompt: 'imaginative, evocative, and storytelling', icon: Lightbulb },
  { id: 'helpful', label: 'Helpful', prompt: 'supportive, instructive, and solution-oriented', icon: Smile },
  { id: 'technical', label: 'Technical', prompt: 'precise, detailed, and specification-focused', icon: Building },
];

/**
 * Output type options with icons, context, and tooltips
 */
export const OUTPUT_TYPES = [
  { id: 'deck', label: 'Deck', icon: Layout, context: 'Slide Deck Outline (Titles, Visuals, Notes)', 
    tooltip: { title: 'Slides, narratives, exec briefings', desc: 'Perfect for investor updates, executive briefings, and internal pitches. Creates structured slide content with clear narratives and key points.' }},
  { id: 'doc', label: 'Doc', icon: FileText, context: 'Comprehensive Written Document',
    tooltip: { title: 'PRDs, memos, structured writing', desc: 'Ideal for product requirements, legal memos, and strategic documents. Produces well-structured, comprehensive written content.' }},
  { id: 'data', label: 'Data', icon: Database, context: 'Structured Data / Tables',
    tooltip: { title: 'Excel-style analysis, tables, charts', desc: 'Great for forecasts, survey summaries, and analytical reports. Generates structured data presentations with tables and insights.' }},
  { id: 'code', label: 'Code', icon: Code, context: 'Production-Ready Code',
    tooltip: { title: 'Functions, scripts, technical solutions', desc: 'Build production-ready code with proper error handling, documentation, and best practices baked in.' }},
  { id: 'copy', label: 'Copy', icon: Copy, context: 'Marketing Copy / Creative Writing',
    tooltip: { title: 'Marketing copy, headlines, CTAs', desc: 'Craft compelling marketing content, ad copy, landing pages, and creative writing that converts.' }},
  { id: 'comms', label: 'Comms', icon: MessageSquare, context: 'Email / Communication',
    tooltip: { title: 'Emails, stakeholder updates, internal comms', desc: 'Ideal for status updates, customer outreach, and internal communications. Creates clear, professional messaging for all stakeholders.' }},
  { id: 'json', label: 'JSON', icon: Code, context: 'Canonical Prompt Blueprint (JSON object)',
    tooltip: { title: 'Structured JSON output', desc: 'Generate valid, parseable JSON objects for API responses and data structures.' }}
];

/**
 * Format options for output structure
 */
export const FORMATS = [
  { id: 'paragraph', label: 'Paragraph', prompt: 'Flowing, cohesive narrative', icon: FileText },
  { id: 'bullets', label: 'Bullet Points', prompt: 'Concise bulleted list', icon: List },
  { id: 'numbered', label: 'Numbered List', prompt: 'Sequential numbered list', icon: ListOrdered },
  { id: 'steps', label: 'Step-by-Step', prompt: 'Clear, actionable steps', icon: FileText },
  { id: 'sections', label: 'Structured Sections', prompt: 'Clear, hierarchical sections with headings', icon: FileText },
  { id: 'json', label: 'JSON', prompt: 'Valid, parseable JSON object', isSafeJson: true, icon: Code },
  { id: 'email', label: 'Email', prompt: 'Professional email format', icon: Mail },
  { id: 'table', label: 'Table', prompt: 'Structured table with headers', icon: Table },
  { id: 'qa', label: 'Q&A', prompt: 'Question and Answer session', icon: MessageSquare }
];

/**
 * Length options for output verbosity
 */
export const LENGTHS = [
  { id: 'short', label: 'Concise', prompt: 'Concise and high-level' },
  { id: 'medium', label: 'Balanced', prompt: 'Balanced detail' },
  { id: 'long', label: 'Exhaustive', prompt: 'Exhaustive and detailed' }
];

/**
 * Style options for writing approach
 */
export const STYLES = [
  { id: 'direct', label: 'Direct', prompt: 'straightforward, no fluff' },
  { id: 'narrative', label: 'Narrative', prompt: 'story-driven, engaging flow' },
  { id: 'analytical', label: 'Analytical', prompt: 'data-backed, logical structure' },
  { id: 'persuasive', label: 'Persuasive', prompt: 'compelling, action-oriented' },
  { id: 'instructional', label: 'Instructional', prompt: 'step-by-step, clear guidance' },
];

/**
 * Helper to get a constant by ID
 */
export function getToneById(id) {
  return TONES.find(t => t.id === id);
}

export function getOutputTypeById(id) {
  return OUTPUT_TYPES.find(t => t.id === id);
}

export function getFormatById(id) {
  return FORMATS.find(f => f.id === id);
}

export function getLengthById(id) {
  return LENGTHS.find(l => l.id === id);
}

export function getStyleById(id) {
  return STYLES.find(s => s.id === id);
}
