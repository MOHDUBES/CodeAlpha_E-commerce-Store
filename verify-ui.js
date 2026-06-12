const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  // Generate a valid JWT for Seller 5 (jain malik, has 35 products)
  const token = jwt.sign({ id: 5, role: 'seller' }, process.env.JWT_SECRET || 'ecommerce_jwt_secret_2024');
  
  // Go to login page to set localStorage
  await page.goto('http://127.0.0.1:3001/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify({ id: 5, name: 'jain malik', role: 'seller', email: 'jainmalik70@gmail.com' }));
  }, token);

  // Navigate to Dashboard
  console.log('Navigating to dashboard...');
  await page.goto('http://127.0.0.1:3001/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  
  // Wait for stats to load
  console.log('Waiting for stats to render...');
  await page.waitForFunction(() => {
    const el = document.getElementById('stat-total-products');
    return el && el.textContent !== '-' && el.textContent !== 'Loading...';
  }, { timeout: 10000 }).catch(e => console.log('Timeout waiting for stats'));

  // Extract UI text
  const uiData = await page.evaluate(() => {
    return {
      profileName: document.getElementById('profile-name')?.textContent,
      profileId: document.getElementById('profile-id')?.textContent,
      profileEmail: document.getElementById('profile-email')?.textContent,
      profileStore: document.getElementById('profile-store')?.textContent,
      totalProducts: document.getElementById('stat-total-products')?.textContent,
      activeListings: document.getElementById('stat-active-listings')?.textContent,
      totalOrders: document.getElementById('stat-total-orders')?.textContent,
      revenue: document.getElementById('stat-total-revenue')?.textContent,
      backToStoreHref: document.getElementById('back-to-store')?.href
    };
  });
  
  console.log('--- ACTUAL BROWSER UI STATE ---');
  console.log(JSON.stringify(uiData, null, 2));
  
  await page.screenshot({ path: 'dashboard-proof.png', fullPage: true });
  console.log('Screenshot saved to dashboard-proof.png');
  
  await browser.close();
})();
