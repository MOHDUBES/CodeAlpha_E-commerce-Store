const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const jsonPath = path.join(__dirname, '../ecommerce.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('No legacy ecommerce.json found. Skipping migration.');
    return;
  }

  console.log('Migrating data from ecommerce.json...');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Migrate Users
  if (data.users) {
    for (const u of data.users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role || 'user',
        }
      });
    }
    console.log('✅ Users migrated');
  }

  // Migrate Products
  if (data.products) {
    for (const p of data.products) {
      await prisma.product.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          sellerId: p.seller_id,
          name: p.name,
          description: p.description,
          price: p.price,
          originalPrice: p.original_price,
          discountPercentage: p.discount_percentage,
          isDealOfDay: p.is_deal_of_day,
          category: p.category,
          stock: p.stock,
          image: p.image,
          images: JSON.stringify(p.images || []),
          features: JSON.stringify(p.features || []),
          brand: p.brand,
          soldBy: p.sold_by,
          rating: p.rating,
          reviews: p.reviews,
        }
      });
    }
    console.log('✅ Products migrated');
  }

  // Migrate Orders
  if (data.orders) {
    for (const o of data.orders) {
      await prisma.order.upsert({
        where: { id: o.id },
        update: {},
        create: {
          id: o.id,
          userId: o.user_id,
          total: o.total,
          name: o.name,
          email: o.email,
          address: o.address,
          city: o.city,
          paymentMethod: o.payment_method,
          status: o.status,
          cancelReason: o.cancel_reason,
          hiddenBySeller: JSON.stringify(o.hidden_by_seller || [])
        }
      });
    }
    console.log('✅ Orders migrated');
  }

  // Migrate OrderItems
  if (data.order_items) {
    for (const oi of data.order_items) {
      await prisma.orderItem.upsert({
        where: { id: oi.id },
        update: {},
        create: {
          id: oi.id,
          orderId: oi.order_id,
          productId: oi.product_id,
          quantity: oi.quantity,
          price: oi.price,
        }
      });
    }
    console.log('✅ Order Items migrated');
  }

  console.log('🎉 Migration Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
