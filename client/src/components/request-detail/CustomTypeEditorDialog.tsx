import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { MonacoEditorField } from './MonacoEditorField';

function countItems(text: string): number {
  return text
    .replace(/\r\n|\r|\n/g, ',')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0).length;
}

export function CustomTypeEditorDialog(props: {
  open: boolean;
  mode: 'create' | 'edit';
  name: string;
  valuesText: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onValuesChange: (value: string) => void;
  onSave: () => void | Promise<void>;
}) {
  const { open, mode, name, valuesText, onClose, onNameChange, onValuesChange, onSave } = props;
  const totalItems = countItems(valuesText);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Custom Type' : 'Edit Custom Type'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">Custom:</InputAdornment>,
            }}
          />
          <MonacoEditorField
            label="List item"
            language="plaintext"
            value={valuesText}
            height={180}
            onChange={onValuesChange}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: '0 !important' }}>
            Total item(s): {totalItems}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => void onSave()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
