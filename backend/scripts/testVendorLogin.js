/**
 * Test vendor login and API responses
 * Run with: node scripts/testVendorLogin.js
 */

const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5000/api';
const EMAIL = 'vendor1@company.com';
const PASSWORD = 'password123';

async function testVendorFlow() {
  console.log('=== Testing Vendor Login and API Flow ===\n');
  
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
    
    // 2. Get Material Requests (without available flag - assigned to me)
    console.log('2. Fetching assigned Material Requests (no available flag)');
    const mrs1 = await axios.get(`${BASE_URL}/material-requests`, {
      params: { status: 'all', limit: 100 },
      headers,
      timeout: 15000
    });
    const assignedRequests = mrs1.data?.data?.materialRequests || [];
    console.log(`✅ Found ${assignedRequests.length} assigned Material Requests`);
    assignedRequests.forEach((mr, i) => {
      console.log(`   ${i+1}. ID: ${mr._id}`);
      console.log(`      Title: ${mr.title}`);
      console.log(`      Status: ${mr.status}`);
      console.log(`      Project: ${mr.project?.title || 'N/A'}`);
      console.log(`      Assigned Vendors: ${mr.assignedVendors?.length || 0}`);
    });
    console.log('');
    
    // 3. Get Material Requests (available=true - unassigned)
    console.log('3. Fetching available Material Requests (available=true)');
    const mrs2 = await axios.get(`${BASE_URL}/material-requests`, {
      params: { available: 'true', limit: 100 },
      headers,
      timeout: 15000
    });
    const availableRequests = mrs2.data?.data?.materialRequests || [];
    console.log(`✅ Found ${availableRequests.length} available Material Requests\n`);
    
    // 4. Get Purchase Orders
    console.log('4. Fetching Purchase Orders');
    const pos = await axios.get(`${BASE_URL}/purchase-orders`, {
      headers,
      timeout: 15000
    });
    const orders = Array.isArray(pos.data?.data) 
      ? pos.data.data 
      : (pos.data?.data?.purchaseOrders || []);
    console.log(`✅ Found ${orders.length} Purchase Orders`);
    orders.forEach((po, i) => {
      console.log(`   ${i+1}. PO Number: ${po.purchaseOrderNumber}`);
      console.log(`      Status: ${po.status}`);
      console.log(`      Title: ${po.title}`);
    });
    console.log('');
    
    // Summary
    console.log('=== SUMMARY ===');
    console.log(`Vendor: ${EMAIL} (${user._id})`);
    console.log(`Assigned Material Requests: ${assignedRequests.length}`);
    console.log(`Available Material Requests: ${availableRequests.length}`);
    console.log(`Purchase Orders: ${orders.length}`);
    console.log('');
    
    if (assignedRequests.length > 0 && orders.length === 0) {
      console.log('💡 NEXT STEP:');
      console.log('   - The vendor has assigned material requests but no orders yet');
      console.log('   - Orders are created when the vendor accepts a material request');
      console.log('   - Go to Material Requests > Accepted tab > tap "Accept & Create Order"');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   Make sure the backend server is running on port 5000');
    }
  }
}

testVendorFlow();
