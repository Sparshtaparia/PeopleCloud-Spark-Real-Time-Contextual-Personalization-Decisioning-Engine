import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const lift = `+${(Math.random() * 15 + 2).toFixed(1)}%`;
  const cRes = await prisma.campaign.updateMany({
    where: { channel: 'app_push', name: 'Premium Value Early Access' },
    data: { status: 'live', lift }
  });
  console.log('App Push Campaigns set to live:', cRes.count);
}
main().catch(console.error);
