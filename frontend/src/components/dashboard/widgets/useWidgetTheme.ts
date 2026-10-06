import { useTheme } from '../../../context/ThemeContext';

export function useWidgetTheme() {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return {
    isLight,
    theme,
    containerStyle: {
      height: '240px',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      background: isLight ? '#FFFFFF' : 'rgba(0,0,0,0.5)',
      border: isLight ? '1px solid rgba(26, 109, 181, 0.18)' : '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: isLight ? '0 4px 16px rgba(26, 109, 181, 0.06)' : 'none',
      transition: 'background-color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
    },
    axisLabelColor: isLight ? '#475569' : '#606075',
    axisLineColor: isLight ? 'rgba(26, 109, 181, 0.2)' : 'rgba(255, 255, 255, 0.1)',
    splitLine: {
      show: false,
    },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: isLight ? '#FFFFFF' : '#16161F',
      borderColor: isLight ? 'rgba(26, 109, 181, 0.25)' : 'rgba(255, 255, 255, 0.15)',
      borderWidth: 1,
      textStyle: {
        color: isLight ? '#0F172A' : '#FFFFFF',
        fontSize: 13,
      },
      extraCssText: isLight
        ? 'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12); border-radius: 6px; padding: 10px 14px;'
        : 'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6); border-radius: 6px; padding: 10px 14px;',
    },
    tagColor: isLight ? '#2E5B8A' : 'var(--text-secondary, #94A3B8)',
    valueColor: isLight ? '#0C1E35' : 'var(--text-primary, #ffffff)',
    emptyTextColor: isLight ? '#94A3B8' : '#606075',
  };
}
