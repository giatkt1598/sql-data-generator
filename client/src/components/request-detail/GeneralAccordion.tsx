import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useRequestDetailContext } from './RequestDetailContext';

export function GeneralAccordion() {
  const context = useRequestDetailContext();

  return (
    <Accordion
      expanded={context.generalExpanded}
      onChange={(_event, value) => context.setGeneralExpanded(value)}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 700 }}>General</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <TextField
            label="Request Name"
            value={context.form.name}
            onChange={(event) =>
              context.setForm((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <TextField
            label="Create Table SQL"
            value={context.form.schemaSql}
            multiline
            minRows={context.schemaFocused ? 20 : 6}
            maxRows={20}
            onFocus={() => context.setSchemaFocused(true)}
            onBlur={() => context.setSchemaFocused(false)}
            onChange={(event) =>
              context.setForm((prev) => ({ ...prev, schemaSql: event.target.value }))
            }
          />
          <Button variant="outlined" onClick={() => void context.buildPrompt()} disabled={context.loading}>
            Build Prompt
          </Button>
          <TextField
            label="AI Classification JSON"
            value={context.form.classificationJson}
            multiline
            minRows={6}
            maxRows={6}
            onChange={(event) =>
              context.setForm((prev) => ({ ...prev, classificationJson: event.target.value }))
            }
          />
          <Button
            variant="contained"
            onClick={() => context.setAnalyzeConfirmOpen(true)}
            disabled={context.loading}
          >
            Analyze & Build Schemas
          </Button>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
