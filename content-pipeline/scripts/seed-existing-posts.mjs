#!/usr/bin/env node
/**
 * One-time script: Migrate hardcoded FEED_POSTS → Firestore feedPosts collection
 */
import { getDb } from '../lib/firebase-admin-init.mjs';

const FEED_POSTS = [
  {
    id: 'post-1',
    category: 'strategies',
    title: 'How I Built a $5K/mo Automation Agency in 90 Days',
    content: 'The key was niching down hard into real estate follow-ups. I used a simple Make.com + OpenAI pipeline to generate personalized follow-up emails for realtors. Started with 3 free trials, converted 2, then scaled through referrals. The secret? Charging for outcomes, not hours.',
    author: 'Marcus Chen',
    authorInitial: 'M',
    personaId: 'marcus-chen',
    date: new Date('2026-02-12'),
    tags: ['automation', 'agency', 'real-estate'],
    premium: false
  },
  {
    id: 'post-2',
    category: 'results',
    title: 'Client Case Study: 340% ROI on AI Chatbot Deployment',
    content: 'Deployed a custom RAG chatbot for an e-commerce store. It handles 78% of support tickets autonomously. Setup cost was $2,400, and the client saves $8,200/month in support staff costs. Full breakdown of the tech stack and prompting strategy inside.',
    author: 'Aisha Patel',
    authorInitial: 'A',
    personaId: 'aisha-patel',
    date: new Date('2026-02-11'),
    tags: ['case-study', 'chatbot', 'ROI'],
    premium: true
  },
  {
    id: 'post-3',
    category: 'tips',
    title: '5 Prompt Engineering Patterns That Actually Work in Production',
    content: 'After shipping 40+ AI features, these are the patterns I keep coming back to: 1) Chain of Thought with guardrails, 2) Few-shot with dynamic example selection, 3) Role-based system prompts with constraints, 4) Output schema enforcement, 5) Confidence scoring with fallbacks.',
    author: 'Jordan Rivera',
    authorInitial: 'J',
    personaId: 'jordan-rivera',
    date: new Date('2026-02-10'),
    tags: ['prompt-engineering', 'production', 'patterns'],
    premium: false
  },
  {
    id: 'post-4',
    category: 'jobs',
    title: 'Hiring: AI Automation Specialist - Remote, $120-150K',
    content: 'We are looking for someone to build and maintain our internal AI automation suite. You will work on document processing pipelines, customer service AI, and data enrichment flows. Must have experience with LangChain, Make.com or n8n, and at least one vector database.',
    author: 'TechCorp Recruiting',
    authorInitial: 'T',
    personaId: 'techcorp-recruiting',
    date: new Date('2026-02-10'),
    tags: ['remote', 'full-time', 'AI-automation'],
    premium: false
  },
  {
    id: 'post-5',
    category: 'keywords',
    title: 'Trending Keywords This Week: "AI Agent Framework" +280%',
    content: 'Search volume analysis for the AI tools space: "AI agent framework" is up 280%, "vibe coding" up 190%, "MCP servers" up 340%, "cursor rules" up 150%. These signal where demand is heading. Build tools targeting these terms now.',
    author: 'AutoNateAI Research',
    authorInitial: 'A',
    personaId: 'autonateai-research',
    date: new Date('2026-02-09'),
    tags: ['SEO', 'trends', 'market-intel'],
    premium: true
  },
  {
    id: 'post-6',
    category: 'strategies',
    title: 'The "Productized Service" Model for AI Freelancers',
    content: 'Stop trading time for money. Package your AI skills into fixed-scope offerings: "AI Email Responder Setup - $997" or "Custom GPT Training - $1,500". I went from $50/hr freelancing to $12K/mo with just 3 productized offerings. Here is the exact playbook.',
    author: 'Damon Wright',
    authorInitial: 'D',
    personaId: 'damon-wright',
    date: new Date('2026-02-08'),
    tags: ['freelancing', 'pricing', 'productized'],
    premium: false
  },
  {
    id: 'post-7',
    category: 'results',
    title: 'Monthly Revenue Report: AutoNateAI Tool Sellers (Jan 2026)',
    content: 'Aggregate data from our top 50 sellers: Average revenue $3,400/mo, median $1,800/mo. Top category: Workflow automation templates. Fastest growing: AI agent starter kits. Best conversion rates on tools priced $29-$49. Full data and charts available.',
    author: 'AutoNateAI Analytics',
    authorInitial: 'A',
    personaId: 'autonateai-analytics',
    date: new Date('2026-02-07'),
    tags: ['revenue', 'analytics', 'marketplace'],
    premium: true
  },
  {
    id: 'post-8',
    category: 'tips',
    title: 'How to Structure Your AI Tool README for Maximum Sales',
    content: 'Your README is your sales page. After A/B testing 20+ listings, this structure wins: 1) One-line value prop, 2) 30-second demo GIF, 3) "What you get" bullet list, 4) Setup in 3 steps, 5) Before/after comparison, 6) FAQ addressing objections. Template included.',
    author: 'Priya Sharma',
    authorInitial: 'P',
    personaId: 'priya-sharma',
    date: new Date('2026-02-06'),
    tags: ['copywriting', 'conversion', 'selling'],
    premium: false
  },
  {
    id: 'post-9',
    category: 'jobs',
    title: 'Contract: Build a Multi-Agent System for Legal Research',
    content: 'Law firm needs a multi-agent AI system that can analyze case law, summarize depositions, and draft initial briefs. 3-month contract, $15K budget. Must have experience with multi-agent orchestration and legal domain knowledge preferred.',
    author: 'LegalTech Solutions',
    authorInitial: 'L',
    personaId: 'legaltech-solutions',
    date: new Date('2026-02-05'),
    tags: ['contract', 'multi-agent', 'legal'],
    premium: false
  },
  {
    id: 'post-10',
    category: 'keywords',
    title: 'Underserved Niches: AI Tools Nobody Is Building Yet',
    content: 'After analyzing 10K+ search queries with zero or low-competition results: AI-powered inventory forecasting for small retailers, automated grant writing for nonprofits, AI meal prep planners with grocery API integration, and pet health monitoring AI. Each has 1K+ monthly searches.',
    author: 'AutoNateAI Research',
    authorInitial: 'A',
    personaId: 'autonateai-research',
    date: new Date('2026-02-04'),
    tags: ['niches', 'opportunity', 'research'],
    premium: true
  }
];

async function seedExistingPosts() {
  const db = getDb();

  console.log(`Migrating ${FEED_POSTS.length} hardcoded posts to Firestore...`);

  const batch = db.batch();

  for (const post of FEED_POSTS) {
    const ref = db.collection('feedPosts').doc(post.id);
    batch.set(ref, {
      id: post.id,
      category: post.category,
      title: post.title,
      content: post.content,
      contentType: 'text',
      interactiveData: null,
      author: post.author,
      authorInitial: post.authorInitial,
      personaId: post.personaId,
      date: post.date,
      tags: post.tags,
      premium: post.premium,
      sourceIds: [],
      status: 'published',
      likes: 0,
      commentCount: 0,
      createdAt: post.date,
      updatedAt: new Date()
    });
    console.log(`  + ${post.id}: ${post.title}`);
  }

  await batch.commit();
  console.log(`\nDone! ${FEED_POSTS.length} posts migrated to feedPosts collection.`);
}

seedExistingPosts().catch(err => {
  console.error('Failed to seed posts:', err);
  process.exit(1);
});
