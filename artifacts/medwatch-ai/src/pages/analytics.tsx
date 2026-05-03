import * as React from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetTimeseries, useGetDrugsAnalytics, useGetHospitalsAnalytics,
  useGetDistrictsAnalytics, useGetSignalsSummary
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { ChevronUp, ChevronDown, Star } from "lucide-react";

const COLORS = { primary: "#6366F1", secondary: "#22D3EE", destructive: "#EF4444", high: "#F97316", medium: "#EAB308", low: "#22C55E" };
const SOURCE_COLORS: Record<string, string> = { social_media: "#3B82F6", whatsapp: "#22C55E", hospital_form: "#EF4444", field_worker: "#A855F7" };
const SOURCE_LABELS: Record<string, string> = { social_media: "Social Media", whatsapp: "WhatsApp", hospital_form: "Hospital Form", field_worker: "Field Worker" };

type SortKey = "district" | "total" | "critical" | "top_category" | "top_drug";
type SortDir = "asc" | "desc";

export default function Analytics() {
  const { data: timeseries, isLoading: loadingTimeseries } = useGetTimeseries();
  const { data: topDrugs, isLoading: loadingDrugs } = useGetDrugsAnalytics();
  const { data: topHospitals, isLoading: loadingHospitals } = useGetHospitalsAnalytics();
  const { data: rawDistricts, isLoading: loadingDistricts } = useGetDistrictsAnalytics();
  const { data: summary, isLoading: loadingSummary } = useGetSignalsSummary();

  const { data: sourceTrends, isLoading: loadingSourceTrends } = useQuery({
    queryKey: ["analytics", "source-trends"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/source-trends");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const [sortKey, setSortKey] = React.useState<SortKey>("total");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const districtsMeta = rawDistricts as any;
  const districts: any[] = Array.isArray(rawDistricts) ? rawDistricts : districtsMeta?.districts || [];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sortedDistricts = React.useMemo(() => {
    return [...districts].sort((a, b) => {
      const av = a[sortKey] ?? ""; const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [districts, sortKey, sortDir]);

  const urbanVsRuralData = React.useMemo(() => {
    const urban = { critical: 0, high: 0, medium: 0, low: 0 };
    const rural = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const d of districts) {
      const bucket = d.location_type === "urban" ? urban : rural;
      bucket.critical += d.critical || 0; bucket.high += d.high || 0;
      bucket.medium += d.medium || 0; bucket.low += d.low || 0;
    }
    return [
      { risk: "Critical", urban: urban.critical, rural: rural.critical },
      { risk: "High", urban: urban.high, rural: rural.high },
      { risk: "Medium", urban: urban.medium, rural: rural.medium },
      { risk: "Low", urban: urban.low, rural: rural.low },
    ];
  }, [districts]);

  const categoryData = summary?.by_category ? Object.entries(summary.by_category).map(([name, value]) => ({ name: name.replace("_", " ").toUpperCase(), value })) : [];
  const categoryColors = [COLORS.primary, COLORS.secondary, COLORS.destructive, COLORS.high];
  const locationData = summary?.by_location_type ? [{ name: "Urban", value: summary.by_location_type.urban }, { name: "Rural", value: summary.by_location_type.rural }] : [];

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />;
  };
  const SortableHead = ({ col, label, right }: { col: SortKey; label: string; right?: boolean }) => (
    <th className={`px-3 py-3 text-xs font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground select-none ${right ? "text-right" : "text-left"}`} onClick={() => handleSort(col)}>
      <span className="flex items-center gap-1 justify-end">{right && <SortIcon col={col} />}{label}{!right && <SortIcon col={col} />}</span>
    </th>
  );

  const chartData = sourceTrends?.chart_data || [];
  const sourceTable = sourceTrends?.source_table || [];
  const mostActive = sourceTrends?.most_active_source;
  const SOURCES = ["social_media", "whatsapp", "hospital_form", "field_worker"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deep Analytics</h1>
        <p className="text-muted-foreground">Strategic overview of system-wide trends and risk factors.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2 xl:col-span-3">
          <CardHeader><CardTitle>Signal Volume (24h)</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {loadingTimeseries ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" vertical={false} />
                  <XAxis dataKey="hour" stroke="#94A3B8" fontSize={12} tickFormatter={(val) => val.split("T")[1]?.substring(0, 5) || val.substring(11, 16)} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#1A1D27", borderColor: "#2A2D3E", color: "#F1F5F9" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="critical" stroke={COLORS.destructive} strokeWidth={2} dot={false} name="Critical" />
                  <Line type="monotone" dataKey="high" stroke={COLORS.high} strokeWidth={2} dot={false} name="High" />
                  <Line type="monotone" dataKey="medium" stroke={COLORS.medium} strokeWidth={2} dot={false} name="Medium" />
                  <Line type="monotone" dataKey="low" stroke={COLORS.low} strokeWidth={2} dot={false} name="Low" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle>Top Suspected Drugs</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {loadingDrugs ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDrugs} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                  <YAxis dataKey="drug_name" type="category" stroke="#94A3B8" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "#1A1D27", borderColor: "#2A2D3E", color: "#F1F5F9" }} cursor={{ fill: "#2A2D3E" }} />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[0, 4, 4, 0]} name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle>Top Reporting Hospitals</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {loadingHospitals ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topHospitals} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                  <YAxis dataKey="hospital_name" type="category" stroke="#94A3B8" fontSize={11} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "#1A1D27", borderColor: "#2A2D3E", color: "#F1F5F9" }} cursor={{ fill: "#2A2D3E" }} />
                  <Bar dataKey="count" fill={COLORS.secondary} radius={[0, 4, 4, 0]} name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle>Incident Categories</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {loadingSummary ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                    {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#1A1D27", borderColor: "#2A2D3E", color: "#F1F5F9" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader><CardTitle>Urban vs Rural Risk Distribution</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {loadingDistricts ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={urbanVsRuralData} margin={{ top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" vertical={false} />
                  <XAxis dataKey="risk" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#1A1D27", borderColor: "#2A2D3E", color: "#F1F5F9" }} cursor={{ fill: "#2A2D3E" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="urban" name="Urban" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rural" name="Rural" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle>Urban vs Rural Reports</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            {loadingSummary ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#1A1D27", borderColor: "#2A2D3E", color: "#F1F5F9" }} cursor={{ fill: "#2A2D3E" }} />
                  <Bar dataKey="value" name="Signals" radius={[4, 4, 0, 0]}>
                    {locationData.map((_, index) => <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.primary : COLORS.secondary} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Source Performance Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Source Performance & Trending</h2>
          <span className="text-xs text-muted-foreground">(Last 7 days)</span>
        </div>

        {mostActive && (
          <Card className="glass-card border-primary/30">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <Star className="w-5 h-5 text-primary shrink-0" />
              <div>
                <div className="text-sm font-semibold">Most Active Source</div>
                <div className="text-primary font-bold capitalize">{SOURCE_LABELS[mostActive] || mostActive.replace("_", " ")}</div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader><CardTitle>Signals Per Source (7 Days)</CardTitle></CardHeader>
            <CardContent className="h-[300px]">
              {loadingSourceTrends ? <Skeleton className="h-full w-full" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" vertical={false} />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickFormatter={(val) => val.slice(5)} />
                    <YAxis stroke="#94A3B8" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: "#1A1D27", borderColor: "#2A2D3E", color: "#F1F5F9" }} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    {SOURCES.map(src => (
                      <Line key={src} type="monotone" dataKey={src} stroke={SOURCE_COLORS[src]} strokeWidth={2} dot={false} name={SOURCE_LABELS[src]} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader><CardTitle>Source Summary Table</CardTitle></CardHeader>
            <CardContent className="overflow-auto p-0">
              {loadingSourceTrends ? <div className="p-4 space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                <table className="w-full text-sm">
                  <thead className="bg-card-border/60 border-b border-card-border">
                    <tr>
                      {["Source", "Signals", "Negative%", "Top Keyword", "Avg Conf."].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sourceTable.map((row: any, i: number) => (
                      <tr key={row.source} className="border-t border-card-border hover:bg-card-border/20" style={{ backgroundColor: i % 2 === 0 ? "#1A1D27" : "#151821" }}>
                        <td className="px-3 py-2.5 font-medium">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SOURCE_COLORS[row.source] || "#6366F1" }} />
                            {SOURCE_LABELS[row.source] || row.source}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-primary">{row.total}</td>
                        <td className="px-3 py-2.5">
                          <span className={`font-semibold ${row.negative_pct > 60 ? "text-destructive" : row.negative_pct > 40 ? "text-[#F97316]" : "text-[#22C55E]"}`}>{row.negative_pct}%</span>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{row.top_keyword}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{row.avg_confidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* District Hotspot Table */}
      <Card className="glass-card">
        <CardHeader><CardTitle>District Hotspot Table</CardTitle></CardHeader>
        <CardContent className="overflow-auto max-h-[400px] p-0">
          {loadingDistricts ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-card-border/60 sticky top-0 z-10">
                <tr>
                  <SortableHead col="district" label="District" />
                  <th className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase text-left">Type</th>
                  <SortableHead col="total" label="Total" right />
                  <SortableHead col="critical" label="Critical" right />
                  <SortableHead col="top_category" label="Top Category" />
                  <SortableHead col="top_drug" label="Top Drug" />
                </tr>
              </thead>
              <tbody>
                {sortedDistricts.map((d, i) => (
                  <tr key={d.district} className="border-t border-card-border hover:bg-card-border/20 transition-colors" style={{ backgroundColor: i % 2 === 0 ? "#1A1D27" : "#151821" }}>
                    <td className="px-3 py-2.5 font-medium">{d.district}</td>
                    <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${d.location_type === "urban" ? "bg-primary/20 text-primary" : "bg-[#22C55E]/20 text-[#22C55E]"}`}>{d.location_type || "unknown"}</span></td>
                    <td className="px-3 py-2.5 text-right font-mono">{d.total}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold ${d.critical > 0 ? "text-destructive bg-destructive/5" : "text-muted-foreground"}`}>{d.critical > 0 ? d.critical : "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground capitalize">{d.top_category?.replace("_", " ") || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{d.top_drug || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
