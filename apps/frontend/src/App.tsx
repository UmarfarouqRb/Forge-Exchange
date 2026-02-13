
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/Navigation";
import ErrorBoundary from "@/components/ErrorBoundary";
import Home from "@/pages/Home";
import Market from "@/pages/Market";
import Spot from "@/pages/Spot";
import Futures from "@/pages/Futures";
import Assets from "@/pages/Assets";
import { Settings } from "@/pages/Settings";
import Portfolio from "@/pages/Portfolio";
import Docs from "@/pages/Docs";
import Deposit from "@/pages/Deposit";
import Withdraw from "@/pages/Withdraw";
import { VaultProvider } from "./contexts/VaultContext";

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}

function App() {
  return (
      <VaultProvider>
        <TooltipProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/market" element={<Market />} />
              <Route path="/spot" element={<Spot />} />
              <Route path="/spot/:pairId" element={<Spot />} />
              <Route path="/futures" element={<Futures />} />
              <Route path="/assets/*" element={<Assets />}>
                <Route path="deposit" element={<Deposit />} />
                <Route path="withdraw" element={<Withdraw />} />
              </Route>
              <Route path="/settings" element={<Settings />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/docs" element={<Docs />} />
            </Route>
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <Toaster />
        </TooltipProvider>
      </VaultProvider>
  );
}

export default App;
