/**
 * @fileoverview Application Orchestrator for The Blind Spot — v2.
 *
 * Responsibilities:
 *  - Bootstraps the UI on DOMContentLoaded
 *  - Coordinates persona selection, scenario loading, and form validation
 *  - Delegates cognitive analysis to {@link DecisionAIService}
 *  - Renders results using batched DocumentFragment DOM operations (efficiency)
 *  - Manages the interactive assumption tracker and follow-up Socratic chat
 *  - Provides keyboard shortcuts and toast notifications
 *
 * Non-Prescriptive Mandate:
 *  All output is intentionally framed to surface blind spots without recommending
 *  a specific decision to the user.
 *
 * @module app
 */

import { PERSONAS } from './engine/personas.js';
import { BENCHMARK_SCENARIOS } from './engine/scenarios.js';
import { DecisionAIService } from './services/llm_provider.js';
import { sanitizeHtml, validateInput } from './engine/sanitization.js';
import { generateFollowUpResponse } from './engine/followup.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum context length before analysis is permitted. */
const MIN_CONTEXT_LEN = 15;

/** SVG circle circumference for the health-score ring (r = 36). */
const RING_CIRCUMFERENCE = 2 * Math.PI * 36;

/** Debounce delay (ms) applied to the chat send throttle. */
const CHAT_DEBOUNCE_MS = 300;

/** Toast auto-dismiss duration in milliseconds. */
const TOAST_DURATION_MS = 3_500;

// ─── Badge class helper ───────────────────────────────────────────────────────

/**
 * Maps a severity label to a CSS badge class.
 * @param {string} severity
 * @returns {string}
 */
function severityToBadge(severity) {
  const map = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
  return map[severity] ?? 'badge-medium';
}

// ─── BlindSpotApp ─────────────────────────────────────────────────────────────

class BlindSpotApp {
  /** @type {DecisionAIService} */
  #service;

  /** @type {string} Active persona ID. */
  #personaId = 'socratic';

  /** @type {import('./services/llm_provider.js').AnalysisResult | null} */
  #analysis = null;

  /** @type {Record<string, 'unverified'|'verified'|'flagged'|'na'>} */
  #assumptionStates = {};

  /** @type {number} Count of addressed (verified/na) assumptions. */
  #verifiedCount = 0;

  /** @type {boolean} Prevents concurrent analysis runs. */
  #analyzing = false;

  /** @type {ReturnType<typeof setTimeout> | null} Chat debounce timer. */
  #chatTimer = null;

  constructor() {
    this.#service = new DecisionAIService();

    this.#initElements();
    this.#bindEvents();
    this.#populatePresets();
    this.#renderPersonaOptions();

    // Pre-load the official hackathon benchmark scenario
    this.#loadScenario('hackathon_internship');
  }

  // ── DOM element references ──────────────────────────────────────────────────

  /** Caches all required DOM element references. */
  #initElements() {
    const q = (id) => document.getElementById(id);

    // Form inputs
    this.presetSelect     = q('preset-select');
    this.contextInput     = q('context-input');
    this.reasoningInput   = q('reasoning-input');
    this.constraintsInput = q('constraints-input');
    this.analyzeBtn       = q('analyze-btn');
    this.personaContainer = q('persona-container');

    // State zones
    this.emptyState       = q('empty-state');
    this.loadingIndicator = q('loading-indicator');
    this.resultsZone      = q('results-zone');

    // Metric counters
    this.metricTotal      = q('metric-total-blindspots');
    this.metricAssumptions = q('metric-assumptions');
    this.metricBiases     = q('metric-biases');
    this.metricReadiness  = q('metric-readiness');

    // Result sections
    this.summaryText      = q('analysis-summary-text');
    this.assumptionsList  = q('assumptions-list');
    this.biasesList       = q('biases-list');
    this.overlookedList   = q('overlooked-list');
    this.conflictsList    = q('conflicts-list');
    this.probingList      = q('probing-questions-list');
    this.premortemBox     = q('premortem-content');

    // Health score ring
    this.scoreRingFill    = q('score-ring-fill');
    this.scoreRingText    = q('score-ring-text');
    this.scoreLabel       = q('score-label');
    this.scoreDesc        = q('score-desc');
    this.verifiedProgress = q('verified-progress');
    this.verifiedLabel    = q('verified-label');

