/**
 * The Blind Spot - Cognitive Heuristics & Decision Analysis Engine
 * Detects implicit assumptions, cognitive biases, conflicting priorities,
 * second-order consequences, and generates non-prescriptive probing questions.
 */

export class CognitiveAnalyzer {
  constructor() {
    this.biasDefinitions = [
      {
        id: 'salience_bias',
        name: 'Salience & Availability Bias',
        description: 'Over-weighting readily available, prominent metrics (e.g., immediate stipend, physical proximity) while under-weighting hidden, intangible factors (mentorship quality, actual culture, academic standing).',
        triggerKeywords: ['stipend', 'money', 'close to home', 'near', 'distance', 'location', 'pay', 'salary', 'brand'],
        severity: 'High'
      },
      {
        id: 'planning_fallacy',
        name: 'Planning Fallacy / Optimism Bias',
        description: 'Assuming schedules, dual commitments (e.g., college exams + 8hr workday), and energy levels will proceed flawlessly without fatigue, schedule overlaps, or academic penalty.',
        triggerKeywords: ['manage', 'handle both', 'time', 'hours', 'schedule', 'college', 'exam', 'attendance', 'weekend'],
        severity: 'High'
      },
      {
        id: 'present_bias',
        name: 'Present Bias / Hyperbolic Discounting',
        description: 'Prioritizing immediate short-term rewards (monthly cash, immediate job title) at the potential expense of multi-year compounded career learning and skill depth.',
        triggerKeywords: ['now', 'immediate', 'quick', 'current', 'short term', 'need money', 'urgent'],
        severity: 'Medium'
      },
      {
        id: 'sunk_cost',
        name: 'Sunk Cost Fallacy',
        description: 'Sticking with an option or relationship primarily because of effort, time, or emotional capital already spent, rather than future net value.',
        triggerKeywords: ['already spent', 'invested', 'so far', 'months of prep', 'wasted', 'given up'],
        severity: 'Medium'
      },
      {
        id: 'false_dichotomy',
        name: 'False Dilemma / Binary Thinking',
        description: 'Framing the decision as a strict either/or choice (e.g., "accept this offer or lose my career chance") rather than negotiating terms, seeking part-time flexibility, or exploring parallel options.',
        triggerKeywords: ['only option', 'either', 'or else', 'last chance', 'have to', 'no other'],
        severity: 'Medium'
      },
      {
        id: 'halo_effect',
        name: 'Halo Effect / Brand Projection',
        description: 'Assuming that because a company or opportunity is reputable or attractive in one aspect, its internal mentorship, work-life balance, and day-to-day role will also be excellent.',
        triggerKeywords: ['big company', 'well known', 'famous', 'reputable', 'prestigious', 'top tier'],
        severity: 'Low'
      }
    ];
  }

