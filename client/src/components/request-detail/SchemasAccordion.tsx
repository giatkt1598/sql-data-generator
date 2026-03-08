/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
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
      nextFieldNameDrafts[key] = columnName;
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
                            sx={{ minWidth: 200, fontWeight: 700, color: 'text.secondary' }}
                          >
                            Field Name
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              width: { xs: '100%', md: 220 },
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
                          <Typography
                            variant="caption"
                            sx={{
                              width: { xs: '100%', md: 110 },
                              fontWeight: 700,
                              color: 'text.secondary',
                            }}
                          >
                            Blank
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
                              <Box sx={{ minWidth: 200 }}>
                                <TextField
                                  size="small"
                                  fullWidth
                                  defaultValue={fieldNameText}
                                  onBlur={(event) =>
                                    setFieldNameDrafts((prev) => ({
                                      ...prev,
                                      [fieldKey]: event.target.value.trim() || column.name,
                                    }))
                                  }
                                />
                              </Box>
                              <Button
                                variant="outlined"
                                onClick={() => context.openTypePicker(table.name, column.name)}
                                endIcon={<KeyboardArrowDownIcon />}
                                sx={{
                                  width: { xs: '100%', md: 220 },
                                  justifyContent: 'space-between',
                                  textTransform: 'none',
                                  color: 'text.primary',
                                  borderColor: 'divider',
                                  backgroundColor: 'background.paper',
                                  px: 1.5,
                                  py: 1.05,
                                }}
                              >
                                {value}
                              </Button>
                              {rule?.kind === 'customList' ? (
                                <TextField
                                  size="small"
                                  fullWidth
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
                              ) : (
                                <Box sx={{ flex: 1, minHeight: 40 }} />
                              )}
                              <TextField
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
                                inputProps={{ min: 0, max: 100 }}
                                sx={{ width: { xs: '100%', md: 110 } }}
                                InputProps={{
                                  endAdornment: (
                                    <Typography variant="body2" color="text.secondary">
                                      %
                                    </Typography>
                                  ),
                                }}
                              />
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
