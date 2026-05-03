import * as React from "react";
import { Settings, Plus, Play, Pause, CheckCircle2, XCircle, Loader2, Sliders } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ENGINES = [
  { id: 1, name: "Twitter/X Engine", source: "Social Media", status: "active", latency: "Real-time", last_run: "2 mins ago", signals_today: 34, endpoint: "https://api.twitter.com/2/tweets/search/recent", rate_limit: 45, retries: 3 },
  { id: 2, name: "Reddit Engine", source: "Forum", status: "active", latency: "Daily", last_run: "6 hrs ago", signals_today: 89, endpoint: "https://oauth.reddit.com/r/india/search", rate_limit: 30, retries: 3 },
  { id: 3, name: "Quora Engine", source: "Q&A Platform", status: "active", latency: "Daily", last_run: "8 hrs ago", signals_today: 23, endpoint: "https://www.quora.com/api/search", rate_limit: 10, retries: 2 },
  { id: 4, name: "WhatsApp Simulator", source: "Messaging", status: "active", latency: "Real-time", last_run: "1 min ago", signals_today: 12, endpoint: "wss://internal-whatsapp-proxy.medwatch.in/ws", rate_limit: 60, retries: 5 },
  { id: 5, name: "News Forum Engine", source: "News", status: "paused", latency: "Weekly", last_run: "2 days ago", signals_today: 0, endpoint: "https://newsapi.org/v2/everything", rate_limit: 5, retries: 1 },
];

