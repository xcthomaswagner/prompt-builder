# Intelligent Prompt Builder - Functionality Summary

## Core Prompt Building

**Prompt Expansion & Enrichment**
The app takes simple user inputs and expands them into comprehensive, structured prompts optimized for LLMs. It analyzes the input to detect content type (documents, presentations, code, data analysis, copy, communications) and automatically applies domain-specific templates and best practices. The system uses "reverse prompting" to intelligently ask clarifying questions when inputs are vague, ensuring the final prompt captures all necessary context.

**Output Type Selection**
Six specialized output types are available: Doc (documents, reports, specs), Deck (presentations, pitch decks), Data (analysis, research, insights), Code (technical specs, implementation guides), Copy (marketing content, blog posts), and Comms (emails, announcements, messaging). Each type has tailored templates with specific structural elements and formatting appropriate to the domain.

**Tone, Style, Format & Length Controls**
Users can fine-tune prompts with tone options (professional, casual, technical, executive, persuasive, educational), style preferences (direct, analytical, creative, instructional, storytelling), format choices (paragraph, bullets, sections, table, outline), and length settings (short, medium, long, comprehensive). These controls ensure the output matches the intended audience and use case.

**Type-Specific Configuration**
Advanced forms appear based on output type selection. For decks, users specify deck type (investor, sales, internal) and slide count. For documents, they choose doc type (requirements, proposal, report) and section depth. Code prompts allow specification of language, framework, and feature type. Data prompts support analysis type and visualization preferences. This contextual configuration ensures highly relevant outputs.

**Quick Start Templates**
Pre-built templates provide instant starting points for common scenarios like investor pitch decks, product requirement docs, API documentation, blog posts, and team announcements. Templates auto-populate all relevant fields and can be customized before generation. This accelerates the prompt creation process for standard use cases.

## Prompt History & Management

**Automatic History Tracking**
Every generated prompt is automatically saved to Firebase Firestore with full context including original input, expanded output, all configuration settings, and timestamps. History persists across sessions and devices. Users can search through history by text content, output type, or tone, making it easy to find and reuse previous work.

**Load & Reuse**
Clicking any history item instantly restores all settings and text, allowing users to iterate on previous prompts or use them as templates for similar tasks. The version tracking system maintains a complete audit trail of refinements, showing how prompts evolved over multiple iterations.

**Backup & Restore**
Users can export their entire prompt history as a JSON file for safekeeping or migration. The restore function imports backups while automatically detecting and skipping duplicates based on content signatures, preventing data duplication. Original creation dates are preserved in the `importedFrom` field for historical accuracy.

**Privacy Controls**
Individual prompts can be marked as private, visually distinguishing them in the history sidebar. This helps organize sensitive or work-in-progress items separately from general prompts.

## Experiment Mode

**Multi-Variant Testing**
Experiment mode generates multiple prompt variations simultaneously by testing different combinations of tone, style, format, and length parameters. Users define a matrix of variables to test (e.g., 3 tones × 2 styles = 6 variants), and the system generates all combinations in parallel, displaying results in a comparison grid.

**Outcome Evaluation**
Each generated variant can be rated on multiple outcome dimensions (clarity, completeness, actionability, specificity, structure, tone accuracy) using a 1-10 scale. The system calculates aggregate scores and highlights top performers, helping users identify which parameter combinations produce the best results for their specific needs.

**Baseline Grounding**
Users can save exemplar prompts with known quality scores as baselines. Future experiments reference these baselines to provide calibrated, consistent scoring across sessions. This creates a learning system that improves evaluation accuracy over time.

**Experiment History**
All experiments are saved with full configuration, results, and ratings. Users can review past experiments to understand which parameter combinations work best for different content types and audiences, building institutional knowledge about effective prompting strategies.

## Quality Assessment

**Automated Quality Scoring**
Every generated prompt receives an automated quality assessment across multiple dimensions: clarity (clear language, no ambiguity), completeness (all necessary information included), actionability (specific, executable guidance), specificity (concrete details vs vague generalities), structure (logical organization), and tone accuracy (matches intended voice). Scores are displayed with explanations and improvement suggestions.