  /**
   * Main analysis entry point.
   * Returns a complete, structured multi-dimensional audit of the decision context.
   */
  analyze(context, additionalDetails = {}) {
    const text = `${context} ${additionalDetails.role || ''} ${additionalDetails.constraints || ''}`.toLowerCase();
    
    // 1. Detect Cognitive Biases
    const detectedBiases = this.detectBiases(text);

    // 2. Extract Hidden / Unstated Assumptions
    const unstatedAssumptions = this.extractAssumptions(text, context);

    // 3. Uncover Overlooked Second & Third Order Consequences
    const overlookedFactors = this.extractOverlookedFactors(text);

    // 4. Identify Reasoning Conflicts / Cognitive Dissonance
    const reasoningConflicts = this.detectConflicts(text, context);

    // 5. Generate Non-Prescriptive Socratic Probing Questions
    const probingQuestions = this.generateProbingQuestions(unstatedAssumptions, detectedBiases, overlookedFactors);

    // 6. Generate Pre-Mortem Scenario
    const preMortem = this.generatePreMortem(context, detectedBiases, unstatedAssumptions);

    // 7. Calculate Blind Spot Clarity Metrics
    const metrics = this.calculateMetrics(detectedBiases, unstatedAssumptions, overlookedFactors, reasoningConflicts);

    return {
      timestamp: new Date().toISOString(),
      metrics,
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
    // Guarantee at least foundational bias analysis if text is general
    if (results.length === 0) {
      results.push({
        id: 'salience_bias',
        name: 'Salience Bias',
        description: 'Focusing primarily on surface criteria while leaving ambient dependencies unexamined.',
        riskLevel: 'Moderate',
        evidenceCount: 1
      });
    }
    return results;
  }

  extractAssumptions(text, originalContext) {
    const assumptions = [];

    // Academic / Performance assumption
    if (text.includes('intern') || text.includes('college') || text.includes('study') || text.includes('degree') || text.includes('schedule')) {
      assumptions.push({
        id: 'asmp_academics',
        title: 'Academic Policy & Exam Friction',
        implicitBelief: 'Assuming college attendance mandates, surprise labs, or exam schedules will flexibly accommodate a full-time or intensive routine without GPA erosion.',
        stressTestQuestion: 'Has the department head or college dean confirmed in writing that this attendance waiver or leave for internships is formally sanctioned?',
        status: 'Unverified'
      });
    }

    // Mentorship & Quality of Learning assumption
    if (text.includes('learning') || text.includes('industry') || text.includes('experience') || text.includes('skills')) {
      assumptions.push({
        id: 'asmp_mentorship',
        title: 'Mentorship vs. Autonomous Busywork',
        implicitBelief: 'Assuming that "industry experience" automatically equates to dedicated senior mentoring and high-impact engineering work, rather than repetitive routine tasks.',
        stressTestQuestion: 'What dedicated 1-on-1 mentorship time and measurable technical deliverables are guaranteed in the offer letter or job description?',
        status: 'Unverified'
      });
    }

    // Proximity & Fatigue assumption
    if (text.includes('close to home') || text.includes('location') || text.includes('distance') || text.includes('commute')) {
      assumptions.push({
        id: 'asmp_proximity',
        title: 'Zero Commute Fatigue Fallacy',
        implicitBelief: 'Assuming that because the physical office is close, mental and emotional exhaustion from an 8-hour shift will not drain evening study or personal projects.',
        stressTestQuestion: 'How many uninterrupted cognitive hours do you actually have after work when factoring in mental fatigue, meals, and recovery?',
        status: 'Unverified'
      });
    }

    // Financial / Stipend Value assumption
    if (text.includes('stipend') || text.includes('money') || text.includes('pay') || text.includes('salary')) {
      assumptions.push({
        id: 'asmp_compensation',
        title: 'Nominal Pay vs. Career Opportunity Cost',
        implicitBelief: 'Assuming that earning money today outweighs the skill velocity or competitive portfolio you could build through alternate specialized projects or research.',
        stressTestQuestion: 'If the stipend was cut by 50%, would the underlying technical and network equity still make this opportunity compelling?',
        status: 'Unverified'
      });
    }

    // Role Scope & Reversibility
    assumptions.push({
      id: 'asmp_reversibility',
      title: 'Exit Cost & Reversibility',
      implicitBelief: 'Assuming that if this commitment becomes overwhelming, walking away or renegotiating hours has negligible social or contractual penalties.',
      stressTestQuestion: 'What notice period, bond, or academic repercussion exists if you discover within 4 weeks that the situation is unsustainable?',
      status: 'Unverified'
    });

    return assumptions;
  }

  extractOverlookedFactors(text) {
    const factors = [];

    factors.push({
      category: '2nd-Order Academic Ripple Effect',
      factor: 'Cumulative Fatigue & Attendance Penalties',
      impact: 'Missing continuous assessments or semester project presentations can trigger strict minimum attendance thresholds or sudden exam debarment.'
    });

    factors.push({
      category: 'Market Value & Portfolio Equity',
      factor: 'Proprietary Tasks vs. Public Portfolio Proof',
      impact: 'If the company restricts sharing source code or public repos, 6 months of effort may yield an NDA with minimal demonstrable artifacts for future top-tier applications.'
    });

    factors.push({
      category: 'Workplace Culture & Overtime Norms',
      factor: 'Implicit Overtime & Weekend Slack Expectations',
      impact: 'What is officially written as 8 hours often stretches to 10+ hours under sprint deadlines, severely encroaching on non-work obligations.'
    });

    factors.push({
      category: 'Alternative Opportunity Cost',
      factor: 'Foregone Open Source, Hackathons, & Competitive Prep',
      impact: 'Committing 40-50 hours weekly locks you out of participating in tier-1 hackathons, interview prep sprints, or independent research.'
    });

    return factors;
  }

  detectConflicts(text, context) {
    const conflicts = [];

    // Conflict between high academic stakes and intensive work
    if ((text.includes('college') || text.includes('academic') || text.includes('gpa') || text.includes('grades') || text.includes('exam')) &&
        (text.includes('6-month') || text.includes('full time') || text.includes('hours') || text.includes('internship'))) {
      conflicts.push({
        dilemma: 'Academic Excellence vs. Intensive Workload',
        observation: 'Your context highlights high value on college progress and graduation requirements, yet the commitment demands 30-45 hours of weekly cognitive presence.',
        reflection: 'Can both priorities thrive concurrently, or is one destined to absorb the friction when deadlines collide?'
      });
    }

    // Conflict between short-term pay and long-term trajectory
    if (text.includes('stipend') && (text.includes('career') || text.includes('future') || text.includes('learning'))) {
      conflicts.push({
        dilemma: 'Immediate Compensation vs. Long-Term Skill Leverage',
        observation: 'The primary draw identified is attractive compensation, but the long-term goal requires deep specialized skills that may or may not be taught in this specific role.',
        reflection: 'Are you choosing this primarily for financial relief now, or because it is genuinely the steepest learning curve available?'
      });
    }

    if (conflicts.length === 0) {
      conflicts.push({
        dilemma: 'Visible Benefits vs. Invisible Trade-offs',
        observation: 'Your framing centers heavily on the clear advantages (stipend, convenience, proximity), with relatively little documentation regarding the trade-offs being surrendered.',
        reflection: 'What are you consciously saying "No" to by saying "Yes" to this opportunity?'
      });
    }

    return conflicts;
  }

  generateProbingQuestions(assumptions, biases, overlooked) {
    const questions = [
      {
        tag: 'Verification',
        text: 'What concrete evidence do you have about the team\'s daily workflow from current or past interns, rather than just the recruiter\'s pitch?'
      },
      {
        tag: 'Boundary Setting',
        text: 'If your college suddenly reschedules major exams during high-stakes company deliverables, what explicit contingency plan is in place?'
      },
      {
        tag: 'Growth Trajectory',
        text: 'Will the specific technologies and tools used here make you dramatically more competitive in 18 months, or are they legacy/niche systems?'
      },
      {
        tag: 'Falsifiability',
        text: 'What specific red flag—if observed during week 2—would prompt you to initiate an exit conversation?'
      },
      {
        tag: 'Energy Allocation',
        text: 'When you picture a grueling Thursday after 8 hours of work, what realistic energy reserve will you have for coursework or personal well-being?'
      }
    ];
    return questions;
  }

  generatePreMortem(context, biases, assumptions) {
    return {
      timeframe: '12 Months in the Future',
      scenario: 'Imagine it is exactly one year from today. The decision turned out to be an exhausting mistake that caused severe academic stress, minimal portfolio progress, and burnout.',
      rootCauses: [
        'The unverified assumption that the internship would offer structured mentorship dissolved into unguided maintenance work.',
        'Mid-semester college exams clashed with client sprint milestones, leading to attendance disputes and GPA drop.',
        'Initial enthusiasm driven by proximity and stipend faded, leaving no time for competitive programming, open source, or rest.'
      ],
      preventionCheck: 'What single preventative guardrail could you put in place today to make this specific failure scenario virtually impossible?'
    };
  }

  calculateMetrics(biases, assumptions, overlooked, conflicts) {
    const totalBlindSpots = biases.length + assumptions.length + overlooked.length + conflicts.length;
    // Decision Clarity Index: calculated based on the scope of blind spots surfaced
    const biasLoad = Math.min(100, biases.length * 18);
    const assumptionDensity = Math.min(100, assumptions.length * 20);
    const criticalCoverage = Math.min(100, Math.round((totalBlindSpots / 15) * 100));

    return {
      totalBlindSpots,
      biasLoad,
      assumptionDensity,
      criticalCoverage,
      readinessGrade: criticalCoverage > 70 ? 'Deeply Examined' : 'Needs Verification'
    };
  }

  generateNeutralSummary(biases, assumptions, overlooked) {
    return `Analysis uncovered ${assumptions.length} unstated assumptions, ${biases.length} dominant cognitive biases, and ${overlooked.length} second-order consequences. The goal is not to dissuade you, but to empower you with calibrated questions and rigorous validation checks before locking in your decision.`;
  }
}
