#!/usr/bin/env node

const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testAuth() {
  console.log('Testing Legal Estate Authentication System\n');
  
  try {
    // Test 1: Login
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@legalestate.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('   Token:', token ? token.substring(0, 20) + '...' : 'None');
    console.log('   User:', loginResponse.data.user?.email);
    
    // Test 2: Verify token
    console.log('\n2. Testing token verification...');
    const verifyResponse = await axios.get(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Token verified');
    console.log('   User role:', verifyResponse.data.user?.role);
    
    // Test 3: Dashboard stats with auth
    console.log('\n3. Testing dashboard access...');
    const dashboardResponse = await axios.get(`${API_URL}/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Dashboard accessible');
    console.log('   Case stats:', dashboardResponse.data.caseStats);
    
    console.log('\n✅ All authentication tests passed!');
    
  } catch (error) {
    console.error('❌ Authentication test failed:');
    console.error('   URL:', error.config?.url);
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n⚠️ Possible issues:');
      console.log('   1. Invalid credentials');
      console.log('   2. User not in database');
      console.log('   3. JWT secret mismatch');
    }
  }
}

// Check API availability first
axios.get(`${API_URL}/health`)
  .then(() => {
    console.log('✅ API is running\n');
    testAuth();
  })
  .catch(() => {
    console.error('❌ API is not running on port 3000');
    console.log('   Run: cd /var/www/html/backend && npm start');
  });