**Iterative Refinement**
Users can request prompt improvements based on quality feedback. The system analyzes weak areas and regenerates the prompt with targeted enhancements. Version history tracks all refinements, showing quality score progression and allowing rollback to previous versions if needed.

**Reasoning Transparency**
The quality assessment panel shows the AI's reasoning process, explaining why specific scores were assigned and what improvements were recommended. This transparency helps users understand prompt engineering principles and learn to write better initial inputs.

## Settings & Configuration

**Multi-Provider LLM Support**
The app supports multiple LLM providers: Google Gemini (default), OpenAI (ChatGPT), and Anthropic (Claude). Users can configure API keys for each provider and select specific models (e.g., GPT-4, Claude 3.5 Sonnet). Provider selection affects both prompt generation and experiment mode execution.

**Model Selection**
For each provider, users can choose from available models with different capabilities and cost profiles. OpenAI users can select between GPT-4 Turbo, GPT-4, and GPT-3.5 Turbo. Claude users can choose between Claude 3.5 Sonnet, Claude 3 Opus, and Claude 3 Haiku.

**Dark Mode**
Full dark mode support with persistent preference storage. All UI elements, including modals, dropdowns, and code blocks, adapt to the selected theme for comfortable use in any lighting condition.

## Authentication & Data Persistence

**Firebase Anonymous Auth**
Users are automatically authenticated anonymously on first visit, enabling immediate use without account creation. This provides a frictionless onboarding experience while still enabling personalized history and settings.

**Cloud Sync**
All data (history, experiments, settings, baselines) syncs to Firebase Firestore in real-time. Users can access their work from any device by using the same browser or by exporting/importing their history backup.

## UI/UX Features

**Responsive Design**
The interface adapts to different screen sizes with a collapsible history sidebar on desktop and optimized layouts for tablet and mobile viewing. Touch-friendly controls and appropriate spacing ensure usability across devices.

**Keyboard Shortcuts & Accessibility**
The main input auto-focuses on page load for immediate typing. All interactive elements support keyboard navigation with proper ARIA labels and roles. Toggle buttons include `aria-expanded` states for screen readers.

**Copy & Download**
Generated prompts can be copied to clipboard with one click or downloaded as markdown files with proper formatting. This facilitates easy transfer to LLM interfaces or documentation systems.

**Token Estimation**
Real-time token counting helps users understand prompt size and potential API costs. The counter updates as users type or modify settings, providing immediate feedback on prompt complexity.

---

# Use Cases

**Product Managers** - Create comprehensive PRDs, feature specs, and user stories with proper structure and technical detail. Experiment with different tones for stakeholder vs engineering audiences.

**Sales Teams** - Generate customized pitch decks and sales collateral for different customer segments. Test messaging variations to find the most persuasive language for specific industries.

**Content Marketers** - Produce blog post outlines, social media copy, and email campaigns with consistent brand voice. Use templates for common content types and iterate based on quality scores.

**Engineering Teams** - Write technical documentation, API specs, and implementation guides with appropriate detail levels. Generate code review checklists and architecture decision records.

**Executives** - Draft board presentations, investor updates, and strategic communications with executive-appropriate tone and structure. Maintain a library of reusable messaging frameworks.

**Researchers** - Create data analysis plans, research proposals, and literature review outlines. Structure complex analytical workflows with clear methodologies and expected outcomes.

**Customer Success** - Develop help documentation, onboarding guides, and customer communications at varying technical levels. Test different explanation styles for diverse user personas.

**Educators** - Build lesson plans, course outlines, and educational content with appropriate pedagogical structure. Experiment with different instructional approaches for various learning styles.

**Consultants** - Generate client deliverables, proposals, and recommendations with professional polish. Maintain a history of successful frameworks to accelerate future engagements.

**Startup Founders** - Quickly produce investor decks, business plans, and go-to-market strategies. Iterate on messaging until achieving the right balance of vision and pragmatism.

