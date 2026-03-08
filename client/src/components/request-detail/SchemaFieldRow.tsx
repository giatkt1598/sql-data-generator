import { memo } from 'react';
import {
  Autocomplete,
  Box,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
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
  const isNumberRule = rule?.kind === 'semantic' && rule.semanticType === 'number';
  const isDateTimeRule = rule?.kind === 'semantic' && rule.semanticType === 'dateTime';
  const isSequenceRule = rule?.kind === 'semantic' && rule.semanticType === 'sequence';
  const isDigitSequenceRule = rule?.kind === 'semantic' && rule.semanticType === 'digitSequence';
  const numberOptions = rule?.numberOptions ?? {
    min: 0,
    max: 100,
    decimals: 0,
  };
  const dateTimeOptions = rule?.dateTimeOptions ?? {
    start: '',
    end: '',
    format: 'yyyy-MM-dd',
  };
  const dateTimeFormats = ['yyyy-MM-dd', 'yyyy-MM-dd HH:mm:ss', 'dd/MM/yyyy', 'MM-dd-yyyy HH:mm'];
  const sequenceOptions = rule?.sequenceOptions ?? {
    startAt: 1,
    step: 1,
    repeat: 1,
  };
  const digitSequenceOptions = rule?.digitSequenceOptions ?? {
    format: '',
  };
  const digitSequenceHelp = [
    'Use "#" for a random digit.',
    'Use "@" for a random lower case letter.',
    'Use "^" for a random upper case letter.',
    'Use "*" for a random digit or letter.',
    'Use "$" for a random digit or lower case letter.',
    'Use "%" for a random digit or upper case letter.',
    'Any other character will be included verbatim.',
  ].join('\n');

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
      {isNumberRule && (
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            label="Min"
            type="number"
            defaultValue={numberOptions.min}
            onBlur={(event) =>
              context.onNumberOptionChange(tableName, column.name, 'min', event.target.value)
            }
            sx={{ width: 110 }}
          />
          <TextField
            size="small"
            label="Max"
            type="number"
            defaultValue={numberOptions.max}
            onBlur={(event) =>
              context.onNumberOptionChange(tableName, column.name, 'max', event.target.value)
            }
            sx={{ width: 110 }}
          />
          <TextField
            size="small"
            label="Decimals"
            type="number"
            defaultValue={numberOptions.decimals}
            onBlur={(event) =>
              context.onNumberOptionChange(tableName, column.name, 'decimals', event.target.value)
            }
            sx={{ width: 110 }}
          />
        </Stack>
      )}
      {isDateTimeRule && (
        <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
          <TextField
            size="small"
            label="Start"
            type="date"
            defaultValue={dateTimeOptions.start}
            onBlur={(event) =>
              context.onDateTimeOptionChange(tableName, column.name, 'start', event.target.value)
            }
            sx={{ width: 150 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            label="End"
            type="date"
            defaultValue={dateTimeOptions.end}
            onBlur={(event) =>
              context.onDateTimeOptionChange(tableName, column.name, 'end', event.target.value)
            }
            sx={{ width: 150 }}
            InputLabelProps={{ shrink: true }}
          />
          <Autocomplete
            freeSolo
            options={dateTimeFormats}
            defaultValue={dateTimeOptions.format}
            sx={{ minWidth: 220 }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Format"
                onBlur={(event) =>
                  context.onDateTimeOptionChange(
                    tableName,
                    column.name,
                    'format',
                    event.target.value,
                  )
                }
              />
            )}
          />
        </Stack>
      )}
      {isSequenceRule && (
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            label="Start At"
            type="number"
            defaultValue={sequenceOptions.startAt}
            onBlur={(event) =>
              context.onSequenceOptionChange(tableName, column.name, 'startAt', event.target.value)
            }
            sx={{ width: 120 }}
          />
          <TextField
            size="small"
            label="Step"
            type="number"
            defaultValue={sequenceOptions.step}
            onBlur={(event) =>
              context.onSequenceOptionChange(tableName, column.name, 'step', event.target.value)
            }
            sx={{ width: 100 }}
          />
          <TextField
            size="small"
            label="Repeat"
            type="number"
            defaultValue={sequenceOptions.repeat}
            onBlur={(event) =>
              context.onSequenceOptionChange(tableName, column.name, 'repeat', event.target.value)
            }
            sx={{ width: 100 }}
          />
        </Stack>
      )}
      {isDigitSequenceRule && (
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            label="Format"
            defaultValue={digitSequenceOptions.format}
            placeholder="example: Ticket-###-@@@"
            onBlur={(event) =>
              context.onDigitSequenceOptionChange(
                tableName,
                column.name,
                'format',
                event.target.value,
              )
            }
            sx={{ minWidth: 300 }}
            slotProps={{
              input: {
                endAdornment: (
                  <Tooltip
                    arrow
                    placement="top"
                    title={
                      <Box sx={{ whiteSpace: 'pre-line' }}>
                        <Typography variant="body2">{digitSequenceHelp}</Typography>
                      </Box>
                    }
                  >
                    <IconButton size="small">
                      <HelpOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ),
              },
            }}
          />
        </Stack>
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
