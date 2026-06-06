/**
 * Seeds production-ready Asher Library templates to propertyDocument (systemId=4).
 *
 * Usage:
 *   npm run seed:library
 *   npm run seed:library -- --force   # re-upload existing names
 *
 * Requires: DATABASE_URL, Cloudinary env vars, admin user (seed:admin first)
 */
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import {
  ASHER_LIBRARY_TEMPLATES,
  getLibraryTemplateDocumentName,
} from "../content/asher-library/manifest";

dotenv.config();

const prisma = new PrismaClient();
const SYSTEM_ID = "4";

async function uploadHtmlToCloudinary(
  documentName: string,
  content: string
): Promise<string> {
  const multerCloudinary = require("../src/middlewares/multerCloudinary");
  const uploadDocsCloudinary = multerCloudinary.uploadDocsCloudinary;

  const htmlBuffer = Buffer.from(content, "utf-8");
  const fileName = `${documentName.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.html`;
  const mockFile = {
    buffer: htmlBuffer,
    originalname: fileName,
    mimetype: "text/html",
    size: htmlBuffer.length,
  };

  const uploadResult: { secure_url?: string } = await uploadDocsCloudinary(mockFile);
  if (!uploadResult?.secure_url) {
    throw new Error(`Cloudinary upload failed for ${documentName}`);
  }
  return uploadResult.secure_url;
}

async function main() {
  const force = process.argv.includes("--force");

  const admin = await prisma.users.findFirst({
    where: { role: { has: "ADMIN" } },
    orderBy: { createdAt: "asc" },
  });

  if (!admin) {
    throw new Error("No admin user found. Run npm run seed:admin first.");
  }

  console.log(`Seeding ${ASHER_LIBRARY_TEMPLATES.length} Asher Library templates...`);

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const def of ASHER_LIBRARY_TEMPLATES) {
    const documentName = getLibraryTemplateDocumentName(def);
    const existing = await prisma.propertyDocument.findFirst({
      where: { documentName },
    });

    if (existing && !force) {
      console.log(`  skip  ${documentName}`);
      skipped += 1;
      continue;
    }

    const url = await uploadHtmlToCloudinary(documentName, def.content);

    if (existing && force) {
      await prisma.propertyDocument.update({
        where: { id: existing.id },
        data: {
          documentUrl: [url],
          type: "text/html",
          size: String(Buffer.byteLength(def.content, "utf-8")),
          docType: "OTHER",
          systemId: SYSTEM_ID,
          isPublished: true,
        },
      });
      console.log(`  update ${documentName}`);
      updated += 1;
      continue;
    }

    await prisma.propertyDocument.create({
      data: {
        documentName,
        documentUrl: [url],
        type: "text/html",
        size: String(Buffer.byteLength(def.content, "utf-8")),
        docType: "OTHER",
        systemId: SYSTEM_ID,
        isPublished: true,
        uploadedBy: admin.id,
      },
    });
    console.log(`  create ${documentName}`);
    created += 1;
  }

  console.log(`Done. created=${created} updated=${updated} skipped=${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
