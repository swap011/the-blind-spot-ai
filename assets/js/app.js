/**
 * The Blind Spot - Application Orchestrator v2
 * New: Decision Health Score ring, Follow-up Chat, interactive assumption tracker,
 * enhanced factor rendering, persona-aware labels.
 */

import { CognitiveAnalyzer } from './engine/heuristics.js';
import { PERSONAS } from './engine/personas.js';
import { BENCHMARK_SCENARIOS } from './engine/scenarios.js';
import { DecisionAIService } from './services/llm_provider.js';
import { sanitizeHtml, validateInput } from './engine/sanitization.js';
import { generateFollowUpResponse } from './engine/followup.js';

class BlindSpotApp {
  constructor() {
    this.aiService = new DecisionAIService();
    this.currentPersonaId = 'socratic';
    this.currentAnalysis = null;
    this.assumptionStates = {};
    this.verifiedCount = 0;

    this.initElements();
    this.bindEvents();
    this.populatePresets();
    this.renderPersonaOptions();
    this.loadScenario('hackathon_internship');
  }

  initElements() {
    this.presetSelect = document.getElementById('preset-select');
    this.contextInput = document.getElementById('context-input');
    this.reasoningInput = document.getElementById('reasoning-input');
    this.constraintsInput = document.getElementById('constraints-input');
    this.analyzeBtn = document.getElementById('analyze-btn');
    this.personaContainer = document.getElementById('persona-container');

    this.resultsZone = document.getElementById('results-zone');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.emptyState = document.getElementById('empty-state');

    this.metricTotalBlindspots = document.getElementById('metric-total-blindspots');
    this.metricBiases = document.getElementById('metric-biases');
    this.metricAssumptions = document.getElementById('metric-assumptions');
    this.metricReadiness = document.getElementById('metric-readiness');

    this.summaryText = document.getElementById('analysis-summary-text');
    this.assumptionsList = document.getElementById('assumptions-list');
    this.biasesList = document.getElementById('biases-list');
    this.overlookedList = document.getElementById('overlooked-list');
    this.conflictsList = document.getElementById('conflicts-list');
    this.probingList = document.getElementById('probing-questions-list');
    this.premortemBox = document.getElementById('premortem-content');

    this.apiKeyModal = document.getElementById('api-key-modal');
    this.exportModal = document.getElementById('export-modal');
    this.apiKeyInput = document.getElementById('gemini-api-key-input');

    // Health score ring elements
    this.scoreRingFill = document.getElementById('score-ring-fill');
    this.scoreRingText = document.getElementById('score-ring-text');
    this.scoreLabel = document.getElementById('score-label');
    this.scoreDesc = document.getElementById('score-desc');

    // Progress tracker
    this.verifiedProgress = document.getElementById('verified-progress');
    this.verifiedLabel = document.getElementById('verified-label');

    // Chat
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.chatSendBtn = document.getElementById('chat-send-btn');
  }

