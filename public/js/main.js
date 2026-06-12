// Shared utilities
const API = '/api';

// --- Cross-Port Auth Sync ---
const urlParams = new URLSearchParams(window.location.search);
const tokenParam = urlParams.get('token');
const userParam = urlParams.get('user');
const fromSellerParam = urlParams.get('from_seller');

if (tokenParam && userParam) {
  localStorage.setItem('token', tokenParam);
  try {
    localStorage.setItem('user', decodeURIComponent(userParam));
  } catch (e) {}
}

if (fromSellerParam) {
  sessionStorage.setItem('from_seller', 'true');
}

if (tokenParam || fromSellerParam) {
  const cleanUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
  window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
}
// -----------------------------


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
  if (!authEl) return;
  
  if (user) {
    let dashboardLink = '';
    if (user.role === 'seller' && sessionStorage.getItem('from_seller') === 'true') {
      // Create link to port 3001 with auth tokens
      const token = localStorage.getItem('token') || '';
      const userStr = encodeURIComponent(localStorage.getItem('user') || '');
      dashboardLink = `
        <a href="http://127.0.0.1:3001/?token=${token}&user=${userStr}" class="nav-icon-btn" style="color: #D884E0;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line></svg>
          <span class="hide-mobile" style="color: #D884E0;">Dashboard</span>
        </a>
      `;
    }
    
    authEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:1.25rem">
        ${dashboardLink}
        <a href="/settings" class="nav-icon-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span class="hide-mobile">${user.name.split(' ')[0]}</span>
        </a>
      </div>
    `;
  } else {
    authEl.innerHTML = `
      <a href="/login" class="nav-icon-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span class="hide-mobile">Login</span>
      </a>
    `;
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
  <header class="site-header">
    <nav class="top-nav">
      <a href="/" class="brand"><span class="brand-text">Shop<span class="brand-accent">Verse</span></span></a>
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" class="search-box" id="search-input" placeholder="Search for products, brands and more..." 
            ${activePage === 'home' ? 'oninput="filterProducts()"' : 'onkeydown="if(event.key===\'Enter\') window.location=\'/?q=\'+this.value"'}>
      </div>
      <div class="nav-actions">
        <div id="nav-auth"></div>
        <a href="/wishlist" class="nav-icon-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span class="hide-mobile">Wishlist</span>
        </a>
        <a href="/cart" class="nav-icon-btn cart-nav">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span class="hide-mobile">Bag</span>
          <span class="cart-count" style="display:none">0</span>
        </a>
      </div>
    </nav>
  </header>
  `;
}

// Init on every page
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);
  updateNavAuth();
  updateCartCount();
});
