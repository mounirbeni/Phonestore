import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

/**
 * Runs before `next build`: applies pending migrations and, while `data/import-on-deploy` exists,
 * imports the catalogue (archiving products that are not part of it). Without a database it does nothing.
 */
if (!process.env.DATABASE_URL) {
  console.log("predeploy: DATABASE_URL not set, skipping");
} else {
  execFileSync("npx", ["tsx", "scripts/migrate.ts"], { stdio: "inherit" });
  if (existsSync("data/import-on-deploy")) {
    execFileSync("npx", ["tsx", "scripts/import-catalog.ts", "--archive-others"], { stdio: "inherit" });
  }
}
