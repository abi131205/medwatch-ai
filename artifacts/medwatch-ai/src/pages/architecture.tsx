import * as React from "react";

const LAYERS = [
  {
    title: "DATA SOURCES LAYER",
    items: ["Twitter/X", "Reddit", "Quora", "WhatsApp", "News Forums", "Hospital Forms", "Field Workers"],
    border: "#3B82F6", bg: "rgba(59,130,246,0.08)",
    arrow: "Crawlers / APIs",
  },
  {
    title: "INGESTION ENGINE LAYER",
    items: ["Source Engine 1", "Source Engine 2", "Source Engine N", "Rate Limiting", "Auth", "Retry Logic"],
    border: "#F97316", bg: "rgba(249,115,22,0.08)",
    arrow: "Raw signals",
  },
  {
    title: "NLP PROCESSING LAYER",
    items: ["Claude AI API", "Entity Extraction", "Risk Classification", "Sentiment Analysis", "PII Detection", "Confidence Scoring", "Explainability"],
    border: "#A855F7", bg: "rgba(168,85,247,0.08)",
    arrow: "Structured signals",
  },
  {
    title: "STORAGE LAYER",
    items: ["PostgreSQL Database", "Projects Table", "Signals Table", "Alerts Table"],
    border: "#EAB308", bg: "rgba(234,179,8,0.08)",
    arrow: "REST API",
  },
  {
    title: "DASHBOARD & UI LAYER",
    items: ["Projects", "Signal Feed", "Cluster Map", "Alerts", "Analytics", "Timeline", "Engine Config"],
    border: "#22C55E", bg: "rgba(34,197,94,0.08)",
    arrow: null,
  },
];

const TECH_STACK = [
  { layer: "Frontend", technology: "React 18 + Vite + TypeScript + Tailwind CSS" },
  { layer: "Backend", technology: "Node.js + Express 5 + Drizzle ORM" },
  { layer: "Database", technology: "PostgreSQL (Replit-hosted)" },
  { layer: "AI/NLP", technology: "Anthropic Claude API (claude-sonnet-4-6)" },
  { layer: "Maps", technology: "Leaflet.js + React-Leaflet" },
  { layer: "Charts", technology: "Recharts" },
  { layer: "Deployment", technology: "Replit (Production + Development)" },
];

export default function Architecture() {
  const archRef = React.useRef<HTMLDivElement>(null);

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    const btn = document.getElementById("copy-btn");
    if (btn) { btn.textContent = "Copied!"; setTimeout(() => { if (btn) btn.textContent = "Copy Architecture URL"; }, 2000); }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0F1117", color: "#F1F5F9", padding: "40px 24px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0 }}>MedWatch AI — System Architecture</h1>
            <p style={{ color: "#94A3B8", marginTop: "6px", fontSize: "14px" }}>Real-Time Social Listening Platform for Patient Safety · PAN IIT Hackathon 2025</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button id="copy-btn" onClick={copyUrl} style={{ padding: "8px 16px", backgroundColor: "#6366F1", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
              Copy Architecture URL
            </button>
            <a href="/dashboard" style={{ padding: "8px 16px", backgroundColor: "#2A2D3E", color: "#F1F5F9", border: "1px solid #3A3D4E", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: "600" }}>
              ← Back to App
            </a>
          </div>
        </div>

        <div ref={archRef} style={{ backgroundColor: "#13151F", border: "1px solid #2A2D3E", borderRadius: "16px", padding: "32px", marginBottom: "32px" }}>
          {LAYERS.map((layer, i) => (
            <div key={layer.title}>
              <div style={{ border: `2px solid ${layer.border}`, backgroundColor: layer.bg, borderRadius: "12px", padding: "20px 24px", marginBottom: "0" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.1em", color: layer.border, marginBottom: "12px" }}>{layer.title}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {layer.items.map(item => (
                    <span key={item} style={{ padding: "4px 12px", backgroundColor: "rgba(255,255,255,0.06)", border: `1px solid ${layer.border}40`, borderRadius: "6px", fontSize: "13px", color: "#E2E8F0" }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              {layer.arrow && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0" }}>
                  <div style={{ width: "2px", height: "16px", backgroundColor: "#3A3D4E" }} />
                  <div style={{ fontSize: "11px", color: "#64748B", margin: "2px 0", fontStyle: "italic" }}>{layer.arrow}</div>
                  <div style={{ width: "2px", height: "16px", backgroundColor: "#3A3D4E" }} />
                  <div style={{ width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid #3A3D4E" }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: "#13151F", border: "1px solid #2A2D3E", borderRadius: "16px", padding: "28px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px", color: "#F1F5F9" }}>Technology Stack</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #2A2D3E" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "12px", color: "#64748B", textTransform: "uppercase" }}>Layer</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "12px", color: "#64748B", textTransform: "uppercase" }}>Technology</th>
              </tr>
            </thead>
            <tbody>
              {TECH_STACK.map((row, i) => (
                <tr key={row.layer} style={{ borderBottom: "1px solid #1E2130", backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: "600", color: "#6366F1", fontSize: "14px" }}>{row.layer}</td>
                  <td style={{ padding: "10px 12px", color: "#CBD5E1", fontSize: "14px" }}>{row.technology}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ backgroundColor: "#13151F", border: "1px solid #2A2D3E", borderRadius: "16px", padding: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}>Key Differentiators</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "12px" }}>
            {[
              { icon: "🧠", title: "Claude AI NLP", desc: "Real-time sentiment, PII detection, risk classification, and explainability" },
              { icon: "🔌", title: "Extensible Engines", desc: "Add new data sources via UI without code changes — plug-and-play architecture" },
              { icon: "📊", title: "Project-scoped Monitoring", desc: "Multiple monitoring projects with different keywords and sources" },
              { icon: "🔒", title: "PII/PHI Compliance", desc: "Automatic PII detection with compliance flagging for data privacy laws" },
            ].map(item => (
              <div key={item.title} style={{ padding: "16px", backgroundColor: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>{item.icon}</div>
                <div style={{ fontWeight: "600", marginBottom: "4px", fontSize: "14px" }}>{item.title}</div>
                <div style={{ color: "#94A3B8", fontSize: "13px", lineHeight: "1.5" }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "32px", color: "#475569", fontSize: "13px" }}>
          MedWatch AI · PAN IIT Hackathon · Theme 6: Real-Time Social Listening for Patient Experience & Safety Signals
        </div>
      </div>
    </div>
  );
}
