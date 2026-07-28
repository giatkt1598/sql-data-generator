import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type {
  ColumnDesignerModel,
  TableColumnOrder,
  TableColumnRules,
} from '../../models/apiModels';
import { SchemaFieldRow } from './SchemaFieldRow';

export function SchemaTableCard(props: {
  table: ColumnDesignerModel['tables'][number];
  tableIndex: number;
  columnRules: TableColumnRules;
  columnOrder: TableColumnOrder;
  dragState: { tableName: string; columnName: string } | null;
  onDragStateChange: (value: { tableName: string; columnName: string } | null) => void;
  reorderColumns: (tableName: string, fromColumnName: string, toColumnName: string) => void;
  addField: (tableName: string) => void;
  deleteField: (tableName: string, columnName: string) => void;
}) {
  const {
    table,
    tableIndex,
    columnRules,
    columnOrder,
    dragState,
    onDragStateChange,
    reorderColumns,
    addField,
    deleteField,
  } = props;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          {tableIndex + 1}.&nbsp;{table.name}
        </Typography>
        <Stack spacing={1}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ px: 0.25 }}>
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
          {(columnOrder[table.name] ?? table.columns.map((column) => column.name))
            .map((columnName) => table.columns.find((column) => column.name === columnName) ?? null)
            .filter((column): column is (typeof table.columns)[number] => Boolean(column))
            .map((column) => {
              const rule = columnRules[table.name]?.[column.name];
              const customListText =
                rule?.kind === 'customList' ? (rule.customValues ?? []).join(', ') : '';
              const fieldNameText = rule?.fieldName ?? column.name;
              const blankPercentage = rule?.blankPercentage ?? 0;
              const ruleSignature = JSON.stringify({
                kind: rule?.kind ?? 'semantic',
                fieldName: fieldNameText,
                blankPercentage,
                customValues: rule?.kind === 'customList' ? (rule.customValues ?? []) : [],
                numberOptions: rule?.numberOptions ?? {
                  min: 0,
                  max: 100,
                  decimals: 0,
                },
                dateTimeOptions: rule?.dateTimeOptions ?? {
                  start: '2024-01-01',
                  end: '2026-12-31',
                  format: 'yyyy-MM-dd HH:mm:ss',
                },
                sequenceOptions: rule?.sequenceOptions ?? {
                  startAt: 1,
                  step: 1,
                  repeat: 1,
                },
                sequenceDateTimeOptions: rule?.sequenceDateTimeOptions ?? {
                  start: '',
                  step: 1,
                  unit: 'days',
                  format: 'yyyy-MM-dd HH:mm:ss',
                },
                fixedValueOptions: rule?.fixedValueOptions ?? {
                  value: '',
                },
                digitSequenceOptions: rule?.digitSequenceOptions ?? {
                  format: '',
                },
                emailOptions: rule?.emailOptions ?? {
                  domains: [],
                },
                textOptions: rule?.textOptions ?? {
                  minLength: 1,
                  maxLength: 4,
                  unit: 'words',
                },
                semanticType:
                  rule?.kind === 'semantic' ? (rule.semanticType ?? 'unknown') : undefined,
                reference: rule?.kind === 'reference' ? rule.reference : undefined,
              });

              return (
                <SchemaFieldRow
                  key={`${table.name}.${column.name}:${ruleSignature}`}
                  tableName={table.name}
                  column={column}
                  blankPercentage={blankPercentage}
                  customListText={customListText}
                  fieldNameText={fieldNameText}
                  draggable
                  isDragging={
                    dragState?.tableName === table.name && dragState.columnName === column.name
                  }
                  onDragStart={() =>
                    onDragStateChange({ tableName: table.name, columnName: column.name })
                  }
                  onDragOver={() => {
                    if (
                      dragState &&
                      dragState.tableName === table.name &&
                      dragState.columnName !== column.name
                    ) {
                      reorderColumns(table.name, dragState.columnName, column.name);
                    }
                  }}
                  onDrop={() => onDragStateChange(null)}
                  onDragEnd={() => onDragStateChange(null)}
                  onDelete={() => deleteField(table.name, column.name)}
                />
              );
            })}
        </Stack>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => addField(table.name)}
          sx={{ mt: 1, ml: 4.5 }}
        >
          Add field
        </Button>
      </CardContent>
    </Card>
  );
}
