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
import { buildInsertFileArtifacts } from '../writer/sqlWriter';

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

describe('Fixed Value generator', () => {
  const fixedValueTable: TableSchema = {
    name: 'hard_values',
    columns: [
      { name: 'text_value', dbType: 'varchar(50)', nullable: true, isPrimaryKey: false },
      { name: 'number_value', dbType: 'decimal(30,10)', nullable: true, isPrimaryKey: false },
      { name: 'boolean_value', dbType: 'boolean', nullable: true, isPrimaryKey: false },
      { name: 'json_value', dbType: 'jsonb', nullable: true, isPrimaryKey: false },
      { name: 'empty_value', dbType: 'int', nullable: true, isPrimaryKey: false },
    ],
    primaryKeyColumns: [],
    foreignKeys: [],
  };

  it('serializes values based on their database types', () => {
    const rules: TableColumnRules = {
      hard_values: {
        text_value: { kind: 'semantic', semanticType: 'fixedValue', fixedValueOptions: { value: '1' } },
        number_value: {
          kind: 'semantic',
          semanticType: 'fixedValue',
          fixedValueOptions: { value: '12345678901234567890.1234567890' },
        },
        boolean_value: { kind: 'semantic', semanticType: 'fixedValue', fixedValueOptions: { value: 'true' } },
        json_value: {
          kind: 'semantic',
          semanticType: 'fixedValue',
          fixedValueOptions: { value: '{ "name": "O\'Reilly" }' },
        },
        empty_value: { kind: 'semantic', semanticType: 'fixedValue', fixedValueOptions: { value: '  ' } },
      },
    };

    const generated = generateDataByTableOrder([fixedValueTable], rules);
    const [artifact] = buildInsertFileArtifacts(generated, 'sqlserver', {
      includeHeader: false,
      includeTransaction: false,
    });

    expect(artifact.content).toContain(
      "('1', 12345678901234567890.1234567890, 1, '{\"name\":\"O''Reilly\"}', NULL)",
    );
  });

  it('rejects invalid values for typed columns', () => {
    const rules: TableColumnRules = {
      hard_values: {
        text_value: { kind: 'semantic', semanticType: 'fixedValue', fixedValueOptions: { value: 'text' } },
        number_value: {
          kind: 'semantic',
          semanticType: 'fixedValue',
          fixedValueOptions: { value: 'not-a-number' },
        },
        boolean_value: { kind: 'semantic', semanticType: 'fixedValue', fixedValueOptions: { value: 'true' } },
        json_value: { kind: 'semantic', semanticType: 'fixedValue', fixedValueOptions: { value: '{}' } },
        empty_value: { kind: 'semantic', semanticType: 'fixedValue', fixedValueOptions: { value: '' } },
      },
    };

    expect(() => generateDataByTableOrder([fixedValueTable], rules)).toThrow(
      "Fixed Value in 'hard_values.number_value' for dbType 'decimal(30,10)' must be a valid numeric literal.",
    );
  });
});
