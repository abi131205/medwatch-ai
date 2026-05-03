import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAnalyzeSignal, getGetSignalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertCircle, Smartphone, Zap } from "lucide-react";

const KARNATAKA_DISTRICTS = [
  "Bengaluru", "Mysuru", "Hubli", "Mangaluru", "Belagavi", "Kalaburagi",
  "Davangere", "Bellary", "Vijayapura", "Bidar", "Raichur", "Kolar",
  "Dharwad", "Tumkur", "Hassan", "Shimoga", "Udupi", "Chikkamagaluru",
];

const formSchema = z.object({
  reporter_type: z.string().min(1, "Reporter type is required"),
  location_district: z.string().min(1, "District is required"),
  location_type: z.string().min(1, "Location type is required"),
  source_type: z.string().min(1, "Source type is required"),
  raw_text: z.string().min(20, "Report must be at least 20 characters"),
  drug_name: z.string().optional(),
  hospital_name: z.string().optional(),
  incident_date: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SubmitReport() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const analyzeSignal = useAnalyzeSignal();
  const [result, setResult] = React.useState<any>(null);

  // Bulk simulation state
  const [bulkSource, setBulkSource] = React.useState("whatsapp");
  const [bulkDistrict, setBulkDistrict] = React.useState("Bengaluru");
  const [bulkCount, setBulkCount] = React.useState([5]);
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [bulkResult, setBulkResult] = React.useState<{ inserted: number; alerts_triggered: number } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reporter_type: "",
      location_district: "",
      location_type: "",
      source_type: "",
      raw_text: "",
      drug_name: "",
      hospital_name: "",
      incident_date: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = (data: FormValues) => {
    analyzeSignal.mutate({ data }, {
      onSuccess: (res) => {
        setResult(res);
        queryClient.invalidateQueries({ queryKey: getGetSignalsQueryKey() });
        toast({
          title: "Report Submitted",
          description: "Signal has been successfully analyzed and logged.",
        });
        setTimeout(() => {
          form.reset();
          setResult(null);
        }, 5000);
      },
      onError: () => {
        toast({
          title: "Submission Failed",
          description: "An error occurred while submitting the report.",
          variant: "destructive",
        });
      }
    });
  };

  const handleBulkSimulate = async () => {
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const response = await fetch("/api/signals/bulk-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: bulkSource,
          district: bulkDistrict,
          count: bulkCount[0],
        }),
      });
      const data = await response.json();
      setBulkResult({ inserted: data.inserted, alerts_triggered: data.alerts_triggered });
      queryClient.invalidateQueries({ queryKey: getGetSignalsQueryKey() });
      toast({
        title: "Signals Injected",
        description: `${data.inserted} signals injected. ${data.alerts_triggered} alert(s) triggered.`,
      });
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch {
      toast({
        title: "Injection Failed",
        description: "An error occurred while injecting signals.",
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical": return "text-destructive";
      case "high": return "text-[#F97316]";
      case "medium": return "text-[#EAB308]";
      case "low": return "text-[#22C55E]";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submit Manual Report</h1>
        <p className="text-muted-foreground">Log observations, adverse events, or capacity issues for AI analysis.</p>
      </div>

      {result && (
        <Card className="border-green-500/30 bg-green-500/5 animate-in slide-in-from-top-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-green-500 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Analysis Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Risk Level:</span>
                <span className={`ml-2 font-bold uppercase ${getRiskColor(result.risk_level)}`}>
                  {result.risk_level}
                </span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Category:</span>
                <span className="ml-2 font-medium capitalize">{result.category?.replace("_", " ")}</span>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Summary:</span>
              <p className="text-sm mt-1">{result.nlp_summary}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Recommended Action:</span>
              <p className="text-sm mt-1 font-medium">{result.recommended_action}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card" style={{ overflow: "visible" }}>
        <CardContent className="pt-6" style={{ overflow: "visible" }}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" style={{ overflow: "visible" }}>
              <div className="grid md:grid-cols-2 gap-6" style={{ overflow: "visible" }}>
                <FormField
                  control={form.control}
                  name="reporter_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reporter Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select reporter type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="nurse">Nurse</SelectItem>
                          <SelectItem value="pharmacist">Pharmacist</SelectItem>
                          <SelectItem value="field_worker">Field Worker</SelectItem>
                          <SelectItem value="patient">Patient</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="source_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hospital_form">Hospital Form</SelectItem>
                          <SelectItem value="field_worker">Field Worker App</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp Hotline</SelectItem>
                          <SelectItem value="social_media">Social Media (Manual)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>District</FormLabel>
                      <FormControl>
                        <div style={{ position: "relative", zIndex: 9999 }}>
                          <select
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              backgroundColor: "#1A1D27",
                              color: field.value ? "#F1F5F9" : "#94A3B8",
                              border: "1px solid #2A2D3E",
                              borderRadius: "8px",
                              fontSize: "14px",
                              cursor: "pointer",
                              position: "relative",
                              zIndex: 9999,
                              appearance: "auto",
                            }}
                          >
                            <option value="" disabled>Select district</option>
                            <optgroup label="Urban Districts">
                              <option value="Bengaluru">Bengaluru</option>
                              <option value="Mysuru">Mysuru</option>
                              <option value="Hubli">Hubli</option>
                              <option value="Mangaluru">Mangaluru</option>
                              <option value="Belagavi">Belagavi</option>
                              <option value="Kalaburagi">Kalaburagi</option>
                              <option value="Dharwad">Dharwad</option>
                              <option value="Tumkur">Tumkur</option>
                            </optgroup>
                            <optgroup label="Rural Districts">
                              <option value="Raichur">Raichur</option>
                              <option value="Bellary">Bellary</option>
                              <option value="Davangere">Davangere</option>
                              <option value="Kolar">Kolar</option>
                              <option value="Bidar">Bidar</option>
                              <option value="Vijayapura">Vijayapura</option>
                              <option value="Hassan">Hassan</option>
                              <option value="Shimoga">Shimoga</option>
                              <option value="Udupi">Udupi</option>
                              <option value="Chikkamagaluru">Chikkamagaluru</option>
                            </optgroup>
                          </select>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select location type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="urban">Urban</SelectItem>
                          <SelectItem value="rural">Rural</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incident_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incident Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="raw_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the adverse event, drug reaction, or resource shortage in detail..."
                        className="min-h-[150px] bg-background resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="drug_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Suspected Drug (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Paracetamol" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hospital_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hospital/Clinic (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Apollo Hospital" {...field} className="bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-card-border">
                <Button type="button" variant="outline" onClick={() => form.reset()} disabled={analyzeSignal.isPending}>
                  Clear
                </Button>
                <Button type="submit" disabled={analyzeSignal.isPending} className="min-w-[150px]">
                  {analyzeSignal.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                  ) : (
                    <><AlertCircle className="w-4 h-4 mr-2" /> Submit Report</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Bulk Simulation Panel */}
      <Card className="glass-card border-amber-500/20" style={{ overflow: "visible" }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-400">
            <Smartphone className="w-5 h-5" />
            📱 Simulate Bulk Incoming Signals
          </CardTitle>
          <CardDescription>For demo purposes — inject multiple signals from field sources to test cluster detection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Channel</label>
              <Select value={bulkSource} onValueChange={setBulkSource}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp Group Messages</SelectItem>
                  <SelectItem value="social_media">Social Media Scrape</SelectItem>
                  <SelectItem value="field_worker">Field Worker SMS</SelectItem>
                  <SelectItem value="hospital_form">Hospital Form Batch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2" style={{ position: "relative", zIndex: 9999 }}>
              <label className="text-sm font-medium">Target District</label>
              <div style={{ position: "relative", zIndex: 9999 }}>
                <select
                  value={bulkDistrict}
                  onChange={(e) => setBulkDistrict(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    backgroundColor: "#1A1D27",
                    color: "#F1F5F9",
                    border: "1px solid #2A2D3E",
                    borderRadius: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 9999,
                    appearance: "auto",
                  }}
                >
                  <optgroup label="Urban Districts">
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Mysuru">Mysuru</option>
                    <option value="Hubli">Hubli</option>
                    <option value="Mangaluru">Mangaluru</option>
                    <option value="Belagavi">Belagavi</option>
                    <option value="Kalaburagi">Kalaburagi</option>
                    <option value="Dharwad">Dharwad</option>
                    <option value="Tumkur">Tumkur</option>
                  </optgroup>
                  <optgroup label="Rural Districts">
                    <option value="Raichur">Raichur</option>
                    <option value="Bellary">Bellary</option>
                    <option value="Davangere">Davangere</option>
                    <option value="Kolar">Kolar</option>
                    <option value="Bidar">Bidar</option>
                    <option value="Vijayapura">Vijayapura</option>
                    <option value="Hassan">Hassan</option>
                    <option value="Shimoga">Shimoga</option>
                    <option value="Udupi">Udupi</option>
                    <option value="Chikkamagaluru">Chikkamagaluru</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Number of Signals to Inject</label>
              <span className="text-2xl font-bold text-amber-400">{bulkCount[0]}</span>
            </div>
            <Slider
              min={3}
              max={10}
              step={1}
              value={bulkCount}
              onValueChange={setBulkCount}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3</span>
              <span>10</span>
            </div>
          </div>

          {bulkResult && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                ✅ {bulkResult.inserted} signals injected from {bulkSource.replace("_", " ")} in {bulkDistrict}.{" "}
                {bulkResult.alerts_triggered > 0
                  ? `${bulkResult.alerts_triggered} alert(s) triggered.`
                  : "No new alerts triggered."}{" "}
                Redirecting to dashboard…
              </span>
            </div>
          )}

          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
            onClick={handleBulkSimulate}
            disabled={bulkLoading}
          >
            {bulkLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Injecting Signals...</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Inject {bulkCount[0]} Signals</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
