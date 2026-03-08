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
import { useRequestDetailContext } from './RequestDetailContext';

const tabGroups = [{ label: 'Basic' }, { label: 'Personal' }, { label: 'Table Primary Key' }];

export function DataTypePickerDialog() {
  const context = useRequestDetailContext();

  return (
    <Dialog
      open={context.typePickerOpen}
      onClose={() => context.setTypePickerOpen(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Choose Data Type</DialogTitle>
      <DialogContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ minHeight: 360 }}>
          <Tabs
            orientation="vertical"
            value={context.typePickerTab}
            onChange={(_event, value: number) => context.setTypePickerTab(value)}
            sx={{ borderRight: 1, borderColor: 'divider', minWidth: 220 }}
          >
            {tabGroups.map((group, index) => (
              <Tab key={group.label} label={group.label} value={index} />
            ))}
          </Tabs>

          <Box sx={{ flex: 1 }}>
            {context.typePickerTab === 0 && (
              <Stack spacing={1}>
                {context.basicOptions.map((option) => (
                  <Card
                    key={option.value}
                    variant="outlined"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => context.applyRule({ kind: 'semantic', semanticType: option.value })}
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
                        value={context.customListInput}
                        onChange={(event) => context.setCustomListInput(event.target.value)}
                      />
                      <Button variant="contained" onClick={context.applyCustomListRule}>
                        Apply
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            )}

            {context.typePickerTab === 1 && (
              <Stack spacing={1}>
                {context.personalOptions.map((option) => (
                  <Card
                    key={option.value}
                    variant="outlined"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => context.applyRule({ kind: 'semantic', semanticType: option.value })}
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

            {context.typePickerTab === 2 && (
              <Stack spacing={1}>
                {context.primaryKeyOptions.map((option) => (
                  <Card
                    key={option.value}
                    variant="outlined"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      const [tableName, columnName] = option.value.split('.', 2);
                      context.applyRule({
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