    // Chat
    this.chatMessages     = q('chat-messages');
    this.chatInput        = q('chat-input');
    this.chatSendBtn      = q('chat-send-btn');

    // Modals
    this.apiKeyModal      = q('api-key-modal');
    this.exportModal      = q('export-modal');
    this.apiKeyInput      = q('gemini-api-key-input');
  }

  // ── Event binding ───────────────────────────────────────────────────────────

  /** Attaches all event listeners. */
  #bindEvents() {
    // Preset scenario loader
    this.presetSelect?.addEventListener('change', (e) => {
      if (e.target.value) this.#loadScenario(e.target.value);
    });

    // Primary analysis trigger
    this.analyzeBtn?.addEventListener('click', () => this.#runAnalysis());

    // Keyboard shortcut: Ctrl+Enter / Cmd+Enter
    this.contextInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) this.#runAnalysis();
    });

    // API settings modal
    q('open-api-modal-btn')?.addEventListener('click', () => {
      this.apiKeyInput.value = this.#service.hasApiKey()
        ? localStorage.getItem('blind_spot_gemini_key') ?? ''
        : '';
      this.apiKeyModal.classList.add('active');
    });

    q('save-api-key-btn')?.addEventListener('click', () => {
      this.#service.setApiKey(this.apiKeyInput.value);
      this.apiKeyModal.classList.remove('active');
      this.#toast('API key saved. Gemini will augment analyses when available.', 'success');
    });

    q('close-api-modal-btn')?.addEventListener('click', () => {
      this.apiKeyModal.classList.remove('active');
    });

    // Export modal
    q('export-audit-btn')?.addEventListener('click', () => this.#openExport());
    q('close-export-modal-btn')?.addEventListener('click', () => {
      this.exportModal.classList.remove('active');
    });
    q('copy-export-btn')?.addEventListener('click', () => {
      const text = document.getElementById('export-markdown-content')?.value ?? '';
      navigator.clipboard.writeText(text)
        .then(() => this.#toast('Audit report copied to clipboard!', 'success'))
        .catch(() => this.#toast('Copy failed — please select and copy manually.', 'error'));
    });

    // Chat
    this.chatSendBtn?.addEventListener('click', () => this.#sendChat());
    this.chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.#sendChat(); }
    });

    // Close modals on backdrop click
    [this.apiKeyModal, this.exportModal].forEach((m) => {
      m?.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('active'); });
    });

    // Escape key closes any open modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.apiKeyModal?.classList.remove('active');
        this.exportModal?.classList.remove('active');
      }
    });
  }

  // ── Scenario / Preset management ────────────────────────────────────────────

  /** Populates the benchmark scenario dropdown from BENCHMARK_SCENARIOS. */
  #populatePresets() {
    const frag = document.createDocumentFragment();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Load a Benchmark Scenario --';
    frag.appendChild(placeholder);

    BENCHMARK_SCENARIOS.forEach((sc) => {
      const opt = document.createElement('option');
      opt.value = sc.id;
      opt.textContent = sc.category ? `[${sc.category}] ${sc.title}` : sc.title;
      frag.appendChild(opt);
    });

    this.presetSelect.innerHTML = '';
    this.presetSelect.appendChild(frag);
  }

  /**
   * Loads a benchmark scenario into the form fields.
   * @param {string} scenarioId
   */
  #loadScenario(scenarioId) {
    const sc = BENCHMARK_SCENARIOS.find((s) => s.id === scenarioId);
    if (!sc) return;
    this.presetSelect.value   = scenarioId;
    this.contextInput.value   = sc.context;
    this.reasoningInput.value = sc.userReasoning;
    this.constraintsInput.value = sc.keyConstraints;
  }

  // ── Persona rendering ────────────────────────────────────────────────────────

  /** Renders the persona thinking-lens selection grid. */
  #renderPersonaOptions() {
    const frag = document.createDocumentFragment();

    Object.values(PERSONAS).forEach((p) => {
      const card = document.createElement('div');
      card.className = `persona-card${p.id === this.#personaId ? ' active' : ''}`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Select ${p.name} thinking lens`);
      card.setAttribute('aria-pressed', String(p.id === this.#personaId));

      card.innerHTML = `
        <div class="persona-header">
          <span aria-hidden="true">${p.avatar}</span>
          <span>${sanitizeHtml(p.name)}</span>
        </div>
        <div class="persona-subtitle">${sanitizeHtml(p.tagline)}</div>
      `;

      const selectPersona = () => {
        this.#personaId = p.id;
        this.personaContainer.querySelectorAll('.persona-card').forEach((c) => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('active');
        card.setAttribute('aria-pressed', 'true');
        // Re-run analysis with new lens if results are already shown
        if (this.#analysis) this.#runAnalysis();
      };

      card.addEventListener('click', selectPersona);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPersona(); }
      });

      frag.appendChild(card);
    });

    this.personaContainer.innerHTML = '';
    this.personaContainer.appendChild(frag);
  }

  // ── Core analysis flow ───────────────────────────────────────────────────────

  /** Validates inputs, runs cognitive analysis, and renders results. */
  async #runAnalysis() {
    if (this.#analyzing) return; // Prevent concurrent runs

    const validation = validateInput(this.contextInput.value, MIN_CONTEXT_LEN);
    if (!validation.valid) {
      this.#toast(validation.error, 'error');
      this.contextInput.focus();
      return;
    }

    const payload = {
      context:     validation.sanitized,
      reasoning:   this.reasoningInput.value.trim(),
      constraints: this.constraintsInput.value.trim(),
    };

    // ── UI: Loading state ──
    this.#analyzing = true;
    this.analyzeBtn.disabled = true;
    this.analyzeBtn.textContent = 'Scanning…';
    this.emptyState.style.display = 'none';
    this.loadingIndicator.style.display = 'block';
    this.resultsZone.style.display = 'none';
    this.#assumptionStates = {};
    this.#verifiedCount = 0;

    try {
      const result = await this.#service.analyzeDecision(payload, this.#personaId);
      this.#analysis = result;
      this.#renderResults(result);
    } catch (err) {
      console.error('[BlindSpot] Analysis error:', err);
      this.#toast('Analysis error — served offline heuristic results.', 'warning');
      // Fallback: run local engine directly
      const fallback = this.#service.localAnalyzer.analyze(payload.context, {
        role: payload.reasoning,
        constraints: payload.constraints,
      });
      this.#analysis = { ...fallback, source: 'Cognitive Heuristics Engine (Error Fallback)' };
      this.#renderResults(this.#analysis);
    } finally {
      this.loadingIndicator.style.display = 'none';
      this.analyzeBtn.disabled = false;
      this.analyzeBtn.innerHTML = '⚡ Reveal My Blind Spots';
      this.#analyzing = false;
    }
  }

  // ── Result rendering ─────────────────────────────────────────────────────────

  /**
   * Renders all analysis sections into the results zone.
   * Uses DocumentFragment for batched DOM insertions to minimise reflows.
   * @param {import('./services/llm_provider.js').AnalysisResult} res
   */
  #renderResults(res) {
    this.resultsZone.style.display = 'flex';
    requestAnimationFrame(() => {
      this.resultsZone.classList.remove('animate-fade-in');
      void this.resultsZone.offsetWidth; // Force reflow to restart animation
      this.resultsZone.classList.add('animate-fade-in');
    });

    // Metrics
    this.metricTotal.textContent      = res.metrics?.totalBlindSpots ?? 0;
    this.metricAssumptions.textContent = res.unstatedAssumptions?.length ?? 0;
    this.metricBiases.textContent     = res.detectedBiases?.length ?? 0;
    this.metricReadiness.textContent  = res.metrics?.readinessGrade ?? 'Analyzed';

    // Health score ring
    if (res.decisionHealthScore) this.#renderHealthRing(res.decisionHealthScore);

    // Text summary
    this.summaryText.textContent = res.summary ?? 'Analysis complete.';

    // All list sections (batched)
    this.#renderAssumptions(res.unstatedAssumptions ?? []);
    this.#renderBiases(res.detectedBiases ?? []);
    this.#renderOverlooked(res.overlookedFactors ?? []);
    this.#renderConflicts(res.reasoningConflicts ?? []);
    this.#renderProbing(res.probingQuestions ?? []);
    this.#renderPremortem(res.preMortem);

    // Chat panel init
    this.#initChat();

    // Smooth scroll to results
    this.resultsZone.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Animates the SVG decision health score ring.
   * @param {{ score: number, label: string, color: string }} health
   */
  #renderHealthRing({ score, label, color }) {
    if (!this.scoreRingFill) return;
    const offset = RING_CIRCUMFERENCE * (1 - score / 100);
    this.scoreRingFill.style.strokeDasharray  = RING_CIRCUMFERENCE;
    this.scoreRingFill.style.strokeDashoffset = offset;
    this.scoreRingFill.style.stroke = color;
    if (this.scoreRingText) {
      this.scoreRingText.textContent = String(score);
      this.scoreRingText.setAttribute('fill', color);
    }
    if (this.scoreLabel) this.scoreLabel.textContent = label;
    if (this.scoreDesc) {
      const { detectedBiases: b = [], unstatedAssumptions: a = [] } = this.#analysis ?? {};
      this.scoreDesc.textContent =
        `Decision readiness — ${b.length} bias${b.length !== 1 ? 'es' : ''}, ` +
        `${a.length} unverified assumption${a.length !== 1 ? 's' : ''} detected.`;
    }
  }

  /**
   * Updates the assumption verification progress bar.
   * @param {number} total - Total number of assumptions.
   */
  #updateProgress(total) {
    if (!this.verifiedProgress || !this.verifiedLabel) return;
    const done = Object.values(this.#assumptionStates)
      .filter((s) => s === 'verified' || s === 'na').length;
    const pct  = total > 0 ? Math.round((done / total) * 100) : 0;

    this.verifiedProgress.style.width      = `${pct}%`;
    this.verifiedProgress.style.background =
      pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#f43f5e';
    this.verifiedLabel.textContent = `${done}/${total} assumptions addressed (${pct}%)`;
  }

  /**
   * Renders the unstated assumptions list using a DocumentFragment.
   * @param {Array} assumptions
   */
  #renderAssumptions(assumptions) {
    const frag = document.createDocumentFragment();
    assumptions.forEach((a) => {
      this.#assumptionStates[a.id] = this.#assumptionStates[a.id] ?? 'unverified';
      const el = document.createElement('div');
      el.className = 'assumption-item';
      el.id = `asmp-${a.id}`;
      el.setAttribute('role', 'listitem');
      el.innerHTML = `
        <div class="assumption-category">${sanitizeHtml(a.category ?? 'Assumption')}</div>
        <div class="assumption-top">
          <span class="assumption-name">⚠️ ${sanitizeHtml(a.title)}</span>
          <span class="badge badge-high" id="asmp-badge-${a.id}">Unverified</span>
        </div>
        <div class="assumption-detail">${sanitizeHtml(a.implicitBelief)}</div>
        <div class="stress-question">
          <strong>Stress-Test:</strong> ${sanitizeHtml(a.stressTestQuestion)}
        </div>
        <div class="assumption-status-toggle" role="group" aria-label="Verify assumption: ${sanitizeHtml(a.title)}">
          <button class="status-btn" data-asmp="${a.id}" data-state="verified" aria-label="Mark as verified">✅ Verified</button>
          <button class="status-btn" data-asmp="${a.id}" data-state="flagged"  aria-label="Mark as flagged risk">🚩 Flagged</button>
          <button class="status-btn" data-asmp="${a.id}" data-state="na"       aria-label="Mark as not applicable">✖ N/A</button>
        </div>
      `;
      frag.appendChild(el);
    });
    this.assumptionsList.innerHTML = '';
    this.assumptionsList.appendChild(frag);
    this.#updateProgress(assumptions.length);

    // Single delegated click listener for all status buttons
    this.assumptionsList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-asmp]');
      if (!btn) return;
      this.#setAssumptionState(btn.dataset.asmp, btn.dataset.state, btn, assumptions.length);
    }, { once: false });
  }

  /**
   * Updates an assumption's verification state and refreshes the progress bar.
   * @param {string} id        - Assumption ID.
   * @param {string} state     - New state: 'verified' | 'flagged' | 'na'.
   * @param {HTMLElement} btn  - The clicked button element.
   * @param {number} total     - Total assumption count.
   */
  #setAssumptionState(id, state, btn, total) {
    this.#assumptionStates[id] = state;

    const parent = document.getElementById(`asmp-${id}`);
    if (!parent) return;
    parent.querySelectorAll('.status-btn').forEach((b) => {
      b.classList.remove('verified', 'flagged');
    });

    const badge = document.getElementById(`asmp-badge-${id}`);
    if (state === 'verified') {
      btn.classList.add('verified');
      if (badge) { badge.textContent = 'Verified ✓'; badge.className = 'badge badge-low'; }
    } else if (state === 'flagged') {
      btn.classList.add('flagged');
      if (badge) { badge.textContent = 'Flagged Risk'; badge.className = 'badge badge-high'; }
    } else {
      if (badge) { badge.textContent = 'N/A'; badge.className = 'badge'; }
    }

    this.#verifiedCount = Object.values(this.#assumptionStates)
      .filter((s) => s === 'verified' || s === 'na').length;
    this.#updateProgress(total);
  }

  /**
   * Renders the detected cognitive biases grid using DocumentFragment.
   * @param {Array} biases
   */
  #renderBiases(biases) {
    const frag = document.createDocumentFragment();
    biases.forEach((b) => {
      const card = document.createElement('div');
      card.className = 'bias-card';
      card.setAttribute('role', 'listitem');
      const badgeClass = severityToBadge(b.riskLevel ?? b.severity ?? 'Medium');
      card.innerHTML = `
        <div class="bias-title">
          <span class="bias-name">${b.icon ?? '🧠'} ${sanitizeHtml(b.name)}</span>
          <span class="badge ${badgeClass}">${sanitizeHtml(b.riskLevel ?? b.severity ?? 'Medium')}</span>
        </div>
        <div class="bias-desc">${sanitizeHtml(b.description)}</div>
      `;
      frag.appendChild(card);
    });
    this.biasesList.innerHTML = '';
    this.biasesList.appendChild(frag);
  }

  /**
   * Renders the overlooked second/third-order consequence items.
   * @param {Array} factors
   */
  #renderOverlooked(factors) {
    const frag = document.createDocumentFragment();
    factors.forEach((f) => {
      const el = document.createElement('div');
      el.className = 'factor-item';
      el.setAttribute('role', 'listitem');
      el.innerHTML = `
        <div class="factor-icon" aria-hidden="true">${f.icon ?? '🔭'}</div>
        <div class="factor-content">
          <div class="factor-tag">${sanitizeHtml(f.category)}</div>
          <h4>${sanitizeHtml(f.factor)}</h4>
          <p>${sanitizeHtml(f.impact)}</p>
        </div>
      `;
      frag.appendChild(el);
    });
    this.overlookedList.innerHTML = '';
    this.overlookedList.appendChild(frag);
  }

  /**
   * Renders reasoning conflict / internal contradiction items.
   * @param {Array} conflicts
   */
  #renderConflicts(conflicts) {
    const frag = document.createDocumentFragment();
    conflicts.forEach((c) => {
      const el = document.createElement('div');
      el.className = 'assumption-item';
      el.setAttribute('role', 'listitem');
      el.innerHTML = `
        <div class="assumption-top">
          <span class="assumption-name">⚖️ ${sanitizeHtml(c.dilemma)}</span>
          <span class="badge badge-medium">Friction Point</span>
        </div>
        <div class="assumption-detail">${sanitizeHtml(c.observation)}</div>
        <div class="stress-question"><strong>Dilemma Question:</strong> ${sanitizeHtml(c.reflection)}</div>
      `;
      frag.appendChild(el);
    });
    this.conflictsList.innerHTML = '';
    this.conflictsList.appendChild(frag);
  }

  /**
   * Renders the Socratic probing questions. Clicking one prefills the chat input.
   * @param {Array} questions
   */
  #renderProbing(questions) {
    const frag = document.createDocumentFragment();
    questions.forEach((q) => {
      const el = document.createElement('div');
      el.className = 'question-item';
      el.setAttribute('role', 'listitem');
      el.setAttribute('tabindex', '0');
      el.setAttribute('title', 'Click to explore in the chat panel');
      el.setAttribute('aria-label', `Probing question: ${q.text}`);

      el.innerHTML = `
        <div class="question-icon" aria-hidden="true">💬</div>
        <div>
          <div class="question-tag">${sanitizeHtml(q.tag)}</div>
          <div class="question-text">${sanitizeHtml(q.text)}</div>
        </div>
      `;

      const prefillChat = () => {
        if (this.chatInput) {
          this.chatInput.value = q.text;
          this.chatInput.focus();
          document.getElementById('chat-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      };
      el.addEventListener('click', prefillChat);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); prefillChat(); }
      });

      frag.appendChild(el);
    });
    this.probingList.innerHTML = '';
    this.probingList.appendChild(frag);
  }

  /**
   * Renders the pre-mortem prospective failure simulation panel.
   * @param {Object|undefined} pm - Pre-mortem data object.
   */
  #renderPremortem(pm) {
    if (!pm) { this.premortemBox.innerHTML = ''; return; }

    const causes = (pm.rootCauses ?? [])
      .map((r) => `<li>${sanitizeHtml(r)}</li>`)
      .join('');

    this.premortemBox.innerHTML = `
      <p style="font-size:0.87rem;margin-bottom:0.7rem;color:#fecdd3">
        <strong>Horizon:</strong> ${sanitizeHtml(pm.timeframe ?? '12 Months Out')}
      </p>
      <p style="font-size:0.83rem;color:#cbd5e1;margin-bottom:0.85rem">
        ${sanitizeHtml(pm.scenario)}
      </p>
      <ul class="premortem-list">${causes}</ul>
      <div class="prevention-box">
        <strong>Prevention Guardrail:</strong> ${sanitizeHtml(pm.preventionCheck)}
      </div>
    `;
  }

  // ── Socratic Chat Panel ──────────────────────────────────────────────────────

  /** Initialises the chat panel with a persona-aware greeting. */
  #initChat() {
    if (!this.chatMessages) return;
    this.chatMessages.innerHTML = '';
    const persona = PERSONAS[this.#personaId] ?? PERSONAS.socratic;
    this.#appendChat(
      'assistant',
      `${persona.avatar} I am your ${sanitizeHtml(persona.name)}. "${sanitizeHtml(persona.coreMotto)}" — Ask me anything about your decision and I will help you think more clearly, without deciding for you.`
    );
  }

  /** Reads the chat input, appends the user message, and generates a response. */
  #sendChat() {
    // Debounce rapid sends
    if (this.#chatTimer) return;
    this.#chatTimer = setTimeout(() => { this.#chatTimer = null; }, CHAT_DEBOUNCE_MS);

    const text = this.chatInput?.value?.trim();
    if (!text) return;

    this.#appendChat('user', text);
    this.chatInput.value = '';

    // Show typing indicator
    const typingEl = document.createElement('div');
    typingEl.className = 'chat-message assistant';
    typingEl.innerHTML = `
      <div class="chat-avatar" aria-hidden="true">👁️</div>
      <div class="typing-indicator" role="status" aria-label="Thinking">
        <span></span><span></span><span></span>
      </div>
    `;
    this.chatMessages.appendChild(typingEl);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

    // Staggered response for natural cadence
    const delay = 800 + Math.random() * 500;
    setTimeout(() => {
      typingEl.remove();
      const reply = generateFollowUpResponse(text);
      this.#appendChat('assistant', reply);
    }, delay);
  }

  /**
   * Appends a message bubble to the chat panel.
   * @param {'assistant'|'user'} role
   * @param {string} text - Plain text (will be HTML-escaped).
   */
  #appendChat(role, text) {
    if (!this.chatMessages) return;
    const el = document.createElement('div');
    el.className = `chat-message ${role}`;
    const avatar = role === 'assistant' ? '👁️' : '👤';
    el.innerHTML = `
      <div class="chat-avatar" aria-hidden="true">${avatar}</div>
      <div class="chat-bubble">${sanitizeHtml(text)}</div>
    `;
    this.chatMessages.appendChild(el);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  /** Generates and displays the Markdown decision audit report. */
  #openExport() {
    if (!this.#analysis) {
      this.#toast('Please analyze a decision first.', 'error');
      return;
    }

    const res    = this.#analysis;
    const persona = PERSONAS[this.#personaId] ?? PERSONAS.socratic;
    const dateStr = new Date().toLocaleDateString('en-IN', { dateStyle: 'long' });

    const assumptionSection = (res.unstatedAssumptions ?? []).map((a, i) => {
      const state = this.#assumptionStates[a.id] ?? 'Unverified';
      return `### ${i + 1}. [${a.category ?? 'Assumption'}] ${a.title}
- **Implicit Belief**: ${a.implicitBelief}
- **Stress-Test Question**: ${a.stressTestQuestion}
- **Status**: ${state}`;
    }).join('\n\n');

    const md = `# Decision Blind Spot Audit Report

**Tool**: The Blind Spot AI Assistant (PromptWars @ Hack2skill)
**Thinking Lens**: ${persona.name} — ${persona.tagline}
**Date**: ${dateStr}
**Mandate**: Non-Prescriptive Decision Support — Same Decisions. A Wider View.

---

## Executive Summary
${res.summary}

## Decision Readiness Metrics
| Metric | Value |
|---|---|
| Decision Health Score | ${res.decisionHealthScore?.score ?? 'N/A'}/100 (${res.decisionHealthScore?.label ?? ''}) |
| Total Blind Spots | ${res.metrics?.totalBlindSpots ?? 0} |
| Cognitive Biases | ${res.detectedBiases?.length ?? 0} |
| Unstated Assumptions | ${res.unstatedAssumptions?.length ?? 0} |
| Assumptions Verified | ${this.#verifiedCount} |

## Unstated Assumptions Exposed
${assumptionSection || 'None surfaced.'}

## Cognitive Biases Detected
${(res.detectedBiases ?? []).map((b) => `- ${b.icon ?? '🧠'} **${b.name}** [${b.riskLevel ?? b.severity}]: ${b.description}`).join('\n') || 'None detected.'}

## Overlooked 2nd & 3rd Order Consequences
${(res.overlookedFactors ?? []).map((f) => `- ${f.icon ?? '🔭'} **${f.factor}** (${f.category}): ${f.impact}`).join('\n') || 'None surfaced.'}

## Reasoning Conflicts
${(res.reasoningConflicts ?? []).map((c) => `- **${c.dilemma}**: ${c.observation} → *${c.reflection}*`).join('\n') || 'None detected.'}

## Socratic Probing Questions
${(res.probingQuestions ?? []).map((q) => `- [${q.tag}] ${q.text}`).join('\n') || 'None generated.'}

## Pre-Mortem Simulation
- **Horizon**: ${res.preMortem?.timeframe ?? 'N/A'}
- **Scenario**: ${res.preMortem?.scenario ?? 'N/A'}
${(res.preMortem?.rootCauses ?? []).map((r) => `- ${r}`).join('\n')}
- **Prevention Guardrail**: ${res.preMortem?.preventionCheck ?? 'N/A'}

---
> *This report surfaces blind spots to support informed thinking — it does not decide for you.*
`.trim();

    const el = document.getElementById('export-markdown-content');
    if (el) el.value = md;
    this.exportModal.classList.add('active');
  }

  // ── Toast notifications ──────────────────────────────────────────────────────

  /**
   * Displays a non-blocking toast notification.
   * @param {string} message
   * @param {'info'|'success'|'error'|'warning'} [type='info']
   */
  #toast(message, type = 'info') {
    const COLORS = { success: '#10b981', error: '#f43f5e', warning: '#f59e0b', info: '#6366f1' };
    const toast = document.createElement('div');
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    Object.assign(toast.style, {
      position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: '9999',
      background: 'var(--bg-secondary)',
      border: `1px solid ${COLORS[type] ?? COLORS.info}`,
      borderRadius: '12px', padding: '0.85rem 1.2rem', maxWidth: '340px',
      fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)', animation: 'fadeIn 0.3s ease',
    });
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), TOAST_DURATION_MS);
  }
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────

/** @type {BlindSpotApp} Global app instance (exposed for inline event handlers fallback). */
let _appInstance;

window.addEventListener('DOMContentLoaded', () => {
  _appInstance = new BlindSpotApp();
});

/** @internal Helper used only in rare cases where inline delegation isn't feasible. */
function q(id) { return document.getElementById(id); }
