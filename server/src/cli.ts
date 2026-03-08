import fs from 'fs';
import path from 'path';
import { parseClassificationJson, validateClassificationCoverage } from './ai/classificationLoader';
import { buildClassificationPrompt } from './ai/promptBuilder';
import { resolveTableOrder } from './schema/dependencyResolver';
import { parseCreateTableSql } from './schema/simpleSchemaParser';
import { generateDataByTableOrder } from './generator/valueGenerator';
import { writeInsertFiles } from './writer/sqlWriter';

function getArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0 || index + 1 >= process.argv.length) {
    return undefined;
  }
  return process.argv[index + 1];
}

function printHelp(): void {
  console.log('Usage:');
  console.log('  ts-node src/cli.ts build-prompt --schema <schema.sql> [--context <context.txt>]');
  console.log(
    '  ts-node src/cli.ts generate --schema <schema.sql> --classification <classification.json> --out <outputDir> [--rows 10]',
  );
}

function runBuildPrompt(): void {
  const schemaPath = getArgValue('--schema');
  if (!schemaPath) {
    throw new Error('Missing --schema path.');
  }
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  const contextPath = getArgValue('--context');
  const contextText = contextPath ? fs.readFileSync(contextPath, 'utf-8') : undefined;

  const prompt = buildClassificationPrompt({
    sqlSchema: schemaSql,
    extraBusinessContext: contextText,
  });
  console.log(prompt);
}

function runGenerate(): void {
  const schemaPath = getArgValue('--schema');
  const classificationPath = getArgValue('--classification');
  const outputDir = getArgValue('--out');
  const rowsArg = getArgValue('--rows');
  const rowsPerTable = rowsArg ? Number(rowsArg) : 10;

  if (!schemaPath || !classificationPath || !outputDir) {
    throw new Error('Missing required args. Need --schema --classification --out.');
  }
  if (!Number.isInteger(rowsPerTable) || rowsPerTable < 1) {
    throw new Error('--rows must be a positive integer.');
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  const classificationText = fs.readFileSync(classificationPath, 'utf-8');

  const schema = parseCreateTableSql(schemaSql);
  if (schema.tables.length === 0) {
    throw new Error('No CREATE TABLE statements found in schema.');
  }

  const classification = parseClassificationJson(classificationText);
  const warnings = validateClassificationCoverage(schema.tables, classification);
  if (warnings.length > 0) {
    console.warn('Classification warnings:');
    warnings.forEach((warning) => console.warn(`- ${warning}`));
  }

  const orderedTables = resolveTableOrder(schema.tables);
  const generatedRows = generateDataByTableOrder(orderedTables, classification, {
    rowsPerTable,
  });
  const files = writeInsertFiles(generatedRows, path.resolve(outputDir));

  console.log('Generated SQL files:');
  files.forEach((file) => console.log(`- ${file}`));
}

function main(): void {
  const command = process.argv[2];
  if (!command || command === 'help' || command === '--help') {
    printHelp();
    return;
  }

  if (command === 'build-prompt') {
    runBuildPrompt();
    return;
  }
  if (command === 'generate') {
    runGenerate();
    return;
  }

  throw new Error(`Unknown command '${command}'.`);
}

main();
