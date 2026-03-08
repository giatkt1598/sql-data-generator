import { Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useRequestDetailContext } from './RequestDetailContext';

export function AnalyzeConfirmDialog() {
  const context = useRequestDetailContext();

  return (
    <Dialog
      open={context.analyzeConfirmOpen}
      onClose={() => context.setAnalyzeConfirmOpen(false)}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Rebuild Schemas?</DialogTitle>
      <DialogContent>
        <Typography>
          This action will overwrite the current Schemas and Schema Relationships data.
        </Typography>
      </DialogContent>
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ px: 3, pb: 3 }}>
        <Button onClick={() => context.setAnalyzeConfirmOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => {
            context.setAnalyzeConfirmOpen(false);
            void context.analyzeAndBuildSchemas();
          }}
          disabled={context.loading}
        >
          Continue
        </Button>
      </Stack>
    </Dialog>
  );
}
