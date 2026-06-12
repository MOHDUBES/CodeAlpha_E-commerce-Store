const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ecommerce.json');

try {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  
  // Find the first seller
  const seller = db.users.find(u => u.role === 'seller');
  
  if (!seller) {
    console.log('No seller account found. Please register as a seller first.');
    process.exit(1);
  }
  
  let updatedCount = 0;
  // Update all products
  db.products.forEach(p => {
    // We can overwrite existing seller_id or only set if undefined
    p.seller_id = seller.id;
    updatedCount++;
  });
  
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log(`Successfully assigned ${updatedCount} products to seller: ${seller.name} (ID: ${seller.id})`);
} catch (err) {
  console.error('Error updating DB:', err);
}
