import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Seeding database...");

  // Upsert Admin
  const admin = await prisma.user.upsert({
    where: { name: "Dad" },
    update: {},
    create: {
      name: "Dad",
      role: "ADMIN",
      passcode: "1234", // simple 4-digit PIN for parent
    },
  });
  console.log("Admin user seeded:", admin.name);

  // Upsert Son
  const kid = await prisma.user.upsert({
    where: { name: "Leo" },
    update: {},
    create: {
      name: "Leo",
      role: "USER",
      passcode: "5678", // simple 4-digit PIN for kid
      balance: 10,
    },
  });
  console.log("Kid user seeded:", kid.name);

  // Seed initial transaction if none exists
  const transactionCount = await prisma.transaction.count({
    where: { userId: kid.id },
  });

  if (transactionCount === 0) {
    await prisma.transaction.create({
      data: {
        amount: 10,
        description: "Welcome stars!",
        userId: kid.id,
        createdById: admin.id,
      },
    });
    console.log("Seeded welcome transaction");
  }

  await prisma.$disconnect();
  await pool.end();
  console.log("Seeding complete.");
}

main().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