---

# Output Types

**Doc** - For creating structured documents like requirements specifications, proposals, reports, and strategic plans. Emphasizes logical organization, comprehensive coverage, and formal documentation standards.

**Deck** - For building presentation content including investor pitches, sales decks, and internal strategy presentations. Focuses on slide-by-slide narrative flow, visual hierarchy, and persuasive storytelling.

**Data** - For analytical work like research plans, data analysis frameworks, and insight reports. Prioritizes methodological rigor, statistical clarity, and evidence-based conclusions.

**Code** - For technical documentation including API specs, implementation guides, and feature requirements. Emphasizes technical precision, code examples, and developer-focused language.

**Copy** - For marketing and creative content like blog posts, landing pages, ad copy, and social media. Optimizes for engagement, brand voice, and conversion-oriented messaging.

**Comms** - For business communications including emails, announcements, memos, and team updates. Balances clarity, professionalism, and appropriate formality for internal/external audiences.

---

# Tone, Style & Format

## Tone
**What it controls:** The voice and emotional register of the output - how formal, technical, or persuasive the language should be.

**Impact:** Tone determines audience appropriateness and credibility. A "technical" tone uses precise terminology for expert audiences, while "casual" makes content accessible to general readers. "Executive" tone is concise and strategic, while "persuasive" emphasizes benefits and calls-to-action.

**Examples:**
- **Professional + Analytical** → "Our Q3 revenue analysis indicates a 23% YoY growth trajectory, driven primarily by enterprise segment expansion and improved retention metrics."
- **Casual + Creative** → "We crushed it this quarter! Revenue jumped 23% compared to last year, thanks to our enterprise customers sticking around and bringing their friends."
- **Technical + Instructional** → "To calculate YoY growth rate: subtract previous period value from current period value, divide by previous period value, multiply by 100 to express as percentage."
- **Executive + Persuasive** → "Our 23% growth validates the enterprise-first strategy. Doubling down on this segment will accelerate our path to market leadership."

## Style
**What it controls:** The structural approach and narrative technique - how information is organized and presented.

**Impact:** Style shapes comprehension and engagement. "Direct" style gets to the point immediately for busy readers. "Analytical" builds logical arguments with supporting evidence. "Storytelling" uses narrative arcs to make content memorable. "Instructional" breaks down complex topics into learnable steps.

**Examples:**
- **Direct** → "Recommendation: Migrate to microservices architecture. Benefits: improved scalability, faster deployments, team autonomy. Timeline: 6 months."
- **Analytical** → "Current monolithic architecture creates deployment bottlenecks (avg 2 weeks per release). Analysis of 50 similar companies shows microservices reduce this to 2 days while improving uptime from 99.5% to 99.9%."
- **Storytelling** → "When our deployment pipeline broke at 2am during Black Friday, we realized our monolith had become a single point of failure. That night sparked our journey to microservices..."
- **Creative** → "Imagine each feature as an independent artist, free to perform without waiting for the entire orchestra to rehearse. That's microservices - autonomous, agile, unstoppable."

## Format
**What it controls:** The visual structure and information hierarchy - how content is chunked and displayed.

**Impact:** Format affects    and information retention. "Bullets" enable quick scanning of key points. "Sections" provide deep dives with clear topic boundaries. "Table" facilitates comparison and data presentation. "Outline" shows hierarchical relationships and dependencies.

**Examples:**
- **Paragraph** → "The migration strategy involves three phases executed sequentially. First, we'll extract the authentication service as it has minimal dependencies. Second, we'll decompose the core business logic into domain-bounded services. Third, we'll migrate the data layer to service-specific databases."

- **Bullets** →
  - Phase 1: Extract authentication service (minimal dependencies)
  - Phase 2: Decompose business logic into domain services
  - Phase 3: Migrate to service-specific databases

