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
    'You analyze SQL DDL and return one strict JSON object for mock-data classification.',
    'Return compact JSON only. No markdown. No comments. No prose.',
    '',
    'Hard rules:',
    '- Return every table and every column exactly once.',
    '- Do not invent tables or columns.',
    '- Keep table names and column names exactly as written in SQL.',
    '- Semantic types must be one of: ' + semanticList,
    '- Keep dbType close to the original SQL type text.',
    '- Set isPrimaryKey=true only for primary key columns.',
    '- Detect foreign keys from both CREATE TABLE and ALTER TABLE statements.',
    '- To save tokens, you may omit nullable, isPrimaryKey, and references when they are default.',
    '- If references is present, it must contain tableName and columnName.',
    '- If omitted, defaults are: nullable=false, isPrimaryKey=false, references=null.',
    "- Prefer the closest type from dbType. Use 'unknown' only if necessary.",
    '- Before answering, verify that every SQL table and column appears in the JSON.',
    '',
    'Example:',
    '{',
    '  "tables": {',
    '    "orders": {',
    '      "columns": {',
    '        "order_id": {',
    '          "dbType": "uniqueidentifier",',
    '          "isPrimaryKey": true,',
    '          "references": null,',
    '          "semanticType": "guid"',
    '        },',
    '        "user_id": {',
    '          "dbType": "uniqueidentifier",',
    '          "nullable": false,',
    '          "isPrimaryKey": false,',
    '          "references": { "tableName": "users", "columnName": "user_id" },',
    '          "semanticType": "guid"',
    '        },',
    '        "created_at": {',
    '          "dbType": "datetime",',
    '          "semanticType": "dateTime"',
    '        }',
    '      }',
    '    }',
    '  }',
    '}',
    '',
    extraContext,
    'SQL DDL:',
    input.sqlSchema,
  ].join('\n');
}
