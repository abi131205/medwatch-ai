import * as React from "react";
import { Link, useLocation } from "wouter";
import { Shield, LayoutDashboard, Map as MapIcon, Activity, PlusCircle, Bell, BarChart2, Menu, FolderOpen, Clock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useGetAlerts } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    setRole(localStorage.getItem("medwatch_role") || "Health Official");
    document.documentElement.classList.add("dark");
  }, []);

  const { data: alerts } = useGetAlerts();
  const activeAlerts = (Array.isArray(alerts) ? alerts : []).filter((a: any) => a.status === "active").length || 0;

  const mainNav = [
    { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderOpen },
    { href: "/signals", label: "Signal Feed", icon: Activity },
    { href: "/map", label: "Cluster Map", icon: MapIcon },
    { href: "/timeline", label: "Timeline", icon: Clock },
    { href: "/submit", label: "Submit Report", icon: PlusCircle },
    { href: "/alerts", label: "Alerts", icon: Bell, badge: activeAlerts },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
  ];

  const bottomNav = [
    { href: "/admin", label: "Engine Config", icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-card-border text-card-foreground">
      <div className="p-4 flex items-center gap-2 border-b border-card-border">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <div className="font-bold text-lg tracking-tight leading-tight">MedWatch AI</div>
          <div className="text-[10px] text-muted-foreground leading-tight">Social Listening Platform</div>
        </div>
      </div>
      <div className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto">
        {mainNav.map((item) => (
          <Link key={item.href} href={item.href} className={`flex items-center justify-between px-3 py-2 rounded-md transition-colors ${location.startsWith(item.href) ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:bg-card-border/50 hover:text-foreground"}`}>
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4" />
              <span className="text-sm">{item.label}</span>
            </div>
            {item.badge ? (
              <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">{item.badge}</span>
            ) : null}
          </Link>
        ))}
      </div>
      <div className="px-3 pb-2 border-t border-card-border pt-2">
        {bottomNav.map((item) => (
          <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.startsWith(item.href) ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:bg-card-border/50 hover:text-foreground"}`}>
            <item.icon className="w-4 h-4" />
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}
      </div>
      <div className="p-4 border-t border-card-border">
        <div className="bg-muted rounded-md p-3 text-sm">
          <div className="text-muted-foreground mb-1">Logged in as</div>
          <div className="font-medium text-primary">{role}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-card-border">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg">MedWatch AI</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="w-6 h-6" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-card-border bg-card">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
      <div className="hidden md:block w-64 h-screen shrink-0 sticky top-0">
        <SidebarContent />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
