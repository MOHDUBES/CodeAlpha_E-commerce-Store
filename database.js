const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ecommerce.json');

const DEFAULT_DB = {
  users: [], products: [], cart: [], orders: [], order_items: [],
  reset_tokens: [],
  _ids: { users: 1, products: 1, cart: 1, orders: 1, order_items: 1 }
};

let memoryDB = null;

function loadDB() {
  if (memoryDB) return memoryDB;
  
  try {
    if (fs.existsSync(DB_PATH)) {
      memoryDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      return memoryDB;
    }
  } catch (e) {}
  
  memoryDB = JSON.parse(JSON.stringify(DEFAULT_DB));
  return memoryDB;
}

function saveDB(db) {
  memoryDB = db;
  // Write asynchronously to not block the event loop
  fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), (err) => {
    if (err) console.error('Failed to save DB:', err);
  });
}

function nextId(db, table) {
  const id = db._ids[table]++;
  saveDB(db);
  return id;
}

// ===== USERS =====
function getUserByEmail(email) {
  return loadDB().users.find(u => u.email === email) || null;
}
function getUserById(id) {
  return loadDB().users.find(u => u.id === Number(id)) || null;
}
function createUser(name, email, password) {
  const db = loadDB();
  const id = db._ids.users++;
  db.users.push({ id, name, email, password, wishlist: [], created_at: new Date().toISOString() });
  saveDB(db);
  return { lastInsertRowid: id };
}

// ===== WISHLIST =====
function toggleWishlist(userId, productId) {
  const db = loadDB();
  const user = db.users.find(u => u.id === Number(userId));
  if (!user) return null;
  if (!user.wishlist) user.wishlist = [];
  
  const pId = Number(productId);
  const index = user.wishlist.indexOf(pId);
  let added = false;
  if (index === -1) {
    user.wishlist.push(pId);
    added = true;
  } else {
    user.wishlist.splice(index, 1);
  }
  saveDB(db);
  return { added, wishlist: user.wishlist };
}

function getWishlist(userId) {
  const db = loadDB();
  const user = db.users.find(u => u.id === Number(userId));
  if (!user || !user.wishlist) return [];
  return user.wishlist.map(pId => db.products.find(p => p.id === pId)).filter(Boolean);
}

function updateProfile(id, name, email) {
  const db = loadDB();
  const user = db.users.find(u => u.id === Number(id));
  if (!user) return null;
  const existing = db.users.find(u => u.email === email && u.id !== Number(id));
  if (existing) return { error: 'Email already in use' };
  user.name = name;
  user.email = email;
  saveDB(db);
  return user;
}

// ===== PRODUCTS =====
function getProducts({ search, category, sort } = {}) {
  let products = [...loadDB().products];
  if (search) {
    const s = search.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s)
    );
  }
  if (category && category !== 'All')
    products = products.filter(p => p.category === category);
  if (sort === 'price_asc') products.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') products.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') products.sort((a, b) => b.rating - a.rating);
  return products;
}
function getProductById(id) {
  return loadDB().products.find(p => p.id === Number(id)) || null;
}
function getCategories() {
  const cats = [...new Set(loadDB().products.map(p => p.category))];
  return ['All', ...cats];
}

