const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sellers = await prisma.user.findMany({where: {role: 'seller'}});
  for (let s of sellers) {
    const pCount = await prisma.product.count({where: {sellerId: s.id}});
    console.log(`Seller ${s.id} (${s.email}): ${pCount} products`);
  }
}
main();
