import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useRequestDetailContext } from './RequestDetailContext';

export function PreviewDialog() {
  const context = useRequestDetailContext();

  return (
    <Dialog open={context.previewOpen} onClose={() => context.setPreviewOpen(false)} fullWidth maxWidth="lg">
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            SQL Preview (Full Content)
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={() => void context.handleCopyPreview()}
          >
            Copy
          </Button>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Box
          component="pre"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: 13,
            p: 1,
            backgroundColor: '#f5f5f5',
            borderRadius: 1,
            maxHeight: 650,
            overflow: 'auto',
          }}
        >
          {context.previewText}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
