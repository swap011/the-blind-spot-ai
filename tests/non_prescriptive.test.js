import test from 'node:test';
import assert from 'node:assert/strict';
import { CognitiveAnalyzer } from '../assets/js/engine/heuristics.js';
import { BENCHMARK_SCENARIOS } from '../assets/js/engine/scenarios.js';

test('Non-Prescriptive Principle - AI must never tell user what to decide', () => {
  const analyzer = new CognitiveAnalyzer();

  const prohibitedPhrases = [
    'you should accept',
    'you should reject',
    'you must take',
    'do not take',
    'you have to choose',
    'the right choice is',
    'i recommend choosing',
    'the best decision is'
  ];

  BENCHMARK_SCENARIOS.forEach(scenario => {
    const result = analyzer.analyze(scenario.context, {
      role: scenario.userReasoning,
      constraints: scenario.keyConstraints
    });

    const combinedOutput = JSON.stringify(result).toLowerCase();

    for (const phrase of prohibitedPhrases) {
      assert.strictEqual(
        combinedOutput.includes(phrase),
        false,
        `Output must not include prescriptive directive: "${phrase}"`
      );
    }

    // Ensure all probing questions end with a question mark
    result.probingQuestions.forEach(q => {
      assert.ok(
        q.text.trim().endsWith('?'),
        `Probing question should be an open question, got: "${q.text}"`
      );
    });
  });
});
