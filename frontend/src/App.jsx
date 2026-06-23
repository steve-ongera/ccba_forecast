import React from "react";
import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Regions from "./pages/Regions";
import Sales from "./pages/Sales";
import Weather from "./pages/Weather";
import Forecasts from "./pages/Forecasts";
import Recommendations from "./pages/Recommendations";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="forecasts" element={<Forecasts />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="sales" element={<Sales />} />
        <Route path="products" element={<Products />} />
        <Route path="regions" element={<Regions />} />
        <Route path="weather" element={<Weather />} />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
  );
}