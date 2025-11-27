# Output Type × Tone × Format Combination Matrix

> A comprehensive analysis of optimal combinations for the Intelligent Prompt Builder

## Overview

This document analyzes the 270 possible combinations of output types, tones, and formats available in the Prompt Builder. It identifies the most effective pairings for specific use cases, including non-obvious combinations that yield exceptional results.

### Available Options

| Category | Options |
|----------|---------|
| **Output Types** | Deck, Doc, Data, Code, Copy, Comms |
| **Tones** | Professional, Creative, Academic, Casual, Instructive |
| **Formats** | Paragraph, Bullets, Numbered, Steps, Sections, JSON, Email, Table, Q&A |

---

## Deck (Slide Presentations)

Slide decks require scannable content with clear visual hierarchy. The format choice significantly impacts how well content translates to slides.

| Tone | Best Formats | Top Use Cases |
|------|--------------|---------------|
| **Professional** | Bullets, Sections | 1. Board presentations – quarterly results, strategic updates<br>2. Client pitches – proposals, capability decks |
| **Creative** | Bullets, Sections | 1. Product launches – storytelling-driven reveals<br>2. Brand campaigns – mood boards, creative briefs |
| **Academic** | Bullets, Numbered | 1. Conference talks – research findings, methodology<br>2. Thesis defenses – structured argument progression |
| **Casual** | Bullets, Q&A | 1. Team all-hands – culture updates, celebrations<br>2. Onboarding decks – welcoming new hires |
| **Instructive** | Steps, Numbered | 1. Training workshops – skill-building sessions<br>2. Process walkthroughs – how systems work |

### Non-Obvious Winner: Academic + Bullets

The rigor of academic tone combined with scannable bullets creates authoritative yet digestible slides. This combination is ideal for technical conferences where you need credibility but can't afford to lose the audience in dense prose.

**Best for:** Research presentations, technical keynotes, investor pitches with data-heavy claims.

---

## Doc (Comprehensive Documents)

Documents allow for depth and nuance. The tone-format pairing determines whether the document reads as a reference, narrative, or guide.

| Tone | Best Formats | Top Use Cases |
|------|--------------|---------------|
| **Professional** | Sections, Paragraph | 1. Business plans – investor-ready documentation<br>2. Policy documents – SOPs, compliance guides |
| **Creative** | Paragraph, Sections | 1. Narrative reports – annual reports with storytelling<br>2. Case studies – compelling customer stories |
| **Academic** | Sections, Numbered | 1. Research papers – literature reviews, methodology<br>2. White papers – technical deep-dives with citations |
| **Casual** | Paragraph, Bullets | 1. Blog posts – thought leadership, tutorials<br>2. Internal wikis – team knowledge bases |
| **Instructive** | Steps, Sections | 1. User manuals – product documentation<br>2. Runbooks – operational procedures |

### Non-Obvious Winner: Instructive + Steps

While "instructive" seems obvious for tutorials, pairing it with step-by-step format for *runbooks* creates exceptional operational documentation. This combination reduces errors during incidents because each action is explicit and sequenced.

**Best for:** Incident response playbooks, deployment procedures, compliance checklists.

---

## Data (Structured Data/Tables)

Data output emphasizes structure and comparability. The tone affects how the data is contextualized and explained.

| Tone | Best Formats | Top Use Cases |
|------|--------------|---------------|
| **Professional** | Table, JSON | 1. Financial reports – P&L, budget breakdowns<br>2. Competitive analysis – feature comparison matrices |
| **Creative** | Table, Bullets | 1. Content calendars – editorial planning<br>2. Mood/style guides – design system specs |
| **Academic** | Table, Numbered | 1. Literature matrices – source comparison tables<br>2. Experimental data – results with statistical notation |
| **Casual** | Table, Bullets | 1. Team rosters – who does what<br>2. Event planning – logistics checklists |
| **Instructive** | Table, Steps | 1. Decision trees – if-then logic tables<br>2. Troubleshooting guides – symptom → solution mapping |

### Non-Obvious Winner: Creative + Table

This sounds contradictory—creativity applied to structured data? But creative tone produces *evocative* content calendars and style guides that inspire action rather than just inform. The structure keeps it usable while the tone makes it engaging.

**Best for:** Editorial calendars, brand guidelines, design systems, campaign planning matrices.

---

## Code (Production-Ready Code)

Code output requires precision, but the surrounding documentation and explanations benefit from varied tones.

| Tone | Best Formats | Top Use Cases |
|------|--------------|---------------|
| **Professional** | Sections, Steps | 1. API documentation – endpoint references<br>2. Architecture docs – system design with code samples |
| **Creative** | Paragraph, Bullets | 1. Code storytelling – explaining complex algorithms narratively<br>2. Developer blogs – making technical concepts engaging |
| **Academic** | Sections, Numbered | 1. Algorithm papers – pseudocode with proofs<br>2. CS coursework – annotated implementations |
| **Casual** | Bullets, Steps | 1. README files – friendly project introductions<br>2. Code reviews – conversational feedback |
| **Instructive** | Steps, Sections | 1. Tutorials – learn-by-building guides<br>2. Migration guides – version upgrade instructions |

### Non-Obvious Winner: Creative + Paragraph

When explaining *why* code works (not just *how*), narrative prose with creative flair makes complex algorithms memorable. Think of the best technical blog posts you've read—they tell a story. This combination transforms documentation into content people actually want to read.

**Best for:** Technical blog posts, algorithm explainers, "how we built it" articles, developer advocacy content.

---

## Copy (Marketing/Creative Writing)

Marketing copy must persuade. The tone-format combination determines the persuasion style—emotional, logical, or educational.

