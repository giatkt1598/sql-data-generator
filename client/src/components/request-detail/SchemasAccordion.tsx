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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { ColumnDesignerModel, TableColumnRules } from '../../models/apiModels';
import { stringifyRule } from '../../utilities/ruleUtils';
import { tableAnchorId } from '../../utilities/schemaAnchor';

interface SchemasAccordionProps {
  expanded: boolean;
  designerModel: ColumnDesignerModel | null;
  columnRules: TableColumnRules;
  onExpandedChange: (expanded: boolean) => void;
  onOpenTypePicker: (tableName: string, columnName: string) => void;
  onBlankPercentageChange: (tableName: string, columnName: string, value: string) => void;
}

export function SchemasAccordion(props: SchemasAccordionProps) {
  return (
    <Accordion expanded={props.expanded} onChange={(_event, value) => props.onExpandedChange(value)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography sx={{ fontWeight: 700 }}>Schemas</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {!props.designerModel && (
          <Typography color="text.secondary">
            No schemas yet. Click "Analyze & Build Schemas" in General.
          </Typography>
        )}
        {props.designerModel && (
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack spacing={1.5}>
                {props.designerModel.tables.map((table) => (
                  <Card key={table.name} id={tableAnchorId(table.name)} variant="outlined">
                    <CardContent>
                      <Typography sx={{ fontWeight: 700, mb: 1 }}>{table.name}</Typography>
                      <Stack spacing={1}>
                        {table.columns.map((column) => {
                          const value = stringifyRule(props.columnRules[table.name]?.[column.name]);
                          const blankPercentage =
                            props.columnRules[table.name]?.[column.name]?.blankPercentage ?? 0;
                          return (
                            <Stack
                              key={`${table.name}.${column.name}`}
                              direction={{ xs: 'column', md: 'row' }}
                              spacing={1}
                              alignItems={{ md: 'center' }}
                            >
                              <Box sx={{ minWidth: 240 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {column.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {column.dbType}
                                </Typography>
                              </Box>
                              <Button
                                variant="outlined"
                                onClick={() => props.onOpenTypePicker(table.name, column.name)}
                                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                              >
                                {value}
                              </Button>
                              <TextField
                                label="Blank (%)"
                                size="small"
                                type="number"
                                value={blankPercentage}
                                onChange={(event) =>
                                  props.onBlankPercentageChange(
                                    table.name,
                                    column.name,
                                    event.target.value,
                                  )
                                }
                                inputProps={{ min: 0, max: 100 }}
                                sx={{ width: { xs: '100%', md: 130 } }}
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
                  {props.designerModel.tables.map((table) => (
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
