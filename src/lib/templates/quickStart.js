/**
 * Quick-Start Templates
 * 
 * Pre-configured starting points for common use cases.
 * Reduces blank-page anxiety and speeds up prompt creation.
 * 
 * @module templates/quickStart
 */

/**
 * Template definition
 * @typedef {Object} QuickStartTemplate
 * @property {string} id - Unique identifier
 * @property {string} label - Display name
 * @property {string} icon - Icon name (from lucide-react)
 * @property {string} outputType - Target output type
 * @property {string} description - Brief description
 * @property {Object} defaults - Default spec values
 * @property {string} exampleInput - Example input text
 */

/**
 * Quick-start templates library
 * @type {QuickStartTemplate[]}
 */
export const quickStartTemplates = [
  // Deck templates
  {
    id: 'quarterly-review',
    label: 'Quarterly Business Review',
    icon: 'BarChart',
    outputType: 'deck',
    description: 'Executive presentation of quarterly performance',
    defaults: {
      typeSpecific: {
        slide_count: 12,
        duration_minutes: 30,
        presentation_context: 'internal',
        include_speaker_notes: true,
        include_visual_suggestions: true,
      },
      constraints: {
        tone_markers: ['professional', 'data-driven'],
      },
    },
    exampleInput: 'Q3 2024 performance review for the executive team',
  },
  {
    id: 'product-launch',
    label: 'Product Launch Deck',
    icon: 'Rocket',
    outputType: 'deck',
    description: 'External presentation for product announcement',
    defaults: {
      typeSpecific: {
        slide_count: 15,
        duration_minutes: 20,
        presentation_context: 'keynote',
        include_speaker_notes: true,
        include_visual_suggestions: true,
        visual_style: 'image-rich',
      },
      constraints: {
        tone_markers: ['creative', 'inspiring'],
      },
    },
    exampleInput: 'Launch presentation for our new AI-powered analytics feature',
  },
  {
    id: 'investor-pitch',
    label: 'Investor Pitch',
    icon: 'TrendingUp',
    outputType: 'deck',
    description: 'Pitch deck for fundraising',
    defaults: {
      typeSpecific: {
        slide_count: 10,
        duration_minutes: 15,
        presentation_context: 'pitch',
        include_speaker_notes: true,
      },
      constraints: {
        tone_markers: ['professional', 'compelling'],
      },
    },
    exampleInput: 'Series A pitch for our B2B SaaS platform',
  },

  // Doc templates
  {
    id: 'technical-blog',
    label: 'Technical Blog Post',
    icon: 'FileText',
    outputType: 'doc',
    description: 'In-depth technical article',
    defaults: {
      typeSpecific: {
        document_type: 'guide',
        include_toc: true,
        section_structure: ['introduction', 'background', 'implementation', 'results', 'conclusion'],
      },
      constraints: {
        length: 'long',
        tone_markers: ['instructive', 'technical'],
      },
    },
    exampleInput: 'How we reduced API latency by 60% using edge caching',
  },
  {
    id: 'meeting-summary',
    label: 'Meeting Summary',
    icon: 'Users',
    outputType: 'doc',
    description: 'Structured notes from a meeting',
    defaults: {
      typeSpecific: {
        document_type: 'report',
        section_structure: ['attendees', 'discussion', 'decisions', 'action_items'],
      },
      constraints: {
        length: 'medium',
        tone_markers: ['professional', 'concise'],
      },
    },
    exampleInput: 'Summarize the product roadmap planning meeting',
  },
  {
    id: 'project-proposal',
    label: 'Project Proposal',
    icon: 'ClipboardList',
    outputType: 'doc',
    description: 'Formal project proposal document',
    defaults: {
      typeSpecific: {
        document_type: 'proposal',
        include_executive_summary: true,
        section_structure: ['executive_summary', 'problem_statement', 'proposed_solution', 'timeline', 'budget', 'conclusion'],
      },
      constraints: {
        length: 'long',
        tone_markers: ['professional', 'persuasive'],
      },
    },
    exampleInput: 'Proposal for implementing a new CRM system',
  },

  // Code templates
  {
    id: 'api-docs',
    label: 'API Documentation',
    icon: 'Code',
    outputType: 'code',
    description: 'Endpoint documentation with examples',
    defaults: {
      typeSpecific: {
        include_comments: true,
        error_handling: 'comprehensive',
      },
      constraints: {
        tone_markers: ['professional', 'precise'],
        format_requirements: ['examples', 'error codes'],
      },
    },
    exampleInput: 'Document the /users endpoint with CRUD operations',
  },
  {
    id: 'react-component',
    label: 'React Component',
    icon: 'Component',
    outputType: 'code',
    description: 'React component with TypeScript',
    defaults: {
      typeSpecific: {
        language: 'typescript',
        framework: 'react',
        include_tests: true,
        include_comments: true,
        error_handling: 'standard',
      },
    },
    exampleInput: 'Create a reusable data table component with sorting and pagination',
  },

  // Comms templates
  {
    id: 'cold-outreach',
    label: 'Cold Outreach Email',
    icon: 'Mail',
    outputType: 'comms',
    description: 'First-contact email to a prospect',
    defaults: {
      typeSpecific: {
        channel: 'email',
        formality_level: 'professional',
        response_urgency: 'normal',
        include_greeting: true,
        include_signature: true,
      },
      constraints: {
        length: 'short',
        tone_markers: ['professional', 'personalized'],
      },
    },
    exampleInput: 'Reach out to VP of Engineering about our developer tools',
  },
  {
    id: 'team-update',
    label: 'Team Update',
    icon: 'MessageSquare',
    outputType: 'comms',
    description: 'Weekly team status update',
    defaults: {
      typeSpecific: {
        channel: 'slack',
        formality_level: 'casual',
        response_urgency: 'low',
      },
      constraints: {
        length: 'short',
        tone_markers: ['friendly', 'informative'],
      },
    },
    exampleInput: 'Weekly engineering team update on sprint progress',
  },

  // Copy templates
  {
    id: 'landing-page',
    label: 'Landing Page Copy',
    icon: 'Layout',
    outputType: 'copy',
    description: 'Conversion-focused landing page',
    defaults: {
      typeSpecific: {
        copy_type: 'landing',
        emotional_appeal: 'aspiration',
        cta_type: 'Get Started',
      },
      constraints: {
        tone_markers: ['compelling', 'clear'],
      },
    },
    exampleInput: 'Landing page for a project management tool targeting startups',
  },
  {
    id: 'social-post',
    label: 'Social Media Post',
    icon: 'Share2',
    outputType: 'copy',
    description: 'Engaging social media content',
    defaults: {
      typeSpecific: {
        copy_type: 'social',
        emotional_appeal: 'curiosity',
        platform: 'linkedin',
      },
      constraints: {
        length: 'short',
        tone_markers: ['engaging', 'professional'],
      },
    },
    exampleInput: 'LinkedIn post announcing our new feature release',
  },

  // Data templates
  {
    id: 'sample-data',
    label: 'Sample Dataset',
    icon: 'Database',
    outputType: 'data',
    description: 'Generate realistic sample data',
    defaults: {
      typeSpecific: {
        output_format: 'json',
        include_headers: true,
        include_descriptions: true,
      },
    },
    exampleInput: 'Generate 10 sample user records with name, email, role, and signup date',
  },
];

/**
 * Get templates by output type
 * @param {string} outputType
 * @returns {QuickStartTemplate[]}
 */
export function getTemplatesByType(outputType) {
  return quickStartTemplates.filter(t => t.outputType === outputType);
}

/**
 * Get a template by ID
 * @param {string} id
 * @returns {QuickStartTemplate|undefined}
 */
export function getTemplateById(id) {
  return quickStartTemplates.find(t => t.id === id);
}

/**
 * Get all unique output types with templates
 * @returns {string[]}
 */
export function getTemplateOutputTypes() {
  return [...new Set(quickStartTemplates.map(t => t.outputType))];
}
