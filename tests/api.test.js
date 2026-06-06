const request = require('supertest');
const app = require('../server');

describe('E-Commerce API Tests', () => {
  let token;

  describe('Auth Routes', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: `test${Date.now()}@example.com`,
          password: 'password123'
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });

    it('should login an existing user', async () => {
      const email = `testlogin${Date.now()}@example.com`;
      await request(app).post('/api/auth/register').send({
        name: 'Login User', email, password: 'password123'
      });
      
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'password123' });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      token = res.body.token;
    });

    it('should fetch profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('email');
    });
  });

  describe('Products Routes', () => {
    it('should get all products', async () => {
      const res = await request(app).get('/api/products');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBeTruthy();
    });
  });
});
