import test from 'node:test';
import assert from 'node:assert/strict';
import { CognitiveAnalyzer } from '../assets/js/engine/heuristics.js';
import { BENCHMARK_SCENARIOS } from '../assets/js/engine/scenarios.js';

test('CognitiveAnalyzer - processes Hack2skill Internship Benchmark', () => {
  const analyzer = new CognitiveAnalyzer();
  const benchmark = BENCHMARK_SCENARIOS.find(s => s.id === 'hackathon_internship');
  assert.ok(benchmark, 'Benchmark scenario must exist');

  const result = analyzer.analyze(benchmark.context, {
    role: benchmark.userReasoning,
    constraints: benchmark.keyConstraints
  });

  // Check structure
  assert.ok(result.metrics, 'Result must contain metrics');
  assert.ok(result.unstatedAssumptions.length > 0, 'Must expose unstated assumptions');
  assert.ok(result.detectedBiases.length > 0, 'Must detect cognitive biases');
  assert.ok(result.overlookedFactors.length > 0, 'Must surface overlooked factors');
  assert.ok(result.probingQuestions.length > 0, 'Must generate probing questions');
  assert.ok(result.preMortem, 'Must provide pre-mortem simulation');

  // Verify specific problem statement elements
  const biasNames = result.detectedBiases.map(b => b.name);
  assert.ok(
    biasNames.some(n => n.includes('Salience') || n.includes('Availability')),
    'Should flag Salience Bias due to focus on immediate stipend & location'
  );

  // Verify unstated assumption regarding academic workload & attendance
  const assumptionTitles = result.unstatedAssumptions.map(a => a.title);
  assert.ok(
    assumptionTitles.some(t => t.includes('Academic') || t.includes('Policy')),
    'Should identify academic/college workload assumption'
  );

  // Verify mentorship assumption
  assert.ok(
    assumptionTitles.some(t => t.includes('Mentorship') || t.includes('Learning')),
    'Should identify mentorship vs busywork assumption'
  );
});

test('CognitiveAnalyzer - detects conflicts when competing priorities exist', () => {
  const analyzer = new CognitiveAnalyzer();
  const input = 'I want a 9.5 GPA in college exams, but I am accepting a 50-hour intense full time internship for the cash stipend.';
  const result = analyzer.analyze(input);

  assert.ok(result.reasoningConflicts.length > 0, 'Must detect conflict between high GPA and intensive full time hours');
});

test('CognitiveAnalyzer - generates valid pre-mortem structure', () => {
  const analyzer = new CognitiveAnalyzer();
  const result = analyzer.analyze('Considering starting an expensive project.');

  assert.ok(result.preMortem.timeframe, 'Pre-mortem should define horizon');
  assert.ok(Array.isArray(result.preMortem.rootCauses), 'Pre-mortem should list root causes');
  assert.ok(result.preMortem.preventionCheck, 'Pre-mortem should have actionable guardrail');
});
