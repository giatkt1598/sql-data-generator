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
import { useEffect, useRef, useState } from 'react';
import { estimateRelationshipRows } from '../../utilities/relationshipEstimate';
import { useRequestDetailContext } from './RequestDetailContext';

export function SchemaRelationshipsAccordion() {
  const context = useRequestDetailContext();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [estimate, setEstimate] = useState(() =>
    estimateRelationshipRows(context.form.schemaRelationshipsJson, context.designerModel),
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    if (textarea.value !== context.form.schemaRelationshipsJson) {
      textarea.value = context.form.schemaRelationshipsJson;
    }
  }, [context.form.schemaRelationshipsJson]);

  useEffect(() => {
    const calculateEstimate = () => {
      setEstimate(
        estimateRelationshipRows(textareaRef.current?.value ?? '', context.designerModel),
      );
    };

    calculateEstimate();
    const intervalId = window.setInterval(calculateEstimate, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [context.designerModel]);

  const estimateTooltip = estimate
    ? estimate.error
      ? estimate.error
      : estimate.overflow
        ? 'Estimated rows exceeded 9999999. Estimation stopped early.'
        : Object.entries(estimate.rowCountByTable)
            .sort((left, right) => right[1] - left[1])
            .map(([tableName, rowCount]) => `${tableName}: ${rowCount.toLocaleString()} rows`)
            .join('\n')
    : '';

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
            defaultValue={context.form.schemaRelationshipsJson}
            multiline
            minRows={6}
            maxRows={12}
            inputRef={textareaRef}
            onBlur={(event) =>
              context.setForm((prev) => ({ ...prev, schemaRelationshipsJson: event.target.value }))
            }
            helperText="Use strict JSON array format (no comments). Default distribution is [1]."
            fullWidth
          />
          {estimate?.summary && (
            <Tooltip
              title={<Box sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{estimateTooltip}</Box>}
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
                  borderColor: estimate.error || estimate.overflow ? 'error.main' : 'divider',
                  backgroundColor:
                    estimate.error || estimate.overflow ? 'error.lighter' : 'background.paper',
                  cursor: 'help',
                }}
              >
                <Typography
                  variant="body2"
                  color={estimate.error || estimate.overflow ? 'error.main' : 'text.secondary'}
                >
                  {estimate.summary}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
