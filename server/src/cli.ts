import fs from 'fs';
import path from 'path';
import {
  buildDatabaseSchemaFromClassification,
  parseClassificationJson,
} from './ai/classificationLoader';
import { buildClassificationPrompt } from './ai/promptBuilder';
import { buildDefaultColumnRules } from './schema/columnRules';
import { resolveTableOrder } from './schema/dependencyResolver';
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
    '  ts-node src/cli.ts generate --schema <schema.sql> --classification <classification.json> --out <outputDir>',
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

  if (!schemaPath || !classificationPath || !outputDir) {
    throw new Error('Missing required args. Need --schema --classification --out.');
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  const classificationText = fs.readFileSync(classificationPath, 'utf-8');

  const classification = parseClassificationJson(classificationText);
  const schema = buildDatabaseSchemaFromClassification(classification);
  if (schema.tables.length === 0) {
    throw new Error('AI classification JSON does not contain any tables.');
  }

  const columnRules = buildDefaultColumnRules(schema.tables, classification);
  const orderedTables = resolveTableOrder(schema.tables, columnRules);
  const generatedRows = generateDataByTableOrder(orderedTables, columnRules);
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