- **Sections** →
  ```
  **Phase 1: Authentication Service**
  Extract authentication as the first service due to its isolated nature and clear API boundaries. Expected duration: 6 weeks.
  
  **Phase 2: Business Logic Decomposition**
  Identify domain boundaries and extract core services. This phase requires careful dependency mapping. Expected duration: 12 weeks.
  ```

- **Table** →
  ```
  | Phase | Service | Dependencies | Duration | Risk |
  |-------|---------|--------------|----------|------|
  | 1 | Auth | None | 6 weeks | Low |
  | 2 | Business Logic | Auth | 12 weeks | Medium |
  | 3 | Data Layer | All | 8 weeks | High |
  ```

---

# Context / Constraints

**Purpose:** Provides critical background information and limitations that shape the prompt's direction.

**How to use:** Add specific details about your situation, requirements, or boundaries that the AI should consider. This prevents generic outputs and ensures relevance to your actual needs.

**What to include:**
- **Audience details** - "For non-technical executives" or "Targeting enterprise CTOs"
- **Technical constraints** - "Must work with Python 3.8" or "Limited to 5 slides max"
- **Business context** - "Series A startup, pre-revenue" or "Fortune 500 with legacy systems"
- **Scope boundaries** - "Focus only on Q4 2024" or "Exclude implementation details"
- **Compliance requirements** - "Must be HIPAA compliant" or "Follow AP style guide"

**Examples:**
- "Our team is 5 engineers, all junior-level, working with React and Node.js. We have no DevOps experience."
- "Budget constraint: $50K total. Timeline: Must launch before competitor's Q2 release."
- "Audience is board members with no technical background. Keep under 10 slides, focus on business metrics."

---

# Additional Notes

**Purpose:** Captures any extra guidance, preferences, or special instructions that don't fit into structured fields.

**How to use:** Add freeform text about desired outcomes, things to emphasize or avoid, stylistic preferences, or specific elements you want included.

**What to include:**
- **Emphasis requests** - "Really stress the ROI and cost savings"
- **Things to avoid** - "Don't use jargon or acronyms without explanation"
- **Specific inclusions** - "Must include a competitive analysis section"
- **Tone nuances** - "Optimistic but realistic, acknowledge risks"
- **Reference materials** - "Similar to Simon Sinek's 'Start With Why' approach"

**Examples:**
- "Include real-world examples from SaaS companies. Avoid theoretical frameworks. Keep it practical and actionable."
- "Use data visualizations wherever possible. Reference our previous Q2 deck's style (attached). Emphasize the 'why now' narrative."
- "Write as if explaining to a smart 12-year-old. Use analogies and metaphors. Make it fun but informative."
- "Follow the STAR method (Situation, Task, Action, Result). Include metrics for every claim. Cite sources where applicable."


**The Problem: Mode Collapse (The "Vanilla" Trap)**
Most modern AI models are trained to be "safe" and "helpful." While this is good for safety, it creates a side effect called Mode Collapse.
What happens: The model becomes "people-pleasing." It ignores unique or creative ideas and instead collapses onto the single most common, average response.
The Business Impact: If you ask for a marketing email, the AI gives you the same generic "Click Here" copy it gives everyone else. It creates a "Typicality Bias," where the output is factually correct but strategically boring.


**The Solution: Verbalized Sampling (VS)**
To fix this, we use a method called Verbalized Sampling. Instead of asking the AI for the single best answer, we ask it to generate a spread of options and assign a probability score to each one.
How it works: This forces the AI to dig deeper into its training data. It retrieves the creative, novel, or "long-tail" ideas that it usually suppresses to be safe.
The Result: You get a wider range of options in a single click—from "Safe and Standard" to "Wild and Novel".

**How to Use the Diversity Slider**
We have mapped the complex probability math into a simple slider for you:

Conservative (0-30%): Best for code, technical specs, and legal text. The model sticks to high-probability, standard answers.
Balanced (30-70%): Best for general communication. You get a mix of standard and slightly distinct variations.
Creative (70-100%): Best for brainstorming, ad copy, and social media. We force the model to look at the "tail" of the distribution—low probability but high novelty. Note: This is where the AI takes risks to be original.
