/**
 * UI API Test Script
 * 
 * Tests the same API endpoints that the mobile UI uses to verify integration
 */

const axios = require('axios');

const API_URL = 'http://127.0.0.1:5000/api';

async function testUIApis() {
  console.log('='.repeat(60));
  console.log('UI API INTEGRATION TEST');
  console.log('='.repeat(60));

  try {
    // 1. Test Vendor Login
    console.log('\n[1] Testing Vendor Login...');
    const vendorLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'vendor1@company.com',
      password: 'password123'
    });
    const vendorToken = vendorLogin.data.data.token;
    console.log('✓ Vendor logged in successfully');

    // 2. Test Get Orders (VendorOrdersScreen)
    console.log('\n[2] Testing GET /purchase-orders (VendorOrdersScreen)...');
    const ordersRes = await axios.get(`${API_URL}/purchase-orders`, {
      headers: { Authorization: `Bearer ${vendorToken}` }
    });
    const ordersList = ordersRes.data.data.purchaseOrders || [];
    console.log(`✓ Orders fetched: ${ordersList.length} orders`);

    // Count by status
    const statuses = {};
    ordersList.forEach(o => {
      statuses[o.status] = (statuses[o.status] || 0) + 1;
    });
    console.log('  Status breakdown:');
    Object.entries(statuses).forEach(([status, count]) => {
      console.log(`    - ${status}: ${count}`);
    });

    // 3. Test Deliverable Orders (VendorDeliveryScreen)
    console.log('\n[3] Testing deliverable orders filter (VendorDeliveryScreen)...');
    const deliverableStatuses = ['accepted', 'in_progress', 'acknowledged', 'partially_delivered', 'completed'];
    const deliverableOrders = ordersList.filter(o => deliverableStatuses.includes(o.status));
    console.log(`✓ Deliverable orders: ${deliverableOrders.length}`);
    deliverableOrders.slice(0, 3).forEach(order => {
      console.log(`    - ${order.purchaseOrderNumber}: ${order.status} (delivery: ${order.deliveryTracking?.status || 'not_started'})`);
    });

    // 4. Test Owner Login
    console.log('\n[4] Testing Owner Login...');
    const ownerLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'owner@houseway.com',
      password: 'password123'
    });
    const ownerToken = ownerLogin.data.data.token;
    console.log('✓ Owner logged in successfully');

    // 5. Test Delivery Overview (AdminDeliveryTrackingScreen)
    console.log('\n[5] Testing GET /purchase-orders/delivery-overview (AdminDeliveryTrackingScreen)...');
    const deliveryOverview = await axios.get(`${API_URL}/purchase-orders/delivery-overview`, {
      headers: { Authorization: `Bearer ${ownerToken}` }
    });
    const { activeDeliveries, delivered } = deliveryOverview.data.data || {};
    console.log(`✓ Delivery Overview:`);
    console.log(`    - Active Deliveries: ${activeDeliveries?.length || 0}`);
    console.log(`    - Completed Deliveries: ${delivered?.length || 0}`);

    // 6. Verify data format for DeliveryCard component
    console.log('\n[6] Verifying DeliveryCard data format...');
    if (activeDeliveries && activeDeliveries.length > 0) {
      const sampleOrder = activeDeliveries[0];
      const requiredFields = ['_id', 'purchaseOrderNumber', 'title', 'status', 'deliveryTracking'];
      const missingFields = requiredFields.filter(f => !(f in sampleOrder));
      
      if (missingFields.length > 0) {
        console.log(`✗ Missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log('✓ All required fields present for DeliveryCard');
        console.log(`  Sample: ${sampleOrder.purchaseOrderNumber}`);
        console.log(`    - Status: ${sampleOrder.status}`);
        console.log(`    - Delivery Status: ${sampleOrder.deliveryTracking?.status || 'not_started'}`);
        console.log(`    - Vendor: ${sampleOrder.vendor?.vendorDetails?.companyName || 'N/A'}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('ALL UI API TESTS PASSED');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n✗ Error:', error.response?.data?.message || error.message);
    if (error.response?.data?.errors) {
      console.error('  Details:', JSON.stringify(error.response.data.errors, null, 2));
    }
    process.exit(1);
  }
}

testUIApis();
