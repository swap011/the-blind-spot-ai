/**
 * The Blind Spot - Cognitive Heuristics & Decision Analysis Engine v2
 * Detects implicit assumptions, cognitive biases, conflicting priorities,
 * second-order consequences, and generates non-prescriptive probing questions.
 */

export class CognitiveAnalyzer {
  constructor() {
    this.biasDefinitions = [
      {
        id: 'salience_bias',
        name: 'Salience & Availability Bias',
        description: 'Over-weighting readily available, prominent metrics (immediate stipend, physical proximity) while under-weighting hidden, intangible factors (mentorship quality, culture, academic standing).',
        triggerKeywords: ['stipend', 'money', 'close to home', 'near', 'distance', 'location', 'pay', 'salary', 'brand', 'commute'],
        severity: 'High',
        icon: '📊'
      },
      {
        id: 'planning_fallacy',
        name: 'Planning Fallacy / Optimism Bias',
        description: 'Assuming schedules, dual commitments (college exams + 8hr workday), and energy levels will proceed flawlessly without fatigue, overlap, or academic penalty.',
        triggerKeywords: ['manage', 'handle both', 'time', 'hours', 'schedule', 'college', 'exam', 'attendance', 'weekend', 'balance'],
        severity: 'High',
        icon: '⏱️'
      },
      {
        id: 'present_bias',
        name: 'Present Bias / Hyperbolic Discounting',
        description: 'Prioritizing immediate short-term rewards (monthly cash, immediate title) at the potential expense of multi-year compounded career learning and skill depth.',
        triggerKeywords: ['now', 'immediate', 'quick', 'current', 'short term', 'need money', 'urgent', 'right now', 'today'],
        severity: 'Medium',
        icon: '⚡'
      },
      {
        id: 'sunk_cost',
        name: 'Sunk Cost Fallacy',
        description: 'Sticking with an option primarily because of effort, time, or emotional capital already spent, rather than future net value.',
        triggerKeywords: ['already spent', 'invested', 'so far', 'months of prep', 'wasted', 'given up', 'already started', 'been working'],
        severity: 'Medium',
        icon: '🪝'
      },
      {
        id: 'false_dichotomy',
        name: 'False Dilemma / Binary Thinking',
        description: 'Framing the decision as a strict either/or choice rather than negotiating terms, seeking flexibility, or exploring parallel options.',
        triggerKeywords: ['only option', 'either', 'or else', 'last chance', 'have to', 'no other', 'only choice', 'must decide'],
        severity: 'Medium',
        icon: '⚖️'
      },
      {
        id: 'halo_effect',
        name: 'Halo Effect / Brand Projection',
        description: 'Assuming that because a company is reputable in one aspect, its mentorship, work-life balance, and day-to-day reality will also be excellent.',
        triggerKeywords: ['big company', 'well known', 'famous', 'reputable', 'prestigious', 'top tier', 'brand name', 'mnc', 'startup'],
        severity: 'Low',
        icon: '✨'
      },
      {
        id: 'anchoring_bias',
        name: 'Anchoring Bias',
        description: 'Over-relying on the first piece of information encountered (e.g., the stated stipend figure) as the primary reference point for evaluating everything else.',
        triggerKeywords: ['compared to', 'higher than', 'better than others', 'more than', 'at least', 'benchmark', 'market rate'],
        severity: 'Medium',
        icon: '⚓'
      },
      {
        id: 'confirmation_bias',
        name: 'Confirmation Bias',
        description: 'Selectively seeking or emphasizing information that confirms the desired outcome while discounting contradictory signals.',
        triggerKeywords: ['people say', 'i heard', 'seems like', 'looks like', 'everyone says', 'they told me', 'i think it will'],
        severity: 'High',
        icon: '🔍'
      }
    ];
  }

