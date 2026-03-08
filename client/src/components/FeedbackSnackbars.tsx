import { Alert, Snackbar } from '@mui/material';

interface FeedbackSnackbarsProps {
  snack: string;
  error: string;
  onCloseSnack: () => void;
  onCloseError: () => void;
}

export function FeedbackSnackbars(props: FeedbackSnackbarsProps) {
  return (
    <>
      <Snackbar
        open={Boolean(props.snack)}
        autoHideDuration={3500}
        onClose={props.onCloseSnack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={props.onCloseSnack}>
          {props.snack}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(props.error)}
        autoHideDuration={3500}
        onClose={props.onCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={props.onCloseError}>
          {props.error}
        </Alert>
      </Snackbar>
    </>
  );
}
