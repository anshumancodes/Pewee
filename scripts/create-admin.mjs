#!/usr/bin/env node
/**
 * Create (or reset) a Pewee CMS admin account.
 *
 *   npm run create-admin
 *   npm run create-admin -- --email you@example.com --name "Your Name" --username yourname
 *
 * The password is read from the ADMIN_PASSWORD env var or prompted for.
 * Running it again for an existing email promotes that user to ADMIN
 * and resets the password.
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout, argv, exit } from "node:process";
import nextEnv from "@next/env";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

nextEnv.loadEnvConfig(process.cwd()); // same .env loading rules as Next.js

function arg(name) {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
}

const rl = createInterface({ input: stdin, output: stdout });
async function ask(question, fallback) {
  if (fallback) return fallback;
  const answer = (await rl.question(question)).trim();
  return answer;
}

async function main() {
  const uri = process.env.MONGO_DB_URI;
  if (!uri) {
    console.error("✖ MONGO_DB_URI is not set. Copy .env.example to .env and fill it in.");
    exit(1);
  }

  const email = (await ask("Admin email: ", arg("email") ?? process.env.ADMIN_EMAIL)).toLowerCase();
  const name = await ask("Display name: ", arg("name") ?? process.env.ADMIN_NAME);
  const username = await ask(
    "Username (4–15 chars): ",
    arg("username") ?? process.env.ADMIN_USERNAME
  );
  const password = await ask(
    "Password (min 8 chars, input is visible): ",
    process.env.ADMIN_PASSWORD
  );
  rl.close();

  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Please provide a valid email.");
  if (!name) throw new Error("Display name is required.");
  if (username.length < 4 || username.length > 15)
    throw new Error("Username must be between 4 and 15 characters.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");

  await mongoose.connect(uri, process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {});

  // Same collection, fields and hashing as src/schemas/user.schema.ts
  const users = mongoose.connection.collection("users");
  const hash = await bcrypt.hash(password, 10);
  const now = new Date();

  const result = await users.updateOne(
    { email },
    {
      $set: { Name: name, username, password: hash, role: "ADMIN", updatedAt: now },
      $setOnInsert: { email, profilePic: null, createdAt: now },
    },
    { upsert: true }
  );

  console.log(
    result.upsertedCount
      ? `✔ Admin created: ${email}`
      : `✔ Existing user ${email} promoted to admin and password reset`
  );
  console.log("  Sign in at /auth to open the dashboard.");
}

main()
  .catch((err) => {
    console.error(`✖ ${err.message ?? err}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
    return mongoose.disconnect();
  });
