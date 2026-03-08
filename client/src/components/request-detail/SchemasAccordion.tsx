import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { stringifyRule } from '../../utilities/ruleUtils';
import { tableAnchorId } from '../../utilities/schemaAnchor';
import { useRequestDetailContext } from './RequestDetailContext';

export function SchemasAccordion() {
  const context = useRequestDetailContext();
  const [blankDrafts, setBlankDrafts] = useState<Record<string, string>>({});
  const [customListDrafts, setCustomListDrafts] = useState<Record<string, string>>({});
  const [fieldNameDrafts, setFieldNameDrafts] = useState<Record<string, string>>({});

  const tableKeys = useMemo(
    () =>
      context.designerModel?.tables.flatMap((table) =>
        table.columns.map((column) => `${table.name}.${column.name}`),
      ) ?? [],
    [context.designerModel],
  );

  useEffect(() => {
    const nextBlankDrafts: Record<string, string> = {};
    const nextCustomListDrafts: Record<string, string> = {};
    const nextFieldNameDrafts: Record<string, string> = {};

    for (const key of tableKeys) {
      const [tableName, columnName] = key.split('.', 2);
      const rule = context.columnRules[tableName]?.[columnName];
      nextBlankDrafts[key] = String(rule?.blankPercentage ?? 0);
      nextCustomListDrafts[key] =
        rule?.kind === 'customList' ? (rule.customValues ?? []).join(', ') : '';
      nextFieldNameDrafts[key] = rule?.fieldName ?? columnName;
    }

    setBlankDrafts(nextBlankDrafts);
    setCustomListDrafts(nextCustomListDrafts);
    setFieldNameDrafts(nextFieldNameDrafts);
  }, [context.columnRules, tableKeys]);

  return (
    <Accordion
      expanded={context.schemasExpanded}
      onChange={(_event, value) => context.setSchemasExpanded(value)}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 700 }}>Schemas</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {!context.designerModel && (
          <Typography color="text.secondary">
            No schemas yet. Click "Analyze & Build Schemas" in General.
          </Typography>
        )}
        {context.designerModel && (
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack spacing={1.5}>
                {context.designerModel.tables.map((table) => (
                  <Card key={table.name} id={tableAnchorId(table.name)} variant="outlined">
                    <CardContent>
                      <Typography sx={{ fontWeight: 700, mb: 1 }}>{table.name}</Typography>
                      <Stack spacing={1}>
                        <Stack
                          direction={{ xs: 'column', md: 'row' }}
                          spacing={1}
                          sx={{ px: 0.25 }}
                        >
                          <Box sx={{ width: 28 }} />
                          <Typography
                            variant="caption"
                            sx={{ minWidth: 160, fontWeight: 700, color: 'text.secondary' }}
                          >
                            Field Name
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              width: { xs: '100%', md: 160 },
                              fontWeight: 700,
                              color: 'text.secondary',
                            }}
                          >
                            Type
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ flex: 1, fontWeight: 700, color: 'text.secondary' }}
                          >
                            Options
                          </Typography>
                        </Stack>
                        {table.columns.map((column) => {
                          const fieldKey = `${table.name}.${column.name}`;
                          const rule = context.columnRules[table.name]?.[column.name];

                          const value = stringifyRule(context.semanticTypes, rule);
                          const blankPercentage =
                            blankDrafts[fieldKey] ?? String(rule?.blankPercentage ?? 0);
                          const customListText = customListDrafts[fieldKey] ?? '';
                          const fieldNameText = fieldNameDrafts[fieldKey] ?? column.name;
                          return (
                            <Stack
                              key={`${table.name}.${column.name}`}
                              direction={{ xs: 'column', md: 'row' }}
                              spacing={1}
                              alignItems={{ md: 'center' }}
                            >
                              <Box
                                sx={{
                                  width: 28,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'text.secondary',
                                }}
                              >
                                <DragIndicatorIcon fontSize="small" />
                              </Box>
                              <Box sx={{ width: 160 }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  defaultValue={fieldNameText}
                                  onBlur={(event) => {
                                    const nextValue = event.target.value.trim() || column.name;
                                    setFieldNameDrafts((prev) => ({
                                      ...prev,
                                      [fieldKey]: nextValue,
                                    }));
                                    context.onFieldNameChange(table.name, column.name, nextValue);
                                  }}
                                />
                              </Box>
                              <Box width={160}>
                                <Tooltip title={value} arrow placement="right">
                                  <Select
                                    size="small"
                                    variant="outlined"
                                    value={value}
                                    onClick={() => context.openTypePicker(table.name, column.name)}
                                    fullWidth
                                    readOnly
                                  >
                                    <MenuItem value={value}>{value}</MenuItem>
                                  </Select>
                                </Tooltip>
                              </Box>
                              {rule?.kind === 'customList' && (
                                <TextField
                                  sx={{ flex: 1 }}
                                  size="small"
                                  defaultValue={customListText}
                                  placeholder="item 1, item 2, item 3"
                                  onBlur={(event) => {
                                    setCustomListDrafts((prev) => ({
                                      ...prev,
                                      [fieldKey]: event.target.value,
                                    }));
                                    context.onCustomListValueChange(
                                      table.name,
                                      column.name,
                                      event.target.value,
                                    );
                                  }}
                                />
                              )}
                              <Box width={90}>
                                <TextField
                                  label="Blank"
                                  size="small"
                                  type="number"
                                  value={blankPercentage}
                                  onChange={(event) =>
                                    setBlankDrafts((prev) => ({
                                      ...prev,
                                      [fieldKey]: event.target.value,
                                    }))
                                  }
                                  onBlur={(event) =>
                                    context.onBlankPercentageChange(
                                      table.name,
                                      column.name,
                                      event.target.value,
                                    )
                                  }
                                  slotProps={{
                                    htmlInput: { min: 0, max: 100 },
                                    input: {
                                      endAdornment: (
                                        <Typography variant="body2" color="text.secondary">
                                          %
                                        </Typography>
                                      ),
                                    },
                                  }}
                                  sx={{ width: 90 }}
                                />
                              </Box>
                            </Stack>
                          );
                        })}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>

            <Card
              variant="outlined"
              sx={{
                width: { xs: '100%', lg: 260 },
                position: { lg: 'sticky' },
                top: { lg: 84 },
                alignSelf: { lg: 'flex-start' },
              }}
            >
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Table Index
                </Typography>
                <Stack spacing={0.5}>
                  {context.designerModel.tables.map((table) => (
                    <Button
                      key={`toc-${table.name}`}
                      size="small"
                      sx={{ justifyContent: 'flex-start' }}
                      onClick={() => {
                        document
                          .getElementById(tableAnchorId(table.name))
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      {table.name}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
