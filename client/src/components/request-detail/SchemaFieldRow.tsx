import { memo } from 'react';
import type { ClipboardEvent, ReactNode } from 'react';
import {
  Autocomplete,
  Box,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { stringifyRule } from '../../utilities/ruleUtils';
import { useMockDataSchemaDetailContext } from './MockDataSchemaDetailContext';
import type { ColumnDesignerModel } from '../../models/apiModels';

function normalizeCustomListPaste(value: string): string {
  return value
    .replace(/\r\n|\r|\n/g, ',')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join(', ');
}

function applyNormalizedPasteToInput(input: HTMLInputElement, normalizedValue: string) {
  const selectionStart = input.selectionStart ?? input.value.length;
  const selectionEnd = input.selectionEnd ?? input.value.length;
  const currentValue = input.value;
  const prefix = currentValue.slice(0, selectionStart);
  const suffix = currentValue.slice(selectionEnd);
  const separatorBefore = prefix.trim().length > 0 && !prefix.trimEnd().endsWith(',') ? ', ' : '';
  const separatorAfter =
    suffix.trim().length > 0 && !suffix.trimStart().startsWith(',') ? ', ' : '';

  input.value = `${prefix}${separatorBefore}${normalizedValue}${separatorAfter}${suffix}`;
}

function handleCommaSeparatedPaste(event: ClipboardEvent<HTMLDivElement>) {
  const clipboardText = event.clipboardData.getData('text');
  const normalizedValue = normalizeCustomListPaste(clipboardText);
  if (!normalizedValue) {
    return;
  }

  event.preventDefault();

  const input = event.currentTarget.querySelector('input');
  if (!input) {
    return;
  }

  applyNormalizedPasteToInput(input, normalizedValue);
}

function buildHelpAdornment(content: ReactNode) {
  return (
    <Tooltip arrow placement="top" title={<Box sx={{ whiteSpace: 'pre-line' }}>{content}</Box>}>
      <IconButton size="small">
        <HelpOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

export const SchemaFieldRow = memo(function SchemaFieldRow(props: {
  tableName: string;
  column: ColumnDesignerModel['tables'][number]['columns'][number];
  blankPercentage: number;
  customListText: string;
  fieldNameText: string;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}) {
  const {
    tableName,
    column,
    blankPercentage,
    customListText,
    fieldNameText,
    draggable,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragging,
  } = props;
  const context = useMockDataSchemaDetailContext();
  const rule = context.columnRules[tableName]?.[column.name];
  const value = stringifyRule(context.semanticTypes, context.customListTypes, rule);
  const isNumberRule = rule?.kind === 'semantic' && rule.semanticType === 'number';
  const isDateTimeRule = rule?.kind === 'semantic' && rule.semanticType === 'dateTime';
  const isTimeRule = rule?.kind === 'semantic' && rule.semanticType === 'time';
  const isSequenceRule = rule?.kind === 'semantic' && rule.semanticType === 'sequence';
  const isDigitSequenceRule = rule?.kind === 'semantic' && rule.semanticType === 'digitSequence';
  const isFormulaRule = rule?.kind === 'semantic' && rule.semanticType === 'formula';
  const isRegularExpressionRule =
    rule?.kind === 'semantic' && rule.semanticType === 'regularExpression';
  const isEmailRule = rule?.kind === 'semantic' && rule.semanticType === 'email';
  const isTextRule = rule?.kind === 'semantic' && rule.semanticType === 'text';
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
  const timeOptions = rule?.timeOptions ?? {
    from: '00:00',
    to: '23:59',
    format: 'HH:mm:ss',
  };
  const dateTimeFormats = ['yyyy-MM-dd', 'yyyy-MM-dd HH:mm:ss', 'dd/MM/yyyy', 'MM-dd-yyyy HH:mm'];
  const timeFormats = ['HH:mm', 'HH:mm:ss', 'hh:mm A'];
  const sequenceOptions = rule?.sequenceOptions ?? {
    startAt: 1,
    step: 1,
    repeat: 1,
  };
  const digitSequenceOptions = rule?.digitSequenceOptions ?? {
    format: '',
  };
  const formulaOptions = rule?.formulaOptions ?? {
    expression: '',
  };
  const regularExpressionOptions = rule?.regularExpressionOptions ?? {
    pattern: '',
  };
  const emailOptions = rule?.emailOptions ?? {
    domains: [],
  };
  const textOptions = rule?.textOptions ?? {
    minLength: 1,
    maxLength: 4,
    unit: 'words' as const,
  };
  const digitSequenceHelp = [
    'Use "{column_name}" to reuse another column in the same row.',
    'Use "\\@" to keep @ as a literal character.',
    'Use "#" for a random digit.',
    'Use "@" for a random lower case letter.',
    'Use "^" for a random upper case letter.',
    'Use "*" for a random digit or letter.',
    'Use "$" for a random digit or lower case letter.',
    'Use "%" for a random digit or upper case letter.',
    'Any other character will be included verbatim.',
  ].join('\n');
  const formulaHelp = [
    'Use column names directly.',
    'Example: quantity * unit_price',
    'Allowed: numbers, column names, +, -, *, /, %, ().',
    'Referenced columns must be numeric.',
    'Looped dependencies will throw an error.',
  ].join('\n');
  const regularExpressionHelp = [
    'Use JavaScript regex syntax.',
    'Example: [A-Z]{3}-\\d{4}',
    'Generated with randexp.',
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
        <IconButton
          size="small"
          draggable={draggable}
          onDragStart={onDragStart}
          onDragOver={(event) => {
            event.preventDefault();
            onDragOver?.();
          }}
          onDrop={(event) => {
            event.preventDefault();
            onDrop?.();
          }}
          onDragEnd={onDragEnd}
          sx={{
            cursor: draggable ? 'grab' : 'default',
            opacity: isDragging ? 0.35 : 1,
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
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
          onPaste={handleCommaSeparatedPaste}
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
        <Stack direction="row" spacing={1}>
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
            placeholder="example: {first_name}+##\\@gmail.com"
            onBlur={(event) =>
              context.onDigitSequenceOptionChange(
                tableName,
                column.name,
                'format',
                event.target.value,
              )
            }
            sx={{ minWidth: 346 }}
            slotProps={{
              input: {
                endAdornment: buildHelpAdornment(
                  <Typography variant="body2">{digitSequenceHelp}</Typography>,
                ),
              },
            }}
          />
        </Stack>
      )}
      {isFormulaRule && (
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            label="Expression"
            defaultValue={formulaOptions.expression}
            placeholder="example: quantity * unit_price"
            onBlur={(event) =>
              context.onFormulaOptionChange(
                tableName,
                column.name,
                'expression',
                event.target.value,
              )
            }
            sx={{ minWidth: 320 }}
            slotProps={{
              input: {
                endAdornment: buildHelpAdornment(
                  <Typography variant="body2">{formulaHelp}</Typography>,
                ),
              },
            }}
          />
        </Stack>
      )}
      {isTimeRule && (
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            label="From"
            type="time"
            defaultValue={timeOptions.from}
            onBlur={(event) =>
              context.onTimeOptionChange(tableName, column.name, 'from', event.target.value)
            }
            sx={{ width: 150 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            label="To"
            type="time"
            defaultValue={timeOptions.to}
            onBlur={(event) =>
              context.onTimeOptionChange(tableName, column.name, 'to', event.target.value)
            }
            sx={{ width: 150 }}
            InputLabelProps={{ shrink: true }}
          />
          <Autocomplete
            freeSolo
            options={timeFormats}
            defaultValue={timeOptions.format}
            sx={{ minWidth: 220 }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Format"
                onBlur={(event) =>
                  context.onTimeOptionChange(tableName, column.name, 'format', event.target.value)
                }
              />
            )}
          />
        </Stack>
      )}
      {isRegularExpressionRule && (
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            label="Pattern"
            defaultValue={regularExpressionOptions.pattern}
            placeholder="example: [A-Z]{3}-\\d{4}"
            onBlur={(event) =>
              context.onRegularExpressionOptionChange(
                tableName,
                column.name,
                'pattern',
                event.target.value,
              )
            }
            sx={{ minWidth: 320 }}
            slotProps={{
              input: {
                endAdornment: buildHelpAdornment(
                  <Typography variant="body2">{regularExpressionHelp}</Typography>,
                ),
              },
            }}
          />
        </Stack>
      )}
      {isEmailRule && (
        <TextField
          size="small"
          label="Domains"
          defaultValue={(emailOptions.domains ?? []).join(', ')}
          placeholder="example: outlook.com, gmail.com"
          onPaste={handleCommaSeparatedPaste}
          onBlur={(event) =>
            context.onEmailOptionChange(tableName, column.name, 'domains', event.target.value)
          }
          sx={{ minWidth: 300 }}
        />
      )}
      {isTextRule && (
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Min Length"
            type="number"
            defaultValue={textOptions.minLength}
            onBlur={(event) =>
              context.onTextOptionChange(tableName, column.name, 'minLength', event.target.value)
            }
            sx={{ width: 110 }}
          />
          <TextField
            size="small"
            label="Max Length"
            type="number"
            defaultValue={textOptions.maxLength}
            onBlur={(event) =>
              context.onTextOptionChange(tableName, column.name, 'maxLength', event.target.value)
            }
            sx={{ width: 110 }}
          />
          <FormControl>
            <RadioGroup
              row
              defaultValue={textOptions.unit}
              onChange={() => undefined}
              onBlur={(event) => {
                const target = event.target as HTMLInputElement;
                context.onTextOptionChange(tableName, column.name, 'unit', target.value);
              }}
            >
              <FormControlLabel value="words" control={<Radio size="small" />} label="Words" />
              <FormControlLabel
                value="characters"
                control={<Radio size="small" />}
                label="Characters"
              />
            </RadioGroup>
          </FormControl>
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
