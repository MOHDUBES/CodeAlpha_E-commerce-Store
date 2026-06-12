const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ecommerce.json');

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

const newProducts = [
  // Bed Linen & Furnishing
  { name: 'Luxury Cotton Bedsheet Set', price: 1499, original_price: 2999, category: 'home', image: 'https://images.unsplash.com/photo-1522771730849-fb3c706de818?auto=format&fit=crop&w=800&q=80', stock: 50, rating: 4.5, description: 'Premium 300 TC cotton double bedsheet with 2 pillow covers.' },
  { name: 'Plush Microfiber Blanket', price: 1999, original_price: 3499, category: 'home', image: 'https://images.unsplash.com/photo-1580828369018-932f91b5c4df?auto=format&fit=crop&w=800&q=80', stock: 30, rating: 4.8, description: 'Ultra-soft, warm, and lightweight microfiber blanket for winter.' },
  { name: 'Orthopedic Memory Foam Pillow', price: 999, original_price: 1599, category: 'home', image: 'https://images.unsplash.com/photo-1629949009765-40f01ceef856?auto=format&fit=crop&w=800&q=80', stock: 40, rating: 4.6, description: 'Ergonomic memory foam pillow for neck pain relief.' },

  // Bath
  { name: 'Egyptian Cotton Bath Towel', price: 599, original_price: 1299, category: 'home', image: 'https://images.unsplash.com/photo-1616627547584-bf28cee262db?auto=format&fit=crop&w=800&q=80', stock: 100, rating: 4.7, description: 'Highly absorbent and soft luxury bath towel.' },
  { name: 'Ceramic Bathroom Accessory Set', price: 899, original_price: 1499, category: 'home', image: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=800&q=80', stock: 25, rating: 4.4, description: '4-piece ceramic set including soap dispenser, toothbrush holder, and tumbler.' },

  // Home Decor
  { name: 'Artificial Indoor Plant with Pot', price: 499, original_price: 899, category: 'home', image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80', stock: 80, rating: 4.5, description: 'Realistic artificial Monstera plant in a ceramic pot.' },
  { name: 'Scented Soy Wax Candles (Set of 3)', price: 699, original_price: 1199, category: 'home', image: 'https://images.unsplash.com/photo-1602874801007-bd458cb6c975?auto=format&fit=crop&w=800&q=80', stock: 60, rating: 4.8, description: 'Lavender, Vanilla, and Sandalwood scented candles for relaxation.' },
  { name: 'Minimalist Wall Clock', price: 1299, original_price: 2499, category: 'home', image: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=800&q=80', stock: 45, rating: 4.3, description: 'Silent sweep modern wall clock for living room.' },
  { name: 'Decorative Ceramic Vase', price: 799, original_price: 1499, category: 'home', image: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=800&q=80', stock: 35, rating: 4.6, description: 'Handcrafted ceramic vase for dry flowers.' },

  // Lamps & Lighting
  { name: 'Vintage Edison Floor Lamp', price: 2499, original_price: 4999, category: 'home', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80', stock: 20, rating: 4.9, description: 'Industrial style floor lamp with warm ambient lighting.' },
  { name: 'Crystal Table Lamp', price: 1599, original_price: 2999, category: 'home', image: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80', stock: 30, rating: 4.7, description: 'Elegant crystal table lamp for bedside.' },

  // Kitchen & Table
  { name: 'Premium Ceramic Dinnerware Set', price: 3499, original_price: 5999, category: 'home', image: 'https://images.unsplash.com/photo-1615876234886-fd9a39fda97f?auto=format&fit=crop&w=800&q=80', stock: 15, rating: 4.8, description: '16-piece dinner set with a modern matte finish.' },
  { name: 'Non-Stick Cookware Set', price: 2999, original_price: 4599, category: 'home', image: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=800&q=80', stock: 25, rating: 4.5, description: '3-piece non-stick induction compatible cookware set.' },
  { name: 'Glass Coffee Mugs (Set of 4)', price: 599, original_price: 999, category: 'home', image: 'https://images.unsplash.com/photo-1514432324607-a2ebd0c11586?auto=format&fit=crop&w=800&q=80', stock: 50, rating: 4.6, description: 'Clear glass mugs for hot and cold beverages.' },

  // Furniture / Cushions
  { name: 'Velvet Cushion Covers (Set of 5)', price: 899, original_price: 1599, category: 'home', image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80', stock: 40, rating: 4.4, description: 'Soft premium velvet cushion covers in vibrant colors.' }
];

for (const p of newProducts) {
  const id = db._ids.products++;
  p.id = id;
  db.products.push(p);
}

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log(`Successfully added ${newProducts.length} new home products!`);