| Tone | Best Formats | Top Use Cases |
|------|--------------|---------------|
| **Professional** | Paragraph, Sections | 1. B2B landing pages – enterprise software<br>2. Press releases – corporate announcements |
| **Creative** | Paragraph, Bullets | 1. Ad campaigns – taglines, social media<br>2. Brand manifestos – company voice documents |
| **Academic** | Paragraph, Sections | 1. Thought leadership – industry analysis pieces<br>2. Research-backed marketing – data-driven claims |
| **Casual** | Paragraph, Bullets | 1. Social media – Twitter/LinkedIn posts<br>2. Newsletter intros – friendly subscriber updates |
| **Instructive** | Steps, Bullets | 1. Product tutorials – feature announcements<br>2. How-to marketing – educational content marketing |

### Non-Obvious Winner: Academic + Paragraph

Counter-intuitive for marketing, but academic rigor in copy builds *trust*. This is especially powerful for B2B, healthcare, fintech, or any industry where credibility drives conversions. The academic tone signals expertise while the paragraph format allows for nuanced argumentation.

**Best for:** White paper landing pages, healthcare marketing, financial services content, B2B thought leadership.

---

## Comms (Email/Communication)

Communications require clarity and appropriate tone for the relationship. Format affects scannability and action-taking.

| Tone | Best Formats | Top Use Cases |
|------|--------------|---------------|
| **Professional** | Email, Bullets | 1. Executive updates – status reports to leadership<br>2. Client correspondence – project updates |
| **Creative** | Email, Paragraph | 1. Campaign announcements – internal creative briefs<br>2. Event invitations – engaging RSVPs |
| **Academic** | Email, Sections | 1. Research collaborations – grant proposals, paper submissions<br>2. Peer review responses – addressing reviewer comments |
| **Casual** | Email, Bullets | 1. Team check-ins – weekly updates<br>2. 1:1 follow-ups – meeting notes |
| **Instructive** | Email, Steps | 1. Onboarding sequences – new user welcome emails<br>2. Process change notices – explaining new procedures |

### Non-Obvious Winner: Creative + Email

Most emails are forgettable. Creative tone transforms routine communications into memorable moments. This is especially powerful for internal culture-building, customer delight moments, or any communication where you want to stand out from the inbox noise.

**Best for:** Welcome emails, celebration announcements, creative brief distributions, customer milestone acknowledgments.

---

## Top 10 Non-Obvious Power Combinations

These combinations may seem counterintuitive but yield exceptional results for specific use cases.

| Rank | Combination | Why It Works | Best Use Case |
|------|-------------|--------------|---------------|
| 1 | **Deck + Academic + Bullets** | Authority + scannability | Conference presentations |
| 2 | **Copy + Academic + Paragraph** | Trust-building marketing | Regulated industry content |
| 3 | **Code + Creative + Paragraph** | Makes algorithms memorable | Technical blog posts |
| 4 | **Data + Creative + Table** | Inspiring structured content | Content calendars |
| 5 | **Comms + Creative + Email** | Memorable communications | Customer delight emails |
| 6 | **Doc + Instructive + Steps** | Actionable documentation | Incident runbooks |
| 7 | **Deck + Instructive + Steps** | Training that sticks | Workshop materials |
| 8 | **Copy + Instructive + Steps** | Educational marketing | Product tutorials |
| 9 | **Data + Instructive + Table** | Usable decision aids | Troubleshooting guides |
| 10 | **Comms + Academic + Sections** | Credible proposals | Grant applications |

---

## Combinations to Avoid

Some combinations create friction between the output type's purpose and the tone/format pairing.

| Combination | Why It Fails |
|-------------|--------------|
| **Code + Casual + Paragraph** | Too loose for production code; lacks precision |
| **Data + Creative + Paragraph** | Creativity fights the structure data needs |
| **Comms + Academic + Q&A** | Emails shouldn't feel like interrogations |
| **Deck + Academic + Paragraph** | Walls of text don't work on slides |
| **Copy + Instructive + JSON** | Marketing isn't machine-readable |
| **Data + Casual + Paragraph** | Data loses meaning without structure |
| **Deck + Creative + Paragraph** | Slides need scannable chunks, not prose |

---

## Quick Reference: Best Format by Output Type

| Output Type | Primary Format | Secondary Format | Avoid |
|-------------|----------------|------------------|-------|
| **Deck** | Bullets | Numbered | Paragraph |
| **Doc** | Sections | Paragraph | JSON |
| **Data** | Table | JSON | Paragraph |
| **Code** | Sections | Steps | Email |
| **Copy** | Paragraph | Bullets | JSON, Table |
| **Comms** | Email | Bullets | JSON, Table |

---

## Quick Reference: Best Tone by Intent

| Intent | Primary Tone | Secondary Tone |
|--------|--------------|----------------|
| **Persuade** | Creative | Professional |
| **Inform** | Professional | Instructive |
| **Teach** | Instructive | Casual |
| **Impress** | Academic | Professional |
| **Connect** | Casual | Creative |
| **Document** | Professional | Academic |

---

## Conclusion

The most effective combinations often come from understanding the *tension* between elements:

1. **Academic tone + accessible format** (like bullets) creates authoritative yet digestible content
2. **Creative tone + structured format** (like tables) produces inspiring yet usable artifacts
3. **Instructive tone + professional output** (like docs) generates documentation people actually follow

The key insight: **tone and format can compensate for each other**. A rigid format can be softened by a casual tone. An informal tone can be grounded by a structured format. The best combinations leverage this interplay.

---

*Generated for the Intelligent Prompt Builder project*
*Last updated: November 2024*
