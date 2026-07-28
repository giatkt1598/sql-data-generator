import { buildInsertFileArtifacts, sqlBooleanValue, wrapSqlInTransaction } from './sqlWriter';

describe('SQL writer', () => {
  describe('sqlBooleanValue', () => {
    it('should return 1 for true', () => {
      expect(sqlBooleanValue(true)).toBe('1');
    });
  });

  it('escapes JSON values as SQL string literals', () => {
    const [artifact] = buildInsertFileArtifacts(
      [
        {
          tableName: 'profiles',
          rows: [{ metadata: JSON.stringify({ name: "O'Reilly" }) }],
        },
      ],
      'postgres',
      { includeHeader: false, includeTransaction: false },
    );

    expect(artifact.content).toContain("('{\"name\":\"O''Reilly\"}')");
  });

  it('wraps PostgreSQL SQL in a single anonymous DO block with error propagation', () => {
    const wrapped = wrapSqlInTransaction('INSERT INTO profiles (name) VALUES (\'Alice\');', 'postgres');

    expect(wrapped).toBe([
      'DO $$',
      'BEGIN',
      '    BEGIN',
      "        INSERT INTO profiles (name) VALUES ('Alice');",
      '',
      '    EXCEPTION',
      '        WHEN OTHERS THEN',
      "            RAISE EXCEPTION 'ERROR: %', SQLERRM;",
      '    END;',
      'END $$;',
    ].join('\n'));
  });

  it('keeps SQL Server and MySQL transaction scripts', () => {
    expect(wrapSqlInTransaction('INSERT INTO profiles VALUES (1);', 'sqlserver')).toContain(
      'BEGIN TRANSACTION;',
    );
    expect(wrapSqlInTransaction('INSERT INTO profiles VALUES (1);', 'mysql')).toBe(
      'START TRANSACTION;\n\nINSERT INTO profiles VALUES (1);\n\nCOMMIT;',
    );
  });
});
