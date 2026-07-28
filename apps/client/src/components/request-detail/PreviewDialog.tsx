import { Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useState } from 'react';
import { useMockDataSchemaDetailContext } from './MockDataSchemaDetailContext';
import { MonacoEditorField } from './MonacoEditorField';

export function PreviewDialog() {
  const context = useMockDataSchemaDetailContext();
  const [copied, setCopied] = useState(false);
  const [prevOpen, setPrevOpen] = useState(context.previewOpen);

  if (context.previewOpen !== prevOpen) {
    setPrevOpen(context.previewOpen);
    if (!context.previewOpen) {
      setCopied(false);
    }
  }

  async function handleCopy() {
    await context.handleCopyPreview();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog
      open={context.previewOpen}
      onClose={() => context.setPreviewOpen(false)}
      fullWidth
      maxWidth="lg"
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            SQL Preview
          </Typography>
          {!context.previewTooLarge && (
            <Button
              variant="outlined"
              size="small"
              startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
              onClick={() => void handleCopy()}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          )}
        </Stack>
      </DialogTitle>
      <DialogContent>
        {context.previewTooLarge ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={2}
            sx={{ minHeight: 420, textAlign: 'center' }}
          >
            <Typography variant="h6">Preview is unavailable for large generated data.</Typography>
            <Typography variant="body2" color="text.secondary">
              Download the SQL file instead.
            </Typography>
            <Button variant="contained" onClick={() => void context.handleGenerateSql()}>
              Download SQL
            </Button>
          </Stack>
        ) : (
          <MonacoEditorField
            label="Generated SQL"
            language="sql"
            value={context.previewText}
            height={620}
            readOnly
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