  /**
   * Main analysis entry point.
   * Returns a complete, structured multi-dimensional cognitive audit.
   */
  analyze(context, additionalDetails = {}) {
    const text = `${context} ${additionalDetails.role || ''} ${additionalDetails.constraints || ''}`.toLowerCase();

    const detectedBiases = this.detectBiases(text);
    const unstatedAssumptions = this.extractAssumptions(text, context);
    const overlookedFactors = this.extractOverlookedFactors(text);
    const reasoningConflicts = this.detectConflicts(text, context);
    const probingQuestions = this.generateProbingQuestions(unstatedAssumptions, detectedBiases, overlookedFactors);
    const preMortem = this.generatePreMortem(context, detectedBiases, unstatedAssumptions);
    const metrics = this.calculateMetrics(detectedBiases, unstatedAssumptions, overlookedFactors, reasoningConflicts);
    const decisionHealthScore = this.calculateHealthScore(detectedBiases, unstatedAssumptions, overlookedFactors);

    return {
      timestamp: new Date().toISOString(),
      metrics,
      decisionHealthScore,
      detectedBiases,
      unstatedAssumptions,
      overlookedFactors,
      reasoningConflicts,
      probingQuestions,
      preMortem,
      summary: this.generateNeutralSummary(detectedBiases, unstatedAssumptions, overlookedFactors)
    };
  }

  detectBiases(text) {
    const results = [];
    for (const bias of this.biasDefinitions) {
      const matchCount = bias.triggerKeywords.filter(kw => text.includes(kw)).length;
      if (matchCount > 0) {
        results.push({
          ...bias,
          evidenceCount: matchCount,
          riskLevel: matchCount >= 2 ? 'High' : bias.severity
        });
      }
    }
    if (results.length === 0) {
      results.push({
        id: 'salience_bias',
        name: 'Salience Bias',
        description: 'Focusing primarily on surface criteria while leaving ambient dependencies unexamined.',
        riskLevel: 'Moderate',
        evidenceCount: 1,
        icon: '📊'
      });
    }
    return results;
  }

  extractAssumptions(text, originalContext) {
    const assumptions = [];

    if (text.includes('intern') || text.includes('college') || text.includes('study') || text.includes('degree') || text.includes('schedule') || text.includes('attendance')) {
      assumptions.push({
        id: 'asmp_academics',
        title: 'Academic Policy & Exam Friction',
        implicitBelief: 'Assuming college attendance mandates, surprise lab sessions, and exam schedules will flexibly accommodate a full-time routine without GPA erosion or debarment risk.',
        stressTestQuestion: 'Has the department head confirmed in writing that this attendance waiver is formally sanctioned? What is the penalty if attendance drops below the threshold?',
        status: 'Unverified',
        category: 'Academic Risk'
      });
    }

    if (text.includes('learning') || text.includes('industry') || text.includes('experience') || text.includes('skills') || text.includes('work')) {
      assumptions.push({
        id: 'asmp_mentorship',
        title: 'Mentorship vs. Autonomous Busywork',
        implicitBelief: 'Assuming "industry experience" automatically equates to dedicated senior mentoring and high-impact engineering work, rather than repetitive routine tasks or ticket-resolution work.',
        stressTestQuestion: 'What dedicated 1-on-1 mentorship hours and measurable technical ownership are explicitly guaranteed in the offer letter or role description?',
        status: 'Unverified',
        category: 'Career Growth'
      });
    }

    if (text.includes('close to home') || text.includes('location') || text.includes('distance') || text.includes('commute') || text.includes('near') || text.includes('home')) {
      assumptions.push({
        id: 'asmp_proximity',
        title: 'Zero Commute Fatigue Assumption',
        implicitBelief: 'Assuming that physical proximity eliminates mental and emotional exhaustion—that after 8+ hours of focused technical work, cognitive capacity for studying or personal projects will remain high.',
        stressTestQuestion: 'How many hours of genuinely productive study time will you realistically have after a cognitively demanding 9-hour workday, meals, and recovery?',
        status: 'Unverified',
        category: 'Energy & Wellbeing'
      });
    }

    if (text.includes('stipend') || text.includes('money') || text.includes('pay') || text.includes('salary') || text.includes('compensation')) {
      assumptions.push({
        id: 'asmp_compensation',
        title: 'Nominal Pay vs. Career Opportunity Cost',
        implicitBelief: 'Assuming that earning money now outweighs the skill velocity, open-source portfolio building, or competitive programming practice that could be accumulated instead.',
        stressTestQuestion: 'If the stipend was reduced by 60%, would the underlying technical skills, network access, and career trajectory still make this role uniquely compelling?',
        status: 'Unverified',
        category: 'Financial Trade-off'
      });
    }

    if (text.includes('startup') || text.includes('equity') || text.includes('founding') || text.includes('early stage')) {
      assumptions.push({
        id: 'asmp_startup_equity',
        title: 'Startup Equity Dilution & Exit Reality',
        implicitBelief: 'Assuming equity figures will retain their stated value through multiple future fundraising rounds without significant dilution, and that a liquidity event will actually occur within a predictable timeline.',
        stressTestQuestion: 'At what Series round does your equity become meaningfully diluted, and what is the realistic probability-weighted expected value given the company\'s current runway?',
        status: 'Unverified',
        category: 'Financial Risk'
      });
    }

    assumptions.push({
      id: 'asmp_reversibility',
      title: 'Exit Cost & Contract Reversibility',
      implicitBelief: 'Assuming that if the commitment becomes overwhelming, walking away or renegotiating has negligible social, financial, or contractual penalties.',
      stressTestQuestion: 'What notice period, contractual bond, or academic repercussion exists if you need to exit within 6 weeks after discovering the situation is unsustainable?',
      status: 'Unverified',
      category: 'Risk Management'
    });

    return assumptions;
  }

