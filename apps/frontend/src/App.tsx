
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
import Staking from "@/pages/Staking";
import Deposit from "@/pages/Deposit";
import InternalTransfer from "@/pages/InternalTransfer";
import Withdraw from "@/pages/Withdraw";
import { VaultProvider } from "./contexts/VaultContext";
import { PointsProvider } from "./contexts/PointsContext";

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
          <PointsProvider>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/market" element={<Market />} />
                <Route path="/spot" element={<Spot />} />
                <Route path="/spot/:pairId" element={<Spot />} />
                <Route path="/futures" element={<Futures />} />
                <Route path="/assets/*" element={<Assets />}>
                  <Route path="deposit" element={<Deposit />} />
                  <Route path="transfer" element={<InternalTransfer />} />
                  <Route path="withdraw" element={<Withdraw />} />
                </Route>
                <Route path="/settings" element={<Settings />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/staking" element={<Staking />} />
              </Route>
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            <Toaster />
          </PointsProvider>
        </TooltipProvider>
      </VaultProvider>
  );
}

export default App;
