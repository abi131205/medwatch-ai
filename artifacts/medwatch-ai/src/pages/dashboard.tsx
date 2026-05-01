import * as React from "react";
import { Link } from "wouter";
import { AlertCircle, Activity, MapPin, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSignalsSummary, useGetSignals, useSimulateSignal } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { getGetSignalsQueryKey, getGetSignalsSummaryQueryKey, useGetTimeseries, getGetTimeseriesQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const simulateSignal = useSimulateSignal();

  const { data: summary, isLoading: loadingSummary } = useGetSignalsSummary();
  const { data: signalsData, isLoading: loadingSignals } = useGetSignals({ limit: 20 });
  const { data: timeseries, isLoading: loadingTimeseries } = useGetTimeseries();

  React.useEffect(() => {
    const interval = setInterval(() => {
      simulateSignal.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSignalsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSignalsSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTimeseriesQueryKey() });
        }
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [simulateSignal, queryClient]);

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
      {summary?.critical_count ? (
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 flex items-center gap-3 text-destructive animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 animate-pulse" />
          <span className="font-semibold">Critical Alerts Active</span>
          <span className="text-sm opacity-90">— {summary.critical_count} signals require immediate attention.</span>
        </div>
      ) : null}

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
                <div className="text-3xl font-bold">{kpi.value || 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Live Feed */}
        <Card className="glass-card lg:col-span-3 flex flex-col h-[500px]">
          <CardHeader className="pb-3 border-b border-card-border">
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Signal Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loadingSignals ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-card-border">
                {signalsData?.signals.map((sig) => (
                  <Link key={sig.id} href={`/signals/${sig.id}`}>
                    <div className="p-4 hover:bg-card-border/30 transition-colors cursor-pointer flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">#{sig.id}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(sig.created_at), 'HH:mm:ss')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold
                            ${sig.risk_level === 'critical' ? 'bg-destructive/20 text-destructive' :
                              sig.risk_level === 'high' ? 'bg-high/20 text-high' :
                              sig.risk_level === 'medium' ? 'bg-medium/20 text-medium' :
                              'bg-low/20 text-low'}`}>
                            {sig.risk_level}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{sig.raw_text}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-2 py-0.5 bg-card-border rounded">{sig.category}</span>
                        <span>•</span>
                        <span>{sig.location_district}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Emerging Signals / Trends */}
        <Card className="glass-card lg:col-span-2 flex flex-col h-[500px]">
          <CardHeader className="pb-3 border-b border-card-border">
            <CardTitle>Emerging Patterns</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingSignals ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <div className="space-y-4">
                <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg">
                  <div className="font-semibold text-primary mb-1">Potential ADR Cluster</div>
                  <p className="text-sm text-muted-foreground">Multiple reports of nausea associated with Paracetamol in Bengaluru urban area.</p>
                </div>
                <div className="bg-secondary/10 border border-secondary/20 p-3 rounded-lg">
                  <div className="font-semibold text-secondary mb-1">Hospital Capacity</div>
                  <p className="text-sm text-muted-foreground">Elevated reporting rate from Apollo Hospitals regarding bed availability.</p>
                </div>
              </div>
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
                  <XAxis dataKey="hour" stroke="#94A3B8" fontSize={12} tickFormatter={(val) => val.split('T')[1].substring(0, 5)} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2D3E' }} />
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
                  <RechartsTooltip contentStyle={{ backgroundColor: '#1A1D27', borderColor: '#2A2D3E' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}