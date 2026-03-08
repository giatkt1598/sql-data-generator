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
import type { RequestDetailForm } from './types';

interface GeneralAccordionProps {
  expanded: boolean;
  loading: boolean;
  form: RequestDetailForm;
  schemaFocused: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onFormChange: (updater: (prev: RequestDetailForm) => RequestDetailForm) => void;
  onSchemaFocusChange: (focused: boolean) => void;
  onBuildPrompt: () => void;
  onAnalyze: () => void;
}

export function GeneralAccordion(props: GeneralAccordionProps) {
  return (
    <Accordion
      expanded={props.expanded}
      onChange={(_event, value) => props.onExpandedChange(value)}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 700 }}>General</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <TextField
            label="Request Name"
            value={props.form.name}
            onChange={(event) =>
              props.onFormChange((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <TextField
            label="Create Table SQL"
            value={props.form.schemaSql}
            multiline
            minRows={props.schemaFocused ? 20 : 6}
            maxRows={20}
            onFocus={() => props.onSchemaFocusChange(true)}
            onBlur={() => props.onSchemaFocusChange(false)}
            onChange={(event) =>
              props.onFormChange((prev) => ({ ...prev, schemaSql: event.target.value }))
            }
          />
          <Button variant="outlined" onClick={props.onBuildPrompt} disabled={props.loading}>
            Build Prompt
          </Button>
          <TextField
            label="AI Classification JSON"
            value={props.form.classificationJson}
            multiline
            minRows={6}
            maxRows={6}
            onChange={(event) =>
              props.onFormChange((prev) => ({ ...prev, classificationJson: event.target.value }))
            }
          />
          <Button variant="contained" onClick={props.onAnalyze} disabled={props.loading}>
            Analyze & Build Schemas
          </Button>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