  extractOverlookedFactors(text) {
    return [
      {
        category: '2nd-Order Academic Ripple',
        factor: 'Cumulative Fatigue & Attendance Debarment',
        impact: 'Missing continuous assessments or semester project presentations can trigger minimum attendance thresholds, causing sudden exam debarment weeks before results.',
        icon: '🎓'
      },
      {
        category: 'Market Value & Portfolio',
        factor: 'NDA & Proprietary Code Restrictions',
        impact: 'If the company restricts sharing source code publicly, 6 months of effort may yield no demonstrable artifacts for future applications, interviews, or GitHub portfolio.',
        icon: '🔒'
      },
      {
        category: 'Workplace Culture',
        factor: 'Implicit Overtime & Weekend Slack Expectations',
        impact: 'What is officially "8 hours" often stretches to 10-12 hours under sprint deadlines, severely encroaching on study time, sleep, and extracurricular commitments.',
        icon: '⏰'
      },
      {
        category: 'Alternative Opportunity Cost',
        factor: 'Foregone Competitive Opportunities',
        impact: 'Committing 40-50 hours weekly prevents participation in tier-1 hackathons, interview prep cycles, open-source contributions, and personal project portfolios that compound career growth.',
        icon: '🚀'
      },
      {
        category: 'Social & Mental Health',
        factor: 'Isolation from Peer Network & College Life',
        impact: 'Missing formative college social experiences, peer study groups, club activities, and campus recruitment drives during the critical final-year period.',
        icon: '💚'
      }
    ];
  }

  detectConflicts(text, context) {
    const conflicts = [];

    if ((text.includes('college') || text.includes('academic') || text.includes('exam')) &&
        (text.includes('full time') || text.includes('hours') || text.includes('internship') || text.includes('work'))) {
      conflicts.push({
        dilemma: 'Academic Excellence vs. Intensive Workload',
        observation: 'Your context highlights high value on academic progress and graduation requirements, yet the commitment demands 40-50 hours of weekly cognitive presence in an external role.',
        reflection: 'When a surprise exam or project deadline clashes with a critical client sprint, which obligation gets sacrificed—and what is the compounding cost of that sacrifice?'
      });
    }

    if (text.includes('stipend') && (text.includes('career') || text.includes('future') || text.includes('learning') || text.includes('growth'))) {
      conflicts.push({
        dilemma: 'Immediate Compensation vs. Long-Term Skill Leverage',
        observation: 'The stated primary motivation centers on compensation, but the long-term goal requires deep specialized skills that may or may not be taught in this specific operational role.',
        reflection: 'Are you choosing this primarily for immediate financial relief, or because it is genuinely the steepest learning curve available to you right now?'
      });
    }

    if (text.includes('startup') && (text.includes('risk') || text.includes('stable') || text.includes('family') || text.includes('loan') || text.includes('debt'))) {
      conflicts.push({
        dilemma: 'Entrepreneurial Upside vs. Financial Stability Obligations',
        observation: 'High-risk startup equity upside conflicts with near-term financial obligations (family support, loan repayments, living expenses) that require a stable, predictable income floor.',
        reflection: 'What is the minimum monthly income required to sustain all obligations, and what happens to dependents if the startup runs out of runway before your next paycheck?'
      });
    }

    if (conflicts.length === 0) {
      conflicts.push({
        dilemma: 'Visible Benefits vs. Hidden Trade-offs',
        observation: 'Your framing centers heavily on the clear, immediate advantages while relatively little attention has been given to what is being permanently surrendered by committing.',
        reflection: 'What are you explicitly saying "No" to for the next 6-12 months by saying "Yes" to this—and is that trade implicitly acceptable to you?'
      });
    }

    return conflicts;
  }

