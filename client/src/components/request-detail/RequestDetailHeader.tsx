import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useRequestDetailContext } from './RequestDetailContext';

export function RequestDetailHeader() {
  const context = useRequestDetailContext();

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
        <IconButton onClick={context.handleBack}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Request: {context.requestName}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={() => void context.handlePreview()} disabled={context.loading}>
          Preview
        </Button>
        <Button
          variant="outlined"
          onClick={() => void context.handleGenerateSql()}
          disabled={context.loading}
        >
          Generate SQL
        </Button>
        <Button variant="contained" onClick={() => void context.saveDetail()} disabled={context.loading}>
          Save
        </Button>
      </Stack>
    </Box>
  );
}
