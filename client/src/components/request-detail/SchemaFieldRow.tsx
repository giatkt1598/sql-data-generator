import { memo } from 'react';
import {
  Box,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { stringifyRule } from '../../utilities/ruleUtils';
import { useRequestDetailContext } from './RequestDetailContext';
import type { ColumnDesignerModel } from '../../models/apiModels';

export const SchemaFieldRow = memo(function SchemaFieldRow(props: {
  tableName: string;
  column: ColumnDesignerModel['tables'][number]['columns'][number];
  blankPercentage: number;
  customListText: string;
  fieldNameText: string;
}) {
  const { tableName, column, blankPercentage, customListText, fieldNameText } = props;
  const context = useRequestDetailContext();
  const rule = context.columnRules[tableName]?.[column.name];
  const value = stringifyRule(context.semanticTypes, rule);

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
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
            context.onFieldNameChange(tableName, column.name, nextValue);
          }}
        />
      </Box>
      <Box width={160}>
        <Tooltip title={value} arrow placement="right">
          <Select
            size="small"
            variant="outlined"
            value={value}
            onClick={() => context.openTypePicker(tableName, column.name)}
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
            context.onCustomListValueChange(tableName, column.name, event.target.value);
          }}
        />
      )}
      <Box width={90}>
        <TextField
          label="Blank"
          size="small"
          type="number"
          defaultValue={blankPercentage}
          onBlur={(event) =>
            context.onBlankPercentageChange(tableName, column.name, event.target.value)
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
});
