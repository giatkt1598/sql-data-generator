import Editor from '@monaco-editor/react';
import { Box, Typography, useTheme } from '@mui/material';

export function MonacoEditorField(props: {
  label: string;
  language: 'sql' | 'json' | 'plaintext';
  value: string;
  onChange?: (value: string) => void;
  helperText?: string;
  height?: number;
  readOnly?: boolean;
}) {
  const { label, language, value, onChange, helperText, height = 300, readOnly = false } = props;
  const theme = useTheme();
  const isReadOnly = readOnly || !onChange;

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}
      >
        <Editor
          height={height}
          language={language}
          theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs'}
          value={value}
          onChange={isReadOnly ? undefined : (nextValue) => onChange?.(nextValue ?? '')}
          options={{
            automaticLayout: true,
            fontSize: 13,
            minimap: { enabled: false },
            readOnly: isReadOnly,
            domReadOnly: isReadOnly,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
          }}
        />
      </Box>
      {helperText && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
}
