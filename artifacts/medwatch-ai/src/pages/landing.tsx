import * as React from "react";
import { useLocation } from "wouter";
import { Shield, User, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Landing() {
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleRoleSelect = (role: string) => {
    localStorage.setItem("medwatch_role", role);
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-primary/20" style={{ width: Math.random() * 4 + 2 + "px", height: Math.random() * 4 + 2 + "px", top: Math.random() * 100 + "%", left: Math.random() * 100 + "%", animation: `pulse ${Math.random() * 3 + 2}s infinite alternate`, animationDelay: `${Math.random() * 2}s` }} />
        ))}
      </div>

      <div className="z-10 w-full max-w-4xl flex flex-col items-center animate-in fade-in zoom-in duration-700">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-card rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(99,102,241,0.2)] border border-card-border relative">
            <div className="absolute inset-0 bg-primary/10 rounded-2xl animate-pulse" />
            <Shield className="w-12 h-12 text-primary relative z-10" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-foreground mb-4">MedWatch AI</h1>
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            for patient safety signals across India
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
          <Card className="glass-card p-8 cursor-pointer group flex flex-col items-center text-center hover:-translate-y-1 transition-transform" onClick={() => handleRoleSelect("Health Official")}>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Enter as Health Official</h3>
            <p className="text-sm text-muted-foreground">Access command center, social listening projects, cluster detection, and strategic analytics.</p>
          </Card>

          <Card className="glass-card p-8 cursor-pointer group flex flex-col items-center text-center hover:-translate-y-1 transition-transform" onClick={() => handleRoleSelect("Field Worker")}>
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <User className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Enter as Field Worker</h3>
            <p className="text-sm text-muted-foreground">Submit incident reports, track local alerts, and monitor community health signals.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
