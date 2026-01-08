import "./global.css";

import { Toaster } from "./components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ForeignVehicles from "./pages/ForeignVehicles";
import Payment from "./pages/Payment";
import Records from "./pages/Records";
import SyrianRecords from "./pages/SyrianRecords";
import ForeignRecords from "./pages/ForeignRecords";
import PdfGeneration from "./pages/PdfGeneration";
import NotFound from "./pages/NotFound";
import PaymentForeign from "./pages/PaymentForeign";
import PdfForeign from "./pages/PdfForeign";

// Authentication Guard Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated");
    setIsAuthenticated(authStatus === "true");
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated");
    setIsAuthenticated(authStatus === "true");
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/syrian-vehicles" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/foreign-vehicles" element={<ProtectedRoute><ForeignVehicles /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
          <Route path="/syrian-records" element={<ProtectedRoute><SyrianRecords /></ProtectedRoute>} />
          <Route path="/foreign-records" element={<ProtectedRoute><ForeignRecords /></ProtectedRoute>} />
          <Route path="/pdf" element={<ProtectedRoute><PdfGeneration /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
          <Route path="/payment-foreign" element={<PaymentForeign />} />
          <Route path="/pdf-foreign" element={<PdfForeign />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
