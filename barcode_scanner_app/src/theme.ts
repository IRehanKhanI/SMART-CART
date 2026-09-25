import { Platform } from 'react-native';

const fontFamily = Platform.OS === 'web' 
  ? 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  : undefined;

const shadows = {
  card: {
    shadowColor: '#202522',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  modal: {
    shadowColor: '#202522',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const theme = {
  colors: {
    // Retail Operations Command Base Colors
    background: '#F5F6F4',
    surface: '#FFFFFF',
    surfaceSubtle: '#EEF0ED',
    border: '#D9DDD8',
    borderLight: '#E8EBE6',
    borderDark: '#B8BEB7',
    
    // Charcoal & Gray Typography
    textPrimary: '#202522',
    textSecondary: '#69716B',
    textMuted: '#8A918C',
    textInverse: '#FFFFFF',

    // Subtle Operational Accent (Forest Slate / Deep Command Green)
    accent: '#1B4D3E',
    accentHover: '#246351',
    accentLight: '#E8EFEA',
    accentSubtle: '#F2F6F3',

    // Semantic Status Colors (Used strictly for small status dots and tags)
    statusNormal: '#2A7E58',
    statusNormalBg: '#E8EFEA',
    statusAttention: '#C87D20',
    statusCritical: '#C53030',
    statusDanger: '#C53030',
    statusInfo: '#2563EB',
    statusNeutral: '#8A918C',
  },

  // 8px Corner Radius per Design Specification (Must be primitive number for native Android bridge)
  radius: 8,

  // Named radius scale helpers
  radii: {
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  // Minimal Shadows (Border > Shadow principle)
  shadow: shadows,
  shadows: shadows,

  // Typography tokens
  typography: {
    sans: fontFamily,
    mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Font family
  fontFamily,
};
