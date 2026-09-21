import { MD3DarkTheme } from 'react-native-paper';
import themeConfig from './themeConfig';

export const paperTheme = {
  ...MD3DarkTheme,

  colors: {
    ...MD3DarkTheme.colors,

    background: themeConfig.background.primary,
    surface: themeConfig.surface.primary,

    primary: themeConfig.accent.primary,
    secondary: themeConfig.text.muted,

    outline: themeConfig.border.subtle,

    onSurface: themeConfig.text.primary,
  },
};