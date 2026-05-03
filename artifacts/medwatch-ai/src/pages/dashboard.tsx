import * as React from "react";
import { Link, useLocation } from "wouter";
import { AlertCircle, Activity, MapPin, Search, Pill, MapPinIcon, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useGetSignalsSummary, useGetSignals, useSimulateSignal, useGetAlerts,
  getGetSignalsQueryKey, getGetSignalsSummaryQueryKey, useGetTimeseries,
  getGetTimeseriesQueryKey, getGetAlertsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { format, formatDistanceToNow } from "date-fns";

const RISK_ORDER = ["critical", "high", "medium", "low"];

function getRiskBorderColor(risk: string) {
  switch (risk) {
    case "critical": return "border-l-destructive";
    case "high": return "border-l-[#F97316]";
    case "medium": return "border-l-[#EAB308]";
    default: return "border-l-[#22C55E]";
  }
}

function getRiskTextColor(risk: string) {
  switch (risk) {
    case "critical": return "text-destructive";
    case "high": return "text-[#F97316]";
    case "medium": return "text-[#EAB308]";
    default: return "text-[#22C55E]";
  }
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const simulateSignal = useSimulateSignal();
  const [newSignalIds, setNewSignalIds] = React.useState<Set<number>>(new Set());

  const { data: summary, isLoading: loadingSummary } = useGetSignalsSummary();
  const { data: signalsData, isLoading: loadingSignals } = useGetSignals({ limit: 20 });
  const { data: allSignalsData } = useGetSignals({ limit: 200 });
  const { data: timeseries, isLoading: loadingTimeseries } = useGetTimeseries();
  const { data: alerts } = useGetAlerts({ refetchInterval: 30000 } as any);

  // 15-second auto-simulate
  React.useEffect(() => {
    const interval = setInterval(() => {
      simulateSignal.mutate(undefined, {
        onSuccess: (newSignal: any) => {
          if (newSignal?.id) {
            setNewSignalIds(prev => new Set([...prev, newSignal.id]));
            setTimeout(() => {
              setNewSignalIds(prev => {
                const next = new Set(prev);
                next.delete(newSignal.id);
                return next;
              });
            }, 3000);

            if (newSignal.risk_level === "critical") {
              toast({
                title: "🔴 New Critical Signal",
                description: `Critical signal detected in ${newSignal.location_district || "Unknown district"}`,
              });
            }
          }
          queryClient.invalidateQueries({ queryKey: getGetSignalsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSignalsSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTimeseriesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() });
        }
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [simulateSignal, queryClient, toast]);

  // Compute trending signals from last 24h
  const trendingSignals = React.useMemo(() => {
    const allSignals = allSignalsData?.signals || [];
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recent = allSignals.filter(s => new Date(s.created_at) >= cutoff);

    const groups = new Map<string, { key: string; type: "drug" | "category"; label: string; district: string; signals: typeof recent }>();

    for (const sig of recent) {
      if (sig.drug_name && sig.location_district) {
        const key = `drug:${sig.drug_name}|${sig.location_district}`;
        if (!groups.has(key)) groups.set(key, { key, type: "drug", label: sig.drug_name, district: sig.location_district, signals: [] });
        groups.get(key)!.signals.push(sig);
      }
    }

    for (const sig of recent) {
      if (sig.category && sig.location_district) {
        const key = `cat:${sig.category}|${sig.location_district}`;
        if (!groups.has(key)) groups.set(key, { key, type: "category", label: sig.category, district: sig.location_district, signals: [] });
        groups.get(key)!.signals.push(sig);
      }
    }

    return Array.from(groups.values())
      .filter(g => g.signals.length >= 2)
      .map(g => {
        const maxRisk = g.signals.reduce((best, s) => {
          const idx = RISK_ORDER.indexOf(s.risk_level || "low");
          const bestIdx = RISK_ORDER.indexOf(best);
          return idx < bestIdx ? (s.risk_level || "low") : best;
        }, "low");
        const latestSignal = g.signals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        const sourceCounts = g.signals.reduce<Record<string, number>>((acc, s) => {
          if (s.source_type) acc[s.source_type] = (acc[s.source_type] || 0) + 1;
          return acc;
        }, {});
        const topSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";
        return { ...g, count: g.signals.length, maxRisk, latestAt: latestSignal?.created_at, topSource };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allSignalsData]);

  const activeAlerts = React.useMemo(() => {
    if (!alerts) return [];
    return (Array.isArray(alerts) ? alerts : []).filter((a: any) => a.status === "active");
  }, [alerts]);

  const categoryColors: Record<string, string> = {
    adr: "#6366F1",
    hospital_issue: "#22D3EE",
    outbreak_signal: "#EF4444",
    treatment_complication: "#F97316"
  };

  const pieData = summary?.by_category ? Object.entries(summary.by_category).map(([name, value]) => ({
    name: name.replace("_", " ").toUpperCase(),
    value
  })) : [];

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {activeAlerts.length > 0 ? (
        <div
          className="rounded-lg p-4 flex items-center gap-3 animate-in slide-in-from-top-2"
          style={{
            background: "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))",
            border: "1px solid rgba(239,68,68,0.3)"
          }}
        >
          <div className="w-3 h-3 rounded-full bg-destructive animate-pulse shrink-0" />
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <span className="font-semibold text-destructive flex-1">
            ⚠ ACTIVE ALERT — {activeAlerts.length} district{activeAlerts.length > 1 ? "s" : ""} showing critical signal clusters
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10 shrink-0"
            onClick={() => navigate("/alerts")}
          >
            View Alerts →
          </Button>
        </div>
      ) : (
        <div
          className="rounded-lg p-4 flex items-center gap-3"
          style={{
            background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.03))",
            border: "1px solid rgba(34,197,94,0.25)"
          }}
        >
          <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <span className="text-green-400 font-medium">✅ System Monitoring Active — No critical clusters detected</span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Signals Today", value: summary?.total_today, icon: Activity, color: "text-primary" },
          { label: "Critical Alerts", value: summary?.critical_count, icon: AlertCircle, color: "text-destructive" },
          { label: "Districts Affected", value: summary?.districts_affected, icon: MapPin, color: "text-secondary" },
          { label: "Signals This Hour", value: summary?.signals_last_hour, icon: Search, color: "text-accent" },
        ].map((kpi, i) => (
          <Card key={i} className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold">{kpi.value ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Live Feed */}
        <Card className="glass-card lg:col-span-3 flex flex-col h-[520px]">
          <CardHeader className="pb-3 border-b border-card-border">
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Signal Feed
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-bold">LIVE</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loadingSignals ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <div className="divide-y divide-card-border">
                {signalsData?.signals.map((sig) => {
                  const isNew = newSignalIds.has(sig.id);
                  return (
                    <Link key={sig.id} href={`/signals/${sig.id}`}>
                      <div
                        className={`p-4 hover:bg-card-border/30 transition-all duration-500 cursor-pointer flex flex-col gap-2 ${
                          isNew ? "bg-yellow-500/10 border-l-2 border-l-yellow-400" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            {isNew && <span className="text-[10px] text-yellow-400 font-bold animate-pulse">NEW</span>}
                            <span className="text-xs font-mono text-muted-foreground">#{sig.id}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(sig.created_at), "HH:mm:ss")}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold
                            ${sig.risk_level === "critical" ? "bg-destructive/20 text-destructive" :
                              sig.risk_level === "high" ? "bg-[#F97316]/20 text-[#F97316]" :
                              sig.risk_level === "medium" ? "bg-[#EAB308]/20 text-[#EAB308]" :
                              "bg-[#22C55E]/20 text-[#22C55E]"}`}>
                            {sig.risk_level}
                          </span>
                        </div>
                        <p className="text-sm font-medium line-clamp-2">{sig.raw_text}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 bg-card-border rounded">{sig.category}</span>
                          <span>•</span>
                          <span>{sig.location_district}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trending Signals Panel */}
        <Card className="glass-card lg:col-span-2 flex flex-col h-[520px]">
          <CardHeader className="pb-3 border-b border-card-border">
            <CardTitle>Trending Signals</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingSignals ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : trendingSignals.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <p className="text-sm">No emerging patterns in the last 24 hours — monitoring active</p>
              </div>
            ) : (
              trendingSignals.map((trend) => (
                <div
                  key={trend.key}
                  className={`border-l-4 ${getRiskBorderColor(trend.maxRisk)} bg-card-border/20 rounded-r-lg p-3 space-y-1`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {trend.type === "drug" ? (
                        <Pill className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : (
                        <MapPinIcon className="w-3.5 h-3.5 text-secondary shrink-0" />
                      )}
                      <span className="text-sm font-bold truncate">
                        {trend.count}× {trend.label.replace("_", " ")} in {trend.district}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold shrink-0
                      ${trend.maxRisk === "critical" ? "bg-destructive/20 text-destructive" :
                        trend.maxRisk === "high" ? "bg-[#F97316]/20 text-[#F97316]" :
                        trend.maxRisk === "medium" ? "bg-[#EAB308]/20 text-[#EAB308]" :
                        "bg-[#22C55E]/20 text-[#22C55E]"}`}>
                      {trend.maxRisk}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last {trend.latestAt ? formatDistanceToNow(new Date(trend.latestAt), { addSuffix: true }) : "recently"} — via {trend.topSource.replace("_", " ")}
                  </p>
                  {trend.count >= 3 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      <span className="text-[11px] text-destructive font-semibold">⚠ Emerging Pattern</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Signal Volume (24h)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingTimeseries ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeseries}>
                  <XAxis dataKey="hour" stroke="#94A3B8" fontSize={12} tickFormatter={(val) => val.split("T")[1].substring(0, 5)} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "#1A1D27", borderColor: "#2A2D3E" }} />
                  <Line type="monotone" dataKey="critical" stroke="#EF4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="high" stroke="#F97316" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="medium" stroke="#EAB308" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="low" stroke="#22C55E" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Distribution by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingSummary ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(categoryColors)[index % 4]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: "#1A1D27", borderColor: "#2A2D3E" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
