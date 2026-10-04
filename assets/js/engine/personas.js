/**
 * Multi-Persona Cognitive Lenses
 * Allows users to review their blind spots through distinct analytical mindsets.
 */

export const PERSONAS = {
  socratic: {
    id: 'socratic',
    name: "The Socratic Mentor",
    tagline: "Uncovering What You Didn't Know You Assumed",
    avatar: "🦉",
    badge: "Exploratory & Reflective",
    tone: "Calibrated, open-ended, thought-provoking",
    perspective: "Examines unstated premises without judging. Asks questions that prompt you to uncover internal assumptions and test whether your reasoning holds up under self-scrutiny.",
    coreMotto: "An unexamined decision is not worth committing to."
  },
  devils_advocate: {
    id: 'devils_advocate',
    name: "The Devil's Advocate",
    tagline: "Stress-Testing Your Weakest Assumptions",
    avatar: "⚡",
    badge: "Adversarial Stress-Testing",
    tone: "Direct, challenging, unsparing",
    perspective: "Intentionally seeks out the flaws in your logic, surfaces hidden vulnerabilities, and asks the uncomfortable questions you may be avoiding.",
    coreMotto: "If your logic cannot withstand friendly critique now, it will crumble under reality later."
  },
  future_self: {
    id: 'future_self',
    name: "The 3-Year Future Self",
    tagline: "Evaluating Compounding Value & Regret Minimization",
    avatar: "⏳",
    badge: "Long-Horizon Lens",
    tone: "Patient, holistic, legacy-focused",
    perspective: "Looks back from 3 years ahead. Filters out immediate convenience (proximity, quick cash) to measure what truly compounds: skill depth, professional reputation, and personal health.",
    coreMotto: "Will this matter in 36 months, or did it merely consume your present bandwidth?"
  },
  risk_auditor: {
    id: 'risk_auditor',
    name: "The Neutral Risk Auditor",
    tagline: "Assessing Reversibility, Dependencies & Downside Protection",
    avatar: "🛡️",
    badge: "Systemic Risk Lens",
    tone: "Objective, probabilistic, pragmatic",
    perspective: "Evaluates the contractual terms, fail-safes, academic policies, and reversibility. Calculates what happens in worst-case scenarios and checks for safety nets.",
    coreMotto: "Never risk what is essential for what is merely desirable without an exit plan."
  }
};
