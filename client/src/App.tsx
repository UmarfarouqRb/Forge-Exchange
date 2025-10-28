import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/contexts/WalletContext";
import { ChainProvider } from "@/contexts/ChainContext";
import { Navigation } from "@/components/Navigation";
import Home from "@/pages/Home";
import Market from "@/pages/Market";
import Spot from "@/pages/Spot";
import Futures from "@/pages/Futures";
import Assets from "@/pages/Assets";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/market" component={Market} />
      <Route path="/spot" component={Spot} />
      <Route path="/futures" component={Futures} />
      <Route path="/assets" component={Assets} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ChainProvider>
          <WalletProvider>
            <div className="min-h-screen bg-background">
              <Navigation />
              <Router />
            </div>
            <Toaster />
          </WalletProvider>
        </ChainProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