export default function Admin() {
  const { toast } = useToast();
  const [engines, setEngines] = React.useState(ENGINES);
  const [configEngine, setConfigEngine] = React.useState<typeof ENGINES[0] | null>(null);
  const [testStatus, setTestStatus] = React.useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newEngine, setNewEngine] = React.useState({ name: "", source_type: "Social Media", base_url: "", auth: "API Key" });

  const [editState, setEditState] = React.useState<{ name: string; endpoint: string; rate_limit: number[]; retries: number[] } | null>(null);

  React.useEffect(() => {
    if (configEngine) {
      setEditState({ name: configEngine.name, endpoint: configEngine.endpoint, rate_limit: [configEngine.rate_limit], retries: [configEngine.retries] });
      setTestStatus("idle");
    }
  }, [configEngine]);

  const toggleStatus = (id: number) => {
    setEngines(prev => prev.map(e => e.id === id ? { ...e, status: e.status === "active" ? "paused" : "active" } : e));
    toast({ title: "Engine status updated" });
  };

  const testConnection = async () => {
    setTestStatus("testing");
    await new Promise(r => setTimeout(r, 1500));
    setTestStatus(Math.random() > 0.2 ? "ok" : "fail");
  };

  const saveConfig = () => {
    if (!configEngine || !editState) return;
    setEngines(prev => prev.map(e => e.id === configEngine.id ? { ...e, name: editState.name, endpoint: editState.endpoint, rate_limit: editState.rate_limit[0], retries: editState.retries[0] } : e));
    toast({ title: "Configuration saved" });
    setConfigEngine(null);
  };

  const addEngine = () => {
    const newId = Math.max(...engines.map(e => e.id)) + 1;
    setEngines(prev => [...prev, { id: newId, name: newEngine.name, source: newEngine.source_type, status: "paused", latency: "Daily", last_run: "Never", signals_today: 0, endpoint: newEngine.base_url, rate_limit: 10, retries: 3 }]);
    toast({ title: "Engine registered. Configure keywords in Projects." });
    setShowAddModal(false);
    setNewEngine({ name: "", source_type: "Social Media", base_url: "", auth: "API Key" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-primary" /> Data Source Engines</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure and manage crawling engines for each data source.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add New Engine
        </Button>
      </div>

      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card-border/60 border-b border-card-border">
              <tr>
                {["Engine Name", "Source Type", "Status", "Latency", "Last Run", "Signals Today", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {engines.map((eng, i) => (
                <tr key={eng.id} className="border-t border-card-border hover:bg-card-border/20 transition-colors" style={{ backgroundColor: i % 2 === 0 ? "#1A1D27" : "#151821" }}>
                  <td className="px-4 py-3 font-medium">{eng.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{eng.source}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${eng.status === "active" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                      {eng.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${eng.latency === "Real-time" ? "bg-green-500" : eng.latency === "Daily" ? "bg-yellow-500" : "bg-gray-500"}`} />
                      {eng.latency}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{eng.last_run}</td>
                  <td className="px-4 py-3">
                    <span className={`font-mono font-bold ${eng.signals_today > 0 ? "text-primary" : "text-muted-foreground"}`}>{eng.signals_today}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs bg-card border-card-border h-7 px-2" onClick={() => setConfigEngine(eng)}>
                        <Sliders className="w-3 h-3 mr-1" /> Configure
                      </Button>
                      <Button size="sm" variant="ghost" className={`text-xs h-7 px-2 ${eng.status === "active" ? "text-yellow-400 hover:bg-yellow-400/10" : "text-green-400 hover:bg-green-400/10"}`} onClick={() => toggleStatus(eng.id)}>
                        {eng.status === "active" ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                        {eng.status === "active" ? "Pause" : "Activate"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Platform Capability</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This engine architecture is fully <span className="text-primary font-semibold">extensible</span> — new data sources can be added via UI without code changes. Each engine supports configurable rate limiting, auth token management, and retry policies. Keyword matching is project-scoped.</p>
        </CardContent>
      </Card>

      {/* Configure Panel */}
      <Sheet open={!!configEngine} onOpenChange={o => { if (!o) setConfigEngine(null); }}>
        <SheetContent className="bg-card border-l border-card-border w-[400px] overflow-y-auto" style={{ zIndex: 1000 }}>
          <SheetHeader>
            <SheetTitle>Configure Engine</SheetTitle>
          </SheetHeader>
          {configEngine && editState && (
            <div className="mt-6 space-y-5">
              <div>
                <label className="text-sm font-medium">Engine Name</label>
                <Input className="mt-1 bg-background" value={editState.name} onChange={e => setEditState(s => s ? { ...s, name: e.target.value } : s)} />
              </div>
              <div>
                <label className="text-sm font-medium">Source URL / API Endpoint</label>
                <Input className="mt-1 bg-background font-mono text-xs" value={editState.endpoint} onChange={e => setEditState(s => s ? { ...s, endpoint: e.target.value } : s)} />
              </div>
              <div>
                <label className="text-sm font-medium">Auth Token / API Key</label>
                <Input className="mt-1 bg-background font-mono" type="password" value="••••••••••••••••" readOnly />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><label className="text-sm font-medium">Rate Limit (req/min)</label><span className="text-primary font-bold">{editState.rate_limit[0]}</span></div>
                <Slider min={1} max={60} step={1} value={editState.rate_limit} onValueChange={v => setEditState(s => s ? { ...s, rate_limit: v } : s)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><label className="text-sm font-medium">Max Retries</label><span className="text-primary font-bold">{editState.retries[0]}</span></div>
                <Slider min={1} max={5} step={1} value={editState.retries} onValueChange={v => setEditState(s => s ? { ...s, retries: v } : s)} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 bg-card border-card-border" onClick={testConnection} disabled={testStatus === "testing"}>
                  {testStatus === "testing" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : testStatus === "ok" ? <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> : testStatus === "fail" ? <XCircle className="w-4 h-4 mr-2 text-destructive" /> : null}
                  {testStatus === "ok" ? "Connected" : testStatus === "fail" ? "Failed" : "Test Connection"}
                </Button>
                <Button className="flex-1 bg-primary" onClick={saveConfig}>Save Config</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Engine Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader><DialogTitle>Register New Engine</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><label className="text-sm font-medium">Engine Name</label><Input className="mt-1 bg-background" placeholder="e.g., YouTube Comments Engine" value={newEngine.name} onChange={e => setNewEngine(n => ({ ...n, name: e.target.value }))} /></div>
            <div>
              <label className="text-sm font-medium">Source Type</label>
              <select value={newEngine.source_type} onChange={e => setNewEngine(n => ({ ...n, source_type: e.target.value }))} style={{ width: "100%", marginTop: "4px", padding: "8px 12px", backgroundColor: "#1A1D27", color: "#F1F5F9", border: "1px solid #2A2D3E", borderRadius: "8px", fontSize: "14px" }}>
                {["Social Media", "Forum", "Q&A Platform", "News", "Messaging", "Government Database"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="text-sm font-medium">Base URL</label><Input className="mt-1 bg-background font-mono text-xs" placeholder="https://api.example.com/v1" value={newEngine.base_url} onChange={e => setNewEngine(n => ({ ...n, base_url: e.target.value }))} /></div>
            <div>
              <label className="text-sm font-medium">Auth Method</label>
              <select value={newEngine.auth} onChange={e => setNewEngine(n => ({ ...n, auth: e.target.value }))} style={{ width: "100%", marginTop: "4px", padding: "8px 12px", backgroundColor: "#1A1D27", color: "#F1F5F9", border: "1px solid #2A2D3E", borderRadius: "8px", fontSize: "14px" }}>
                {["API Key", "OAuth 2.0", "Bearer Token", "None"].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground bg-card-border/40 rounded p-3">Engine registered. Configure keywords in Projects to start monitoring.</p>
            <div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button><Button className="flex-1 bg-primary" onClick={addEngine} disabled={!newEngine.name}>Register Engine</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
