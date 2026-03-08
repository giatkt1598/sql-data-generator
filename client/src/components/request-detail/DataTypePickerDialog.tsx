import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import type { DataTypeDefinition, TableColumnRules } from '../../models/apiModels';

interface DataTypePickerDialogProps {
  open: boolean;
  tab: number;
  customListInput: string;
  basicOptions: DataTypeDefinition[];
  personalOptions: DataTypeDefinition[];
  primaryKeyOptions: Array<{ value: string; description: string }>;
  onClose: () => void;
  onTabChange: (value: number) => void;
  onCustomListInputChange: (value: string) => void;
  onApplyRule: (rule: TableColumnRules[string][string]) => void;
  onApplyCustomList: () => void;
}

const tabGroups = [
  { label: 'Basic' },
  { label: 'Personal' },
  { label: 'Table Primary Key' },
];

export function DataTypePickerDialog(props: DataTypePickerDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="md">
      <DialogTitle>Choose Data Type</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 360 }}>
          <Tabs
            orientation="vertical"
            value={props.tab}
            onChange={(_event, value: number) => props.onTabChange(value)}
            sx={{ borderRight: 1, borderColor: 'divider', minWidth: 220 }}
          >
            {tabGroups.map((group, index) => (
              <Tab key={group.label} label={group.label} value={index} />
            ))}
          </Tabs>

          <Box sx={{ flex: 1 }}>
            {props.tab === 0 && (
              <Stack spacing={1}>
                {props.basicOptions.map((option) => (
                  <Card
                    key={option.value}
                    variant="outlined"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => props.onApplyRule({ kind: 'semantic', semanticType: option.value })}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {option.displayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.description} ({option.value})
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      customList
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Custom values separated by comma. Example: admin,user,manager
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Custom values"
                        value={props.customListInput}
                        onChange={(event) => props.onCustomListInputChange(event.target.value)}
                      />
                      <Button variant="contained" onClick={props.onApplyCustomList}>
                        Apply
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            )}

            {props.tab === 1 && (
              <Stack spacing={1}>
                {props.personalOptions.map((option) => (
                  <Card
                    key={option.value}
                    variant="outlined"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => props.onApplyRule({ kind: 'semantic', semanticType: option.value })}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {option.displayName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.description} ({option.value})
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

            {props.tab === 2 && (
              <Stack spacing={1}>
                {props.primaryKeyOptions.map((option) => (
                  <Card
                    key={option.value}
                    variant="outlined"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      const [tableName, columnName] = option.value.split('.', 2);
                      props.onApplyRule({
                        kind: 'reference',
                        reference: { tableName, columnName },
                      });
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {option.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.description}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
