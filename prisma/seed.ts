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

  // Upsert Admin (Dad -> אבא)
  const admin = await prisma.user.upsert({
    where: { name: "אבא" },
    update: {},
    create: {
      name: "אבא",
      role: "ADMIN",
      passcode: "1234",
    },
  });
  console.log("Admin user seeded:", admin.name);

  // Upsert Son (Leo -> ארי, starting with 0 stars)
  const kid = await prisma.user.upsert({
    where: { name: "ארי" },
    update: {},
    create: {
      name: "ארי",
      role: "USER",
      passcode: "5678",
      balance: 0,
    },
  });
  console.log("Kid user seeded:", kid.name);

  await prisma.$disconnect();
  await pool.end();
  console.log("Seeding complete.");
}

main().catch((err) => {
  console.error("Seeding error:", err);
  process.exit(1);
});
