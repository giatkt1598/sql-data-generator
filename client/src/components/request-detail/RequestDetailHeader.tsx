import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface RequestDetailHeaderProps {
  projectId: string;
  requestName: string;
  loading: boolean;
  onBack: (projectId: string) => void;
  onPreview: () => void;
  onGenerateSql: () => void;
  onSave: () => void;
}

export function RequestDetailHeader(props: RequestDetailHeaderProps) {
  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        py: 1,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => props.onBack(props.projectId)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Request: {props.requestName}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={props.onPreview} disabled={props.loading}>
          Preview
        </Button>
        <Button variant="outlined" onClick={props.onGenerateSql} disabled={props.loading}>
          Generate SQL
        </Button>
        <Button variant="contained" onClick={props.onSave} disabled={props.loading}>
          Save
        </Button>
      </Stack>
    </Box>
  );
}
