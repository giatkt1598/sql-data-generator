import { SUPPORTED_SEMANTIC_TYPES } from '../core/semanticTypes';

export interface BuildClassificationPromptInput {
  sqlSchema: string;
  extraBusinessContext?: string;
}

export function buildClassificationPrompt(input: BuildClassificationPromptInput): string {
  const semanticList = SUPPORTED_SEMANTIC_TYPES.join(', ');
  const extraContext = input.extraBusinessContext
    ? `\nBusiness context:\n${input.extraBusinessContext}\n`
    : '';

  return [
    'You are a data classification assistant.',
    'Task: analyze SQL DDL and classify table columns for mock-data generation.',
    'Rules:',
    `- Semantic types must be one of: ${semanticList}`,
    '- Keep table names and column names exactly as provided.',
    '- Return each column with dbType, nullable, isPrimaryKey, isForeignKey.',
    '- If isForeignKey=true, you must also return references.tableName and references.columnName.',
    "- If uncertain about semantic meaning, use semanticType='unknown'.",
    '- Return strict JSON only, no markdown and no explanation text outside JSON.',
    '',
    'Output JSON shape:',
    '{',
    '  "version": "1",',
    '  "tables": {',
    '    "<tableName>": {',
    '      "columns": {',
    '        "<columnName>": {',
    '          "dbType": "<SQL column type text>",',
    '          "nullable": true,',
    '          "isPrimaryKey": false,',
    '          "isForeignKey": false,',
    '          "references": {',
    '            "tableName": "<referenced table name if foreign key>",',
    '            "columnName": "<referenced column name if foreign key>"',
    '          },',
    '          "semanticType": "<one semantic type>",',
    '          "reason": "<short reason>"',
    '        }',
    '      }',
    '    }',
    '  }',
    '}',
    '',
    'Important:',
    '- Derive structure from the SQL itself, including primary keys and foreign keys.',
    '- Keep dbType close to the original SQL type text.',
    '- Omit references or set it to null when isForeignKey=false.',
    extraContext,
    'SQL schema to classify:',
    input.sqlSchema,
  ].join('\n');
}
