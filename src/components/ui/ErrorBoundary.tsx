import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback: ReactNode
}

/**
 * Catches runtime errors inside the 3D canvas tree and swaps in a static
 * fallback so a WebGL/driver failure never blanks the whole app.
 */
export class ErrorBoundary extends Component<Props, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AgroSorb] Scene error:', error, info.componentStack)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
