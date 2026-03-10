1. Run postgres database in docker container

2. Create database schema, run `create-table.sql`

3. Seed data, ring `seed-data.sql`

4. To run data generator, run open new terminal and run `cmd /c "docker exec -i postgres_db psql -U sa -d db1 < schema.sql"`

- `postgres_db` is container name

- `db1` is database name

- `sa` is user name

- `schema.sql` is sql file generated from tool
