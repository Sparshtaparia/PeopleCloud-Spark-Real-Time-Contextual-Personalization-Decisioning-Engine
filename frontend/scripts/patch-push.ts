import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const cRes = await prisma.campaign.updateMany({
    where: { channel: 'push' },
    data: { channel: 'app_push' }
  });
  console.log('Campaigns updated:', cRes.count);

  const eRes = await prisma.customerEvent.updateMany({
    where: { channel: 'push' },
    data: { channel: 'app_push' }
  });
  console.log('Events updated:', eRes.count);

  const dRes = await prisma.personalizationDecision.updateMany({
    where: { channel: 'push' },
    data: { channel: 'app_push' }
  });
  console.log('Decisions updated:', dRes.count);
}
main().catch(console.error);
