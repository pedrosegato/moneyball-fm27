import { Component, type ErrorInfo, type ReactNode } from "react";
import { PageFailed } from "./PageFailed";

interface Props {
  children: ReactNode;
  onRetry(): void;
}

export class PageErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Tela falhou ao abrir", error, info.componentStack);
  }

  private retry = () => {
    this.props.onRetry();
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return <PageFailed onRetry={this.retry} />;
  }
}
