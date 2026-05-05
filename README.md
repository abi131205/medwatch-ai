# MedWatch AI 🛡️
### Real-Time Social Listening for Patient Experience & Safety Signals
**AI for Bharat Hackathon 2026 — Theme 6 | PAN IIT Bengaluru**
 
## 🔗 Live Demo
https://med-watch-agent--creature-13.replit.app
 
## 🎯 Problem Statement
Patient safety signals — adverse drug reactions, treatment complications,
and hospital quality issues — are scattered across social media, WhatsApp
groups, online forums and informal channels across India. No unified system
captures, analyzes or acts on these signals in real time. MedWatch AI solves this.
 
## ✅ Solution
An AI-powered social listening PLATFORM that:
- Monitors keywords across multiple sources (X/Twitter, Reddit, Quora, WhatsApp)
- Uses Claude AI to extract entities, classify risk, detect sentiment and flag PII
- Generates real-time cluster alerts when safety signals concentrate in a district
- Provides configurable project-based monitoring for any healthcare use case
- Shows geographic intelligence across districts in Karnataka
## 🏗️ Architecture
```
<img width="1440" height="1568" alt="image" src="https://github.com/user-attachments/assets/e4ad25ed-cbd3-4960-87ce-fa5b34267be5" />

```
 
## ⚡ Key Features
- **Projects** — Create monitoring projects with custom keywords and sources
- **Signal Feed** — Real-time feed with risk badges, filters, search
- **AI Analysis** — Claude NLP: entities, risk, sentiment, confidence, PII detection
- **Cluster Map** — Geographic heatmap of Karnataka districts
- **Alert System** — Auto-alerts when 3+ critical signals cluster in 24 hours
- **Analytics** — Urban vs Rural comparison, top drugs, source performance
- **Timeline** — Chronological signal view with day grouping
- **Engine Config** — Admin panel to configure and add data source engines
- **Architecture** — Full system architecture visualization
## 🛠️ Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | SQLite via better-sqlite3 |
| AI/NLP | Anthropic Claude API (claude-sonnet-4) |
| Maps | Leaflet.js + React-Leaflet |
| Charts | Recharts |
| Deployment | Replit (Production) |
 
## 🚀 Setup Instructions
```bash
# Clone the repository
git clone https://github.com/abi131205/medwatch-ai.git
cd medwatch-ai
 
# Install dependencies
npm install
cd artifacts/medwatch-ai && npm install
 
# Set environment variables
# Create .env file and add:
# ANTHROPIC_API_KEY=your_key_here
# PORT=3001
 
# Run the app
npm run dev
```
 
## 🌍 Real-World Impact
- Supports Karnataka Health Department pharmacovigilance needs
- Bridges urban Bengaluru and rural Raichur healthcare monitoring gap
- Aligns with Ayushman Bharat Digital Mission goals
- Deployable by district health officers with zero technical training
- Compliant with India's DPDP Act 2023 via built-in PII detection
## 📱 App Pages
| Page | URL | Description |
|---|---|---|
| Landing | / | Role selection (Health Official / Field Worker) |
| Dashboard | /dashboard | Live signal feed + KPI cards + alerts |
| Projects | /projects | Create and manage monitoring projects |
| Signal Feed | /signals | All signals with filters and search |
| Map | /map | Geographic cluster map of Karnataka |
| Timeline | /timeline | Chronological signal timeline |
| Submit | /submit | Submit new safety report + bulk simulate |
| Alerts | /alerts | Cluster alerts and management |
| Analytics | /analytics | Charts, urban vs rural breakdown |
| Engine Config | /admin | Data source engine configuration |
| Architecture | /architecture | System architecture diagram |
