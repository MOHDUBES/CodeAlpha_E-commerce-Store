// Shared utilities
const API = '/api';

// Theme management
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.innerHTML = theme === 'light' ? 'Dark Mode' : 'Light Mode';
}
function toggleTheme() {
  const current = localStorage.getItem('theme') || 'dark';
  applyTheme(current === 'light' ? 'dark' : 'light');
}

// Session ID for guest cart
function getSessionId() {
  let sid = localStorage.getItem('session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substr(2, 12);
    localStorage.setItem('session_id', sid);
  }
  return sid;
}

// Auth helpers
function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}
function getToken() { return localStorage.getItem('token'); }
function isLoggedIn() { return !!getToken(); }

// API headers
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  const user = getUser();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (user) {
    headers['x-user-id'] = user.id;
    headers['x-user-email'] = user.email;
  }
  return headers;
}

// Cart count updater
async function updateCartCount() {
  try {
    const user = getUser();
    let url = `${API}/cart?session_id=${getSessionId()}`;
    const res = await fetch(url, { headers: getHeaders() });
    const items = await res.json();
    const count = items.reduce((s, i) => s + i.quantity, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  } catch {}
}

// Toast notification
function showToast(msg, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-icon"></span><span class="toast-msg"></span>`;
    document.body.appendChild(toast);
  }
  const icons = { success: '✅', error: '❌', info: 'ℹ️', cart: '🛒' };
  toast.querySelector('.toast-icon').textContent = icons[type] || '✅';
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Add to cart
async function addToCart(productId, qty = 1) {
  try {
    const res = await fetch(`${API}/cart/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        product_id: productId,
        quantity: qty,
        session_id: getSessionId()
      })
    });
    if (res.ok) {
      showToast('Added to cart!', 'cart');
      updateCartCount();
    }
  } catch {
    showToast('Failed to add to cart', 'error');
  }
}

// Navbar auth update
function updateNavAuth() {
  const user = getUser();
  const authEl = document.getElementById('nav-auth');
  const heroBtn = document.getElementById('hero-register-btn');
    if (user) {
      document.getElementById('nav-auth').innerHTML = `
        <span class="hide-mobile" style="font-size:0.9rem;font-weight:500">Hi, ${user.name.split(' ')[0]}</span>
        <button onclick="window.location='/settings'" class="btn btn-outline btn-sm" style="margin-left:0.5rem; border:none; padding: 0.3rem;">⚙️</button>
      `;
    } else {
      document.getElementById('nav-auth').innerHTML = `<button onclick="window.location='/login'" class="btn btn-outline btn-sm">Login</button>`;
    }
  }

// Global Wishlist handler
let userWishlistIds = [];
async function fetchUserWishlist() {
  if (!isLoggedIn()) return;
  try {
    const res = await fetch(`${API}/wishlist`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
    const data = await res.json();
    if (data.wishlist) {
      userWishlistIds = data.wishlist.map(p => p.id);
    }
  } catch(e) {}
}

async function toggleWishlist(productId, btnElement) {
  if (!isLoggedIn()) {
    showToast('Please login to add to wishlist');
    setTimeout(() => window.location='/login', 1500);
    return;
  }
  btnElement.style.transform = 'scale(0.8)';
  try {
    const res = await fetch(`${API}/wishlist/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ productId })
    });
    const data = await res.json();
    
    if (!res.ok) {
      if (data.error === 'Failed to update wishlist') {
        // This often happens if the user was deleted from DB but token is still active
        showToast('Session expired or invalid. Please login again.', 'error');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => window.location = '/login', 2000);
      } else {
        showToast(data.error || 'Failed to update wishlist', 'error');
      }
      setTimeout(() => btnElement.style.transform = 'scale(1)', 200);
      return;
    }

    if (data.added) {
      btnElement.classList.add('active');
      btnElement.innerHTML = '❤️';
      showToast('Added to wishlist', 'success');
      userWishlistIds.push(productId);
    } else {
      btnElement.classList.remove('active');
      btnElement.innerHTML = '🤍';
      showToast('Removed from wishlist');
      userWishlistIds = userWishlistIds.filter(id => id !== productId);
    }
  } catch (err) {
    showToast('Failed to update wishlist', 'error');
  }
  setTimeout(() => btnElement.style.transform = 'scale(1)', 200);
}

// Global Create Product Card
function createProductCardHTML(p) {
  const isWished = userWishlistIds.includes(p.id);
  const wishIcon = isWished ? '❤️' : '🤍';
  const wishClass = isWished ? 'active' : '';
  
  return `
    <div class="product-card">
      <button class="wishlist-btn ${wishClass}" onclick="event.preventDefault(); toggleWishlist(${p.id}, this)">${wishIcon}</button>
      <a href="/product?id=${p.id}" style="text-decoration:none;color:inherit">
        <img src="${p.image}" alt="${p.name}" class="product-image">
        <div class="product-info">
          <div style="font-size:0.8rem;color:var(--accent);margin-bottom:0.3rem;font-weight:600">${p.category}</div>
          <h3 class="product-name">${p.name}</h3>
          <div class="product-rating">
            <span class="star">★</span> ${p.rating} 
            <span style="color:var(--text-muted);font-size:0.8rem;margin-left:4px">(${p.reviews})</span>
          </div>
          <div class="price-container">
            <span class="product-price">₹${p.price.toLocaleString()}</span>
            ${p.original_price ? `<span class="price-original">₹${p.original_price.toLocaleString()}</span>` : ''}
            ${p.discount_percentage ? `<span class="discount-badge">${p.discount_percentage}% OFF</span>` : ''}
          </div>
          <button class="btn btn-primary add-cart-btn" style="width:100%" onclick="event.preventDefault(); addToCart(${p.id})">
            Add to Cart
          </button>
        </div>
      </a>
    </div>
  `;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

// Format price
function formatPrice(p) {
  return '₹' + Number(p).toLocaleString('en-IN');
}

// Star rating
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = '★'.repeat(full);
  if (half) stars += '½';
  stars += '☆'.repeat(5 - full - (half ? 1 : 0));
  return stars;
}

// Navbar HTML
function renderNavbar(activePage = '') {
  return `
    <nav class="navbar">
      <a href="/" style="text-decoration:none">
        <div class="navbar-brand">ShopVerse</div>
      </a>
      <div class="navbar-search">
        <input type="text" class="search-input" id="search-input" placeholder="Search for products, brands and more..." 
            ${activePage === 'home' ? 'oninput="filterProducts()"' : 'onkeydown="if(event.key===\'Enter\') window.location=\'/?q=\'+this.value"'}>
      </div>
      <div class="navbar-actions" style="gap: 0.5rem;">
        <div id="nav-auth"></div>
        <a href="/cart" class="cart-btn" style="padding: 0.4rem 0.6rem;">
          🛒<span class="hide-mobile" style="margin-left:4px">Cart</span> <span class="cart-count" id="cart-badge" style="display:none">0</span>
        </a>
      </div>
    </nav>
  `;
}

// Init on every page
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
  updateNavAuth();
  updateCartCount();
});
