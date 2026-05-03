import * as React from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Clock, MapPin, User, Building, AlertCircle, CheckCircle, Brain, Lock, Shield } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useGetSignal, getGetSignalQueryKey, useUpdateSignalStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function SignalDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const signalId = id ? parseInt(id, 10) : 0;
  const { data: signal, isLoading } = useGetSignal(signalId, { query: { enabled: !!signalId } });
  const updateStatus = useUpdateSignalStatus();

  if (!signalId) return <div>Invalid ID</div>;

  const handleUpdateStatus = (newStatus: "new" | "reviewed" | "escalated") => {
    updateStatus.mutate({ id: signalId, data: { status: newStatus } }, {
      onSuccess: (updatedSignal) => {
        queryClient.setQueryData(getGetSignalQueryKey(signalId), updatedSignal);
        toast({ title: "Status Updated", description: `Signal #${signalId} marked as ${newStatus}.` });
      },
      onError: () => toast({ title: "Error", description: "Failed to update signal status.", variant: "destructive" })
    });
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical": return "bg-destructive/20 text-destructive border-destructive/30";
      case "high": return "bg-[#F97316]/20 text-[#F97316] border-[#F97316]/30";
      case "medium": return "bg-[#EAB308]/20 text-[#EAB308] border-[#EAB308]/30";
      case "low": return "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  let extractedEntities: any = {};
  try { if (signal?.extracted_entities) extractedEntities = JSON.parse(signal.extracted_entities); } catch (e) {}

  let safetyFlags: string[] = [];
  try { if ((signal as any)?.safety_flags) safetyFlags = JSON.parse((signal as any).safety_flags); } catch (e) {}

  let piiTypes: string[] = [];
  try { if ((signal as any)?.pii_types) piiTypes = JSON.parse((signal as any).pii_types); } catch (e) {}

  const sig = signal as any;
  const piiDetected = sig?.pii_detected === 1 || sig?.pii_detected === true;
  const confidenceScore = sig?.confidence_score ?? 0.75;
  const sentimentScore = sig?.sentiment_score ?? 0;
  const sentiment = sig?.sentiment;
  const reasoning = sig?.reasoning;
  const traceId = signal ? `SIG-${signalId}-${new Date(signal.created_at).getTime()}` : "";

  const sentimentColor = sentiment === "negative" ? "text-destructive" : sentiment === "positive" ? "text-green-500" : "text-muted-foreground";
  const sentimentLabel = sentiment === "negative" ? "🔴 Negative" : sentiment === "positive" ? "🟢 Positive" : "⚪ Neutral";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/signals")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold font-mono">Signal #{signalId}</h1>
        {signal?.status && (
          <span className="px-3 py-1 rounded bg-card-border text-xs uppercase font-semibold">{signal.status}</span>
        )}
      </div>

      {isLoading || !signal ? (
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <>
          {/* PII Banner */}
          {piiDetected && (
            <div style={{ background: "rgba(239,68,68,0.08)", borderLeft: "3px solid #EF4444", borderRadius: "6px", padding: "12px 16px" }}>
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-destructive text-sm">🔒 PII/PHI DETECTED</div>
                  <div className="text-destructive/80 text-xs mt-0.5">
                    This report contains: {piiTypes.join(", ")}
                  </div>
                  {sig?.pii_description && <div className="text-destructive/70 text-xs mt-0.5">{sig.pii_description}</div>}
                  <div className="text-destructive/60 text-xs mt-1">Handle in compliance with data privacy laws (DPDPA 2023).</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <Card className="glass-card">
                <CardHeader className="border-b border-card-border pb-4">
                  <CardTitle className="text-lg">Original Report</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  <div className="bg-background rounded-md p-4 border border-card-border leading-relaxed whitespace-pre-wrap text-sm">
                    {signal.raw_text}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1 text-muted-foreground">
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Reported</div>
                      <div className="text-foreground font-mono text-xs">{format(new Date(signal.created_at), "yyyy-MM-dd HH:mm:ss")}</div>
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</div>
                      <div className="text-foreground">{signal.location_district} ({signal.location_type})</div>
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <div className="flex items-center gap-2"><User className="w-4 h-4" /> Reporter Type</div>
                      <div className="text-foreground capitalize">{signal.reporter_type?.replace("_", " ")}</div>
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <div className="flex items-center gap-2"><Building className="w-4 h-4" /> Source</div>
                      <div className="text-foreground capitalize">{signal.source_type?.replace("_", " ")}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Explainability Panel */}
              <Card className="glass-card border-primary/20">
                <CardHeader className="border-b border-card-border pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    🧠 AI Explainability & Traceability
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Confidence Score</span>
                      <span className="font-bold text-primary">{Math.round(confidenceScore * 100)}%</span>
                    </div>
                    <div className="w-full bg-card-border rounded-full h-2.5">
                      <div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${confidenceScore * 100}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sentiment</span>
                    <span className={`font-semibold ${sentimentColor}`}>
                      {sentimentLabel} <span className="text-muted-foreground font-normal">({sentimentScore.toFixed(2)})</span>
                    </span>
                  </div>

                  {reasoning && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Reasoning</div>
                      <p className="text-sm italic bg-card-border/30 rounded-md p-3 leading-relaxed border-l-2 border-primary/40">"{reasoning}"</p>
                    </div>
                  )}

                  {safetyFlags.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Safety Flags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {safetyFlags.map((flag: string) => (
                          <span key={flag} className="px-2 py-0.5 rounded bg-destructive/15 text-destructive text-[11px] font-medium border border-destructive/20">
                            {flag.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-card-border pt-3 space-y-1 text-xs text-muted-foreground font-mono">
                    <div><span className="text-muted-foreground/60">Trace ID:</span> {traceId}</div>
                    <div><span className="text-muted-foreground/60">Engine:</span> {signal.source_type?.replace("_", " ")} Simulator</div>
                    <div><span className="text-muted-foreground/60">Project ID:</span> {sig?.project_id ? `PRJ-${sig.project_id}` : "Unassigned"}</div>
                    <div><span className="text-muted-foreground/60">Processed:</span> {format(new Date(signal.created_at), "yyyy-MM-dd HH:mm:ss")}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <Card className="glass-card">
                <CardHeader className="border-b border-card-border pb-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">AI Analysis</CardTitle>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getRiskColor(signal.risk_level || "")}`}>
                    {signal.risk_level === "critical" ? "🔴 " : signal.risk_level === "high" ? "🟠 " : signal.risk_level === "medium" ? "🟡 " : "🟢 "}{signal.risk_level}
                  </span>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">NLP Summary</h4>
                    <p className="text-sm">{signal.nlp_summary}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                    <div className="inline-block px-3 py-1 rounded bg-card-border text-sm capitalize">{signal.category?.replace("_", " ")}</div>
                  </div>
                  {Object.keys(extractedEntities).length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Extracted Entities</h4>
                      <div className="flex flex-wrap gap-2">
                        {extractedEntities.drugs?.map((d: string) => (
                          <span key={d} className="px-2 py-1 rounded bg-primary/20 text-primary text-xs font-medium border border-primary/30">{d}</span>
                        ))}
                        {extractedEntities.symptoms?.map((s: string) => (
                          <span key={s} className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-500 text-xs font-medium border border-yellow-500/30">{s}</span>
                        ))}
                        {extractedEntities.hospitals?.map((h: string) => (
                          <span key={h} className="px-2 py-1 rounded bg-secondary/20 text-secondary text-xs font-medium border border-secondary/30">{h}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-green-500/30">
                <CardHeader className="pb-3 border-b border-card-border/50">
                  <CardTitle className="text-sm font-medium text-green-500 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Recommended Action
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <p className="text-sm">{signal.recommended_action || "Standard monitoring protocol."}</p>
                  <div className="flex gap-3 mt-6">
                    {signal.status !== "reviewed" && (
                      <Button variant="outline" className="flex-1 bg-card hover:bg-card-border" onClick={() => handleUpdateStatus("reviewed")} disabled={updateStatus.isPending}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Mark as Reviewed
                      </Button>
                    )}
                    {signal.status !== "escalated" && (
                      <Button className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleUpdateStatus("escalated")} disabled={updateStatus.isPending}>
                        <AlertCircle className="w-4 h-4 mr-2" /> Escalate Alert
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
