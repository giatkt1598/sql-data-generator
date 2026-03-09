import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useMockDataSchemaDetailContext } from './MockDataSchemaDetailContext';

export function GeneralAccordion() {
  const context = useMockDataSchemaDetailContext();
  const sqlProviderOptions = [
    { value: 'sqlserver', label: 'SQL Server' },
    { value: 'postgres', label: 'Postgres' },
    { value: 'mysql', label: 'MySQL' },
  ] as const;

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
          <Stack direction={'row'} spacing={2}>
            <TextField
              size="small"
              sx={{ flex: 1 }}
              label="Request Name"
              value={context.form.name}
              onChange={(event) =>
                context.setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <Autocomplete
              sx={{ width: 240 }}
              size="small"
              options={sqlProviderOptions}
              value={
                sqlProviderOptions.find((option) => option.value === context.form.sqlProvider) ??
                null
              }
              onChange={(_event, value) =>
                context.setForm((prev) => ({ ...prev, sqlProvider: value?.value ?? '' }))
              }
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.value === value.value}
              renderInput={(params) => <TextField {...params} label="SQL Provider" />}
            />
            <TextField
              sx={{ width: 240 }}
              select
              size="small"
              label="Locale"
              value={context.form.locale}
              onChange={(event) =>
                context.setForm((prev) => ({ ...prev, locale: event.target.value }))
              }
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end" style={{ transform: 'translateX(-24px)' }}>
                      <Tooltip
                        arrow
                        title="Generates data using the selected locale when faker supports that dataset."
                      >
                        <IconButton edge="end" size="small">
                          <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                },
              }}
            >
              {context.supportedLocales.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Box
            sx={{ display: 'grid', alignItems: 'center', gap: 2, gridTemplateColumns: '1fr 1fr' }}
          >
            <Stack direction={'column'} gap={2}>
              <TextField
                label="Create Table SQL"
                defaultValue={context.form.schemaSql}
                multiline
                rows={12}
                onBlur={(event) =>
                  context.setForm((prev) => ({ ...prev, schemaSql: event.target.value }))
                }
              />
              <Button
                variant="outlined"
                onClick={() => void context.buildPrompt()}
                disabled={context.loading}
              >
                Build Prompt
              </Button>
            </Stack>
            <Stack direction={'column'} gap={2}>
              <TextField
                label="AI Classification JSON"
                defaultValue={context.form.classificationJson}
                multiline
                rows={12}
                onBlur={(event) =>
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
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
