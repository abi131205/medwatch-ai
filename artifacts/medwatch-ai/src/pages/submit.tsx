import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAnalyzeSignal, getGetSignalsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

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
  const queryClient = useQueryClient();
  const analyzeSignal = useAnalyzeSignal();
  const [result, setResult] = React.useState<any>(null);

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
      incident_date: new Date().toISOString().split('T')[0],
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Submit Manual Report</h1>
          <p className="text-muted-foreground">Log observations, adverse events, or capacity issues for AI analysis.</p>
        </div>
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
                <span className="ml-2 font-medium capitalize">{result.category?.replace('_', ' ')}</span>
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

      <Card className="glass-card">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select district" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Bengaluru">Bengaluru</SelectItem>
                          <SelectItem value="Mysuru">Mysuru</SelectItem>
                          <SelectItem value="Hubli">Hubli</SelectItem>
                          <SelectItem value="Mangaluru">Mangaluru</SelectItem>
                          <SelectItem value="Belagavi">Belagavi</SelectItem>
                          <SelectItem value="Kalaburagi">Kalaburagi</SelectItem>
                          <SelectItem value="Davangere">Davangere</SelectItem>
                          <SelectItem value="Bellary">Bellary</SelectItem>
                          <SelectItem value="Vijayapura">Vijayapura</SelectItem>
                          <SelectItem value="Bidar">Bidar</SelectItem>
                        </SelectContent>
                      </Select>
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
    </div>
  );
}