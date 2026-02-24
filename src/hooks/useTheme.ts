import {useColorScheme} from 'react-native';
import useSettingsStore from '../store/useSettingsStore';
import {colors, ThemeColors} from '../theme/colors';

interface UseThemeResult {
  theme: ThemeColors;
  isDark: boolean;
}

/**
 * Returns the resolved theme colors based on the user's dark mode preference.
 * Handles 'system', 'light', and 'dark' modes.
 */
export default function useTheme(): UseThemeResult {
  const darkMode = useSettingsStore(state => state.darkMode);
  const systemScheme = useColorScheme();
  const isDark =
    darkMode === 'dark' || (darkMode === 'system' && systemScheme === 'dark');
  const theme = isDark ? colors.dark : colors.light;
  return {theme, isDark};
}
