/**
 * Test admin login and API responses
 * Run with: node scripts/testAdminLogin.js
 */

const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5000/api';
const EMAIL = 'admin@houseway.com'; // Default admin email from seed
const PASSWORD = 'Admin123'; // Default admin password from seed

async function testAdminFlow() {
  console.log('=== Testing Admin Login and API Flow ===\n');
  
  try {
    // 1. Login
    console.log('1. Logging in as', EMAIL);
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, 
      { email: EMAIL, password: PASSWORD },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    
    if (!loginRes.data.success) {
      console.error('❌ Login failed:', loginRes.data.message);
      return;
    }
    
    const token = loginRes.data.data?.token;
    const user = loginRes.data.data?.user;
    console.log('✅ Login successful');
    console.log('   User ID:', user._id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Token (first 20 chars):', token?.substring(0, 20) + '...\n');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // 2. Get All Material Requests
    console.log('2. Fetching all Material Requests');
    const mrs = await axios.get(`${BASE_URL}/material-requests`, {
      params: { limit: 10 },
      headers,
      timeout: 15000
    });
    const allRequests = mrs.data?.data?.materialRequests || [];
    console.log(`✅ Found ${allRequests.length} Material Requests`);
    allRequests.slice(0, 5).forEach((mr, i) => {
      console.log(`   ${i+1}. ID: ${mr._id}`);
      console.log(`      Title: ${mr.title}`);
      console.log(`      Status: ${mr.status}`);
      console.log(`      Project: ${mr.project?.title || 'N/A'}`);
    });
    console.log('');
    
    // 3. Get All Purchase Orders
    console.log('3. Fetching all Purchase Orders');
    const pos = await axios.get(`${BASE_URL}/purchase-orders`, {
      headers,
      timeout: 15000
    });
    const orders = Array.isArray(pos.data?.data) 
      ? pos.data.data 
      : (pos.data?.data?.purchaseOrders || []);
    console.log(`✅ Found ${orders.length} Purchase Orders`);
    orders.slice(0, 5).forEach((po, i) => {
      console.log(`   ${i+1}. PO Number: ${po.purchaseOrderNumber}`);
      console.log(`      Status: ${po.status}`);
      console.log(`      Vendor: ${po.vendor?.firstName || 'N/A'}`);
    });
    console.log('');
    
    // 4. Get Delivery Overview
    console.log('4. Fetching Delivery Overview');
    const deliveryRes = await axios.get(`${BASE_URL}/purchase-orders/delivery/overview`, {
      headers,
      timeout: 15000
    });
    const deliveryData = deliveryRes.data?.data || {};
    const activeCount = (deliveryData.activeDeliveries || []).length;
    const completedCount = (deliveryData.delivered || []).length;
    console.log(`✅ Delivery Overview: ${activeCount} active, ${completedCount} completed\n`);
    
    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Admin: ${EMAIL} (${user._id})`);
    console.log(`Total Material Requests (fetched): ${allRequests.length}`);
    console.log(`Total Purchase Orders: ${orders.length}`);
    console.log(`Active Deliveries: ${activeCount}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Make sure the backend server is running on port 5000');
    }
  }
}

testAdminFlow();
