/**
 * Dual-Mode AI Analysis Provider
 * Supports both Google Gemini API (when configured) and the Built-in Cognitive Heuristics Engine.
 * Enforces the strict rule: "The system should not make the decision for the user."
 */

import { CognitiveAnalyzer } from '../engine/heuristics.js';
import { PERSONAS } from '../engine/personas.js';

export class DecisionAIService {
  constructor() {
    this.localAnalyzer = new CognitiveAnalyzer();
    this.geminiApiKey = localStorage.getItem('blind_spot_gemini_key') || '';
    this.geminiModel = 'gemini-1.5-flash';
  }

  setApiKey(key) {
    this.geminiApiKey = (key || '').trim();
    if (this.geminiApiKey) {
      localStorage.setItem('blind_spot_gemini_key', this.geminiApiKey);
    } else {
      localStorage.removeItem('blind_spot_gemini_key');
    }
  }

  hasApiKey() {
    return Boolean(this.geminiApiKey);
  }

  /**
   * Primary entry point for decision analysis.
   */
  async analyzeDecision(payload, personaId = 'socratic') {
    const persona = PERSONAS[personaId] || PERSONAS.socratic;

    // Run local engine first for instant baseline
    const localResult = this.localAnalyzer.analyze(payload.context, {
      role: payload.reasoning,
      constraints: payload.constraints
    });

    // If no API key is provided, return rich local analysis immediately
    if (!this.hasApiKey()) {
      return {
        ...localResult,
        source: 'Cognitive Heuristics Engine (Offline/Local)',
        persona
      };
    }

    // If Gemini key is available, enhance with live LLM synthesis
    try {
      const llmResult = await this.callGemini(payload, persona);
      return {
        ...localResult,
        ...llmResult,
        source: 'Google Gemini AI (Live Augmented)',
        persona
      };
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local cognitive heuristics:', err);
      return {
        ...localResult,
        source: 'Cognitive Heuristics Engine (Offline Fallback)',
        fallbackNotice: 'Live Gemini API connection timed out or hit rate limits; served high-precision deterministic analysis.',
        persona
      };
    }
  }

  async callGemini(payload, persona) {
    const prompt = `
You are "The Blind Spot", an elite AI-powered cognitive decision analysis engine.
Active Thinking Persona: ${persona.name} (${persona.tagline}).
Tone: ${persona.tone}.
Perspective: ${persona.perspective}.

CRITICAL MANDATORY RULE:
YOU MUST NOT MAKE THE DECISION FOR THE USER. DO NOT RECOMMEND ACCEPTING, REJECTING, OR CHOOSING AN OPTION.
Your sole purpose is to help the user identify blind spots in their reasoning, uncover hidden assumptions, examine trade-offs, and explore calibrated Socratic questions.

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

Please analyze this decision and return a valid JSON object matching this exact schema:
{
  "summary": "2-3 sentence neutral overview of the decision landscape and primary blind spots surfaced",
  "detectedBiases": [
    {
      "name": "Name of bias",
      "description": "How this bias specifically manifests in the user's scenario",
      "severity": "High" | "Medium" | "Low"
    }
  ],
  "unstatedAssumptions": [
    {
      "id": "asmp_1",
      "title": "Title of assumption",
      "implicitBelief": "What the user is taking for granted without empirical validation",
      "stressTestQuestion": "A precise probing question to test this assumption",
      "status": "Unverified"
    }
  ],
  "overlookedFactors": [
    {
      "category": "Domain category (e.g. Academic, Career, Mental Well-being, Legal)",
      "factor": "Specific overlooked 2nd or 3rd order factor",
      "impact": "Concrete consequence if ignored"
    }
  ],
  "reasoningConflicts": [
    {
      "dilemma": "Name of internal contradiction",
      "observation": "Where the user's goals or reasoning contradict themselves",
      "reflection": "Probing question to resolve the conflict"
    }
  ],
  "probingQuestions": [
    {
      "tag": "Category tag",
      "text": "Open-ended, non-prescriptive probing question"
    }
  ],
  "preMortem": {
    "timeframe": "12 Months in the Future",
    "scenario": "A plausible worst-case outcome if critical blind spots are ignored",
    "rootCauses": ["Key root cause 1", "Key root cause 2"],
    "preventionCheck": "Actionable guardrail to prevent this scenario"
  }
}
Output only the raw JSON string without markdown code fences or conversational text.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiApiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini API');

    const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleanedText);
  }
}
