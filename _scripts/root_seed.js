const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const data = JSON.parse(fs.readFileSync('./ecommerce.json', 'utf8'));

  console.log('Seeding users...');
  for (const u of data.users) {
    try {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role || 'user',
          createdAt: new Date(u.created_at || Date.now())
        }
      });
    } catch (e) { console.error('Error user', u.email, e.message); }
  }

  console.log('Seeding products...');
  for (const p of data.products) {
    try {
      await prisma.product.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: p.price,
          originalPrice: p.original_price || null,
          discountPercentage: p.discount_percentage || null,
          image: p.image,
          images: JSON.stringify(p.images || [p.image]),
          category: p.category,
          brand: p.brand || null,
          soldBy: p.sold_by || null,
          stock: p.stock || 0,
          rating: p.rating || 0,
          reviews: p.reviews || 0,
          isDealOfDay: p.is_deal_of_day || false,
          features: JSON.stringify(p.features || []),
          sellerId: p.seller_id || 7, // Fallback to test seller
          createdAt: new Date(p.created_at || Date.now())
        }
      });
    } catch (e) { console.error('Error product', p.id, e.message); }
  }

  console.log('Seeding orders...');
  for (const o of data.orders || []) {
    try {
      const itemsForOrder = (data.order_items || []).filter(i => i.order_id === o.id);
      
      await prisma.order.upsert({
        where: { id: o.id },
        update: {},
        create: {
          id: o.id,
          userId: o.user_id,
          name: o.name,
          email: o.email,
          address: o.address,
          city: o.city,
          paymentMethod: o.payment_method,
          total: o.total,
          status: o.status || 'confirmed',
          cancelReason: o.cancel_reason || null,
          hiddenBySeller: o.hidden_by_seller ? JSON.stringify(o.hidden_by_seller) : '[]',
          createdAt: new Date(o.created_at || Date.now()),
          items: {
            create: itemsForOrder.map(i => ({
              productId: i.product_id,
              quantity: i.quantity,
              price: i.price || 0
            }))
          }
        }
      });
    } catch (e) { console.error('Error order', o.id, e.message); }
  }

  console.log('Seeding wishlist items...');
  for (const u of data.users) {
    if (u.wishlist && u.wishlist.length > 0) {
      for (const wid of u.wishlist) {
        try {
          await prisma.wishlistItem.upsert({
            where: { userId_productId: { userId: u.id, productId: wid } },
            update: {},
            create: { userId: u.id, productId: wid }
          });
        } catch (e) { }
      }
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
