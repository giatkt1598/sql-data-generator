import { memo } from 'react';
import { Card, CardContent, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { CustomListTypeDefinition } from '../../models/apiModels';
import type { PickerItem } from './types';

export const TypePickerCard = memo(function TypePickerCard(props: {
  item: PickerItem;
  onSelect: (item: PickerItem) => void;
  onEditCustomType: (item: CustomListTypeDefinition) => void;
  onDeleteCustomType: (item: CustomListTypeDefinition) => void;
}) {
  const { item, onSelect, onEditCustomType, onDeleteCustomType } = props;

  return (
    <Card
      variant="outlined"
      onClick={() => onSelect(item)}
      sx={{
        cursor: 'pointer',
        backgroundColor: 'rgba(8, 22, 43, 0.84)',
        borderColor: 'rgba(57, 255, 136, 0.18)',
        color: 'text.primary',
        transition: 'background-color 120ms ease, transform 120ms ease',
        borderRadius: 0,
        boxShadow: 'none',
        position: 'relative',
        '&:hover': {
          backgroundColor: 'rgba(57, 255, 136, 0.08)',
          transform: 'translateY(-1px)',
        },
        '&:hover .custom-type-actions': {
          opacity: 1,
          pointerEvents: 'auto',
        },
      }}
    >
      {item.kind === 'customType' && (
        <Stack
          direction="row"
          spacing={0.25}
          className="custom-type-actions"
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 120ms ease',
            zIndex: 1,
          }}
        >
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onEditCustomType(item.customType);
              }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteCustomType(item.customType);
              }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
      <CardContent sx={{ p: 2.25 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2, mb: 0.5 }}>
          {item.title}
        </Typography>
        {item.kind === 'customType' ? (
          <Stack spacing={0.5}>
            <Typography
              sx={{
                color: 'text.secondary',
                fontSize: 13,
                fontStyle: 'italic',
                lineHeight: 1.35,
                minHeight: 36,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.description}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.35 }}>
              Total item(s): {item.customType.values.length}
            </Typography>
          </Stack>
        ) : (
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: 13,
              fontStyle: 'italic',
              lineHeight: 1.35,
              whiteSpace: 'pre-line',
              minHeight: 56,
            }}
          >
            {item.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
});
