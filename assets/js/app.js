/**
 * The Blind Spot - Application Orchestrator
 * Coordinates UI, scenario loading, persona lenses, and cognitive engine analysis.
 */

import { CognitiveAnalyzer } from './engine/heuristics.js';
import { PERSONAS } from './engine/personas.js';
import { BENCHMARK_SCENARIOS } from './engine/scenarios.js';
import { DecisionAIService } from './services/llm_provider.js';
import { sanitizeHtml, validateInput } from './engine/sanitization.js';

class BlindSpotApp {
  constructor() {
    this.aiService = new DecisionAIService();
    this.currentPersonaId = 'socratic';
    this.currentAnalysis = null;

    this.initElements();
    this.bindEvents();
    this.populatePresets();
    this.renderPersonaOptions();
    
    // Auto-load the hackathon benchmark scenario by default
    this.loadScenario('hackathon_internship');
  }

  initElements() {
    this.presetSelect = document.getElementById('preset-select');
    this.contextInput = document.getElementById('context-input');
    this.reasoningInput = document.getElementById('reasoning-input');
    this.constraintsInput = document.getElementById('constraints-input');
    this.analyzeBtn = document.getElementById('analyze-btn');
    this.personaContainer = document.getElementById('persona-container');
    
    // Dashboard & result zones
    this.resultsZone = document.getElementById('results-zone');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.emptyState = document.getElementById('empty-state');
    
    // Metric badges
    this.metricTotalBlindspots = document.getElementById('metric-total-blindspots');
    this.metricBiases = document.getElementById('metric-biases');
    this.metricAssumptions = document.getElementById('metric-assumptions');
    this.metricReadiness = document.getElementById('metric-readiness');
    
    // Detailed sections
    this.summaryText = document.getElementById('analysis-summary-text');
    this.assumptionsList = document.getElementById('assumptions-list');
    this.biasesList = document.getElementById('biases-list');
    this.overlookedList = document.getElementById('overlooked-list');
    this.conflictsList = document.getElementById('conflicts-list');
    this.probingList = document.getElementById('probing-questions-list');
    this.premortemBox = document.getElementById('premortem-content');
    
    // Modals
    this.apiKeyModal = document.getElementById('api-key-modal');
    this.exportModal = document.getElementById('export-modal');
    this.apiKeyInput = document.getElementById('gemini-api-key-input');
  }

