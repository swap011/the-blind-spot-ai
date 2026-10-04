/**
 * @fileoverview Dual-Mode AI Analysis Provider for The Blind Spot.
 *
 * Supports two analysis modes:
 *  1. Built-in Cognitive Heuristics Engine (offline, zero dependencies, instant)
 *  2. Google Gemini API (optional, live LLM augmentation when API key is configured)
 *
 * Core Mandate: The system MUST NOT make the decision for the user.
 * Every output is non-prescriptive — it surfaces blind spots, not verdicts.
 *
 * @module llm_provider
 */

import { CognitiveAnalyzer } from '../engine/heuristics.js';
import { PERSONAS } from '../engine/personas.js';

/** @typedef {{ context: string, reasoning?: string, constraints?: string }} AnalysisPayload */

/** @typedef {{ score: number, label: string, color: string }} HealthScore */

/**
 * @typedef {Object} AnalysisResult
 * @property {string}   source             - 'Cognitive Heuristics Engine' or 'Google Gemini AI'
 * @property {Object}   metrics            - Quantitative blind-spot metrics
 * @property {HealthScore} decisionHealthScore - Decision readiness score (0–100)
 * @property {Array}    detectedBiases     - Cognitive biases found in the text
 * @property {Array}    unstatedAssumptions - Unverified premises
 * @property {Array}    overlookedFactors  - 2nd and 3rd order consequences
 * @property {Array}    reasoningConflicts - Internal value contradictions
 * @property {Array}    probingQuestions   - Non-prescriptive Socratic questions
 * @property {Object}   preMortem          - Prospective failure simulation
 * @property {string}   summary            - Neutral overview text
 * @property {Object}   persona            - Active thinking lens
 */

/** Gemini model to use for live analysis augmentation. */
const GEMINI_MODEL = 'gemini-1.5-flash';

/** localStorage key for the optional API key. */
const STORAGE_KEY = 'blind_spot_gemini_key';

/** Timeout for Gemini API requests in milliseconds. */
const API_TIMEOUT_MS = 12_000;

export class DecisionAIService {
  constructor() {
    /** @type {CognitiveAnalyzer} */
    this.localAnalyzer = new CognitiveAnalyzer();

    /** @type {string} */
    this._apiKey = '';

    // Safely read API key from localStorage (may fail in sandboxed environments)
    try {
      this._apiKey = localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      this._apiKey = '';
    }

    /** @type {Map<string, AnalysisResult>} In-memory result cache keyed by context hash. */
    this._cache = new Map();
  }

  /**
   * Set the Gemini API key and persist it to localStorage.
   * Passing an empty string clears the key.
   * @param {string} key - The new API key value.
   */
  setApiKey(key) {
    this._apiKey = (key ?? '').trim();
    try {
      if (this._apiKey) {
        localStorage.setItem(STORAGE_KEY, this._apiKey);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage may be unavailable in certain browser contexts
    }
  }

  /**
   * Returns true if a Gemini API key is configured.
   * @returns {boolean}
   */
  hasApiKey() {
    return Boolean(this._apiKey);
  }

  /**
   * Generates a lightweight hash string for caching analysis results.
   * Not cryptographic — used only for in-session memoisation.
   * @param {AnalysisPayload} payload
   * @param {string} personaId
   * @returns {string}
   */
  _cacheKey(payload, personaId) {
    return `${personaId}:${payload.context.slice(0, 120)}:${payload.reasoning ?? ''}:${payload.constraints ?? ''}`;
  }

  /**
   * Primary entry point for decision analysis.
   * Runs the local heuristics engine first for instant baseline results,
   * then optionally augments with live Gemini output if an API key is set.
   *
   * @param {AnalysisPayload} payload - User-supplied decision context.
   * @param {string} [personaId='socratic'] - Active thinking lens ID.
   * @returns {Promise<AnalysisResult>}
   */
  async analyzeDecision(payload, personaId = 'socratic') {
    const persona = PERSONAS[personaId] ?? PERSONAS.socratic;
    const key = this._cacheKey(payload, personaId);

    // Return cached result for identical inputs within the same session
    if (this._cache.has(key)) {
      return { ...this._cache.get(key), _cached: true };
    }

    // Always run the deterministic heuristics engine for instant baseline
    const localResult = this.localAnalyzer.analyze(payload.context, {
      role: payload.reasoning,
      constraints: payload.constraints,
    });

    const baseResult = { ...localResult, persona };

    if (!this.hasApiKey()) {
      const result = { ...baseResult, source: 'Cognitive Heuristics Engine (Offline)' };
      this._cache.set(key, result);
      return result;
    }

    // Attempt live Gemini augmentation with a hard timeout
    try {
      const llmResult = await this._fetchWithTimeout(
        () => this._callGemini(payload, persona),
        API_TIMEOUT_MS
      );
      const result = {
        ...baseResult,
        ...llmResult,
        source: 'Google Gemini AI (Live Augmented)',
        persona,
      };
      this._cache.set(key, result);
      return result;
    } catch (err) {
      console.warn('[BlindSpot] Gemini API unavailable, using offline engine:', err.message);
      const result = {
        ...baseResult,
        source: 'Cognitive Heuristics Engine (Offline Fallback)',
        _fallbackReason: err.message,
      };
      this._cache.set(key, result);
      return result;
    }
  }

  /**
   * Wraps an async factory in a race against a timeout.
   * @param {() => Promise<any>} fn - Async function to run.
   * @param {number} ms - Timeout in milliseconds.
   * @returns {Promise<any>}
   */
  async _fetchWithTimeout(fn, ms) {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    );
    return Promise.race([fn(), timeout]);
  }

