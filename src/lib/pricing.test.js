/**
 * Unit tests for pricing service
 */

import { describe, it, expect } from 'vitest';
import {
  MODEL_PRICING,
  PROVIDER_NAMES,
  getModelPricing,
  calculateCost,
  formatCost,
  formatTokens,
  getProviderFromModel,
  aggregateByProvider,
  aggregateByUser,
  aggregateByFeature,
  FEATURE_LABELS,
} from './pricing';

describe('pricing', () => {
  describe('MODEL_PRICING', () => {
    it('should have pricing for OpenAI models', () => {
      expect(MODEL_PRICING['gpt-4o']).toBeDefined();
      expect(MODEL_PRICING['gpt-4o'].input).toBeGreaterThan(0);
      expect(MODEL_PRICING['gpt-4o'].output).toBeGreaterThan(0);
    });

    it('should have pricing for Anthropic models', () => {
      expect(MODEL_PRICING['claude-3-5-sonnet-20241022']).toBeDefined();
    });

    it('should have pricing for Gemini models', () => {
      expect(MODEL_PRICING['gemini-1.5-pro']).toBeDefined();
    });
  });

  describe('getModelPricing', () => {
    it('should return pricing for known model', () => {
      const pricing = getModelPricing('gpt-4o');
      expect(pricing).toEqual({ input: 2.50, output: 10.00 });
    });

    it('should return null for unknown model', () => {
      expect(getModelPricing('unknown-model')).toBe(null);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly', () => {
      // gpt-4o: $2.50/1M input, $10.00/1M output
      const cost = calculateCost('gpt-4o', 1_000_000, 1_000_000);
      expect(cost).toBe(12.50);
    });

    it('should handle small token counts', () => {
      const cost = calculateCost('gpt-4o', 1000, 500);
      // 1000 input = $0.0025, 500 output = $0.005
      expect(cost).toBeCloseTo(0.0075, 4);
    });

    it('should return null for unknown model', () => {
      expect(calculateCost('unknown-model', 1000, 500)).toBe(null);
    });
  });

  describe('formatCost', () => {
    it('should format normal costs', () => {
      expect(formatCost(12.5)).toBe('$12.5000');
      expect(formatCost(0.0075)).toBe('$0.0075');
    });

    it('should handle zero', () => {
      expect(formatCost(0)).toBe('$0.00');
    });

    it('should handle very small costs', () => {
      expect(formatCost(0.00001)).toBe('< $0.0001');
    });

    it('should handle null/undefined', () => {
      expect(formatCost(null)).toBe('—');
      expect(formatCost(undefined)).toBe('—');
    });

    it('should respect decimal places parameter', () => {
      expect(formatCost(12.5678, 2)).toBe('$12.57');
    });
  });

  describe('formatTokens', () => {
    it('should format millions', () => {
      expect(formatTokens(1_500_000)).toBe('1.5M');
      expect(formatTokens(2_000_000)).toBe('2.0M');
    });

    it('should format thousands', () => {
      expect(formatTokens(1500)).toBe('2K');
      expect(formatTokens(450_000)).toBe('450K');
    });

    it('should format small numbers', () => {
      expect(formatTokens(500)).toBe('500');
    });

    it('should handle null/undefined', () => {
      expect(formatTokens(null)).toBe('—');
      expect(formatTokens(undefined)).toBe('—');
    });
  });

  describe('getProviderFromModel', () => {
    it('should detect OpenAI models', () => {
      expect(getProviderFromModel('gpt-4o')).toBe('openai');
      expect(getProviderFromModel('gpt-3.5-turbo')).toBe('openai');
    });

    it('should detect Anthropic models', () => {
      expect(getProviderFromModel('claude-3-5-sonnet-20241022')).toBe('anthropic');
      expect(getProviderFromModel('claude-3-haiku-20240307')).toBe('anthropic');
    });

    it('should detect Gemini models', () => {
      expect(getProviderFromModel('gemini-1.5-pro')).toBe('gemini');
      expect(getProviderFromModel('gemini-2.0-flash-exp')).toBe('gemini');
    });

    it('should return null for unknown models', () => {
      expect(getProviderFromModel('unknown-model')).toBe(null);
    });
  });

  describe('aggregateByProvider', () => {
    it('should aggregate usage by provider', () => {
      const records = [
        { provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500, estimatedCost: 0.01 },
        { provider: 'openai', model: 'gpt-4o', inputTokens: 2000, outputTokens: 1000, estimatedCost: 0.02 },
        { provider: 'anthropic', model: 'claude-3-5-sonnet', inputTokens: 500, outputTokens: 250, estimatedCost: 0.005 },
      ];

      const result = aggregateByProvider(records);

      expect(result.openai.totalRequests).toBe(2);
      expect(result.openai.totalInputTokens).toBe(3000);
      expect(result.openai.totalOutputTokens).toBe(1500);
      expect(result.openai.estimatedCost).toBe(0.03);
      expect(result.anthropic.totalRequests).toBe(1);
    });

    it('should aggregate by model within provider', () => {
      const records = [
        { provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500, estimatedCost: 0.01 },
        { provider: 'openai', model: 'gpt-4o-mini', inputTokens: 2000, outputTokens: 1000, estimatedCost: 0.002 },
      ];

      const result = aggregateByProvider(records);

      expect(result.openai.byModel['gpt-4o'].requests).toBe(1);
      expect(result.openai.byModel['gpt-4o-mini'].requests).toBe(1);
    });
  });

  describe('aggregateByUser', () => {
    it('should aggregate usage by user', () => {
      const records = [
        { userId: 'user1', userEmail: 'user1@test.com', estimatedCost: 0.01, keySource: 'org' },
        { userId: 'user1', userEmail: 'user1@test.com', estimatedCost: 0.02, keySource: 'org' },
        { userId: 'user2', userEmail: 'user2@test.com', estimatedCost: 0.005, keySource: 'personal' },
      ];

      const result = aggregateByUser(records);

      expect(result.user1.requests).toBe(2);
      expect(result.user1.estimatedCost).toBe(0.03);
      expect(result.user1.email).toBe('user1@test.com');
      expect(result.user2.requests).toBe(1);
      expect(result.user2.keySource).toBe('personal');
    });
  });

  describe('aggregateByFeature', () => {
    it('should aggregate usage by feature', () => {
      const records = [
        { feature: 'prompt_generation', estimatedCost: 0.01 },
        { feature: 'prompt_generation', estimatedCost: 0.02 },
        { feature: 'experiment', estimatedCost: 0.005 },
      ];

      const result = aggregateByFeature(records);

      expect(result.prompt_generation.requests).toBe(2);
      expect(result.prompt_generation.estimatedCost).toBe(0.03);
      expect(result.experiment.requests).toBe(1);
    });

    it('should handle missing feature as unknown', () => {
      const records = [{ estimatedCost: 0.01 }];
      const result = aggregateByFeature(records);
      expect(result.unknown.requests).toBe(1);
    });
  });

  describe('FEATURE_LABELS', () => {
    it('should have labels for all features', () => {
      expect(FEATURE_LABELS.prompt_generation).toBe('Prompt Generation');
      expect(FEATURE_LABELS.experiment).toBe('Experiments');
      expect(FEATURE_LABELS.reverse_prompt).toBe('Reverse Prompt');
      expect(FEATURE_LABELS.quality_assessment).toBe('Quality Assessment');
    });
  });
});
