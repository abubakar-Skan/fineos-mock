import Database from "better-sqlite3";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedDatabase } from "./seed.ts";

export type Db = Database.Database;

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(HERE, "schema.sql");
const RESET_DATA_SQL = `
  DELETE FROM case_execution_run;
  DELETE FROM absence_period;
  DELETE FROM gdc_case;
  DELETE FROM absence_case;
  DELETE FROM notification;
  DELETE FROM party;
`;

export const DEFAULT_DB_PATH = join(HERE, "..", "..", "..", "..", "data", "fineos.sqlite");

export const resetDatabase = (path: string): Db => {
  if (path !== ":memory:") rmSync(path, { force: true });
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  db.exec(readFileSync(SCHEMA_PATH, "utf8"));
  return db;
};

export const resetSeededDatabase = (db: Db): void => {
  db.transaction(() => {
    db.exec(RESET_DATA_SQL);
    seedDatabase(db);
  })();
};

export const resetToSeededFile = (): void => {
  const db = resetDatabase(DEFAULT_DB_PATH);
  seedDatabase(db);
  db.close();
};
