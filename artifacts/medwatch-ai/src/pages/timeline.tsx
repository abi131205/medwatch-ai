import * as React from "react";
import { Link } from "wouter";
import { Clock, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSignals } from "@workspace/api-client-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const PERIODS = [
  { label: "Today", days: 0 },
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
];

function getRiskColor(risk: string) {
  switch (risk) {
    case "critical": return { dot: "bg-destructive border-destructive", card: "border-l-destructive", text: "text-destructive", bg: "bg-destructive/20 text-destructive" };
    case "high": return { dot: "bg-[#F97316] border-[#F97316]", card: "border-l-[#F97316]", text: "text-[#F97316]", bg: "bg-[#F97316]/20 text-[#F97316]" };
    case "medium": return { dot: "bg-[#EAB308] border-[#EAB308]", card: "border-l-[#EAB308]", text: "text-[#EAB308]", bg: "bg-[#EAB308]/20 text-[#EAB308]" };
    default: return { dot: "bg-[#22C55E] border-[#22C55E]", card: "border-l-[#22C55E]", text: "text-[#22C55E]", bg: "bg-[#22C55E]/20 text-[#22C55E]" };
  }
}

function groupByDay(signals: any[]): { date: string; signals: any[] }[] {
  const grouped: Record<string, any[]> = {};
  for (const s of signals) {
    const day = new Date(s.created_at).toISOString().split("T")[0];
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(s);
  }
  return Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => ({ date, signals: grouped[date] }));
}

export default function Timeline() {
  const [period, setPeriod] = React.useState(7);
  const [sourceFilter, setSourceFilter] = React.useState("");
  const [riskFilter, setRiskFilter] = React.useState("");

  const params: any = { limit: 200 };
  if (sourceFilter) params.source_type = sourceFilter;
  if (riskFilter) params.risk_level = riskFilter;
  if (period === 0) { params.from_date = startOfDay(new Date()).toISOString(); }
  else if (period > 0) { params.from_date = subDays(new Date(), period).toISOString(); }

  const { data, isLoading } = useGetSignals(params);
  const signals = data?.signals || [];
  const days = groupByDay(signals);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="w-6 h-6 text-primary" /> Signal Timeline</h1>
          <p className="text-muted-foreground text-sm mt-1">Chronological view of all patient safety signals.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-card-border">
            {PERIODS.map(p => (
              <button key={p.days} onClick={() => setPeriod(p.days)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${period === p.days ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-card-border"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} style={{ padding: "6px 10px", backgroundColor: "#1A1D27", color: "#94A3B8", border: "1px solid #2A2D3E", borderRadius: "8px", fontSize: "12px" }}>
            <option value="">All Sources</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="social_media">Social Media</option>
            <option value="hospital_form">Hospital Form</option>
            <option value="field_worker">Field Worker</option>
          </select>
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={{ padding: "6px 10px", backgroundColor: "#1A1D27", color: "#94A3B8", border: "1px solid #2A2D3E", borderRadius: "8px", fontSize: "12px" }}>
            <option value="">All Risks</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : days.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No signals found for the selected period.</div>
      ) : (
        <div className="relative">
          <div className="absolute left-[calc(50%-1px)] top-0 bottom-0 w-0.5 bg-card-border hidden md:block" />

          {days.map((day, dayIdx) => (
            <div key={day.date} className="mb-8">
              <div className="flex items-center justify-center mb-4 relative z-10">
                <span className="bg-card border border-card-border px-4 py-1.5 rounded-full text-sm font-semibold text-muted-foreground">
                  📅 {format(new Date(day.date + "T12:00:00"), "EEEE, MMMM d, yyyy")} — {day.signals.length} signal{day.signals.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-4">
                {day.signals.map((sig, idx) => {
                  const colors = getRiskColor(sig.risk_level || "low");
                  const isLeft = idx % 2 === 0;

                  return (
                    <div key={sig.id} className="relative flex items-start md:items-center gap-4">
                      <div className="md:hidden w-full">
                        <Link href={`/signals/${sig.id}`}>
                          <Card className={`glass-card border-l-4 ${colors.card} hover:bg-card-border/20 cursor-pointer transition-colors`}>
                            <div className="p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground font-mono">{format(new Date(sig.created_at), "HH:mm:ss")}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${colors.bg}`}>{sig.risk_level}</span>
                              </div>
                              <p className="text-sm line-clamp-2">{sig.raw_text}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="px-1.5 py-0.5 bg-card-border rounded">{sig.source_type?.replace("_", " ")}</span>
                                <span>{sig.location_district}</span>
                                <span className="capitalize">{sig.category?.replace("_", " ")}</span>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </div>

                      <div className="hidden md:flex w-full items-start gap-4">
                        <div className={`flex-1 ${isLeft ? "block" : "opacity-0 pointer-events-none"}`}>
                          {isLeft && (
                            <Link href={`/signals/${sig.id}`}>
                              <Card className={`glass-card border-l-4 ${colors.card} hover:bg-card-border/20 cursor-pointer transition-colors`}>
                                <div className="p-3 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground font-mono">{format(new Date(sig.created_at), "HH:mm:ss")}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${colors.bg}`}>{sig.risk_level}</span>
                                  </div>
                                  <p className="text-sm line-clamp-2">{sig.raw_text}</p>
                                  <div className="flex gap-1.5 text-xs text-muted-foreground">
                                    <span className="px-1.5 py-0.5 bg-card-border rounded">{sig.source_type?.replace("_", " ")}</span>
                                    <span>{sig.location_district}</span>
                                  </div>
                                </div>
                              </Card>
                            </Link>
                          )}
                        </div>

                        <div className="relative z-10 shrink-0">
                          <div className={`w-4 h-4 rounded-full border-2 ${colors.dot} ${sig.risk_level === "critical" ? "animate-pulse" : ""}`} />
                        </div>

                        <div className={`flex-1 ${!isLeft ? "block" : "opacity-0 pointer-events-none"}`}>
                          {!isLeft && (
                            <Link href={`/signals/${sig.id}`}>
                              <Card className={`glass-card border-r-4 ${colors.card} hover:bg-card-border/20 cursor-pointer transition-colors`} style={{ borderLeftWidth: 0 }}>
                                <div className="p-3 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${colors.bg}`}>{sig.risk_level}</span>
                                    <span className="text-xs text-muted-foreground font-mono">{format(new Date(sig.created_at), "HH:mm:ss")}</span>
                                  </div>
                                  <p className="text-sm line-clamp-2">{sig.raw_text}</p>
                                  <div className="flex gap-1.5 text-xs text-muted-foreground justify-end">
                                    <span>{sig.location_district}</span>
                                    <span className="px-1.5 py-0.5 bg-card-border rounded">{sig.source_type?.replace("_", " ")}</span>
                                  </div>
                                </div>
                              </Card>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
