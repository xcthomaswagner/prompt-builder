# Intelligent Prompt Builder

This is a React application that enriches and structures LLM prompts using a "reverse prompting" architecture.

## Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configuration:**
   - Copy `.env.example` to `.env`
   - Fill in your Google Gemini API Key.
   - Fill in your Firebase configuration details.
   - **Note:** You must enable **Firestore** and **Anonymous Authentication** in your Firebase Console.

3. **Run Locally:**
   ```bash
   npm run dev
   ```

## Architecture
The app uses a "Domain-First" approach:
1. Analyzes user input for domain and nouns.
2. Checks sufficiency.
3. Conditionally triggers "Reverse Prompting" if the input is vague.
4. Synthesizes a final cohesive prompt using Gemini.