  bindEvents() {
    this.presetSelect.addEventListener('change', (e) => {
      if (e.target.value) this.loadScenario(e.target.value);
    });

    this.analyzeBtn.addEventListener('click', () => this.runAnalysis());

    this.contextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) this.runAnalysis();
    });

    document.getElementById('open-api-modal-btn')?.addEventListener('click', () => {
      this.apiKeyInput.value = localStorage.getItem('blind_spot_gemini_key') || '';
      this.apiKeyModal.classList.add('active');
    });

    document.getElementById('save-api-key-btn')?.addEventListener('click', () => {
      this.aiService.setApiKey(this.apiKeyInput.value);
      this.apiKeyModal.classList.remove('active');
      this.showToast('API key saved! Gemini AI will augment analyses when available.', 'success');
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
        this.showToast('Audit report copied to clipboard!', 'success');
      });
    });

    // Chat
    this.chatSendBtn?.addEventListener('click', () => this.sendChatMessage());
    this.chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChatMessage(); }
    });

    // Close modals on overlay click
    [this.apiKeyModal, this.exportModal].forEach(m => {
      m?.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('active'); });
    });
  }

  populatePresets() {
    this.presetSelect.innerHTML = '<option value="">-- Load a Benchmark Scenario --</option>';
    BENCHMARK_SCENARIOS.forEach(sc => {
      const opt = document.createElement('option');
      opt.value = sc.id;
      opt.textContent = `${sc.category ? `[${sc.category}] ` : ''}${sc.title}`;
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
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Select ${p.name} thinking lens`);
      card.onclick = () => {
        this.currentPersonaId = p.id;
        document.querySelectorAll('.persona-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        if (this.currentAnalysis) this.runAnalysis();
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
    if (!validation.valid) { this.showToast(validation.error, 'error'); return; }

    const payload = {
      context: validation.sanitized,
      reasoning: this.reasoningInput.value.trim(),
      constraints: this.constraintsInput.value.trim()
    };

    this.analyzeBtn.disabled = true;
    this.analyzeBtn.innerHTML = '<span class="animate-spin" style="display:inline-block">⚙️</span> Scanning...';
    this.emptyState.style.display = 'none';
    this.loadingIndicator.style.display = 'block';
    this.resultsZone.style.display = 'none';
    this.assumptionStates = {};
    this.verifiedCount = 0;

    try {
      const result = await this.aiService.analyzeDecision(payload, this.currentPersonaId);
      this.currentAnalysis = result;
      this.renderResults(result);
    } catch (err) {
      console.error(err);
      this.showToast('Falling back to offline heuristic engine.', 'warning');
      const fallback = this.aiService.localAnalyzer.analyze(payload.context);
      this.currentAnalysis = fallback;
      this.renderResults(fallback);
    } finally {
      this.loadingIndicator.style.display = 'none';
      this.analyzeBtn.disabled = false;
      this.analyzeBtn.innerHTML = '⚡ Reveal My Blind Spots';
    }
  }

  renderResults(res) {
    this.resultsZone.style.display = 'flex';
    requestAnimationFrame(() => this.resultsZone.classList.add('animate-fade-in'));

    // Metrics
    this.metricTotalBlindspots.textContent = res.metrics?.totalBlindSpots ?? (res.unstatedAssumptions.length + res.detectedBiases.length);
    this.metricBiases.textContent = res.detectedBiases?.length ?? 0;
    this.metricAssumptions.textContent = res.unstatedAssumptions?.length ?? 0;
    this.metricReadiness.textContent = res.metrics?.readinessGrade ?? 'Analyzed';

    // Health Score Ring
    this.renderHealthScore(res.decisionHealthScore || { score: 50, label: 'Partially Examined', color: '#f59e0b' });

    // Summary
    this.summaryText.textContent = res.summary ?? 'Analysis complete. Review surfaced blind spots below.';

    // Assumptions with interactive state
    this.renderAssumptions(res.unstatedAssumptions || []);

    // Biases
    this.biasesList.innerHTML = '';
    (res.detectedBiases || []).forEach(b => {
      const card = document.createElement('div');
      card.className = 'bias-card';
      const badgeClass = b.severity === 'High' || b.riskLevel === 'High' ? 'badge-high' : b.severity === 'Medium' ? 'badge-medium' : 'badge-low';
      card.innerHTML = `
        <div class="bias-title">
          <span class="bias-name">${b.icon || '🧠'} ${sanitizeHtml(b.name)}</span>
          <span class="badge ${badgeClass}">${b.riskLevel || b.severity || 'Medium'}</span>
        </div>
        <div class="bias-desc">${sanitizeHtml(b.description)}</div>
      `;
      this.biasesList.appendChild(card);
    });

    // Overlooked Factors (enhanced)
    this.overlookedList.innerHTML = '';
    (res.overlookedFactors || []).forEach(f => {
      const row = document.createElement('div');
      row.className = 'factor-item';
      row.innerHTML = `
        <div class="factor-icon">${f.icon || '🔭'}</div>
        <div class="factor-content">
          <div class="factor-tag">${sanitizeHtml(f.category)}</div>
          <h4>${sanitizeHtml(f.factor)}</h4>
          <p>${sanitizeHtml(f.impact)}</p>
        </div>
      `;
      this.overlookedList.appendChild(row);
    });

    // Conflicts
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
        <div class="stress-question"><strong>Dilemma Question:</strong> ${sanitizeHtml(c.reflection)}</div>
      `;
      this.conflictsList.appendChild(row);
    });

    // Probing Questions (clickable → prefill chat)
    this.probingList.innerHTML = '';
    (res.probingQuestions || []).forEach(q => {
      const qItem = document.createElement('div');
      qItem.className = 'question-item';
      qItem.setAttribute('title', 'Click to explore in chat');
      qItem.onclick = () => {
        if (this.chatInput) {
          this.chatInput.value = q.text;
          this.chatInput.focus();
          document.getElementById('chat-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      qItem.innerHTML = `
        <div class="question-icon">💬</div>
        <div>
          <div class="question-tag">${sanitizeHtml(q.tag)}</div>
          <div class="question-text">${sanitizeHtml(q.text)}</div>
        </div>
      `;
      this.probingList.appendChild(qItem);
    });

    // Pre-Mortem
    if (res.preMortem) {
      this.premortemBox.innerHTML = `
        <p style="font-size:0.88rem;margin-bottom:0.7rem;color:#fecdd3">
          <strong>Simulation Horizon:</strong> ${sanitizeHtml(res.preMortem.timeframe || '12 Months Out')}
        </p>
        <p style="font-size:0.83rem;color:#cbd5e1;margin-bottom:0.85rem">${sanitizeHtml(res.preMortem.scenario)}</p>
        <ul class="premortem-list">
          ${(res.preMortem.rootCauses || []).map(r => `<li>${sanitizeHtml(r)}</li>`).join('')}
        </ul>
        <div class="prevention-box">
          <strong>Critical Prevention Guardrail:</strong> ${sanitizeHtml(res.preMortem.preventionCheck)}
        </div>
      `;
    }

    // Initialize Chat
    this.initChat();

    // Scroll to results
    this.resultsZone.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  renderHealthScore(health) {
    if (!this.scoreRingFill) return;
    const circumference = 2 * Math.PI * 36; // r=36
    const offset = circumference * (1 - (health.score / 100));
    this.scoreRingFill.style.strokeDasharray = `${circumference}`;
    this.scoreRingFill.style.strokeDashoffset = offset;
    this.scoreRingFill.style.stroke = health.color;
    if (this.scoreRingText) {
      this.scoreRingText.textContent = `${health.score}`;
      this.scoreRingText.setAttribute('fill', health.color);
    }
    if (this.scoreLabel) this.scoreLabel.textContent = health.label;
    if (this.scoreDesc) {
      this.scoreDesc.textContent = `Decision Readiness Score — based on ${this.currentAnalysis?.detectedBiases?.length || 0} biases, ${this.currentAnalysis?.unstatedAssumptions?.length || 0} unverified assumptions detected.`;
    }
  }

  renderAssumptions(assumptions) {
    this.assumptionsList.innerHTML = '';
    if (!assumptions.length) return;

    assumptions.forEach((asmp, idx) => {
      this.assumptionStates[asmp.id] = this.assumptionStates[asmp.id] || 'unverified';
      const item = document.createElement('div');
      item.className = 'assumption-item';
      item.id = `asmp-${asmp.id}`;
      item.innerHTML = `
        <div class="assumption-category">${sanitizeHtml(asmp.category || 'Assumption')}</div>
        <div class="assumption-top">
          <span class="assumption-name">⚠️ ${sanitizeHtml(asmp.title)}</span>
          <span class="badge badge-high" id="asmp-badge-${asmp.id}">Unverified</span>
        </div>
        <div class="assumption-detail">${sanitizeHtml(asmp.implicitBelief)}</div>
        <div class="stress-question">
          <strong>Calibrated Stress-Test:</strong> ${sanitizeHtml(asmp.stressTestQuestion)}
        </div>
        <div class="assumption-status-toggle">
          <button class="status-btn" id="btn-verify-${asmp.id}" onclick="window._app.setAssumptionState('${asmp.id}', 'verified', this)" title="Mark as confirmed">✅ Verified</button>
          <button class="status-btn" id="btn-flag-${asmp.id}" onclick="window._app.setAssumptionState('${asmp.id}', 'flagged', this)" title="Mark as a real risk">🚩 Flagged Risk</button>
          <button class="status-btn" id="btn-na-${asmp.id}" onclick="window._app.setAssumptionState('${asmp.id}', 'na', this)" title="Not applicable">✖ N/A</button>
        </div>
      `;
      this.assumptionsList.appendChild(item);
    });
    this.updateVerifiedProgress(assumptions.length);
  }

  setAssumptionState(id, state, btnEl) {
    this.assumptionStates[id] = state;
    const parent = document.getElementById(`asmp-${id}`);
    if (!parent) return;

    parent.querySelectorAll('.status-btn').forEach(b => {
      b.classList.remove('verified', 'flagged');
    });

    const badge = document.getElementById(`asmp-badge-${id}`);
    if (state === 'verified') {
      btnEl.classList.add('verified');
      if (badge) { badge.textContent = 'Verified'; badge.className = 'badge badge-low'; }
    } else if (state === 'flagged') {
      btnEl.classList.add('flagged');
      if (badge) { badge.textContent = 'Flagged Risk'; badge.className = 'badge badge-high'; }
    } else {
      if (badge) { badge.textContent = 'N/A'; badge.className = 'badge'; }
    }

    const verified = Object.values(this.assumptionStates).filter(s => s === 'verified' || s === 'na').length;
    this.verifiedCount = verified;
    const total = Object.keys(this.assumptionStates).length;
    this.updateVerifiedProgress(total);
  }

  updateVerifiedProgress(total) {
    if (!this.verifiedProgress || !this.verifiedLabel) return;
    const verified = Object.values(this.assumptionStates).filter(s => s === 'verified' || s === 'na').length;
    const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
    this.verifiedProgress.style.width = `${pct}%`;
    this.verifiedProgress.style.background = pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#f43f5e';
    this.verifiedLabel.textContent = `${verified}/${total} assumptions addressed (${pct}%)`;
  }

  initChat() {
    if (!this.chatMessages) return;
    this.chatMessages.innerHTML = '';
    const persona = PERSONAS[this.currentPersonaId] || PERSONAS.socratic;
    this.appendChatMessage('assistant', `${persona.avatar} I am your ${persona.name}. "${persona.coreMotto}" — Ask me any question about your decision and I will help you think more clearly, without deciding for you.`);
  }

  sendChatMessage() {
    const text = this.chatInput?.value?.trim();
    if (!text) return;
    this.appendChatMessage('user', text);
    this.chatInput.value = '';

    // Show typing indicator
    const typingId = `typing-${Date.now()}`;
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-message assistant';
    typingEl.id = typingId;
    typingEl.innerHTML = `
      <div class="chat-avatar">👁️</div>
      <div class="typing-indicator"><span></span><span></span><span></span></div>
    `;
    this.chatMessages.appendChild(typingEl);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    // Simulate thinking delay then respond
    setTimeout(() => {
      typingEl.remove();
      const response = generateFollowUpResponse(text);
      this.appendChatMessage('assistant', response);
    }, 900 + Math.random() * 600);
  }

  appendChatMessage(role, text) {
    if (!this.chatMessages) return;
    const msg = document.createElement('div');
    msg.className = `chat-message ${role}`;
    const avatar = role === 'assistant' ? '👁️' : '👤';
    msg.innerHTML = `
      <div class="chat-avatar">${avatar}</div>
      <div class="chat-bubble">${sanitizeHtml(text)}</div>
    `;
    this.chatMessages.appendChild(msg);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  openExportModal() {
    if (!this.currentAnalysis) { this.showToast('Analyze a decision first.', 'error'); return; }
    const res = this.currentAnalysis;
    const persona = PERSONAS[this.currentPersonaId] || PERSONAS.socratic;
    const md = `# Decision Blind Spot Audit Report
**Generated By**: The Blind Spot AI Assistant (PromptWars @ Hack2skill)
**Thinking Lens**: ${persona.name} (${persona.tagline})
**Date**: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}
**Mandate**: Non-Prescriptive Decision Support (Same decisions. A wider view.)

---

## 1. Executive Summary
${res.summary}

## 2. Decision Readiness Metrics
- Decision Health Score: ${res.decisionHealthScore?.score ?? 'N/A'}/100 (${res.decisionHealthScore?.label ?? ''})
- Total Blind Spots Identified: ${res.metrics?.totalBlindSpots || 0}
- Cognitive Biases Detected: ${res.detectedBiases?.length || 0}
- Unstated Assumptions: ${res.unstatedAssumptions?.length || 0}
- Assumptions Verified by User: ${this.verifiedCount}

## 3. Unstated Assumptions Exposed
${(res.unstatedAssumptions || []).map((a, i) => `### ${i + 1}. [${a.category || 'Assumption'}] ${a.title}
- **Implicit Belief**: ${a.implicitBelief}
- **Stress-Test Question**: ${a.stressTestQuestion}
- **Status**: ${this.assumptionStates[a.id] || 'Unverified'}
`).join('\n')}

## 4. Cognitive Biases Detected
${(res.detectedBiases || []).map(b => `- ${b.icon || '🧠'} **${b.name}** [${b.riskLevel || b.severity}]: ${b.description}`).join('\n')}

## 5. Overlooked 2nd & 3rd Order Consequences
${(res.overlookedFactors || []).map(f => `- ${f.icon || '🔭'} **${f.factor}** (${f.category}): ${f.impact}`).join('\n')}

## 6. Internal Reasoning Conflicts
${(res.reasoningConflicts || []).map(c => `- **${c.dilemma}**: ${c.observation} → *${c.reflection}*`).join('\n')}

## 7. Socratic Probing Questions
${(res.probingQuestions || []).map(q => `- [${q.tag}] ${q.text}`).join('\n')}

## 8. Pre-Mortem Worst-Case Simulation
**Horizon**: ${res.preMortem?.timeframe || '12 Months Out'}
**Scenario**: ${res.preMortem?.scenario || 'N/A'}
${(res.preMortem?.rootCauses || []).map(r => `- ${r}`).join('\n')}
**Prevention Guardrail**: ${res.preMortem?.preventionCheck || 'N/A'}

---
> *This report does not decide for you. Its purpose is calibrated examination before commitment.*
`;
    document.getElementById('export-markdown-content').value = md;
    this.exportModal.classList.add('active');
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const colors = { success: '#10b981', error: '#f43f5e', warning: '#f59e0b', info: '#6366f1' };
    toast.style.cssText = `
      position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999;
      background: var(--bg-secondary); border: 1px solid ${colors[type] || colors.info};
      border-radius: 12px; padding: 0.85rem 1.2rem; max-width: 340px;
      font-size: 0.85rem; color: var(--text-main); font-family: inherit;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      animation: fadeIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }
}

// Expose for inline onclick handlers
window.addEventListener('DOMContentLoaded', () => {
  window._app = new BlindSpotApp();
});
