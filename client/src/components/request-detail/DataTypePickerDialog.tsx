import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useRequestDetailContext } from './RequestDetailContext';
import type { DataTypeDefinition, DataTypeGroup } from '../../models/apiModels';

type PickerItem =
  {
    key: string;
    group: DataTypeGroup;
    title: string;
    subtitle: string;
    sample: string;
    onClick: () => void;
  };

const GROUPS = ['All', 'Basic', 'Personal', 'Table Primary Key'] as const;
type GroupName = (typeof GROUPS)[number];

function buildSample(item: DataTypeDefinition): string {
  if (item.value === 'customList') {
    return 'item1,item2,item3';
  }

  return item.value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\./g, ' / ')
    .replace(/^./, (char) => char.toUpperCase());
}

export function DataTypePickerDialog() {
  const context = useRequestDetailContext();
  const [selectedGroup, setSelectedGroup] = useState<GroupName>('All');
  const [searchText, setSearchText] = useState('');

  const items = useMemo<PickerItem[]>(() => {
    const semanticItems: PickerItem[] = context.semanticTypes.map((option) => ({
      key: option.value,
      group: option.group,
      title: option.displayName,
      subtitle: option.description,
      sample: buildSample(option),
      onClick: () => {
        if (option.value === 'customList') {
          context.applyCustomListRule();
          return;
        }

        context.applyRule({ kind: 'semantic', semanticType: option.value });
      },
    }));

    const primaryKeyItems: PickerItem[] = context.primaryKeyOptions.map((option) => ({
      key: option.value,
      group: 'Table Primary Key',
      title: option.value,
      subtitle: option.description,
      sample: 'Reference existing primary key',
      onClick: () => {
        const [tableName, columnName] = option.value.split('.', 2);
        context.applyRule({
          kind: 'reference',
          reference: { tableName, columnName },
        });
      },
    }));

    return [...semanticItems, ...primaryKeyItems];
  }, [context]);

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return items.filter((item) => {
      const matchesGroup = selectedGroup === 'All' || item.group === selectedGroup;
      if (!matchesGroup) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return [item.title, item.subtitle, item.sample, item.group]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [items, searchText, selectedGroup]);

  const countsByGroup = useMemo(() => {
    const counts = new Map<GroupName, number>([
      ['All', items.length],
      ['Basic', 0],
      ['Personal', 0],
      ['Table Primary Key', 0],
    ]);

    for (const item of items) {
      counts.set(item.group, (counts.get(item.group) ?? 0) + 1);
    }

    return counts;
  }, [items]);

  return (
    <Dialog
      open={context.typePickerOpen}
      onClose={() => context.setTypePickerOpen(false)}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          backgroundColor: '#2f2f2f',
          color: '#f5f5f5',
          minHeight: 620,
        },
      }}
    >
      <DialogTitle sx={{ px: 0, py: 0 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 3,
            py: 2,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            backgroundColor: '#262626',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Choose a Type
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              placeholder="Find Type..."
              size="small"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              sx={{
                minWidth: 280,
                '& .MuiOutlinedInput-root': {
                  color: '#f5f5f5',
                  backgroundColor: '#1f1f1f',
                  '& fieldset': { borderColor: '#4caf50' },
                  '&:hover fieldset': { borderColor: '#66bb6a' },
                  '&.Mui-focused fieldset': { borderColor: '#81c784' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#9e9e9e' }} />
                  </InputAdornment>
                ),
              }}
            />
            <IconButton onClick={() => context.setTypePickerOpen(false)} sx={{ color: '#bdbdbd' }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ minHeight: 540 }}>
          <Box
            sx={{
              width: { xs: '100%', md: 220 },
              backgroundColor: '#232323',
              borderRight: { md: '1px solid rgba(255,255,255,0.08)' },
              borderBottom: { xs: '1px solid rgba(255,255,255,0.08)', md: 'none' },
            }}
          >
            <List disablePadding>
              {GROUPS.map((group) => {
                const selected = selectedGroup === group;
                return (
                  <ListItemButton
                    key={group}
                    selected={selected}
                    onClick={() => setSelectedGroup(group)}
                    sx={{
                      alignItems: 'flex-start',
                      py: 1.5,
                      px: 2,
                      borderLeft: selected ? '3px solid #2ec4b6' : '3px solid transparent',
                      backgroundColor: selected ? 'rgba(255,255,255,0.08)' : 'transparent',
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(255,255,255,0.08)',
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: 'rgba(255,255,255,0.12)',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography sx={{ color: '#f5f5f5', fontWeight: 700 }}>
                          {group}
                          <Typography component="span" sx={{ color: '#9e9e9e', ml: 0.75 }}>
                            ({countsByGroup.get(group) ?? 0})
                          </Typography>
                        </Typography>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>

          <Box
            sx={{
              flex: 1,
              px: 2.5,
              py: 2,
              maxHeight: 540,
              overflow: 'auto',
              backgroundColor: '#3a3a3a',
            }}
          >
            {filteredItems.length === 0 && (
              <Typography sx={{ color: '#bdbdbd' }}>No types matched your search.</Typography>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 1.5,
              }}
            >
              {filteredItems.map((item) => {
                return (
                  <Card
                    key={item.key}
                    variant="outlined"
                    onClick={item.onClick}
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: '#454545',
                      borderColor: 'rgba(255,255,255,0.08)',
                      color: '#f5f5f5',
                      transition: 'background-color 120ms ease, transform 120ms ease',
                      '&:hover': {
                        backgroundColor: '#4c4c4c',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.15, mb: 0.75 }}>
                        {item.title}
                      </Typography>
                      <Typography sx={{ color: '#d0d0d0', fontSize: 14, minHeight: 40, mb: 0.75 }}>
                        {item.subtitle}
                      </Typography>
                      <Typography sx={{ color: '#9e9e9e', fontSize: 14 }}>{item.sample}</Typography>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