// ===== CART =====
function getCartItems(userId, sessionId) {
  const db = loadDB();
  let items = userId
    ? db.cart.filter(c => c.user_id === Number(userId))
    : db.cart.filter(c => c.session_id === (sessionId || ''));
  return items.map(c => {
    const p = db.products.find(p => p.id === c.product_id);
    if (!p) return null;
    return { id: c.id, quantity: c.quantity, product_id: p.id, name: p.name, price: p.price, image: p.image, stock: p.stock };
  }).filter(Boolean);
}
function addToCart(userId, sessionId, productId, quantity = 1) {
  const db = loadDB();
  const pid = Number(productId);
  let existing = userId
    ? db.cart.find(c => c.user_id === Number(userId) && c.product_id === pid)
    : db.cart.find(c => c.session_id === (sessionId || '') && c.product_id === pid);
  if (existing) {
    existing.quantity += Number(quantity);
  } else {
    db.cart.push({ id: db._ids.cart++, user_id: userId ? Number(userId) : null, session_id: sessionId || '', product_id: pid, quantity: Number(quantity) });
  }
  saveDB(db);
}
function updateCartItem(id, quantity) {
  const db = loadDB();
  if (Number(quantity) <= 0) {
    db.cart = db.cart.filter(c => c.id !== Number(id));
  } else {
    const item = db.cart.find(c => c.id === Number(id));
    if (item) item.quantity = Number(quantity);
  }
  saveDB(db);
}
function removeCartItem(id) {
  const db = loadDB();
  db.cart = db.cart.filter(c => c.id !== Number(id));
  saveDB(db);
}
function clearCart(userId, sessionId) {
  const db = loadDB();
  db.cart = userId
    ? db.cart.filter(c => c.user_id !== Number(userId))
    : db.cart.filter(c => c.session_id !== (sessionId || ''));
  saveDB(db);
}

// ===== ORDERS =====
function createOrder({ userId, total, name, email, address, city, payment_method, items, sessionId }) {
  const db = loadDB();
  const orderId = db._ids.orders++;
  db.orders.push({ id: orderId, user_id: userId ? Number(userId) : null, total, name, email, address, city, payment_method: payment_method || 'card', status: 'confirmed', created_at: new Date().toISOString() });
  for (const item of items) {
    const p = db.products.find(p => p.id === Number(item.product_id));
    if (p) db.order_items.push({ id: db._ids.order_items++, order_id: orderId, product_id: Number(item.product_id), quantity: item.quantity, price: p.price });
  }
  db.cart = userId
    ? db.cart.filter(c => c.user_id !== Number(userId))
    : db.cart.filter(c => c.session_id !== (sessionId || ''));
  saveDB(db);
  return { orderId, total };
}
function getOrdersByUser(userId, email) {
  const db = loadDB();
  let orders = userId
    ? db.orders.filter(o => o.user_id === Number(userId))
    : email ? db.orders.filter(o => o.email === email) : [];
  orders = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return orders.map(order => ({
    ...order,
    items: db.order_items.filter(oi => oi.order_id === order.id).map(oi => {
      const p = db.products.find(p => p.id === oi.product_id);
      return { ...oi, name: p?.name, image: p?.image };
    })
  }));
}
function getOrderById(id) {
  const db = loadDB();
  const order = db.orders.find(o => o.id === Number(id));
  if (!order) return null;
  return {
    ...order,
    items: db.order_items.filter(oi => oi.order_id === order.id).map(oi => {
      const p = db.products.find(p => p.id === oi.product_id);
      return { ...oi, name: p?.name, image: p?.image };
    })
  };
}
function cancelOrder(orderId, userId, reason) {
  const db = loadDB();
  const order = db.orders.find(o => o.id === Number(orderId) && o.user_id === Number(userId));
  if (!order) return false;
  if (order.status === 'cancelled') return false;
  
  order.status = 'cancelled';
  order.cancel_reason = reason || 'Not specified';
  // Optional: Restore stock
  // const items = db.order_items.filter(oi => oi.order_id === order.id);
  // for (const item of items) {
  //   const p = db.products.find(p => p.id === item.product_id);
  //   if (p) p.stock += item.quantity;
  // }
  
  saveDB(db);
  return true;
}

