// Builder title generator for Hacker House Goa 2026

const PREFIXES = [
  "Autonomous",
  "Zero-Knowledge",
  "Neural",
  "Consensus",
  "Latency",
  "Kernel",
  "Fullstack",
  "DeFi",
  "Protocol",
  "Syntactic",
  "Quantum",
  "Distributed",
  "On-Chain",
  "Hyper-Scale",
  "Vector",
  "Tokenomic",
  "Deterministic",
  "Algorithmic",
  "Agentic",
  "Deep-Sea",
  "Goa-Vibing",
  "Off-Grid",
  "Ship-First",
  "Sub-Millisecond",
  "Bare-Metal",
  "Model",
  "Prompt",
  "Cryptographic"
];

const ROLES = [
  "Alchemist",
  "Architect",
  "Shaman",
  "Whisperer",
  "Wrangler",
  "Shipper",
  "Slayer",
  "Auditor",
  "Crafter",
  "Strategist",
  "Mechanic",
  "Navigator",
  "Maxi",
  "Warlock",
  "Maverick",
  "Overlord",
  "Evangelist",
  "Sorcerer",
  "Cartographer",
  "Hacker",
  "Conjurer",
  "Breaker",
  "Operator",
  "Vanguard"
];

export const ROLE_PRESETS = [
  "AI Agents & LLMs",
  "Solana & Rust",
  "Fullstack Web3",
  "Smart Contract Security",
  "Distributed Systems",
  "Product Engineering",
  "Applied Cryptography",
  "DeFi & MEV",
  "Frontend & UX Systems",
  "MLOps & GPU Infra"
];

export function generateRandomTitle() {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const role = ROLES[Math.floor(Math.random() * ROLES.length)];
  return `${prefix} ${role}`;
}

export function generateRandomBuilderId() {
  const num = Math.floor(1 + Math.random() * 247).toString().padStart(3, "0");
  return `#HHG-26-${num}`;
}
