const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

async function main() {
  const sellerId = 5;
  const seller = await prisma.user.findUnique({ where: { id: sellerId } });
  
  const token = jwt.sign({ id: seller.id, role: 'seller' }, process.env.JWT_SECRET || 'ecommerce_jwt_secret_2024');
  
  console.log('--- FETCHING PROFILE ---');
  const profileRes = await fetch('http://localhost:3001/api/seller/profile', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Profile JSON:', await profileRes.json());
  
  console.log('--- FETCHING DASHBOARD STATS ---');
  const dashRes = await fetch('http://localhost:3001/api/seller/dashboard', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Dashboard JSON:', await dashRes.json());
  
  console.log('--- FETCHING PRODUCTS ---');
  const prodRes = await fetch('http://localhost:3001/api/seller/products', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Products Count:', (await prodRes.json()).length);
}
main();
