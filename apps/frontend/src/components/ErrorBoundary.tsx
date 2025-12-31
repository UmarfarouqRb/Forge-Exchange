
import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public componentDidCatch(error: Error) {
    this.setState({ hasError: true });
    console.error("Uncaught error:", error);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-8rem)] bg-background text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong.</h1>
            <p className="text-muted-foreground">We've logged the error and will look into it.</p>
            <p className="text-muted-foreground">Please refresh the page to try again.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
