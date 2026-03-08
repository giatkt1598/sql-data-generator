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
    'Task: classify table columns by semantic data type for mock-data generation.',
    'Rules:',
    `- Semantic types must be one of: ${semanticList}`,
    '- Keep table names and column names exactly as provided.',
    "- If uncertain, use semanticType='unknown'.",
    '- Return strict JSON only, no markdown and no explanation text outside JSON.',
    '',
    'Output JSON shape:',
    '{',
    '  "version": "1",',
    '  "tables": {',
    '    "<tableName>": {',
    '      "columns": {',
    '        "<columnName>": {',
    '          "semanticType": "<one semantic type>",',
    '          "reason": "<short reason>"',
    '        }',
    '      }',
    '    }',
    '  }',
    '}',
    extraContext,
    'SQL schema to classify:',
    input.sqlSchema,
  ].join('\n');
}