  generateProbingQuestions(assumptions, biases, overlooked) {
    return [
      {
        tag: 'Ground-Truth Verification',
        text: 'What concrete evidence—from current or past participants, not recruiters—do you have about the team\'s actual day-to-day workflow and mentorship structure?'
      },
      {
        tag: 'Contingency Planning',
        text: 'If your college suddenly rescheduled major exams or project demos during the peak delivery weeks of this commitment, what explicit contingency plan is already in place?'
      },
      {
        tag: 'Future Technology Stack',
        text: 'Will the specific technologies, tools, and methodologies used here make you materially more competitive in top-tier technical interviews 18 months from now?'
      },
      {
        tag: 'Exit Criteria',
        text: 'What specific observable red flag—if encountered during the first two weeks—would give you clear, unambiguous grounds to initiate an honest exit conversation?'
      },
      {
        tag: 'Negotiability Check',
        text: 'Have you explored negotiating for a hybrid or part-time arrangement, or are you assuming the terms as stated are completely fixed and non-negotiable?'
      },
      {
        tag: 'The Regret Minimization Test',
        text: 'Projected 5 years forward, which carries a greater anticipated regret: declining this particular opportunity, or accepting it and missing the alternatives that will become unavailable?'
      }
    ];
  }

  generatePreMortem(context, biases, assumptions) {
    return {
      timeframe: '12 Months in the Future',
      scenario: 'It is exactly one year from today. Looking back, the decision turned out to be a compounding source of exhaustion, academic setbacks, and missed portfolio-building opportunities—yielding minimal career advancement relative to the cost.',
      rootCauses: [
        'The unverified assumption that the internship offered structured mentorship dissolved into repetitive maintenance and ticket-resolution work.',
        'Mid-semester exams clashed with sprint delivery deadlines, leading to attendance disputes, GPA degradation, and deferred graduation risk.',
        'Initial enthusiasm driven by stipend and location faded within weeks, leaving insufficient cognitive energy for competitive prep, open-source contributions, or recovery.',
        'The NDA clause prevented showcasing any of the work publicly, leaving a 6-month gap on the portfolio that required extensive explanation in every subsequent interview.'
      ],
      preventionCheck: 'What single contractual, academic, or personal guardrail—if put in place before day one—would render this specific failure scenario virtually impossible to materialize?'
    };
  }

  calculateMetrics(biases, assumptions, overlooked, conflicts) {
    const totalBlindSpots = biases.length + assumptions.length + overlooked.length + conflicts.length;
    const biasLoad = Math.min(100, biases.length * 15);
    const assumptionDensity = Math.min(100, assumptions.length * 18);
    const criticalCoverage = Math.min(100, Math.round((totalBlindSpots / 18) * 100));

    return {
      totalBlindSpots,
      biasLoad,
      assumptionDensity,
      criticalCoverage,
      readinessGrade: criticalCoverage > 75 ? 'Deeply Examined' : criticalCoverage > 45 ? 'Partially Examined' : 'Needs Verification'
    };
  }

  calculateHealthScore(biases, assumptions, overlooked) {
    // Score from 0-100 representing decision readiness (not decision correctness)
    const highSeverityBiases = biases.filter(b => b.severity === 'High' || b.riskLevel === 'High').length;
    const unverifiedAssumptions = assumptions.filter(a => a.status === 'Unverified').length;

    let score = 100;
    score -= highSeverityBiases * 12;
    score -= unverifiedAssumptions * 10;
    score -= overlooked.length * 4;
    score = Math.max(8, Math.min(100, score));

    return {
      score,
      label: score >= 70 ? 'Well-Examined' : score >= 45 ? 'Partially Examined' : 'Needs Due Diligence',
      color: score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#f43f5e'
    };
  }

  generateNeutralSummary(biases, assumptions, overlooked) {
    const highBiases = biases.filter(b => b.severity === 'High' || b.riskLevel === 'High');
    return `Analysis surfaced ${assumptions.length} unverified assumptions, ${biases.length} cognitive bias patterns (${highBiases.length} high-severity), and ${overlooked.length} second-order consequences. This report does not evaluate whether your decision is correct — it surfaces what may be invisible to you so you can make a more calibrated, empirically grounded choice.`;
  }
}
