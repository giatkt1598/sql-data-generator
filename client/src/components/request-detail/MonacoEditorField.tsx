import Editor from '@monaco-editor/react';
import { Box, Typography } from '@mui/material';

export function MonacoEditorField(props: {
  label: string;
  language: 'sql' | 'json' | 'plaintext';
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
  height?: number;
}) {
  const { label, language, value, onChange, helperText, height = 300 } = props;

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 0.5, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
        <Editor
          height={height}
          language={language}
          theme="vs"
          value={value}
          onChange={(nextValue) => onChange(nextValue ?? '')}
          options={{
            automaticLayout: true,
            fontSize: 13,
            minimap: { enabled: false },
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
