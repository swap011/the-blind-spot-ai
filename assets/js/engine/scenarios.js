/**
 * Benchmark Decision Scenarios
 * Includes the official Hack2skill PromptWars problem scenario and realistic high-stakes dilemmas.
 */

export const BENCHMARK_SCENARIOS = [
  {
    id: 'hackathon_internship',
    title: 'The 6-Month Internship Dilemma (Hack2skill Benchmark)',
    category: 'Career & Academics',
    description: 'A student deciding whether to accept a 6-month intensive internship while managing college coursework.',
    context: `I am deciding whether to accept a 6-month software engineering internship offer.
Key details:
- Stipend: ₹35,000/month (very good for my college tier)
- Location: 15 minutes away from my house (walking/short commute)
- Working hours: 9:30 AM to 6:30 PM, Monday through Friday (in-office)
- Role: Junior Full Stack Intern working on client projects
- College schedule: 6th semester B.Tech with 75% mandatory attendance, mid-term labs, and final exams in May.
I am strongly leaning toward accepting this offer because the stipend is lucrative, the office is very close to home so I won't waste time in transit, and it will provide real industry experience for my resume.`,
    userReasoning: 'Accepting because: 1) Great stipend, 2) Very close to home, 3) Real industry experience on resume.',
    keyConstraints: 'College requires 75% attendance; final exams in May; 6-month lock-in agreement.',
    knownUncertainties: 'Whether company will grant exam leaves; how much actual mentorship will be given vs. routine bug fixing.'
  },
  {
    id: 'startup_vs_bigtech',
    title: 'Early-Stage AI Startup vs. Big-Tech Corporate Offer',
    category: 'Career & Financial',
    description: 'Choosing between a high-equity Founding Engineer role at a pre-seed AI startup versus a secure Fortune 500 SDE offer.',
    context: `I have two competing offers:
1. Early-stage AI startup: ₹12 LPA base + 1.5% equity, 60+ hrs/week, rapid product velocity, working directly with founders.
2. Tier-1 Multinational Corp: ₹24 LPA base + ₹6 LPA stocks, 40 hrs/week, stable brand, established mentorship, but working on internal legacy pipelines.
I am leaning toward the startup because I love the excitement of building from scratch and believe the equity will make me wealthy if we raise Series A.`,
    userReasoning: 'Choosing startup for higher growth, startup excitement, and potential equity upside.',
    keyConstraints: 'Need to support family living expenses; startup has 9 months of runway remaining.',
    knownUncertainties: 'Market risk of startup; whether founder equity dilution will render stock insignificant.'
  },
  {
    id: 'tech_monolith_migration',
    title: 'Monolith to Microservices / Kubernetes Migration',
    category: 'Engineering & Architecture',
    description: 'A Lead Architect considering rewriting a working monolith into event-driven microservices.',
    context: `Our team of 6 engineers manages a working monolithic Node/PostgreSQL web application serving 100k daily active users.
We are considering rewriting the core backend into microservices orchestrated with Kubernetes and Kafka.
My primary reasoning is that microservices are modern industry best practice, will decouple team modules, allow independent scaling, and look great for engineering modernization.`,
    userReasoning: 'Modernize tech stack, decouple services, and adopt Kubernetes for independent scalability.',
    keyConstraints: 'Only 6 developers; tight quarterly feature delivery deadlines; no in-house dedicated DevOps specialist.',
    knownUncertainties: 'Network latency overhead, distributed debugging complexity, and cluster operational expenses.'
  },
  {
    id: 'education_loan_masters',
    title: '₹60 Lakh Education Loan for Foreign Master\'s Degree',
    category: 'Education & Finance',
    description: 'Deciding whether to take a massive student loan for an MS abroad amid shifting visa and tech hiring climates.',
    context: `I have received admission to a prestigious US university for an MS in Computer Science. Total estimated cost is ₹60 Lakhs, which requires taking a collateral-backed education loan.
My reasoning is that an international degree carries lifelong prestige, opens doors to high salaries in USD, and offers global exposure that staying in my home country cannot match.`,
    userReasoning: 'US degree provides prestige, higher currency earnings, and global network.',
    keyConstraints: 'Family home pledged as collateral; strict interest payment schedule; current tight tech H1B / OPT hiring market.',
    knownUncertainties: 'Sponsorship rates for junior graduates; timeline to reach net-positive financial break-even.'
  }
];