// ===== SEED =====
function seed() {
  const db = loadDB();
  if (db.products.length > 0) return;
  const products = [
    { name: 'Wireless Noise-Cancelling Headphones', description: 'Premium audio experience with 30hr battery life, active noise cancellation, and crystal-clear sound.', price: 2999, image: '/images/product-1.jpg', category: 'Electronics', stock: 50, rating: 4.8, reviews: 2341 },
    { name: 'Smart Fitness Watch', description: 'Track your health 24/7 with heart rate, SpO2, sleep tracking, and 100+ workout modes.', price: 4499, image: '/images/product-2.jpg', category: 'Electronics', stock: 35, rating: 4.6, reviews: 1876 },
    { name: 'Premium Leather Wallet', description: 'Handcrafted genuine leather wallet with RFID protection and slim profile design.', price: 899, image: '/images/product-3.jpg', category: 'Fashion', stock: 80, rating: 4.5, reviews: 654 },
    { name: 'Mechanical Keyboard', description: 'RGB backlit mechanical keyboard with tactile switches, N-key rollover for gaming.', price: 3499, image: '/images/product-4.jpg', category: 'Electronics', stock: 25, rating: 4.7, reviews: 987 },
    { name: 'Running Shoes Pro', description: 'Lightweight, breathable mesh upper with responsive foam midsole for maximum comfort.', price: 5999, image: '/images/product-5.jpg', category: 'Fashion', stock: 60, rating: 4.4, reviews: 1234 },
    { name: 'Stainless Steel Bottle', description: 'Double-wall vacuum insulated, keeps drinks cold 24hrs / hot 12hrs. BPA-free.', price: 699, image: '/images/product-6.jpg', category: 'Lifestyle', stock: 100, rating: 4.3, reviews: 432 },
    { name: 'Wireless Charging Pad', description: 'Fast 15W Qi wireless charging compatible with all Qi-enabled devices.', price: 1299, image: '/images/product-7.jpg', category: 'Electronics', stock: 45, rating: 4.5, reviews: 765 },
    { name: 'Backpack Pro 30L', description: 'Waterproof laptop backpack with USB charging port, anti-theft pockets.', price: 2499, image: '/images/product-8.jpg', category: 'Lifestyle', stock: 40, rating: 4.6, reviews: 543 },
    { name: 'Sunglasses UV400', description: 'Polarized lenses with UV400 protection, lightweight titanium frame.', price: 1799, image: '/images/product-9.jpg', category: 'Fashion', stock: 55, rating: 4.2, reviews: 321 },
    { name: 'Portable Bluetooth Speaker', description: 'IPX7 waterproof, 360° surround sound, 20hr playtime, voice assistant support.', price: 3299, image: '/images/product-10.jpg', category: 'Electronics', stock: 30, rating: 4.7, reviews: 876 },
    { name: 'Yoga Mat Premium', description: 'Non-slip, eco-friendly TPE material, 6mm thickness, includes carrying strap.', price: 1199, image: '/images/product-11.jpg', category: 'Lifestyle', stock: 70, rating: 4.4, reviews: 287 },
    { name: 'Coffee Maker Deluxe', description: 'Programmable 12-cup coffee maker with built-in grinder and thermal carafe.', price: 6499, image: '/images/product-12.jpg', category: 'Lifestyle', stock: 20, rating: 4.8, reviews: 1102 },
    { name: 'Minimalist Card Holder', description: 'Ultra-slim leather card holder with RFID blocking and quick-access slot.', price: 499, image: '/images/product-3.jpg', category: 'Fashion', stock: 120, rating: 4.5, reviews: 342 },
    { name: 'Ergonomic Mouse', description: 'Wireless ergonomic vertical mouse to reduce wrist strain, 2.4GHz & Bluetooth.', price: 1599, image: '/images/product-4.jpg', category: 'Electronics', stock: 45, rating: 4.6, reviews: 892 },
    { name: 'Comfort Running Socks', description: 'Pack of 3 breathable athletic socks with arch support and cushioned heel.', price: 399, image: '/images/product-5.jpg', category: 'Fashion', stock: 200, rating: 4.7, reviews: 156 },
    { name: 'Travel Coffee Mug', description: '16oz insulated travel mug with leak-proof lid. Perfect for daily commutes.', price: 899, image: '/images/product-6.jpg', category: 'Lifestyle', stock: 85, rating: 4.8, reviews: 541 },
    { name: 'Magnetic Phone Mount', description: 'Universal car air vent magnetic phone holder with 360-degree rotation.', price: 599, image: '/images/product-7.jpg', category: 'Electronics', stock: 150, rating: 4.3, reviews: 211 },
    { name: 'Weekend Duffle Bag', description: 'Spacious canvas duffle bag with shoe compartment and water-resistant lining.', price: 2199, image: '/images/product-8.jpg', category: 'Lifestyle', stock: 30, rating: 4.9, reviews: 423 },
    { name: 'Aviator Sunglasses', description: 'Classic aviator style sunglasses with gold metal frame and UV400 polarized lenses.', price: 1499, image: '/images/product-9.jpg', category: 'Fashion', stock: 65, rating: 4.6, reviews: 312 },
    { name: 'Resistance Bands Set', description: '5-piece stackable resistance bands with handles, ankle straps, and door anchor.', price: 1499, image: '/images/product-11.jpg', category: 'Lifestyle', stock: 65, rating: 4.5, reviews: 320 }
  ].map((p, idx) => {
    const markup = 1.2 + (Math.random() * 0.4);
    const original_price = Math.round((p.price * markup) / 100) * 100 - 1;
    const discount_percentage = Math.round(((original_price - p.price) / original_price) * 100);
    const is_deal_of_day = idx < 4;
    
    // Add rich Amazon-style details
    const extraImages = [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1546435770-a3e426fac365?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=800&fit=crop',
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&h=800&fit=crop'
    ];
    const images = [p.image, ...extraImages.slice(0, 3)];
    
    const brands = ['Sony', 'Samsung', 'LG', 'Nike', 'Adidas', 'Puma', 'Apple', 'Bose'];
    const brand = brands[idx % brands.length];
    const sold_by = 'Appario Retail Private Ltd';
    
    const features = [
      'Premium build quality with durable materials for long-lasting use.',
      'Designed specifically to meet modern aesthetic and functional needs.',
      'Backed by a comprehensive 1-year manufacturer warranty.',
      'Extensively tested for reliability and performance under extreme conditions.',
      '100% Genuine and authenticated product directly from the manufacturer.'
    ];

    return { ...p, original_price, discount_percentage, is_deal_of_day, images, brand, sold_by, features };
  });

  products.forEach(p => {
    db.products.push({ id: db._ids.products++, ...p, created_at: new Date().toISOString() });
  });
  saveDB(db);
  console.log('✅ Database seeded');
}

