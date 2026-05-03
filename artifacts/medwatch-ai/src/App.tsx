import * as React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";

import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import MapView from "@/pages/map";
import Signals from "@/pages/signals";
import SignalDetail from "@/pages/signals/detail";
import SubmitReport from "@/pages/submit";
import Alerts from "@/pages/alerts";
import Analytics from "@/pages/analytics";
import Projects from "@/pages/projects";
import Admin from "@/pages/admin";
import Timeline from "@/pages/timeline";
import Architecture from "@/pages/architecture";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard"><Layout><Dashboard /></Layout></Route>
      <Route path="/map"><Layout><MapView /></Layout></Route>
      <Route path="/signals"><Layout><Signals /></Layout></Route>
      <Route path="/signals/:id"><Layout><SignalDetail /></Layout></Route>
      <Route path="/submit"><Layout><SubmitReport /></Layout></Route>
      <Route path="/alerts"><Layout><Alerts /></Layout></Route>
      <Route path="/analytics"><Layout><Analytics /></Layout></Route>
      <Route path="/projects"><Layout><Projects /></Layout></Route>
      <Route path="/admin"><Layout><Admin /></Layout></Route>
      <Route path="/timeline"><Layout><Timeline /></Layout></Route>
      <Route path="/architecture"><Architecture /></Route>
      <Route><Layout><NotFound /></Layout></Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
