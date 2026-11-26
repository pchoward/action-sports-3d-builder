"use client";

import { Component, type ReactNode } from "react";

/** Keeps an optional scene layer (e.g. an HDR environment) from crashing the whole builder. */
export class SceneErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[scene] optional layer failed, using fallback:", error);
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
