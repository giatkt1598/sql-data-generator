jest.mock('@faker-js/faker', () => {
  const faker = {};
  return {
    fakerDE: faker,
    fakerEN: faker,
    fakerES: faker,
    fakerFR: faker,
    fakerJA: faker,
    fakerKO: faker,
    fakerVI: faker,
    fakerZH_CN: faker,
  };
});

import { generateDataByTableOrder } from './valueGenerator';
import type { TableColumnRules, TableSchema } from '../core/types';

const table: TableSchema = {
  name: 'events',
  columns: [
    {
      name: 'occurred_at',
      dbType: 'datetime',
      nullable: true,
      isPrimaryKey: false,
    },
  ],
  primaryKeyColumns: [],
  foreignKeys: [],
};

function buildRules(blankPercentage = 0): TableColumnRules {
  return {
    events: {
      occurred_at: {
        kind: 'semantic',
        semanticType: 'sequenceDateTime',
        blankPercentage,
        sequenceDateTimeOptions: {
          start: '2026-01-01T00:00',
          step: 5,
          unit: 'minutes',
          format: 'yyyy-MM-dd HH:mm:ss',
        },
      },
    },
  };
}

describe('Sequence Date Time generator', () => {
  it('increments each row from the configured start by step and unit', () => {
    const [generated] = generateDataByTableOrder([table], buildRules());

    expect(generated.rows.map((row) => row.occurred_at)).toEqual([
      '2026-01-01 00:00:00',
      '2026-01-01 00:05:00',
      '2026-01-01 00:10:00',
      '2026-01-01 00:15:00',
      '2026-01-01 00:20:00',
      '2026-01-01 00:25:00',
      '2026-01-01 00:30:00',
      '2026-01-01 00:35:00',
      '2026-01-01 00:40:00',
      '2026-01-01 00:45:00',
    ]);
  });

  it('applies Blank before generation', () => {
    const [generated] = generateDataByTableOrder([table], buildRules(100));

    expect(generated.rows.map((row) => row.occurred_at)).toEqual(Array(10).fill(null));
  });
});
