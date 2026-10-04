/**
 * Follow-Up Conversation Engine
 * Provides Socratic follow-up responses to user questions without being prescriptive.
 */

const FOLLOW_UP_PATTERNS = [
  {
    triggers: ['should i', 'what should', 'tell me', 'what do you think', 'is it worth', 'is this good', 'is this bad', 'should i take', 'should i accept'],
    response: (q) => `That is precisely the kind of question I am designed to help you answer for yourself — not answer for you. What I can do is ask: what would need to be true for this to clearly be the right move? And which of those things have you actually verified?`
  },
  {
    triggers: ['bias', 'what bias', 'explain', 'what does', 'what is', 'what are'],
    response: (q) => `Great question to explore. Every bias represents a mental shortcut our brains use to save energy. The important thing is not just naming it — it's asking: "How specifically might this shortcut be distorting my perception of this decision right now?" Which bias from the report feels most applicable to your current reasoning?`
  },
  {
    triggers: ['assume', 'assumption', 'what if i verify', 'how do i check', 'how can i verify', 'how to verify'],
    response: (q) => `Excellent instinct. Assumptions become dangerous only when they remain unexamined. To verify any assumption: identify the exact claim you're taking for granted, find the single person or document that could definitively confirm or refute it, then contact them before committing. Which specific assumption do you want to verify first?`
  },
  {
    triggers: ['risk', 'worst case', 'what if it goes wrong', 'what happens if', 'scared', 'worried', 'afraid'],
    response: (q) => `Concern about downside scenarios is a sign of intellectual honesty, not weakness. Walk through this: if the worst plausible scenario materialized, what is the *actual* reversibility cost? How long would recovery take, and what resources exist to buffer that recovery? Fear is often most paralyzing when the worst-case is vague — making it specific almost always makes it less frightening.`
  },
  {
    triggers: ['i decided', 'i am going to', 'i will take', 'i made my decision', 'i accepted', 'i rejected'],
    response: (q) => `That is a meaningful milestone. Before fully closing the chapter, consider one last question: what would need to happen in the first 30 days for you to feel confident you made a well-informed choice — and what is your plan if those signals don't materialize?`
  },
  {
    triggers: ['money', 'stipend', 'salary', 'pay', 'compensation', 'financial'],
    response: (q) => `Financial factors are concrete and visible, which makes them cognitively very compelling. Here's a useful reframe: instead of evaluating the absolute number, ask what your net hourly rate of *learning* is — because skills compound over decades while stipends are consumed each month. What specific skills will be meaningfully advanced by this role that you cannot build another way?`
  },
  {
    triggers: ['family', 'parents', 'pressure', 'expectation', 'everyone wants me to'],
    response: (q) => `External expectations are real decision inputs, not noise — they carry genuine social and emotional weight. The useful distinction is between externally-driven obligations you are choosing to honor vs. assumptions about what others want that you have not directly verified. Have you explicitly discussed your reservations with the people whose expectations are influencing you?`
  }
];

const DEFAULT_RESPONSES = [
  `That's a rich area to explore. What specific part of your reasoning feels most uncertain or unverified to you right now?`,
  `Let me reflect that question back: if you imagine explaining your final decision to a skeptical but caring mentor three months from now, what part of your current reasoning would you find hardest to justify?`,
  `Interesting angle. What would need to be true for your current instinct to be completely correct — and which of those conditions have you empirically confirmed vs. assumed?`,
  `Consider this: the goal isn't to eliminate uncertainty, it's to convert unexamined uncertainty into informed, acceptable uncertainty. Which blind spots from the analysis feel most unresolved to you?`,
  `That's worth sitting with. What additional information would meaningfully change your assessment, and is that information realistically obtainable before your decision deadline?`
];

export function generateFollowUpResponse(userMessage) {
  const msgLower = (userMessage || '').toLowerCase();

  for (const pattern of FOLLOW_UP_PATTERNS) {
    if (pattern.triggers.some(t => msgLower.includes(t))) {
      return pattern.response(userMessage);
    }
  }

  // Return a random default Socratic response
  return DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
}
