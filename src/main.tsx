import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

type ErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || "An unexpected rendering error occurred."
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[FAIMS] React render error:", error, info.componentStack);
  }

  private resetLocalData = (): void => {
    try {
      localStorage.removeItem("faims_db_state");
      localStorage.removeItem("faims_remember_email");
      localStorage.removeItem("faims_remember_me");
    } catch (error) {
      console.error("[FAIMS] Failed to reset local data:", error);
    }
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          alignItems: "center",
          background: "#09090b",
          color: "#f4f4f5",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, system-ui, sans-serif",
          gap: "16px",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "24px",
          textAlign: "center"
        }}
      >
        <div aria-hidden="true" style={{ color: "#f59e0b", fontSize: "42px", lineHeight: 1 }}>
          !
        </div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0 }}>Application Error</h1>
        <p style={{ color: "#d4d4d8", lineHeight: 1.6, margin: 0, maxWidth: "520px" }}>
          {this.state.message}
        </p>
        <p style={{ color: "#a1a1aa", fontSize: "13px", lineHeight: 1.5, margin: 0, maxWidth: "520px" }}>
          The app stopped a runtime error from becoming a blank screen. Reload the page, or reset local app data if the
          stored session is corrupted.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "#27272a",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
              color: "#f4f4f5",
              cursor: "pointer",
              fontSize: "14px",
              padding: "10px 18px"
            }}
          >
            Reload Page
          </button>
          <button
            type="button"
            onClick={this.resetLocalData}
            style={{
              background: "#2563eb",
              border: "0",
              borderRadius: "8px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 700,
              padding: "10px 18px"
            }}
          >
            Reset Local Data
          </button>
        </div>
      </div>
    );
  }
}

window.addEventListener("error", (event) => {
  console.error("[FAIMS] Uncaught runtime error:", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[FAIMS] Unhandled promise rejection:", event.reason);
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Application root element '#root' was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
