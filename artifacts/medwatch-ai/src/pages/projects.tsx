import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Plus, X, ChevronRight, Clock, ToggleLeft, ToggleRight, Loader2, Search } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const SOURCE_DEFS = [
  { id: "twitter", label: "Twitter / X", color: "bg-blue-500/20 text-blue-400", dot: "bg-blue-400" },
  { id: "reddit", label: "Reddit", color: "bg-orange-500/20 text-orange-400", dot: "bg-orange-400" },
  { id: "quora", label: "Quora", color: "bg-red-500/20 text-red-400", dot: "bg-red-400" },
  { id: "whatsapp", label: "WhatsApp", color: "bg-green-500/20 text-green-400", dot: "bg-green-400" },
  { id: "news", label: "News Forums", color: "bg-purple-500/20 text-purple-400", dot: "bg-purple-400" },
];

const LATENCY_OPTS = ["realtime", "daily", "weekly"];
const LATENCY_COLORS: Record<string, string> = { realtime: "bg-green-500", daily: "bg-yellow-500", weekly: "bg-gray-500" };

function SourceBadge({ source }: { source: string }) {
  const def = SOURCE_DEFS.find(s => s.id === source) || { label: source, color: "bg-card-border text-muted-foreground", dot: "bg-gray-500" };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${def.color}`}>{def.label}</span>
  );
}

function LatencyDot({ val }: { val: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className={`w-1.5 h-1.5 rounded-full ${LATENCY_COLORS[val] || "bg-gray-500"}`} />
      {val === "realtime" ? "Real-time" : val.charAt(0).toUpperCase() + val.slice(1)}
    </span>
  );
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function Projects() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showModal, setShowModal] = React.useState(false);
  const [kwInput, setKwInput] = React.useState("");
  const [form, setForm] = React.useState({ name: "", description: "", keywords: [] as string[], sources: [] as string[], latency: {} as Record<string, string> });

  const { data: projects = [], isLoading } = useQuery<any[]>({ queryKey: ["projects"], queryFn: () => apiFetch("/api/projects") });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast({ title: "Project created" }); setShowModal(false); resetForm(); },
    onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiFetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast({ title: "Project deleted" }); },
  });

  function resetForm() { setForm({ name: "", description: "", keywords: [], sources: [], latency: {} }); setKwInput(""); }

  function addKeyword(kw: string) {
    const trimmed = kw.trim();
    if (trimmed && !form.keywords.includes(trimmed)) setForm(f => ({ ...f, keywords: [...f.keywords, trimmed] }));
    setKwInput("");
  }

  function toggleSource(src: string) {
    setForm(f => {
      if (f.sources.includes(src)) {
        const next = f.sources.filter(s => s !== src);
        const lat = { ...f.latency }; delete lat[src];
        return { ...f, sources: next, latency: lat };
      }
      return { ...f, sources: [...f.sources, src], latency: { ...f.latency, [src]: "daily" } };
    });
  }

  const activeProjects = projects.filter(p => p.status === "active").length;
  const totalKeywords = projects.reduce((sum: number, p: any) => { try { return sum + JSON.parse(p.keywords).length; } catch { return sum; } }, 0);
  const sourcesConnected = new Set(projects.flatMap((p: any) => { try { return JSON.parse(p.sources); } catch { return []; } })).size;
  const totalSignals = projects.reduce((sum: number, p: any) => sum + (p.signal_count || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FolderOpen className="w-6 h-6 text-primary" /> Social Listening Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor keywords and patient signals across multiple data sources.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Project
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Projects", value: activeProjects, color: "text-green-400" },
          { label: "Keywords Monitored", value: totalKeywords, color: "text-primary" },
          { label: "Sources Connected", value: sourcesConnected, color: "text-secondary" },
          { label: "Signals Collected", value: totalSignals, color: "text-[#F97316]" },
        ].map(kpi => (
          <Card key={kpi.label} className="glass-card">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
              <div className={`text-2xl font-bold ${kpi.color}`}>{isLoading ? "—" : kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-60 w-full" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((project: any) => {
            const keywords: string[] = (() => { try { return JSON.parse(project.keywords); } catch { return []; } })();
            const sources: string[] = (() => { try { return JSON.parse(project.sources); } catch { return []; } })();
            const latency: Record<string, string> = (() => { try { return JSON.parse(project.latency); } catch { return {}; } })();
            const isActive = project.status === "active";
            return (
              <Card key={project.id} className={`glass-card border-l-4 ${isActive ? "border-l-green-500" : "border-l-gray-600"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      {project.description && <CardDescription className="text-xs mt-1">{project.description}</CardDescription>}
                    </div>
                    <button onClick={() => toggleStatusMutation.mutate({ id: project.id, status: isActive ? "paused" : "active" })} title="Toggle status">
                      {isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {keywords.slice(0, 4).map((kw: string) => (
                      <span key={kw} className="px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 text-[11px] font-medium">{kw}</span>
                    ))}
                    {keywords.length > 4 && <span className="px-2 py-0.5 rounded-full bg-card-border text-muted-foreground text-[11px]">+{keywords.length - 4} more</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sources.map((src: string) => <SourceBadge key={src} source={src} />)}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {sources.map((src: string) => (
                      <div key={src} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="capitalize">{src}:</span>
                        <LatencyDot val={latency[src] || "daily"} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-card-border">
                    <div className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{project.signal_count || 0}</span> signals collected
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {project.created_at ? format(new Date(project.created_at), "MMM d") : "Recently"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/signals?project_id=${project.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full bg-card border-card-border hover:bg-card-border text-xs">
                        View Signals <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 text-xs" onClick={() => deleteMutation.mutate(project.id)}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-card border-card-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Social Listening Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Project Name *</label>
              <Input className="mt-1 bg-background" placeholder="e.g., ADR Monitor Karnataka" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea className="mt-1 bg-background resize-none" rows={2} placeholder="What does this project monitor?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Keywords</label>
              <p className="text-xs text-muted-foreground mb-1">Type a keyword and press Enter</p>
              <Input className="bg-background" placeholder="e.g., Metformin, adverse reaction..." value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword(kwInput); } }} />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.keywords.map(kw => (
                  <span key={kw} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 text-xs">
                    {kw}
                    <button onClick={() => setForm(f => ({ ...f, keywords: f.keywords.filter(k => k !== kw) }))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Data Sources</label>
              <div className="mt-2 space-y-2">
                {SOURCE_DEFS.map(src => (
                  <div key={src.id} className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.sources.includes(src.id)} onChange={() => toggleSource(src.id)} className="rounded" />
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${src.color}`}>{src.label}</span>
                    </label>
                    {form.sources.includes(src.id) && (
                      <select
                        value={form.latency[src.id] || "daily"}
                        onChange={e => setForm(f => ({ ...f, latency: { ...f.latency, [src.id]: e.target.value } }))}
                        style={{ backgroundColor: "#1A1D27", color: "#F1F5F9", border: "1px solid #2A2D3E", borderRadius: "6px", padding: "2px 8px", fontSize: "12px" }}
                      >
                        {LATENCY_OPTS.map(opt => <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button className="flex-1 bg-primary" onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
