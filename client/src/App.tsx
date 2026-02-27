import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import ChoiceBoard from "@/pages/ChoiceBoard";
import TokenBoard from "@/pages/TokenBoard";
import VisualSchedule from "@/pages/VisualSchedule";
import { SafetyBar } from "@/components/SafetyBar";
import { BottomNav } from "@/components/BottomNav";
import { PartnerProvider } from "@/lib/partnerContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/choice-board" component={ChoiceBoard} />
      <Route path="/token-board" component={TokenBoard} />
      <Route path="/schedule" component={VisualSchedule} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PartnerProvider>
          <Toaster />
          <div className="flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
            <div className="flex-1 overflow-hidden">
              <Router />
            </div>
            <SafetyBar />
            <BottomNav />
          </div>
        </PartnerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
