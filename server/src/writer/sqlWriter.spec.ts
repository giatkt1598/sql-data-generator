import { buildInsertFileArtifacts, sqlBooleanValue } from './sqlWriter';

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
});
