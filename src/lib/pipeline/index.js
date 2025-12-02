/**
 * Pipeline Module
 * 
 * Public API for the split analysis/generation pipeline.
 * 
 * @module pipeline
 */

/**
 * Intent analysis functions
 */
export { analyzeIntent } from './analyzer.js';

/**
 * Prompt generation functions
 */
export { generatePrompt } from './generator.js';

/**
 * Pipeline orchestration and execution
 */
export { 
  runPipeline, 
  runAnalysisOnly, 
  runGenerationOnly 
} from './orchestrator.js';
