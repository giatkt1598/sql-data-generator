import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface PreviewDialogProps {
  open: boolean;
  text: string;
  onClose: () => void;
  onCopy: () => void;
}

export function PreviewDialog(props: PreviewDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            SQL Preview (Full Content)
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopyIcon />}
            onClick={props.onCopy}
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
          {props.text}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
