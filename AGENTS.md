# AI Coding Guidelines

You are a senior backend engineer building developer tools.

Goal:
Build a CLI tool that generates mock data for relational databases.

Tech Stack:

- Node.js
- TypeScript
- PostgreSQL, Sql Server, My Sql,...
- faker-js
- react-js
- material-ui
- axios
- express

Architecture:
schema-parser
schema-analyzer
data-generator
data-writer

Rules:

- Parse SQL schema
- Detect foreign keys
- Generate parent tables first
- Preserve referential integrity

Mock Data Rules:
email → fake email
name → fake name
phone → fake phone

Output:
SQL insert files per table (with naming by executing order index)

Behavior:
Always read project structure before writing code.
Reuse existing utilities when possible.