  /**
   * Calls the Gemini generateContent API with a structured non-prescriptive prompt.
   * Parses and returns the JSON response, stripping markdown fences if present.
   *
   * @param {AnalysisPayload} payload
   * @param {Object} persona - Active thinking lens object.
   * @returns {Promise<Partial<AnalysisResult>>}
   * @throws {Error} If the API returns a non-OK status or an empty response body.
   */
  async _callGemini(payload, persona) {
    const prompt = this._buildPrompt(payload, persona);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${this._apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Gemini HTTP ${response.status}: ${body.slice(0, 120)}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Gemini returned an empty response body');

    // Strip markdown fences that some models prepend despite responseMimeType
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new Error('Gemini response could not be parsed as JSON');
    }
  }

  /**
   * Builds the structured non-prescriptive Gemini prompt.
   * @param {AnalysisPayload} payload
   * @param {Object} persona
   * @returns {string}
   */
  _buildPrompt(payload, persona) {
    return `
You are "The Blind Spot", an elite AI-powered cognitive decision analysis engine.
Active Thinking Persona: ${persona.name} (${persona.tagline}).
Tone: ${persona.tone}.
Perspective: ${persona.perspective}.

CRITICAL MANDATORY RULE:
YOU MUST NOT MAKE THE DECISION FOR THE USER.
DO NOT RECOMMEND ACCEPTING, REJECTING, OR CHOOSING ANY OPTION.
Your sole purpose is to surface hidden assumptions, map cognitive biases, reveal second-order consequences, and generate calibrated Socratic probing questions.

User Decision Context:
"""
${payload.context}
"""

User's Stated Reasoning & Motivations:
"""
${payload.reasoning || 'Not explicitly stated'}
"""

Known Constraints & Deadlines:
"""
${payload.constraints || 'Not explicitly stated'}
"""

Return a valid JSON object with this exact schema (no markdown fences, no extra text):
{
  "summary": "2-3 sentence neutral overview of the decision landscape and blind spots surfaced",
  "detectedBiases": [
    { "name": "string", "description": "string", "severity": "High|Medium|Low", "icon": "emoji" }
  ],
  "unstatedAssumptions": [
    {
      "id": "asmp_N",
      "title": "string",
      "implicitBelief": "string",
      "stressTestQuestion": "string",
      "status": "Unverified",
      "category": "string"
    }
  ],
  "overlookedFactors": [
    { "category": "string", "factor": "string", "impact": "string", "icon": "emoji" }
  ],
  "reasoningConflicts": [
    { "dilemma": "string", "observation": "string", "reflection": "string" }
  ],
  "probingQuestions": [
    { "tag": "string", "text": "string (must end with ?)" }
  ],
  "preMortem": {
    "timeframe": "12 Months in the Future",
    "scenario": "string",
    "rootCauses": ["string"],
    "preventionCheck": "string"
  }
}`.trim();
  }
}
