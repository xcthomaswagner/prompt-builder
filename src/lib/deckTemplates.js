/**
 * Deck Template Definitions
 * Extracted for maintainability - used by promptSpecs.js
 */

// Shared slide format that ALL deck types must follow
export const SLIDE_FORMAT = `SLIDE OUTPUT FORMAT (use for every slide):
| # | Title | Key Message | Visual Suggestion | Speaker Notes |
|---|-------|-------------|-------------------|---------------|

For each slide provide:
- **#**: Slide number
- **Title**: Clear, action-oriented headline (5-8 words)
- **Key Message**: One sentence takeaway
- **Visual Suggestion**: Chart type, image concept, or diagram idea
- **Speaker Notes**: 2-3 bullet points for presenter`;

// Deck type configurations - compact and DRY
export const DECK_TYPES = {
  investor: {
    label: 'Investor Pitch',
    slides: '10-12',
    structure: [
      'Title + Tagline',
      'Problem (quantified pain)',
      'Solution (before/after)',
      'Market Opportunity (TAM/SAM/SOM)',
      'Traction (metrics, milestones)',
      'Business Model (revenue, unit economics)',
      'Competition (2x2 matrix, moat)',
      'Go-to-Market (channels, CAC)',
      'Team (founders, key hires)',
      'Financials (3-year projection)',
      'The Ask (amount, use of funds)',
      'Closing (CTA, contact)'
    ],
    focus: 'Investors want: clear problem, large market, strong team, path to returns. Lead with traction if you have it.'
  },
  sales: {
    label: 'Sales Deck',
    slides: '8-12',
    structure: [
      'Hook (provocative question)',
      'The Challenge (their world, cost of inaction)',
      'Vision (what great looks like)',
      'Solution (capabilities, how it works)',
      'Proof Points (2-3 case studies)',
      'Differentiators (why you vs. alternatives)',
      'Implementation (timeline to value)',
      'Investment (pricing, ROI)',
      'Next Steps (clear CTA)'
    ],
    focus: 'Speak to their pain, prove results, make buying easy. Every slide should build toward the close.'
  },
  board: {
    label: 'Board Update',
    slides: '10-15',
    structure: [
      'Executive Summary (3-5 headlines, health indicator)',
      'Metrics Dashboard (KPIs with trends)',
      'Wins & Highlights',
      'Financial Performance (P&L, cash, runway)',
      'Challenges & Risks (honest assessment)',
      'Product Update (roadmap progress)',
      'Team & Org (headcount, key changes)',
      'Competitive Landscape',
      'Strategic Priorities (next quarter)',
      'Asks & Decisions (board input needed)',
      'Appendix (detailed data)'
    ],
    focus: 'Be direct, data-driven, and honest. Board members want signal, not noise. Flag issues early.'
  },
  internal: {
    label: 'Internal Meeting',
    slides: '6-10',
    structure: [
      'Title + Purpose (what we\'re deciding)',
      'Background (current state, how we got here)',
      'Analysis (data, findings)',
      'Options (pros/cons for each)',
      'Recommendation (with rationale)',
      'Implementation Plan (milestones, owners)',
      'Resource Ask (budget, team)',
      'Discussion (key questions)',
      'Next Steps (actions, owners)'
    ],
    focus: 'Optimize for decision-making. Present options clearly, make recommendation, get alignment.'
  },
  training: {
    label: 'Training/Workshop',
    slides: '15-25',
    structure: [
      'Title + Learning Objectives',
      'Agenda (with times)',
      'Why This Matters (relevance, pain points)',
      'Content Modules (1 concept per slide)',
      'Interactive Exercises (instructions, time)',
      'Key Takeaways (summary)',
      'Resources (further reading, tools)',
      'Q&A'
    ],
    focus: 'Engage with activities. One concept per slide. Include practice opportunities and memory aids.'
  }
};

// Few-shot examples for better LLM output consistency
export const FEW_SHOT_EXAMPLES = `
## FEW-SHOT EXAMPLES

### Example 1: Startup Pitch
**Input**: "Create a pitch deck for my AI writing assistant startup. We have 5k users and $20k MRR."
**Output Summary**:
| # | Title | Key Message | Visual | Notes |
|---|-------|-------------|--------|-------|
| 1 | WriteAI: Your AI Writing Partner | AI that makes everyone a better writer | Logo + tagline | Hook: "What if writing was effortless?" |
| 2 | The Problem: Writing is Hard | Professionals spend 25% of time writing | Clock + frustrated person icon | "Average knowledge worker: 2.5 hrs/day on email alone" |
| 3 | WriteAI Solution | Draft → Polish → Publish in minutes | Before/After comparison | Demo: live writing improvement |
...

### Example 2: Quarterly Business Review  
**Input**: "Q3 board update for B2B SaaS. Revenue up 40% but churn increased."
**Output Summary**:
| # | Title | Key Message | Visual | Notes |
|---|-------|-------------|--------|-------|
| 1 | Q3 2024: Strong Growth, Retention Focus | 40% revenue growth, churn requires action | Scorecard: 🟢 Revenue, 🟡 Churn | "Good quarter with one area needing attention" |
| 2 | Key Metrics | $2.1M ARR (+40%), 8% churn (+2pts) | Dashboard with trend arrows | Walk through each metric |
...`;

// Metadata output template
export const METADATA_TEMPLATE = `## OUTPUT FORMAT

Start every deck blueprint with this metadata block:

---
**DECK METADATA**
- Type: [Investor/Sales/Board/Internal/Training]
- Target Audience: [Inferred from brief]
- Recommended Slides: [X-Y slides]
- Estimated Duration: [X minutes]
- Visual Style: [Minimal/Data-heavy/Image-rich]
---

Then provide the slide table followed by detailed slide specifications.`;

export default DECK_TYPES;
