import { Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';

interface AnalyzeConfirmDialogProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function AnalyzeConfirmDialog(props: AnalyzeConfirmDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <DialogTitle>Rebuild Schemas?</DialogTitle>
      <DialogContent>
        <Typography>
          This action will overwrite the current Schemas and Schema Relationships data.
        </Typography>
      </DialogContent>
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 3, pb: 3 }}>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button variant="contained" onClick={props.onConfirm} disabled={props.loading}>
          Continue
        </Button>
      </Stack>
    </Dialog>
  );
}