// ===== RESET TOKENS =====
function createResetToken(email, otp) {
  const db = loadDB();
  if (!db.reset_tokens) db.reset_tokens = [];
  db.reset_tokens = db.reset_tokens.filter(t => t.email !== email);
  const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.reset_tokens.push({ email, otp, expiry });
  saveDB(db);
}
function verifyResetToken(email, otp) {
  const db = loadDB();
  if (!db.reset_tokens) return false;
  const record = db.reset_tokens.find(t => t.email === email && t.otp === otp);
  if (!record) return false;
  if (new Date() > new Date(record.expiry)) return false; // expired
  return true;
}
function deleteResetToken(email) {
  const db = loadDB();
  if (!db.reset_tokens) return;
  db.reset_tokens = db.reset_tokens.filter(t => t.email !== email);
  saveDB(db);
}
function updatePassword(email, hashedPassword) {
  const db = loadDB();
  const user = db.users.find(u => u.email === email);
  if (!user) return false;
  user.password = hashedPassword;
  saveDB(db);
  return true;
}

seed();

module.exports = { getUserByEmail, getUserById, createUser, updateProfile, getProducts, getProductById, getCategories, getCartItems, addToCart, updateCartItem, removeCartItem, clearCart, createOrder, getOrdersByUser, getOrderById, cancelOrder, createResetToken, verifyResetToken, deleteResetToken, updatePassword, getWishlist, toggleWishlist };
