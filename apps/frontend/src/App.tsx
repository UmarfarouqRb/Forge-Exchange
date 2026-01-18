import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navigation />
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/market" element={<Market />} />
              <Route path="/spot" element={<Spot />} />
              <Route path="/futures" element={<Futures />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </ErrorBoundary>
        </div>
        <Toaster />
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;
