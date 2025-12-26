
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivyProvider } from "@privy-io/react-auth";
import { WalletProvider } from "@/contexts/WalletContext";
import { ChainProvider } from "@/contexts/ChainContext";
import { Navigation } from "@/components/Navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
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
  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!privyAppId) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Privy App ID is not set.</h1>
          <p className="text-muted-foreground">
            Please set the VITE_PRIVY_APP_ID environment variable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PrivyProvider
          appId={privyAppId}
          config={{
            appearance: {
              theme: 'dark',
              accentColor: '#ff6b00',
            },
          }}
        >
          <ChainProvider>
            <WalletProvider>
              <div className="min-h-screen bg-background">
                <Navigation />
                <ErrorBoundary>
                  <Router />
                </ErrorBoundary>
              </div>
              <Toaster />
            </WalletProvider>
          </ChainProvider>
        </PrivyProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
