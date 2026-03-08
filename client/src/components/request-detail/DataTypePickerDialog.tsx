import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
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
import type {
  DataTypeCatalogValue,
  DataTypeGroup,
  SemanticDataType,
} from '../../models/apiModels';

type PickerItem =
  | {
      key: string;
      kind: 'semantic';
      value: DataTypeCatalogValue;
      group: DataTypeGroup;
      title: string;
      description: string;
    }
  | {
      key: string;
      kind: 'reference';
      value: string;
      group: 'Table Primary Key';
      title: string;
      description: string;
    };

const GROUPS = ['All', 'Basic', 'Personal', 'Table Primary Key'] as const;
type GroupName = (typeof GROUPS)[number];

const TypePickerCard = memo(function TypePickerCard(props: {
  item: PickerItem;
  onSelect: (item: PickerItem) => void;
}) {
  const { item, onSelect } = props;

  return (
    <Card
      variant="outlined"
      onClick={() => onSelect(item)}
      sx={{
        cursor: 'pointer',
        backgroundColor: '#ffffff',
        borderColor: 'rgba(15, 23, 42, 0.08)',
        color: '#1f2933',
        transition: 'background-color 120ms ease, transform 120ms ease',
        borderRadius: 0,
        boxShadow: 'none',
        '&:hover': {
          backgroundColor: '#f8fafc',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2, mb: 0.5 }}>
          {item.title}
        </Typography>
        <Typography
          sx={{
            color: '#475569',
            fontSize: 13,
            fontStyle: 'italic',
            lineHeight: 1.35,
            whiteSpace: 'pre-line',
            minHeight: 56,
          }}
        >
          {item.description}
        </Typography>
      </CardContent>
    </Card>
  );
});

export const DataTypePickerDialog = memo(function DataTypePickerDialog() {
  const {
    typePickerOpen,
    setTypePickerOpen,
    semanticTypes,
    primaryKeyOptions,
    applyRule,
    applyCustomListRule,
  } = useRequestDetailContext();
  const [selectedGroup, setSelectedGroup] = useState<GroupName>('All');
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);

  const items = useMemo<PickerItem[]>(() => {
    const semanticItems: PickerItem[] = semanticTypes.map((option) => ({
      key: option.value,
      kind: 'semantic',
      value: option.value,
      group: option.group,
      title: option.displayName,
      description: option.description,
    }));

    const primaryKeyItems: PickerItem[] = primaryKeyOptions.map((option) => ({
      key: option.value,
      kind: 'reference',
      value: option.value,
      group: 'Table Primary Key',
      title: option.value,
      description: `${option.description}\nExample: ${option.value}`,
    }));

    return [...semanticItems, ...primaryKeyItems];
  }, [primaryKeyOptions, semanticTypes]);

  const filteredItems = useMemo(() => {
    const keyword = deferredSearchText.trim().toLowerCase();
    return items.filter((item) => {
      const matchesGroup = selectedGroup === 'All' || item.group === selectedGroup;
      if (!matchesGroup) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return [item.title, item.description, item.group]
        .join(' ')
        .toLowerCase()
        .includes(keyword);
    });
  }, [deferredSearchText, items, selectedGroup]);

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

  const handleSelectItem = useCallback(
    (item: PickerItem) => {
      if (item.kind === 'reference') {
        const [tableName, columnName] = item.value.split('.', 2);
        applyRule({
          kind: 'reference',
          reference: { tableName, columnName },
        });
        return;
      }

      if (item.value === 'customList') {
        applyCustomListRule();
        return;
      }

      applyRule({
        kind: 'semantic',
        semanticType: item.value as SemanticDataType,
      });
    },
    [applyCustomListRule, applyRule],
  );

  const handleClose = useCallback(() => {
    setTypePickerOpen(false);
  }, [setTypePickerOpen]);

  return (
    <Dialog
      open={typePickerOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      keepMounted
      PaperProps={{
        sx: {
          backgroundColor: '#ffffff',
          color: '#1f2933',
          minHeight: 620,
          borderRadius: 0,
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
            py: 1.75,
            borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
            backgroundColor: '#ffffff',
          }}
        >
          <Typography sx={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
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
                  color: '#1f2933',
                  backgroundColor: '#ffffff',
                  '& fieldset': { borderColor: '#cbd5e1' },
                  '&:hover fieldset': { borderColor: '#94a3b8' },
                  '&.Mui-focused fieldset': { borderColor: '#2563eb' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#64748b' }} />
                  </InputAdornment>
                ),
              }}
            />
            <IconButton onClick={handleClose} sx={{ color: '#64748b' }}>
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
              backgroundColor: '#ffffff',
              borderRight: { md: '1px solid rgba(15, 23, 42, 0.08)' },
              borderBottom: { xs: '1px solid rgba(15, 23, 42, 0.08)', md: 'none' },
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
                      borderLeft: selected ? '3px solid #2563eb' : '3px solid transparent',
                      backgroundColor: selected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: 'rgba(37, 99, 235, 0.12)',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography sx={{ color: '#1f2933', fontWeight: 700, fontSize: 15 }}>
                          {group}
                          <Typography component="span" sx={{ color: '#64748b', ml: 0.75, fontSize: 14 }}>
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
              px: 2,
              py: 1.5,
              maxHeight: 540,
              overflow: 'auto',
              backgroundColor: '#ffffff',
            }}
          >
            {filteredItems.length === 0 && (
              <Typography sx={{ color: '#64748b' }}>No types matched your search.</Typography>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 1,
              }}
            >
              {filteredItems.map((item) => (
                <TypePickerCard key={item.key} item={item} onSelect={handleSelectItem} />
              ))}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
});
