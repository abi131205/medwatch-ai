# MedWatch AI 🛡️
### Real-Time Social Listening for Patient Experience & Safety Signals
**AI for Bharat Hackathon 2026 — Theme 6 | PAN IIT Bengaluru**

## 🔗 Live Demo
https://med-watch-agent--creature-13.replit.app

## 🎯 Problem Statement
Patient safety signals — adverse drug reactions, treatment complications, and hospital quality issues — are scattered across social media, WhatsApp groups, online forums, and informal channels across India. No unified system captures, analyzes, or acts on these signals in real time. MedWatch AI solves this.

## ✅ Solution
An AI-powered social listening PLATFORM that:
- Monitors keywords across multiple sources (X/Twitter, Reddit, Quora, WhatsApp)
- Uses Claude AI to extract entities, classify risk, detect sentiment, and flag PII
- Generates real-time cluster alerts when safety signals concentrate in any district
- Provides configurable project-based monitoring for any healthcare use case
- Shows geographic intelligence across all districts in Karnataka

## 🏗️ Architecture
file:///E:/Downloads/Downloads/medwatch_architecture_diagram.svg
## ⚡ Key Features
- **Projects** — Create monitoring projects with custom keywords and sources
- **Signal Feed** — Real-time feed with risk badges, filters, and search
- **AI Analysis** — Claude NLP: entities, risk, sentiment, confidence, and PII detection
- **Cluster Map** — Geographic heatmap of all Karnataka districts
- **Alert System** — Auto-alerts when 3+ critical signals cluster in 24 hours
- **Analytics** — Urban vs. Rural comparison, top drugs, and source performance
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
git clone [https://github.com/abi131205/medwatch-ai.git](https://github.com/abi131205/medwatch-ai.git)
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
🌍 Real-World ImpactState-Wide Coverage — Supports Karnataka Health Department pharmacovigilance across all 31 districts.Urban-Rural Bridge — Monitors safety signals from major urban hubs to remote rural healthcare centers.ABDM Alignment — Directly supports Ayushman Bharat Digital Mission surveillance goals.Public Health Governance — Deployable by District Health Officers (DHOs) with zero technical training.Privacy First — Compliant with India's DPDP Act 2023 via automated PII detection and redaction.🏛️ Government Implementation & FeasibilityAdministrative Dashboard — Hierarchical view for State Health Commissioners and DHOs to monitor state-wide health trends.Vernacular NLP Engine — Built to process signals in regional languages (Kannada, etc.) to ensure rural inclusivity.Cluster-Based Intervention — Identifies localized health risks or medicine quality issues before they escalate.Ecosystem Integration — Designed to plug into existing Government of Karnataka health portals and ABDM registries.📱 App PagesPageURLDescriptionLanding/Role selection (Health Official / Field Worker)Dashboard/dashboardLive signal feed + KPI cards + alertsProjects/projectsCreate and manage monitoring projectsSignal Feed/signalsAll signals with filters and searchMap/mapGeographic cluster map of Karnataka districtsTimeline/timelineChronological signal timelineSubmit/submitSubmit new safety report + bulk simulateAlerts/alertsCluster alerts and managementAnalytics/analyticsCharts, urban vs. rural breakdownEngine Config/adminData source engine configurationArchitecture/architectureSystem architecture diagram👥 Team Details & CreditsThis project was developed for the AI for Bharat 2 Hackathon.Abijith U K — Lead Developer & System Architect[Teammate Name] — Core Contributor: Research, Data Strategy & TestingNote: Due to platform synchronization constraints on HackerEarth, this project is submitted via the lead's profile but represents a collaborative team effort.
