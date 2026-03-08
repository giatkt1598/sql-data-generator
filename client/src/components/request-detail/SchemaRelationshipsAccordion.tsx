import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useRequestDetailContext } from './RequestDetailContext';

export function SchemaRelationshipsAccordion() {
  const context = useRequestDetailContext();

  return (
    <Accordion
      expanded={context.relationshipsExpanded}
      onChange={(_event, value) => context.setRelationshipsExpanded(value)}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 700 }}>Schema Relationships</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <TextField
            label="Schema Relationships JSON"
            value={context.form.schemaRelationshipsJson}
            multiline
            minRows={6}
            maxRows={12}
            onChange={(event) =>
              context.setForm((prev) => ({ ...prev, schemaRelationshipsJson: event.target.value }))
            }
            helperText="Use strict JSON array format (no comments). Default distribution is [1]."
            fullWidth
          />
          {context.relationshipEstimateSummary && (
            <Tooltip
              title={
                <Box sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>
                  {context.relationshipEstimateTooltip}
                </Box>
              }
              placement="top-start"
              arrow
            >
              <Box
                sx={{
                  display: 'inline-flex',
                  width: 'fit-content',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: context.relationshipEstimateError ? 'error.main' : 'divider',
                  backgroundColor: context.relationshipEstimateError
                    ? 'error.lighter'
                    : 'background.paper',
                  cursor: 'help',
                }}
              >
                <Typography
                  variant="body2"
                  color={context.relationshipEstimateError ? 'error.main' : 'text.secondary'}
                >
                  {context.relationshipEstimateSummary}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
