/**
 * Doc-specific Prompt Spec Template
 * 
 * Extends the base schema with fields specific to document generation.
 * 
 * @module promptSpecs/templates/doc
 */

import { createBaseSpec } from '../schema.js';

/**
 * @typedef {'report'|'proposal'|'guide'|'analysis'|'whitepaper'|'memo'|'requirements'|'agenda'} DocumentType
 */

/**
 * @typedef {'apa'|'mla'|'chicago'|'harvard'|'ieee'|null} CitationStyle
 */

/**
 * @typedef {Object} DocTypeSpecific
 * @property {DocumentType} document_type - Type of document
 * @property {string[]} section_structure - Required sections
 * @property {boolean} include_executive_summary - Include executive summary
 * @property {boolean} include_toc - Include table of contents
 * @property {CitationStyle} citation_style - Citation format
 * @property {string[]} appendices - Supplementary sections
 */

/**
 * Default doc-specific fields
 * @type {DocTypeSpecific}
 */
export const docDefaults = {
  document_type: 'report',
  section_structure: [],
  include_executive_summary: false,
  include_toc: false,
  citation_style: null,
  appendices: [],
};

/**
 * Common section structures by document type
 */
export const SECTION_STRUCTURES = {
  report: ['introduction', 'methodology', 'findings', 'analysis', 'conclusion', 'recommendations'],
  proposal: ['executive_summary', 'problem_statement', 'proposed_solution', 'timeline', 'budget', 'conclusion'],
  guide: ['introduction', 'prerequisites', 'steps', 'troubleshooting', 'faq'],
  analysis: ['overview', 'data_sources', 'methodology', 'findings', 'implications'],
  whitepaper: ['abstract', 'introduction', 'background', 'solution', 'benefits', 'conclusion'],
  memo: ['purpose', 'background', 'discussion', 'action_items'],
  requirements: ['executive_summary', 'stakeholders', 'functional_requirements', 'non_functional_requirements', 'user_stories', 'acceptance_criteria', 'constraints', 'assumptions', 'dependencies', 'glossary'],
  agenda: ['meeting_info', 'attendees', 'objectives', 'agenda_items', 'discussion_topics', 'action_items', 'next_steps'],
};

/**
 * Agenda-specific section structures by agenda type
 */
export const AGENDA_STRUCTURES = {
  call: ['call_info', 'attendees', 'purpose', 'talking_points', 'questions', 'next_steps'],
  meeting: ['meeting_info', 'attendees', 'objectives', 'agenda_items', 'discussion_topics', 'action_items', 'next_steps'],
  workshop: ['workshop_info', 'facilitator', 'participants', 'objectives', 'materials_needed', 'activities', 'breakout_sessions', 'wrap_up', 'deliverables'],
  standup: ['date_time', 'attendees', 'yesterday_updates', 'today_plans', 'blockers', 'announcements'],
  review: ['meeting_info', 'attendees', 'review_scope', 'accomplishments', 'demos', 'feedback', 'action_items'],
  planning: ['meeting_info', 'attendees', 'goals', 'backlog_review', 'capacity', 'commitments', 'risks', 'action_items'],
  kickoff: ['project_overview', 'stakeholders', 'objectives', 'scope', 'timeline', 'roles_responsibilities', 'communication_plan', 'risks', 'next_steps'],
  board: ['call_to_order', 'attendees', 'approval_of_minutes', 'reports', 'old_business', 'new_business', 'executive_session', 'adjournment'],
  interview: ['interview_info', 'interviewers', 'candidate_intro', 'role_overview', 'interview_sections', 'questions', 'candidate_questions', 'next_steps'],
  one_on_one: ['meeting_info', 'wins', 'challenges', 'priorities', 'feedback', 'career_development', 'action_items'],
};

/**
 * Create a Doc Prompt Spec with doc-specific defaults
 * @returns {import('../schema.js').BasePromptSpec}
 */
export function createDocSpec() {
  const spec = createBaseSpec('doc');
  spec.typeSpecific = { ...docDefaults };
  return spec;
}

/**
 * Get recommended sections for document type
 * @param {DocumentType} docType
 * @param {string} [agendaType] - Optional agenda sub-type for agenda documents
 * @returns {string[]}
 */
export function recommendSections(docType, agendaType = null) {
  if (docType === 'agenda' && agendaType && AGENDA_STRUCTURES[agendaType]) {
    return AGENDA_STRUCTURES[agendaType];
  }
  return SECTION_STRUCTURES[docType] || SECTION_STRUCTURES.report;
}

/**
 * Get recommended sections for a specific agenda type
 * @param {string} agendaType - The type of agenda (call, meeting, workshop, etc.)
 * @returns {string[]}
 */
export function getAgendaSections(agendaType) {
  return AGENDA_STRUCTURES[agendaType] || AGENDA_STRUCTURES.meeting;
}

/**
 * Should include executive summary based on length and audience
 * @param {string} length - short|medium|long
 * @param {string} audienceLevel - novice|general|expert
 * @returns {boolean}
 */
export function shouldIncludeExecutiveSummary(length, audienceLevel) {
  if (length === 'short') return false;
  if (audienceLevel === 'expert' && length === 'medium') return false;
  return length === 'long' || audienceLevel === 'novice';
}

/**
 * Validate doc-specific fields
 * @param {DocTypeSpecific} typeSpecific
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateDocSpec(typeSpecific) {
  const errors = [];
  const warnings = [];
  
  if (typeSpecific.include_toc && typeSpecific.section_structure.length < 3) {
    warnings.push('Table of contents may not be useful with fewer than 3 sections');
  }
  
  if (typeSpecific.citation_style && typeSpecific.document_type === 'memo') {
    warnings.push('Memos typically do not require formal citations');
  }
  
  if (typeSpecific.include_executive_summary && typeSpecific.document_type === 'memo') {
    warnings.push('Memos typically do not include executive summaries');
  }
  
  return { errors, warnings };
}