  bindEvents() {
    this.presetSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        this.loadScenario(e.target.value);
      }
    });

    this.analyzeBtn.addEventListener('click', () => this.runAnalysis());

    document.getElementById('open-api-modal-btn')?.addEventListener('click', () => {
      this.apiKeyInput.value = localStorage.getItem('blind_spot_gemini_key') || '';
      this.apiKeyModal.classList.add('active');
    });

    document.getElementById('save-api-key-btn')?.addEventListener('click', () => {
      this.aiService.setApiKey(this.apiKeyInput.value);
      this.apiKeyModal.classList.remove('active');
      alert('API settings saved! If an API key is provided, Gemini will augment analyses.');
    });

    document.getElementById('close-api-modal-btn')?.addEventListener('click', () => {
      this.apiKeyModal.classList.remove('active');
    });

    document.getElementById('export-audit-btn')?.addEventListener('click', () => this.openExportModal());
    document.getElementById('close-export-modal-btn')?.addEventListener('click', () => {
      this.exportModal.classList.remove('active');
    });

    document.getElementById('copy-export-btn')?.addEventListener('click', () => {
      const text = document.getElementById('export-markdown-content').value;
      navigator.clipboard.writeText(text).then(() => {
        alert('Decision Audit Brief copied to clipboard!');
      });
    });
  }

  populatePresets() {
    this.presetSelect.innerHTML = '<option value="">-- Choose a Realistic Scenario --</option>';
    BENCHMARK_SCENARIOS.forEach(sc => {
      const opt = document.createElement('option');
      opt.value = sc.id;
      opt.textContent = sc.title;
      this.presetSelect.appendChild(opt);
    });
  }

  loadScenario(scenarioId) {
    const sc = BENCHMARK_SCENARIOS.find(s => s.id === scenarioId);
    if (!sc) return;
    this.presetSelect.value = scenarioId;
    this.contextInput.value = sc.context;
    this.reasoningInput.value = sc.userReasoning;
    this.constraintsInput.value = sc.keyConstraints;
  }

  renderPersonaOptions() {
    this.personaContainer.innerHTML = '';
    Object.values(PERSONAS).forEach(p => {
      const card = document.createElement('div');
      card.className = `persona-card ${p.id === this.currentPersonaId ? 'active' : ''}`;
      card.onclick = () => {
        this.currentPersonaId = p.id;
        document.querySelectorAll('.persona-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        if (this.currentAnalysis) {
          this.runAnalysis();
        }
      };

      card.innerHTML = `
        <div class="persona-header">
          <span>${p.avatar}</span>
          <span>${p.name}</span>
        </div>
        <div class="persona-subtitle">${p.tagline}</div>
      `;
      this.personaContainer.appendChild(card);
    });
  }

  async runAnalysis() {
    const validation = validateInput(this.contextInput.value, 15);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const payload = {
      context: validation.sanitized,
      reasoning: this.reasoningInput.value.trim(),
      constraints: this.constraintsInput.value.trim()
    };

    // UI state: loading
    this.analyzeBtn.disabled = true;
    this.analyzeBtn.textContent = 'Scanning Blind Spots...';
    this.emptyState.style.display = 'none';
    this.loadingIndicator.style.display = 'block';

    try {
      const result = await this.aiService.analyzeDecision(payload, this.currentPersonaId);
      this.currentAnalysis = result;
      this.renderResults(result);
    } catch (err) {
      console.error(err);
      alert('Analysis encountered an issue. Falling back to offline heuristic engine.');
      const fallback = this.aiService.localAnalyzer.analyze(payload.context);
      this.renderResults(fallback);
    } finally {
      this.loadingIndicator.style.display = 'none';
      this.analyzeBtn.disabled = false;
      this.analyzeBtn.innerHTML = '⚡ Reveal My Blind Spots';
    }
  }

  renderResults(res) {
    this.resultsZone.style.display = 'flex';
    this.resultsZone.classList.add('animate-fade-in');

    // Metrics
    this.metricTotalBlindspots.textContent = res.metrics?.totalBlindSpots || (res.unstatedAssumptions.length + res.detectedBiases.length);
    this.metricBiases.textContent = res.detectedBiases?.length || 0;
    this.metricAssumptions.textContent = res.unstatedAssumptions?.length || 0;
    this.metricReadiness.textContent = res.metrics?.readinessGrade || 'Analyzed';

    // Summary
    this.summaryText.textContent = res.summary || 'Decision landscape parsed. Review surfaced blind spots below.';

    // Render Assumptions with interactive check buttons
    this.assumptionsList.innerHTML = '';
    (res.unstatedAssumptions || []).forEach(asmp => {
      const item = document.createElement('div');
      item.className = 'assumption-item';
      item.innerHTML = `
        <div class="assumption-top">
          <span class="assumption-name">⚠️ ${sanitizeHtml(asmp.title)}</span>
          <span class="badge badge-high">Unverified Assumption</span>
        </div>
        <div class="assumption-detail">${sanitizeHtml(asmp.implicitBelief)}</div>
        <div class="stress-question">
          <strong>Calibrated Stress-Test:</strong> ${sanitizeHtml(asmp.stressTestQuestion)}
        </div>
        <div class="assumption-status-toggle">
          <button class="status-btn active" onclick="this.parentElement.querySelectorAll('button').forEach(b=>b.className='status-btn'); this.className='status-btn flagged';">Unchecked</button>
          <button class="status-btn" onclick="this.parentElement.querySelectorAll('button').forEach(b=>b.className='status-btn'); this.className='status-btn active';">Empirically Verified</button>
        </div>
      `;
      this.assumptionsList.appendChild(item);
    });

    // Render Biases
    this.biasesList.innerHTML = '';
    (res.detectedBiases || []).forEach(b => {
      const card = document.createElement('div');
      card.className = 'bias-card';
      const badgeClass = b.severity === 'High' ? 'badge-high' : (b.severity === 'Medium' ? 'badge-medium' : 'badge-low');
      card.innerHTML = `
        <div class="bias-title">
          <span>🧠 ${sanitizeHtml(b.name)}</span>
          <span class="badge ${badgeClass}">${b.severity || 'Medium'} Impact</span>
        </div>
        <div class="bias-desc">${sanitizeHtml(b.description)}</div>
      `;
      this.biasesList.appendChild(card);
    });

    // Render Overlooked Factors
    this.overlookedList.innerHTML = '';
    (res.overlookedFactors || []).forEach(f => {
      const row = document.createElement('div');
      row.className = 'assumption-item';
      row.innerHTML = `
        <div class="assumption-top">
          <span class="assumption-name">🔭 ${sanitizeHtml(f.factor)}</span>
          <span class="badge badge-cyan">${sanitizeHtml(f.category)}</span>
        </div>
        <div class="assumption-detail">${sanitizeHtml(f.impact)}</div>
      `;
      this.overlookedList.appendChild(row);
    });

    // Render Conflicts
    this.conflictsList.innerHTML = '';
    (res.reasoningConflicts || []).forEach(c => {
      const row = document.createElement('div');
      row.className = 'assumption-item';
      row.innerHTML = `
        <div class="assumption-top">
          <span class="assumption-name">⚖️ ${sanitizeHtml(c.dilemma)}</span>
          <span class="badge badge-medium">Friction Point</span>
        </div>
        <div class="assumption-detail">${sanitizeHtml(c.observation)}</div>
        <div class="stress-question">
          <strong>Key Dilemma Question:</strong> ${sanitizeHtml(c.reflection)}
        </div>
      `;
      this.conflictsList.appendChild(row);
    });

    // Render Probing Questions
    this.probingList.innerHTML = '';
    (res.probingQuestions || []).forEach(q => {
      const qItem = document.createElement('div');
      qItem.className = 'question-item';
      qItem.innerHTML = `
        <div class="question-icon">💬</div>
        <div class="question-text">
          <strong>[${sanitizeHtml(q.tag)}]:</strong> ${sanitizeHtml(q.text)}
        </div>
      `;
      this.probingList.appendChild(qItem);
    });

    // Render Pre-Mortem
    if (res.preMortem) {
      this.premortemBox.innerHTML = `
        <p style="font-size: 0.9rem; margin-bottom: 0.75rem; color: #fecdd3;">
          <strong>Simulation Horizon:</strong> ${sanitizeHtml(res.preMortem.timeframe || '12 Months Out')}
        </p>
        <p style="font-size: 0.85rem; color: #cbd5e1;">${sanitizeHtml(res.preMortem.scenario)}</p>
        <ul class="premortem-list">
          ${(res.preMortem.rootCauses || []).map(r => `<li>${sanitizeHtml(r)}</li>`).join('')}
        </ul>
        <div class="prevention-box">
          <strong>Critical Prevention Guardrail:</strong> ${sanitizeHtml(res.preMortem.preventionCheck)}
        </div>
      `;
    }
  }

  openExportModal() {
    if (!this.currentAnalysis) {
      alert('Please analyze a decision first before exporting.');
      return;
    }

    const res = this.currentAnalysis;
    const persona = PERSONAS[this.currentPersonaId] || PERSONAS.socratic;
    const md = `# Decision Blind Spot Audit Report
**Generated By**: The Blind Spot AI Assistant (PromptWars @ Hack2skill)
**Thinking Lens**: ${persona.name} (${persona.tagline})
**Date**: ${new Date().toLocaleDateString()}
**Guiding Mandate**: Non-Prescriptive Decision Support (Same decisions. A wider view.)

---

## 1. Executive Summary
${res.summary}

## 2. Decision Clarity Metrics
- Total Blind Spots Identified: ${res.metrics?.totalBlindSpots || 0}
- Cognitive Biases Detected: ${res.detectedBiases?.length || 0}
- Unstated Assumptions: ${res.unstatedAssumptions?.length || 0}
- Readyness Level: ${res.metrics?.readinessGrade || 'Analyzed'}

## 3. Unstated Assumptions Exposed
${(res.unstatedAssumptions || []).map((a, i) => `### ${i+1}. ${a.title}
- **Implicit Assumption**: ${a.implicitBelief}
- **Stress-Test Question**: ${a.stressTestQuestion}
`).join('\n')}

## 4. Cognitive Biases Detected
${(res.detectedBiases || []).map(b => `- **${b.name}** [Severity: ${b.severity}]: ${b.description}`).join('\n')}

## 5. Overlooked 2nd & 3rd Order Factors
${(res.overlookedFactors || []).map(f => `- **${f.factor}** (${f.category}): ${f.impact}`).join('\n')}

## 6. Socratic Probing Questions (Non-Prescriptive)
${(res.probingQuestions || []).map(q => `- [${q.tag}] ${q.text}`).join('\n')}

## 7. Pre-Mortem Worst-Case Simulation
- **Scenario**: ${res.preMortem?.scenario || 'N/A'}
- **Guardrail**: ${res.preMortem?.preventionCheck || 'N/A'}

---
*Remember: This report does not decide for you. Use these questions to conduct due diligence and negotiate terms.*
`;

    document.getElementById('export-markdown-content').value = md;
    this.exportModal.classList.add('active');
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new BlindSpotApp();
});
