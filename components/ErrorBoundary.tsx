import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Error desconocido' };
  }

  componentDidCatch(error: Error) {
    console.error('UI ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 560, width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: 0, marginBottom: 8 }}>Se detectó un error en la interfaz</h2>
            <p style={{ opacity: 0.9, marginBottom: 14 }}>Detalle: {this.state.message}</p>
            <button onClick={() => window.location.reload()} style={{ background: '#06b6d4', color: '#fff', border: 0, borderRadius: 8, padding: '10px 14px', fontWeight: 700 }}>
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
