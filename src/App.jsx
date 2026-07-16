import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DataProvider } from "./context/DataContext";
import Dashboard from "./pages/Dashboard";
import FuelTracker from "./pages/FuelTracker";
import ServiceHistory from "./pages/ServiceHistory";

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fuel" element={<FuelTracker />} />
          <Route path="/service" element={<ServiceHistory />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}
