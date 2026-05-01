import * as React from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Clock, MapPin, User, Building, AlertCircle, CheckCircle, ArrowUpRight } from "lucide-react";
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
    updateStatus.mutate(
      { id: signalId, data: { status: newStatus } },
      {
        onSuccess: (updatedSignal) => {
          queryClient.setQueryData(getGetSignalQueryKey(signalId), updatedSignal);
          toast({
            title: "Status Updated",
            description: `Signal #${signalId} marked as ${newStatus}.`,
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update signal status.",
            variant: "destructive"
          });
        }
      }
    );
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

  let extractedEntities: any = {};
  try {
    if (signal?.extracted_entities) {
      extractedEntities = JSON.parse(signal.extracted_entities);
    }
  } catch(e) {}

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/signals")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold font-mono">Signal #{signalId}</h1>
          {signal?.status && (
            <span className="px-3 py-1 rounded bg-card-border text-xs uppercase font-semibold">
              {signal.status}
            </span>
          )}
        </div>
      </div>

      {isLoading || !signal ? (
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column: Original Report */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader className="border-b border-card-border pb-4">
                <CardTitle className="text-lg">Original Report</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                <div className="bg-background rounded-md p-4 border border-card-border leading-relaxed whitespace-pre-wrap">
                  {/* Simplistic highlighting simulation */}
                  {signal.raw_text}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1 text-muted-foreground">
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Reported</div>
                    <div className="text-foreground font-mono">{format(new Date(signal.created_at), "yyyy-MM-dd HH:mm:ss")}</div>
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
          </div>

          {/* Right Column: AI Analysis */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader className="border-b border-card-border pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">AI Analysis</CardTitle>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase border ${getRiskColor(signal.risk_level || '')}`}>
                  {signal.risk_level === 'critical' ? '🔴 ' : signal.risk_level === 'high' ? '🟠 ' : signal.risk_level === 'medium' ? '🟡 ' : '🟢 '}
                  {signal.risk_level}
                </span>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">NLP Summary</h4>
                  <p className="text-sm">{signal.nlp_summary}</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                  <div className="inline-block px-3 py-1 rounded bg-card-border text-sm capitalize">
                    {signal.category?.replace("_", " ")}
                  </div>
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

            <Card className="glass-card border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.05)]">
              <CardHeader className="pb-3 border-b border-card-border/50">
                <CardTitle className="text-sm font-medium text-green-500 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Recommended Action
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <p className="text-sm">{signal.recommended_action || "Standard monitoring protocol."}</p>
                
                <div className="flex gap-3 mt-6">
                  {signal.status !== 'reviewed' && (
                    <Button 
                      variant="outline" 
                      className="flex-1 bg-card hover:bg-card-border"
                      onClick={() => handleUpdateStatus("reviewed")}
                      disabled={updateStatus.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Reviewed
                    </Button>
                  )}
                  {signal.status !== 'escalated' && (
                    <Button 
                      className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleUpdateStatus("escalated")}
                      disabled={updateStatus.isPending}
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Escalate Alert
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}