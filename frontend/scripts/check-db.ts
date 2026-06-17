import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, channel: true, status: true, lift: true }
  });
  console.log("Campaigns:", campaigns);
  
  const segments = await prisma.segment.findMany({
    select: { id: true, name: true }
  });
  console.log("Segments:", segments.length);
}
main().catch(console.error);
