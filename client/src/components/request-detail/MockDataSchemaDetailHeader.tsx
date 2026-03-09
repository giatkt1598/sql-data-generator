import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMockDataSchemaDetailContext } from './MockDataSchemaDetailContext';

export function MockDataSchemaDetailHeader() {
  const context = useMockDataSchemaDetailContext();

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
          Mock Data Schema: {context.requestName}
          {context.hasUnsavedChanges ? (
            <Typography variant="body1" display={'inline'}>
              <i>{' (Unsaved changes)'}</i>
            </Typography>
          ) : (
            ''
          )}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          onClick={() => void context.handlePreview()}
          disabled={context.loading}
        >
          Preview
        </Button>
        <Button
          variant="outlined"
          onClick={() => void context.handleGenerateSql()}
          disabled={context.loading}
        >
          Generate SQL
        </Button>
        <Button
          variant="contained"
          onClick={() => void context.saveDetail()}
          disabled={context.loading}
        >
          Save
        </Button>
      </Stack>
    </Box>
  );
}
