import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error: String(error) };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, background: "#ffecec", border: "1px solid #f5b7b7" }}>
          <strong>? Errore UI:</strong> {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}
