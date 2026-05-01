import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Clock, ShieldAlert } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useGetAlerts, useCheckAlerts, useUpdateAlertStatus, getGetAlertsQueryKey, UpdateAlertStatusBodyStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Alerts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: alerts, isLoading } = useGetAlerts();
  const checkAlerts = useCheckAlerts();
  const updateAlertStatus = useUpdateAlertStatus();

  const handleRunDetection = () => {
    checkAlerts.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() });
        toast({
          title: "Cluster Detection Complete",
          description: "System has finished scanning for emerging patterns.",
        });
      },
      onError: () => {
        toast({
          title: "Detection Failed",
          description: "An error occurred while running cluster detection.",
          variant: "destructive",
        });
      }
    });
  };

  const handleUpdateStatus = (id: number, newStatus: UpdateAlertStatusBodyStatus) => {
    updateAlertStatus.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() });
          toast({
            title: "Alert Updated",
            description: `Alert #${id} marked as ${newStatus}.`,
          });
        }
      }
    );
  };

  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-high';
      case 'medium': return 'text-medium';
      case 'low': return 'text-low';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Alert Center</h1>
          <p className="text-muted-foreground">Monitor and respond to detected signal clusters.</p>
        </div>
        <Button 
          onClick={handleRunDetection} 
          disabled={checkAlerts.isPending}
          className="bg-primary hover:bg-primary/90"
        >
          {checkAlerts.isPending ? (
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 animate-spin" /> Scanning...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Run Cluster Detection
            </span>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))
        ) : alerts?.length === 0 ? (
          <Card className="glass-card p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Active Alerts</h3>
            <p className="text-muted-foreground">The system hasn't detected any critical clusters requiring attention.</p>
          </Card>
        ) : (
          alerts?.map((alert) => (
            <Card key={alert.id} className={`glass-card relative overflow-hidden ${alert.status === 'active' ? 'border-l-4 border-l-destructive' : 'border-l-4 border-l-card-border'}`}>
              {alert.status === 'active' && (
                <div className="absolute top-4 right-4 flex items-center gap-2 text-destructive text-sm font-semibold">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  ACTION REQUIRED
                </div>
              )}
              
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full border ${
                    alert.risk_level === 'critical' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                    alert.risk_level === 'high' ? 'bg-high/10 border-high/20 text-high' :
                    alert.risk_level === 'medium' ? 'bg-medium/10 border-medium/20 text-medium' :
                    'bg-low/10 border-low/20 text-low'
                  }`}>
                    {alert.risk_level} Risk
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-card-border font-semibold uppercase">
                    {alert.status}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {format(new Date(alert.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {alert.district ? `Cluster detected in ${alert.district}` : 'System-wide Cluster Detected'}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-foreground leading-relaxed">
                  {alert.cluster_summary}
                </p>
                
                <div className="flex flex-wrap gap-4 text-sm bg-background p-3 rounded-md border border-card-border">
                  <div className="space-x-2">
                    <span className="text-muted-foreground">Signals Involved:</span>
                    <span className="font-mono font-medium">{alert.signal_count}</span>
                  </div>
                  <div className="space-x-2">
                    <span className="text-muted-foreground">Time Window:</span>
                    <span className="font-mono font-medium">Last {alert.time_window_hours} hours</span>
                  </div>
                </div>

                {alert.status === 'active' && (
                  <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      className="bg-card hover:bg-card-border flex-1 sm:flex-none"
                      onClick={() => handleUpdateStatus(alert.id, 'acknowledged')}
                      disabled={updateAlertStatus.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Acknowledge
                    </Button>
                    <Button 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1 sm:flex-none"
                      onClick={() => handleUpdateStatus(alert.id, 'escalated')}
                      disabled={updateAlertStatus.isPending}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" /> Escalate to National
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}