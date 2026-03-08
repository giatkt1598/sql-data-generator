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

interface SchemaRelationshipsAccordionProps {
  expanded: boolean;
  value: string;
  estimateSummary?: string;
  estimateTooltip?: string;
  estimateError?: string;
  onExpandedChange: (expanded: boolean) => void;
  onChange: (value: string) => void;
}

export function SchemaRelationshipsAccordion(props: SchemaRelationshipsAccordionProps) {
  return (
    <Accordion
      expanded={props.expanded}
      onChange={(_event, value) => props.onExpandedChange(value)}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 700 }}>Schema Relationships</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          <TextField
            label="Schema Relationships JSON"
            value={props.value}
            multiline
            minRows={10}
            maxRows={20}
            onChange={(event) => props.onChange(event.target.value)}
            helperText='Use strict JSON array format (no comments). Default distribution is [1].'
            fullWidth
          />
          {props.estimateSummary && (
            <Tooltip
              title={
                <Box sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>
                  {props.estimateTooltip}
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
                  borderColor: props.estimateError ? 'error.main' : 'divider',
                  backgroundColor: props.estimateError ? 'error.lighter' : 'background.paper',
                  cursor: 'help',
                }}
              >
                <Typography
                  variant="body2"
                  color={props.estimateError ? 'error.main' : 'text.secondary'}
                >
                  {props.estimateSummary}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
