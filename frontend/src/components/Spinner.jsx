import React from "react";

export default function Spinner({ size = "md", label = "Loading..." }) {
  const sizeClass = { sm: "spinner-sm", md: "spinner-md", lg: "spinner-lg" }[size] || "spinner-md";
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className={`spinner ${sizeClass}`} aria-hidden="true" />
      <span className="spinner-label">{label}</span>
    </div>
  );
}