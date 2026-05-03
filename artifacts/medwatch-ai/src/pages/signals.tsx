import * as React from "react";
import { Link } from "wouter";
import { Download, Search, Filter, X, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetSignals } from "@workspace/api-client-react";
import { format } from "date-fns";
import * as Papa from "papaparse";

const RISK_LEVELS = ["critical", "high", "medium", "low"] as const;

export default function Signals() {
  const [search, setSearch] = React.useState("");
  const [selectedRisks, setSelectedRisks] = React.useState<string[]>([]);
  const [category, setCategory] = React.useState<string>("");
  const [sourceType, setSourceType] = React.useState<string>("");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [piiOnly, setPiiOnly] = React.useState(false);

  const params: Record<string, any> = { limit: 200 };
  if (search) params.search = search;
  if (selectedRisks.length === 1) params.risk_level = selectedRisks[0];
  if (selectedRisks.length > 1) params.risk_level = selectedRisks.join(",") as any;
  if (category) params.category = category as any;
  if (sourceType) params.source_type = sourceType as any;
  if (fromDate) params.from_date = fromDate;
  if (toDate) params.to_date = toDate;
  if (piiOnly) params.pii_only = "1";

  const { data, isLoading } = useGetSignals(params);

  const piiCount = React.useMemo(() => {
    if (!data?.signals) return 0;
    return (data.signals as any[]).filter(s => s.pii_detected === 1).length;
  }, [data]);

  const activeFilterCount = [
    selectedRisks.length > 0, !!category, !!sourceType, !!fromDate || !!toDate, piiOnly,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearch(""); setSelectedRisks([]); setCategory(""); setSourceType("");
    setFromDate(""); setToDate(""); setPiiOnly(false);
  };

  const toggleRisk = (risk: string) => {
    setSelectedRisks(prev => prev.includes(risk) ? prev.filter(r => r !== risk) : [...prev, risk]);
  };

  const exportCSV = () => {
    if (!data?.signals) return;
    const csv = Papa.unparse((data.signals as any[]).map(s => ({
      ID: s.id, Date: s.created_at, Risk: s.risk_level, Category: s.category,
      District: s.location_district, Status: s.status,
      Sentiment: s.sentiment, Confidence: s.confidence_score,
      PII: s.pii_detected ? "Yes" : "No", Text: s.raw_text
    })));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `signals_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const getRiskStyle = (risk: string) => {
    switch (risk) {
      case "critical": return "bg-destructive/20 text-destructive border-destructive/30";
      case "high": return "bg-[#F97316]/20 text-[#F97316] border-[#F97316]/30";
      case "medium": return "bg-[#EAB308]/20 text-[#EAB308] border-[#EAB308]/30";
      case "low": return "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)]">
      <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Signal Feed</h1>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-semibold">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </div>
          {data && <span className="text-xs text-muted-foreground">{data.total} signals</span>}
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search signals..." className="pl-9 bg-card border-card-border" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" className={`shrink-0 bg-card border-card-border hover:bg-card-border relative ${showFilters ? "border-primary text-primary" : ""}`} onClick={() => setShowFilters(v => !v)}>
            <Filter className="h-4 w-4 mr-1" /> Filters
            {activeFilterCount > 0 && <span className="ml-1 bg-primary text-primary-foreground rounded-full text-[10px] w-4 h-4 flex items-center justify-center font-bold">{activeFilterCount}</span>}
          </Button>
          <Button variant="outline" onClick={exportCSV} size="sm" className="shrink-0 bg-card border-card-border hover:bg-card-border">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </div>
      </div>

      {/* Quick PII filter chip */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <button
          onClick={() => setPiiOnly(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            piiOnly
              ? "bg-destructive/20 text-destructive border-destructive/50"
              : "bg-card border-card-border text-muted-foreground hover:border-destructive/30 hover:text-destructive"
          }`}
        >
          <Lock className="w-3 h-3" />
          🔒 PII Flagged
          {!isLoading && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${piiOnly ? "bg-destructive/30" : "bg-card-border"}`}>
              {piiCount}
            </span>
          )}
        </button>
        {piiOnly && (
          <button onClick={() => setPiiOnly(false)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <X className="w-3 h-3" /> Clear PII filter
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="glass-card p-4 shrink-0 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Risk Level</label>
              <div className="flex flex-wrap gap-2">
                {RISK_LEVELS.map(risk => (
                  <button key={risk} onClick={() => toggleRisk(risk)} className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border transition-all ${selectedRisks.includes(risk) ? getRiskStyle(risk) : "border-card-border text-muted-foreground hover:border-muted"}`}>
                    {risk}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
              <Select value={category || "all"} onValueChange={v => setCategory(v === "all" ? "" : v)}>
                <SelectTrigger className="bg-background h-9 text-sm"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="adr">ADR</SelectItem>
                  <SelectItem value="hospital_issue">Hospital Issue</SelectItem>
                  <SelectItem value="outbreak_signal">Outbreak Signal</SelectItem>
                  <SelectItem value="treatment_complication">Treatment Complication</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Source</label>
              <Select value={sourceType || "all"} onValueChange={v => setSourceType(v === "all" ? "" : v)}>
                <SelectTrigger className="bg-background h-9 text-sm"><SelectValue placeholder="All sources" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="hospital_form">Hospital Form</SelectItem>
                  <SelectItem value="field_worker">Field Worker</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Date Range</label>
              <div className="flex gap-2">
                <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-background h-9 text-xs" />
                <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-background h-9 text-xs" />
              </div>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-3 pt-3 border-t border-card-border flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5 mr-1" /> Clear all filters
              </Button>
            </div>
          )}
        </Card>
      )}

      <Card className="glass-card flex-1 flex flex-col overflow-hidden">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-card-border/50 sticky top-0 z-10">
              <TableRow className="border-card-border hover:bg-transparent">
                <TableHead className="w-16">ID</TableHead>
                <TableHead className="w-8">PII</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="hidden md:table-cell">Summary</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <TableRow key={i} className="border-card-border">
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : (
                (data?.signals as any[])?.map((sig) => (
                  <TableRow key={sig.id} className="border-card-border hover:bg-card-border/30 cursor-pointer transition-colors group">
                    <TableCell className="font-mono text-xs text-muted-foreground group-hover:text-primary">
                      <Link href={`/signals/${sig.id}`}><div className="py-1">#{sig.id}</div></Link>
                    </TableCell>
                    <TableCell>
                      {sig.pii_detected === 1 ? (
                        <span title="PII Detected"><Lock className="w-3.5 h-3.5 text-destructive" /></span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{format(new Date(sig.created_at), "MMM d, HH:mm")}</TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${getRiskStyle(sig.risk_level || "")}`}>
                        {sig.risk_level === "critical" ? "🔴 " : sig.risk_level === "high" ? "🟠 " : sig.risk_level === "medium" ? "🟡 " : "🟢 "}
                        {sig.risk_level}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{sig.category?.replace("_", " ")}</TableCell>
                    <TableCell className="text-sm">
                      <div>{sig.location_district || "Unknown"}</div>
                      {sig.location_type && <div className="text-xs text-muted-foreground">{sig.location_type}</div>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm max-w-md truncate">{sig.nlp_summary || sig.raw_text}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded bg-card-border text-xs uppercase font-semibold">{sig.status}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
