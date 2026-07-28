import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import type { PaletteMode } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';

const THEME_MODE_STORAGE_KEY = 'mock-data-generator.theme-mode';

function createAppTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';
  const colors = isDark
    ? {
        defaultBackground: '#040914',
        paperBackground: '#0a1529',
        primaryText: '#e6f4ff',
        secondaryText: '#8ea7c3',
        green: '#39ff88',
        greenLight: '#8cffb5',
        cardBackground: 'linear-gradient(145deg, rgba(14, 30, 55, 0.96), rgba(7, 18, 36, 0.96))',
        accordionBackground: 'rgba(10, 21, 41, 0.84)',
        dialogBackground: 'linear-gradient(145deg, #0d1d36, #071226)',
        inputBackground: 'rgba(2, 12, 27, 0.66)',
        tooltipBackground: '#0f2542',
        pageBackground:
          'radial-gradient(circle at 12% -10%, rgba(57, 255, 136, 0.16), transparent 32%), radial-gradient(circle at 90% 0%, rgba(37, 99, 235, 0.16), transparent 28%), linear-gradient(135deg, #040914 0%, #071524 52%, #05130e 100%)',
      }
    : {
        defaultBackground: '#f3faf6',
        paperBackground: '#ffffff',
        primaryText: '#102a20',
        secondaryText: '#587064',
        green: '#128a4c',
        greenLight: '#08743e',
        cardBackground:
          'linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(241, 252, 246, 0.98))',
        accordionBackground: 'rgba(255, 255, 255, 0.9)',
        dialogBackground: 'linear-gradient(145deg, #ffffff, #edf9f1)',
        inputBackground: 'rgba(255, 255, 255, 0.9)',
        tooltipBackground: '#163d2a',
        pageBackground:
          'radial-gradient(circle at 10% -10%, rgba(57, 255, 136, 0.2), transparent 30%), radial-gradient(circle at 95% 0%, rgba(96, 165, 250, 0.14), transparent 26%), linear-gradient(135deg, #f6fcf8 0%, #eef8f3 52%, #f8fcfa 100%)',
      };

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.green,
        light: colors.greenLight,
        dark: isDark ? '#16b863' : '#0b6537',
        contrastText: isDark ? '#02150b' : '#ffffff',
      },
      secondary: {
        main: '#2563eb',
        light: '#60a5fa',
        dark: '#1d4ed8',
      },
      background: {
        default: colors.defaultBackground,
        paper: colors.paperBackground,
      },
      text: {
        primary: colors.primaryText,
        secondary: colors.secondaryText,
      },
      divider: isDark ? 'rgba(57, 255, 136, 0.16)' : 'rgba(18, 138, 76, 0.16)',
      success: { main: '#16a765' },
      error: { main: '#e5484d' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily:
        "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
      button: { fontWeight: 700, letterSpacing: '0.02em', textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            colorScheme: mode,
          },
          body: {
            background: colors.pageBackground,
          },
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: isDark ? '#35556d #071426' : '#9bbdad #e8f2ec',
          },
          '*::-webkit-scrollbar': {
            width: 10,
            height: 10,
          },
          '*::-webkit-scrollbar-track': {
            backgroundColor: isDark ? '#071426' : '#e8f2ec',
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? '#35556d' : '#9bbdad',
            border: `2px solid ${isDark ? '#071426' : '#e8f2ec'}`,
            borderRadius: 999,
          },
          '*::-webkit-scrollbar-thumb:hover': {
            backgroundColor: isDark ? '#4c728d' : '#729d89',
          },
          'input[type="number"]': {
            colorScheme: mode,
          },
          'input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button':
            {
              opacity: isDark ? 0.78 : 0.68,
              cursor: 'pointer',
            },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiCard: {
        styleOverrides: {
          root: {
            background: colors.cardBackground,
            borderColor: isDark ? 'rgba(57, 255, 136, 0.16)' : 'rgba(18, 138, 76, 0.16)',
            boxShadow: isDark
              ? '0 16px 36px rgba(0, 0, 0, 0.2)'
              : '0 16px 36px rgba(23, 74, 47, 0.1)',
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            background: colors.accordionBackground,
            border: `1px solid ${isDark ? 'rgba(57, 255, 136, 0.14)' : 'rgba(18, 138, 76, 0.15)'}`,
            boxShadow: isDark
              ? '0 14px 32px rgba(0, 0, 0, 0.16)'
              : '0 12px 28px rgba(23, 74, 47, 0.08)',
            '&:before': { display: 'none' },
            '&.Mui-expanded': { margin: 0 },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: { minHeight: 56, '&.Mui-expanded': { minHeight: 56 } },
          content: { '&.Mui-expanded': { margin: '12px 0' } },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8 },
          containedPrimary: {
            boxShadow: `0 0 18px ${isDark ? 'rgba(57, 255, 136, 0.24)' : 'rgba(18, 138, 76, 0.2)'}`,
            '&:hover': {
              boxShadow: `0 0 24px ${isDark ? 'rgba(57, 255, 136, 0.38)' : 'rgba(18, 138, 76, 0.28)'}`,
            },
          },
          outlined: {
            borderColor: isDark ? 'rgba(140, 255, 181, 0.38)' : 'rgba(18, 138, 76, 0.38)',
            '&:hover': {
              borderColor: colors.green,
              backgroundColor: isDark ? 'rgba(57, 255, 136, 0.08)' : 'rgba(18, 138, 76, 0.07)',
            },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: colors.inputBackground,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(142, 167, 195, 0.34)' : 'rgba(44, 98, 70, 0.3)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(140, 255, 181, 0.62)' : 'rgba(18, 138, 76, 0.62)',
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${isDark ? 'rgba(57, 255, 136, 0.1)' : 'rgba(18, 138, 76, 0.1)'}`,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: colors.green },
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            background: colors.dialogBackground,
            border: `1px solid ${isDark ? 'rgba(57, 255, 136, 0.2)' : 'rgba(18, 138, 76, 0.18)'}`,
            boxShadow: isDark
              ? '0 24px 64px rgba(0, 0, 0, 0.55)'
              : '0 24px 64px rgba(23, 74, 47, 0.2)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: isDark ? 'rgba(142, 167, 195, 0.14)' : 'rgba(44, 98, 70, 0.12)',
          },
          head: {
            color: colors.secondaryText,
            fontWeight: 800,
            backgroundColor: isDark ? 'rgba(57, 255, 136, 0.04)' : 'rgba(18, 138, 76, 0.05)',
          },
        },
      },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 700 } } },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: colors.tooltipBackground,
            border: `1px solid ${isDark ? 'rgba(57, 255, 136, 0.24)' : 'rgba(18, 138, 76, 0.26)'}`,
          },
        },
      },
    },
  });
}

function Root() {
  const [themeMode, setThemeMode] = useState<PaletteMode>(() =>
    localStorage.getItem(THEME_MODE_STORAGE_KEY) === 'light' ? 'light' : 'dark',
  );
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  useEffect(() => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  }, [themeMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App
          themeMode={themeMode}
          onToggleThemeMode={() =>
            setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))
          }
        />
      </BrowserRouter>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
