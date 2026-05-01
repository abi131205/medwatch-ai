import * as React from "react";
import { Link } from "wouter";
import { Download, Search, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetSignals } from "@workspace/api-client-react";
import { format } from "date-fns";
import * as Papa from "papaparse";

export default function Signals() {
  const [search, setSearch] = React.useState("");
  const { data, isLoading } = useGetSignals({ limit: 50, search: search || undefined });

  const exportCSV = () => {
    if (!data?.signals) return;
    const csv = Papa.unparse(data.signals.map(s => ({
      ID: s.id,
      Date: s.created_at,
      Risk: s.risk_level,
      Category: s.category,
      District: s.location_district,
      Status: s.status,
      Text: s.raw_text
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `signals_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'critical': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'high': return 'bg-high/20 text-high border-high/30';
      case 'medium': return 'bg-medium/20 text-medium border-medium/30';
      case 'low': return 'bg-low/20 text-low border-low/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-2rem)] md:h-[calc(100vh-3rem)]">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Signal Feed</h1>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-semibold">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </div>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search signals..." 
              className="pl-9 bg-card border-card-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0 bg-card border-card-border hover:bg-card-border">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={exportCSV} className="shrink-0 bg-card border-card-border hover:bg-card-border">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card className="glass-card flex-1 flex flex-col overflow-hidden">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-card-border/50 sticky top-0 z-10">
              <TableRow className="border-card-border hover:bg-transparent">
                <TableHead className="w-24">ID</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : (
                data?.signals.map((sig) => (
                  <TableRow key={sig.id} className="border-card-border hover:bg-card-border/30 cursor-pointer transition-colors group">
                    <TableCell className="font-mono text-xs text-muted-foreground group-hover:text-primary">
                      <Link href={`/signals/${sig.id}`}>
                        <div className="py-2">#{sig.id}</div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(sig.created_at), 'MMM d, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${getRiskColor(sig.risk_level || '')}`}>
                        {sig.risk_level === 'critical' ? '🔴 ' : sig.risk_level === 'high' ? '🟠 ' : sig.risk_level === 'medium' ? '🟡 ' : '🟢 '}
                        {sig.risk_level}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm capitalize">{sig.category?.replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm">{sig.location_district || 'Unknown'}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm max-w-md truncate">
                      {sig.nlp_summary || sig.raw_text}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded bg-card-border text-xs uppercase font-semibold">
                        {sig.status}
                      </span>
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