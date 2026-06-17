import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: {
      campaigns: true,
      customers: true,
      decisions: true
    }
  });
  console.log("Latest Workspace:", workspaces[0].id);
  console.log("Campaigns:", workspaces[0].campaigns.length);
  console.log("Live/Learning Campaigns:", workspaces[0].campaigns.filter(c => c.status === 'live' || c.status === 'learning').length);
  console.log("Customers:", workspaces[0].customers.length);
  console.log("Decisions:", workspaces[0].decisions?.length);
}
main().catch(console.error);
