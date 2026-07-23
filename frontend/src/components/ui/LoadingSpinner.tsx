interface LoadingSpinnerProps {
  text?: string;
}

export default function LoadingSpinner({ text = 'Loading Data...' }: LoadingSpinnerProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 20px', gap: 16
    }}>
      <div style={{
        width: 40, height: 40, border: '3px solid rgba(52,152,219,0.15)', borderTop: '3px solid #3498DB',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite'
      }} />
      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: '#606075', letterSpacing: 1 }}>
        {text}
      </span>
      <style>
        {`@keyframes spin {from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}
      </style>
    </div>
  );
}