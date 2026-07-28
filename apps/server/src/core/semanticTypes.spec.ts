import { SQL_TYPE_DEFAULT_CLASSIFICATION, normalizeSqlType } from './semanticTypes';

describe('JSON semantic type', () => {
  it('classifies PostgreSQL json and jsonb columns as json', () => {
    expect(SQL_TYPE_DEFAULT_CLASSIFICATION[normalizeSqlType('json')]).toBe('json');
    expect(SQL_TYPE_DEFAULT_CLASSIFICATION[normalizeSqlType('jsonb')]).toBe('json');
  });

  it('normalizes jsonb with modifiers', () => {
    expect(normalizeSqlType('JSONB(10)')).toBe('jsonb');
  });
});
