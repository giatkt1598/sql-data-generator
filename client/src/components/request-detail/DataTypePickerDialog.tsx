import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
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
import { useMockDataSchemaDetailContext } from './MockDataSchemaDetailContext';
import { DATA_TYPE_GROUPS } from '../../models/apiModels';
import type { CustomListTypeDefinition, SemanticDataType } from '../../models/apiModels';
import { getErrorMessage } from '../../utilities/errorUtils';
import { CustomTypeEditorDialog } from './CustomTypeEditorDialog';
import { DeleteCustomTypeDialog } from './DeleteCustomTypeDialog';
import { TypePickerCard } from './TypePickerCard';
import type { PickerGroupName, PickerItem } from './types';

const GROUPS = ['All', ...DATA_TYPE_GROUPS, 'Custom List'] as const;
type GroupName = (typeof GROUPS)[number];

function stringifyCustomTypeValues(values: Array<string | number | boolean>): string {
  return values.map((item) => String(item)).join(', ');
}

export const DataTypePickerDialog = memo(function DataTypePickerDialog() {
  const {
    typePickerOpen,
    setTypePickerOpen,
    semanticTypes,
    customListTypes,
    primaryKeyOptions,
    applyRule,
    applyCustomListRule,
    createCustomListType,
    updateCustomListType,
    deleteCustomListType,
  } = useMockDataSchemaDetailContext();
  const [selectedGroup, setSelectedGroup] = useState<GroupName>('All');
  const [searchText, setSearchText] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editingCustomType, setEditingCustomType] = useState<CustomListTypeDefinition | null>(null);
  const [customTypeNameInput, setCustomTypeNameInput] = useState('');
  const [customTypeValuesInput, setCustomTypeValuesInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<CustomListTypeDefinition | null>(null);
  const deferredSearchText = useDeferredValue(searchText);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!typePickerOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [typePickerOpen]);

  const items = useMemo<PickerItem[]>(() => {
    const semanticItems: PickerItem[] = semanticTypes.map((option) => ({
      key: option.value,
      kind: 'semantic',
      value: option.value,
      groups: option.groups as PickerGroupName[],
      title: option.displayName,
      description: option.description,
    }));

    const primaryKeyItems: PickerItem[] = primaryKeyOptions.map((option) => ({
      key: option.value,
      kind: 'reference',
      value: option.value,
      groups: ['Table Primary Key'],
      title: option.value,
      description: `${option.description}\nExample: ${option.value}`,
    }));

    const customTypeItems: PickerItem[] = customListTypes.map((item) => ({
      key: item.id,
      kind: 'customType',
      value: item.name,
      groups: ['Custom List'],
      title: item.name,
      description: stringifyCustomTypeValues(item.values),
      customType: item,
    }));

    return [...semanticItems, ...primaryKeyItems, ...customTypeItems];
  }, [customListTypes, primaryKeyOptions, semanticTypes]);

  const keyword = deferredSearchText.trim().toLowerCase();
  const hasSearchKeyword = keyword.length > 0;
  const searchMatchedItems = useMemo(() => {
    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [item.title, item.description, item.groups.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [items, keyword]);

  const filteredItems = useMemo(() => {
    return searchMatchedItems.filter(
      (item) => selectedGroup === 'All' || item.groups.includes(selectedGroup),
    );
  }, [searchMatchedItems, selectedGroup]);

  const countsByGroup = useMemo(() => {
    const counts = new Map<GroupName, number>();
    const allGroups = GROUPS as readonly GroupName[];
    counts.set('All', searchMatchedItems.length);
    for (const group of allGroups.slice(1)) {
      counts.set(group, 0);
    }

    for (const item of searchMatchedItems) {
      for (const group of item.groups) {
        const key = group as GroupName;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    return counts;
  }, [searchMatchedItems]);

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

      if (item.kind === 'customType') {
        applyRule({
          kind: 'customList',
          customTypeName: item.customType.name,
          customValues: item.customType.values,
        });
        setTypePickerOpen(false);
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
    [applyCustomListRule, applyRule, setTypePickerOpen],
  );

  const handleClose = useCallback(() => {
    setTypePickerOpen(false);
  }, [setTypePickerOpen]);

  function openCreateDialog() {
    setEditorMode('create');
    setEditingCustomType(null);
    setCustomTypeNameInput('');
    setCustomTypeValuesInput('');
    setEditorOpen(true);
  }

  function openEditDialog(item: CustomListTypeDefinition) {
    setEditorMode('edit');
    setEditingCustomType(item);
    setCustomTypeNameInput(item.name.replace(/^Custom:/, ''));
    setCustomTypeValuesInput(stringifyCustomTypeValues(item.values));
    setEditorOpen(true);
  }

  async function handleSubmitCustomType() {
    try {
      if (editorMode === 'create') {
        await createCustomListType({
          name: customTypeNameInput,
          valuesText: customTypeValuesInput,
        });
      } else if (editingCustomType) {
        await updateCustomListType(editingCustomType.id, {
          name: customTypeNameInput,
          valuesText: customTypeValuesInput,
        });
      }
      setEditorOpen(false);
    } catch (error) {
      window.alert(getErrorMessage(error, 'Failed to save custom type.'));
    }
  }

  async function handleDeleteCustomType() {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteCustomListType(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      window.alert(getErrorMessage(error, 'Failed to delete custom type.'));
    }
  }

  return (
    <>
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
                inputRef={searchInputRef}
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
                            <Typography
                              component="span"
                              sx={{ color: '#64748b', ml: 0.75, fontSize: 14 }}
                            >
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
              {selectedGroup === 'Custom List' && (
                <Box sx={{ mb: 1.5 }}>
                  <Button variant="outlined" onClick={openCreateDialog}>
                    Create Type
                  </Button>
                </Box>
              )}

              {filteredItems.length === 0 && (
                <Typography sx={{ color: '#64748b' }}>
                  {hasSearchKeyword ? 'No types matched your search.' : 'No data'}
                </Typography>
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
                  <TypePickerCard
                    key={item.key}
                    item={item}
                    onSelect={handleSelectItem}
                    onEditCustomType={openEditDialog}
                    onDeleteCustomType={(target) => setDeleteTarget(target)}
                  />
                ))}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>

      <CustomTypeEditorDialog
        open={editorOpen}
        mode={editorMode}
        name={customTypeNameInput}
        valuesText={customTypeValuesInput}
        onClose={() => setEditorOpen(false)}
        onNameChange={setCustomTypeNameInput}
        onValuesChange={setCustomTypeValuesInput}
        onSave={handleSubmitCustomType}
      />

      <DeleteCustomTypeDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onDelete={handleDeleteCustomType}
      />
    </>
  );
});
