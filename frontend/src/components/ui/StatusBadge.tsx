const config = {
  normal:  { color: '#22C55E', label: 'Normal' },
  warning: { color: '#F59E0B', label: 'Warning' },
  danger:  { color: '#EF4444', label: 'Alert' },
  info:    { color: '#3B82F6', label: 'Info' },
  offline: { color: '#606075', label: 'Offline' },
}

interface StatusBadgeProps {
  status?: 'normal' | 'warning' | 'danger' | 'info' | 'offline';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status = 'normal', label, size = 'md' }: StatusBadgeProps) {
  const c = config[status] || config.normal
  const isSmall = size === 'sm'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: isSmall ? 5 : 6,
      padding: isSmall ? '3px 8px' : '5px 12px',
      background: `${c.color}18`,
      border: `1px solid ${c.color}44`,
      borderRadius: 20,
      fontSize: isSmall ? 11 : 12,
      fontFamily: "'Share Tech Mono', monospace",
      color: c.color,
      letterSpacing: '0.5px',
    }}>
      <span style={{
        width: isSmall ? 6 : 7, height: isSmall ? 6 : 7,
        borderRadius: '50%', background: c.color,
        boxShadow: `0 0 6px ${c.color}`,
        animation: status !== 'offline' ? 'pulse 2s infinite' : 'none',
        flexShrink: 0,
      }} />
      {label || c.label}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </span>
  )
}
