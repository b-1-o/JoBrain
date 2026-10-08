import { execSync } from "node:child_process";

const command = process.env.VERCEL_ENV === "production"
  ? "npx prisma migrate deploy && npx next build"
  : "npx next build";

execSync(command, {
  stdio: "inherit",
  env: process.env,
});
