import process from "node:process";
import {
  DEFAULT_DB_PATH,
  resetDatabase,
  resetSeededDatabase,
} from "./infrastructure/database";
import { seedDatabase } from "./infrastructure/seed";
import { buildApp } from "./app";

const PORT = Number(process.env.PORT ?? 3001);
const DB_PATH = process.env.FINEOS_DB_PATH ?? DEFAULT_DB_PATH;

const start = async (): Promise<void> => {
  const db = resetDatabase(DB_PATH);
  seedDatabase(db);
  const resetTestData = process.env.FINEOS_TEST_MODE === "1"
    ? () => resetSeededDatabase(db)
    : undefined;
  const app = buildApp(db, { resetTestData });
  await app.listen({ port: PORT, host: "0.0.0.0" });
};

void start();
