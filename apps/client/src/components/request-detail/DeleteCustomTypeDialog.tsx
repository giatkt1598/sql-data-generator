import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

export function DeleteCustomTypeDialog(props: {
  open: boolean;
  onClose: () => void;
  onDelete: () => void | Promise<void>;
}) {
  const { open, onClose, onDelete } = props;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Delete custom type?</DialogTitle>
      <DialogContent>
        <Typography>Do you want to delete this custom type?</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={() => void onDelete()}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
