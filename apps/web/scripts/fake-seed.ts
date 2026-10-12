import { parseArgs } from "node:util";

import { hashPassword } from "better-auth/crypto";
import { Client } from "pg";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@nitap/database";
import { generatePerfData, writePerfData } from "@nitap/database/perf";

/**
 * Fills the development database with fake members, profiles, connections,
 * mentorships, jobs, events, posts, conversations and notifications, reusing
 * the deterministic performance generator at a browsable size. Every fake
 * account is `…@perf.example.test` and shares one password.
 *
 * Pnpm db:fake -- [--users 300] [--seed 1] [--password …] [--reset]
 */
const FAKE_DOMAIN = "@perf.example.test";

async function main() {
  const { values: args } = parseArgs({
    // pnpm forwards the `--` separator itself.
    args: process.argv.slice(2).filter((arg) => arg !== "--"),
    options: {
      users: { type: "string", default: "300" },
      seed: { type: "string", default: "1" },
      password: { type: "string", default: "fake-password-1234" },
      reset: { type: "boolean", default: false },
    },
  });
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to write fake data: NODE_ENV=production.");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const users = Number(args.users);
  if (!Number.isInteger(users) || users < 1) {
    throw new Error(`--users must be a positive integer, got "${args.users}"`);
  }
  const name = decodeURIComponent(new URL(connectionString).pathname.slice(1));

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const fakeUsers = { email: { endsWith: FAKE_DOMAIN } };
    if (args.reset) {
      const ids = (
        await prisma.user.findMany({ where: fakeUsers, select: { id: true } })
      ).map((u) => u.id);
      // Role grants restrict deleting their grantor, so they go first; everything else cascades.
      await prisma.$transaction([
        prisma.userRole.deleteMany({
          where: { OR: [{ userId: { in: ids } }, { grantedBy: { in: ids } }] },
        }),
        prisma.user.deleteMany({ where: { id: { in: ids } } }),
      ]);
      console.log(`Removed ${ids.length} fake users from ${name}.`);
    } else {
      const existing = await prisma.user.count({ where: fakeUsers });
      if (existing > 0) {
        throw new Error(
          `${name} already has ${existing} fake users; rerun with --reset to replace them.`
        );
      }
    }

    const [departments, degrees, roles] = await Promise.all([
      prisma.department.findMany({
        select: { id: true, code: true },
        orderBy: { code: "asc" },
      }),
      prisma.degree.findMany({
        select: { id: true, code: true },
        orderBy: { code: "asc" },
      }),
      prisma.role.findMany({ select: { id: true, name: true } }),
    ]);
    if (departments.length === 0 || roles.length === 0) {
      throw new Error(`${name} has no reference data; run pnpm db:seed first.`);
    }

    const started = Date.now();
    const data = generatePerfData(
      {
        users,
        seed: Number(args.seed),
        sessions: 0,
        spikeCapacity: 50,
        now: new Date(),
      },
      {
        departments,
        degrees,
        roleIds: Object.fromEntries(roles.map((r) => [r.name, r.id])),
      }
    );
    await writePerfData(
      client,
      data.tables,
      await hashPassword(args.password),
      (table, rows) =>
        console.log(`  ${table.padEnd(26)} ${rows.toLocaleString("en-US")}`)
    );
    console.log(
      `Seeded ${name} in ${((Date.now() - started) / 1000).toFixed(1)} s.`
    );
    console.log(`Sign in with any of these (password: ${args.password}):`);
    for (const email of [
      "perf-super-admin-1@perf.example.test",
      "perf-alumni-coordinator-1@perf.example.test",
      "perf-moderator-1@perf.example.test",
      ...data.fixture.signInEmails.slice(0, 3),
    ]) {
      console.log(`  ${email}`);
    }
  } finally {
    await client.end();
    await prisma.$disconnect();
  }
}

await main();
