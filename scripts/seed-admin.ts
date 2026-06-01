import { PrismaClient, userRoles } from "@prisma/client";
import { hashSync } from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@ashercorp.co.uk";
const ADMIN_PASSWORD = "Taptap123";

async function seedAdminUser() {
  const email = ADMIN_EMAIL.toLowerCase();
  const hashedPassword = hashSync(ADMIN_PASSWORD, 10);

  const existingUser = await prisma.users.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (existingUser) {
    await prisma.users.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: [userRoles.ADMIN],
        isVerified: true,
      },
    });

    console.log(`Updated admin user: ${email}`);
    return;
  }

  const profile = await prisma.profile.create({
    data: {
      firstName: "Admin",
      lastName: "User",
      fullname: "Admin User",
      title: "System Administrator",
    },
  });

  await prisma.users.create({
    data: {
      email,
      password: hashedPassword,
      role: [userRoles.ADMIN],
      isVerified: true,
      profileId: profile.id,
    },
  });

  console.log(`Created admin user: ${email}`);
}

seedAdminUser()
  .catch((error) => {
    console.error("Failed to seed admin user:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
