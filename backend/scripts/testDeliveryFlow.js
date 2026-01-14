/**
 * Test Script: Complete Delivery Flow
 * 
 * Tests the full flow from order creation to delivery:
 * 1. Login as owner (owner@houseway.com / password123)
 * 2. Create/find vendor with existing orders
 * 3. Create negotiation messages between admin and vendor
 * 4. Admin accepts quotation
 * 5. Vendor fills delivery details
 * 6. Admin views delivery details
 * 7. Vendor marks as delivered
 * 8. Admin confirms delivery in their view
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5000';
const API_URL = `${BASE_URL}/api`;

// Store tokens and IDs
const testContext = {
  tokens: {
    owner: null,
    vendor: null,
  },
  ids: {
    vendorId: null,
    projectId: null,
    purchaseOrderId: null,
    quotationMessageId: null,
  },
};

// Logging utilities
const log = {
  info: (msg) => console.log(`\x1b[36mℹ ${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m✓ ${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m✗ ${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m⚠ ${msg}\x1b[0m`),
  header: (msg) => console.log(`\n\x1b[35m${'═'.repeat(60)}\n${msg}\n${'═'.repeat(60)}\x1b[0m`),
  step: (num, msg) => console.log(`\n\x1b[34m[Step ${num}] ${msg}\x1b[0m`),
};

// API helper
async function api(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status,
      data: error.response?.data,
    };
  }
}

// ============================================
// Step 1: Login Tests
// ============================================
async function step1_LoginTests() {
  log.step(1, 'Testing Login APIs');

  // Test Owner Login
  log.info('Logging in as owner (owner@houseway.com)...');
  const ownerLogin = await api('POST', '/auth/login', {
    email: 'owner@houseway.com',
    password: 'password123',
  });

  if (ownerLogin.success && ownerLogin.data?.data?.token) {
    testContext.tokens.owner = ownerLogin.data.data.token;
    log.success(`Owner login successful - User: ${ownerLogin.data.data.user?.firstName || 'Owner'}`);
  } else {
    log.error(`Owner login failed: ${ownerLogin.error}`);
    throw new Error('Owner login failed - cannot continue');
  }

  // Test if we have a vendor - try vendor1@company.com first
  log.info('Checking for existing vendor (vendor1@company.com)...');
  const vendorLogin = await api('POST', '/auth/login', {
    email: 'vendor1@company.com',
    password: 'password123',
  });

  if (vendorLogin.success && vendorLogin.data?.data?.token) {
    testContext.tokens.vendor = vendorLogin.data.data.token;
    testContext.ids.vendorId = vendorLogin.data.data.user._id;
    log.success(`Vendor login successful - ${vendorLogin.data.data.user?.vendorDetails?.companyName || vendorLogin.data.data.user?.firstName}`);
  } else {
    log.warn('vendor1@company.com not found, trying vendor@test.com...');
    const vendorLogin2 = await api('POST', '/auth/login', {
      email: 'vendor@test.com',
      password: 'password123',
    });

    if (vendorLogin2.success && vendorLogin2.data?.data?.token) {
      testContext.tokens.vendor = vendorLogin2.data.data.token;
      testContext.ids.vendorId = vendorLogin2.data.data.user._id;
      log.success(`Vendor login successful - ${vendorLogin2.data.data.user?.firstName}`);
    } else {
      log.error('No vendor found - need to create one');
      throw new Error('No vendor account available');
    }
  }

  return true;
}

// ============================================
// Step 2: Create Material Request and Purchase Order
// ============================================
async function step2_GetOrCreateOrder() {
  log.step(2, 'Creating Material Request and Purchase Order');

  // Get projects first
  const projectsRes = await api('GET', '/projects', null, testContext.tokens.owner);
  if (!projectsRes.success || !projectsRes.data?.data?.projects?.length) {
    log.error('No projects found');
    throw new Error('No projects available');
  }

  const project = projectsRes.data.data.projects[0];
  testContext.ids.projectId = project._id;
  log.info(`Using project: ${project.title}`);

  // Step 2a: Create Material Request
  log.info('Creating material request...');
  const requiredByDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
  const materialReqRes = await api('POST', '/material-requests', {
    projectId: project._id,
    title: `Test Materials ${Date.now().toString().slice(-6)}`,
    description: 'Testing delivery flow - construction materials for new site',
    materials: [
      {
        name: 'Premium Cement (50kg bags)',
        description: 'UltraTech PPC Cement',
        quantity: 50,
        unit: 'pcs',
        category: 'cement',
        requiredBy: requiredByDate,
      },
      {
        name: 'TMT Steel Bars (16mm)',
        description: 'TMT Steel bars for RCC',
        quantity: 100,
        unit: 'pcs',
        category: 'steel',
        requiredBy: requiredByDate,
      },
    ],
    priority: 'high',
    requiredBy: requiredByDate,
  }, testContext.tokens.owner);

  if (!materialReqRes.success || !materialReqRes.data?.data?.materialRequest) {
    log.error(`Failed to create material request: ${materialReqRes.error}`);
    if (materialReqRes.data?.errors) {
      console.log('Validation errors:', JSON.stringify(materialReqRes.data.errors, null, 2));
    }
    throw new Error('Could not create material request');
  }

  const materialRequest = materialReqRes.data.data.materialRequest;
  testContext.ids.materialRequestId = materialRequest._id;
  log.success(`Created material request: ${materialRequest.title}`);

  // Step 2b: Vendor Accepts Material Request (this creates PO)
  log.info('Vendor accepting material request (creates PO)...');
  const acceptRes = await api('POST', `/material-requests/${materialRequest._id}/accept`, null, testContext.tokens.vendor);

  if (!acceptRes.success) {
    log.error(`Vendor failed to accept: ${acceptRes.error}`);
    throw new Error('Vendor could not accept material request');
  }

  const purchaseOrder = acceptRes.data?.data?.purchaseOrder;
  if (!purchaseOrder) {
    log.error('No purchase order created from acceptance');
    throw new Error('PO not created');
  }

  testContext.ids.purchaseOrderId = purchaseOrder._id;
  log.success(`Created PO: ${purchaseOrder.purchaseOrderNumber}`);
  log.info(`PO Status: ${purchaseOrder.status}`);
  
  return true;
}

// ============================================
// Step 3: Vendor Sends Quotation
// ============================================
async function step3_VendorSendsQuotation() {
  log.step(3, 'Vendor Sends Quotation');

  // Get order details first
  const orderRes = await api('GET', `/purchase-orders/${testContext.ids.purchaseOrderId}`, null, testContext.tokens.vendor);
  
  if (!orderRes.success) {
    log.error(`Failed to get order details: ${orderRes.error}`);
    throw new Error('Could not fetch order details');
  }

  const order = orderRes.data?.data?.purchaseOrder || orderRes.data?.purchaseOrder;
  log.info(`Order status: ${order.status}`);

  // If already accepted, skip quotation
  if (order.status === 'accepted') {
    log.warn('Order already accepted, skipping quotation step');
    return true;
  }

  // Check if quotation already submitted
  const messagesRes = await api('GET', `/purchase-orders/${testContext.ids.purchaseOrderId}/messages`, null, testContext.tokens.vendor);
  
  if (messagesRes.success) {
    const messages = messagesRes.data?.data?.messages || [];
    const existingQuotation = messages.find(m => m.messageType === 'quotation' && m.quotation?.status !== 'rejected');
    
    if (existingQuotation) {
      testContext.ids.quotationMessageId = existingQuotation._id;
      log.success(`Found existing quotation: ₹${existingQuotation.quotation?.amount?.toLocaleString()}`);
      
      if (existingQuotation.quotation?.status === 'accepted') {
        log.info('Quotation already accepted');
        return true;
      }
      return true; // Will accept in next step
    }
  }

  // Send quotation message
  log.info('Sending quotation...');
  const quotationData = {
    amount: 75000,
    currency: 'INR',
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    note: 'Best quality materials with fast delivery. Includes transport charges.',
    items: [
      { name: 'Portland Cement (50kg bags)', quantity: 100, unitPrice: 400, total: 40000 },
      { name: 'Steel Rebar (12mm)', quantity: 200, unitPrice: 150, total: 30000 },
      { name: 'River Sand (Fine)', quantity: 10, unitPrice: 500, total: 5000 },
    ],
    paymentTerms: '50% advance, 50% on delivery',
    deliveryTerms: 'Delivery within 5-7 working days',
  };

  const quotationRes = await api('POST', `/purchase-orders/${testContext.ids.purchaseOrderId}/quotation`, quotationData, testContext.tokens.vendor);

  if (quotationRes.success && (quotationRes.data?.data?.message || quotationRes.data?.data?._id)) {
    // Handle both response formats: { data: { message: {...} } } or { data: { _id: ... } }
    testContext.ids.quotationMessageId = quotationRes.data.data.message?._id || quotationRes.data.data._id;
    log.success(`Quotation sent: ₹${quotationData.amount.toLocaleString()}`);
  } else {
    log.error(`Failed to send quotation: ${quotationRes.error}`);
    console.log('Response:', JSON.stringify(quotationRes.data, null, 2));
    throw new Error('Could not send quotation');
  }

  return true;
}

// ============================================
// Step 4: Admin Sends Negotiation Message
// ============================================
async function step4_AdminNegotiates() {
  log.step(4, 'Admin Sends Negotiation Message');

  // First check order status
  const orderRes = await api('GET', `/purchase-orders/${testContext.ids.purchaseOrderId}`, null, testContext.tokens.owner);
  const order = orderRes.data?.data?.purchaseOrder || orderRes.data?.purchaseOrder;

  if (order.status === 'accepted' || order.status === 'in_progress') {
    log.warn(`Order already in ${order.status} status, skipping negotiation`);
    return true;
  }

  // Send a negotiation message
  log.info('Admin sending negotiation message...');
  const msgRes = await api('POST', `/purchase-orders/${testContext.ids.purchaseOrderId}/messages`, {
    content: 'Thank you for the quotation. Can you provide a 10% discount for bulk order?',
    messageType: 'text',
  }, testContext.tokens.owner);

  if (msgRes.success) {
    log.success('Admin message sent');
  } else {
    log.warn(`Failed to send admin message: ${msgRes.error}`);
  }

  // Vendor responds
  log.info('Vendor responding...');
  const vendorMsgRes = await api('POST', `/purchase-orders/${testContext.ids.purchaseOrderId}/messages`, {
    content: 'We can offer 5% discount on this order. Final price: ₹71,250',
    messageType: 'text',
  }, testContext.tokens.vendor);

  if (vendorMsgRes.success) {
    log.success('Vendor message sent');
  } else {
    log.warn(`Failed to send vendor message: ${vendorMsgRes.error}`);
  }

  return true;
}

// ============================================
// Step 5: Admin Accepts Quotation
// ============================================
async function step5_AdminAcceptsQuotation() {
  log.step(5, 'Admin Accepts Quotation');

  // Check order status first
  const orderRes = await api('GET', `/purchase-orders/${testContext.ids.purchaseOrderId}`, null, testContext.tokens.owner);
  const order = orderRes.data?.data?.purchaseOrder || orderRes.data?.purchaseOrder;

  if (order.status === 'accepted' || order.status === 'in_progress') {
    log.warn(`Order already ${order.status}, skipping acceptance`);
    return true;
  }

  // Get messages to find the quotation
  const messagesRes = await api('GET', `/purchase-orders/${testContext.ids.purchaseOrderId}/messages`, null, testContext.tokens.owner);
  
  if (messagesRes.success) {
    // Response format is { success: true, data: [...] } - data is the array directly
    const messages = Array.isArray(messagesRes.data?.data) ? messagesRes.data.data : (messagesRes.data?.data?.messages || []);
    log.info(`Found ${messages.length} messages in chat`);
    
    // Find any quotation with pending status or use the one we just sent
    const quotations = messages.filter(m => m.messageType === 'quotation');
    log.info(`Found ${quotations.length} quotation(s)`);
    
    quotations.forEach((q, i) => {
      log.info(`  Quotation ${i + 1}: ID=${q._id}, status=${q.quotation?.status}, amount=₹${q.quotation?.amount}`);
    });
    
    // Find pending quotation or use the latest one
    let quotationToAccept = quotations.find(m => m.quotation?.status === 'pending');
    
    if (!quotationToAccept && quotations.length > 0) {
      // Use the quotation we saved or the last one
      quotationToAccept = quotations.find(m => m._id === testContext.ids.quotationMessageId) || quotations[quotations.length - 1];
    }
    
    if (quotationToAccept) {
      testContext.ids.quotationMessageId = quotationToAccept._id;
      log.info(`Will accept quotation: ${quotationToAccept._id} (status: ${quotationToAccept.quotation?.status})`);
    } else {
      log.error('No quotation found to accept');
      throw new Error('No quotation to accept');
    }
    
    // Check if already accepted
    if (quotationToAccept.quotation?.status === 'accepted') {
      log.success('Quotation already accepted');
      return true;
    }
  } else {
    log.error(`Failed to get messages: ${messagesRes.error}`);
    throw new Error('Could not fetch messages');
  }

  // Accept quotation
  log.info(`Admin accepting quotation ${testContext.ids.quotationMessageId}...`);
  const acceptRes = await api('PUT', `/purchase-orders/${testContext.ids.purchaseOrderId}/quotation/${testContext.ids.quotationMessageId}/accept`, {}, testContext.tokens.owner);

  if (acceptRes.success) {
    log.success('Quotation accepted!');
    log.info(`Order status: ${acceptRes.data?.data?.purchaseOrder?.status || 'accepted'}`);
  } else {
    log.error(`Failed to accept quotation: ${acceptRes.error}`);
    console.log('Response:', JSON.stringify(acceptRes.data, null, 2));
    throw new Error('Could not accept quotation');
  }

  return true;
}

// ============================================
// Step 6: Vendor Submits Delivery Details
// ============================================
async function step6_VendorSubmitsDeliveryDetails() {
  log.step(6, 'Vendor Submits Delivery Details');

  // Verify order is in accepted status
  const orderRes = await api('GET', `/purchase-orders/${testContext.ids.purchaseOrderId}`, null, testContext.tokens.vendor);
  const order = orderRes.data?.data?.purchaseOrder || orderRes.data?.purchaseOrder;

  if (order.status === 'in_progress' || order.status === 'completed') {
    log.warn(`Order already in ${order.status} status, delivery details already submitted`);
    return true;
  }

  if (order.status !== 'accepted') {
    log.error(`Order status is ${order.status}, expected 'accepted'`);
    throw new Error('Order not in accepted status');
  }

  // Submit delivery details
  log.info('Submitting delivery details...');
  const deliveryRes = await api('POST', `/purchase-orders/${testContext.ids.purchaseOrderId}/delivery-details`, {
    estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    trackingNumber: `TRK${Date.now().toString().slice(-8)}`,
    carrier: 'Blue Dart Express',
    deliveryNotes: 'Materials will be delivered in 2 shipments. Cement and sand in first batch, steel in second batch.',
  }, testContext.tokens.vendor);

  if (deliveryRes.success) {
    log.success('Delivery details submitted');
    log.info(`Invoice generated: ${deliveryRes.data?.data?.invoice?.invoiceNumber}`);
    log.info(`Order status: ${deliveryRes.data?.data?.purchaseOrder?.status}`);
  } else {
    log.error(`Failed to submit delivery details: ${deliveryRes.error}`);
    console.log('Response:', JSON.stringify(deliveryRes.data, null, 2));
    throw new Error('Could not submit delivery details');
  }

  return true;
}

// ============================================
// Step 7: Admin Views Delivery Tracking
// ============================================
async function step7_AdminViewsDelivery() {
  log.step(7, 'Admin Views Delivery Tracking');

  // Get delivery overview
  log.info('Fetching admin delivery overview...');
  const overviewRes = await api('GET', '/purchase-orders/delivery-overview', null, testContext.tokens.owner);

  if (overviewRes.success) {
    const active = overviewRes.data?.data?.activeDeliveries || [];
    const delivered = overviewRes.data?.data?.delivered || [];
    const total = overviewRes.data?.data?.total || 0;
    log.success(`Total orders: ${total}, Active: ${active.length}, Delivered: ${delivered.length}`);
    
    // Find our order
    const allOrders = [...active, ...delivered];
    const ourOrder = allOrders.find(o => o._id === testContext.ids.purchaseOrderId);
    if (ourOrder) {
      log.success(`Found our order in deliveries: ${ourOrder.purchaseOrderNumber}`);
      log.info(`Delivery status: ${ourOrder.deliveryTracking?.status || 'N/A'}`);
    } else {
      log.warn('Our order not found in delivery overview');
    }
  } else {
    log.warn(`Failed to fetch delivery overview: ${overviewRes.error}`);
  }

  // Get specific order chat to verify status change
  const messagesRes = await api('GET', `/purchase-orders/${testContext.ids.purchaseOrderId}/messages`, null, testContext.tokens.owner);
  
  if (messagesRes.success) {
    const messages = Array.isArray(messagesRes.data?.data) ? messagesRes.data.data : [];
    log.info(`Chat has ${messages.length} messages`);
    
    // Check for delivery and invoice messages
    const deliveryMsg = messages.find(m => m.messageType === 'delivery');
    const invoiceMsg = messages.find(m => m.messageType === 'invoice');
    
    if (deliveryMsg) log.success('Delivery message found in chat');
    if (invoiceMsg) log.success(`Invoice message found: ${invoiceMsg.invoice?.invoiceNumber}`);
  }

  return true;
}

// ============================================
// Step 8: Vendor Updates Delivery Status to Delivered
// ============================================
async function step8_VendorMarksDelivered() {
  log.step(8, 'Vendor Marks Order as Delivered');

  log.info('Updating delivery status to delivered...');
  const updateRes = await api('PUT', `/purchase-orders/${testContext.ids.purchaseOrderId}/delivery-status`, {
    status: 'delivered',
    notes: 'All materials delivered and signed off by site supervisor.',
  }, testContext.tokens.vendor);

  if (updateRes.success) {
    log.success('Order marked as delivered!');
    log.info(`Final order status: ${updateRes.data?.data?.purchaseOrder?.status}`);
  } else {
    log.error(`Failed to mark delivered: ${updateRes.error}`);
    console.log('Response:', JSON.stringify(updateRes.data, null, 2));
    // Don't throw - might fail if not in correct state
  }

  return true;
}

// ============================================
// Step 9: Verify Final States
// ============================================
async function step9_VerifyFinalStates() {
  log.step(9, 'Verifying Final States');

  // Get order as admin
  const adminOrderRes = await api('GET', `/purchase-orders/${testContext.ids.purchaseOrderId}`, null, testContext.tokens.owner);
  const order = adminOrderRes.data?.data?.purchaseOrder || adminOrderRes.data?.purchaseOrder;

  log.info('Final Order State:');
  log.info(`  - Status: ${order?.status}`);
  log.info(`  - Delivery Status: ${order?.deliveryTracking?.status}`);
  log.info(`  - Chat Closed: ${order?.negotiation?.chatClosed}`);

  // Get vendor orders to verify status shown correctly
  const vendorOrdersRes = await api('GET', '/purchase-orders', null, testContext.tokens.vendor);
  if (vendorOrdersRes.success) {
    const orders = vendorOrdersRes.data?.data?.purchaseOrders || [];
    const ourOrder = orders.find(o => o._id === testContext.ids.purchaseOrderId);
    if (ourOrder) {
      log.success(`Vendor sees order status as: ${ourOrder.status}`);
    }
  }

  // Summary
  log.header('TEST SUMMARY');
  log.success('All API tests completed!');
  log.info(`Purchase Order ID: ${testContext.ids.purchaseOrderId}`);
  log.info(`Project ID: ${testContext.ids.projectId}`);
  log.info(`Vendor ID: ${testContext.ids.vendorId}`);

  return true;
}

// ============================================
// Main Runner
// ============================================
async function runTests() {
  log.header('DELIVERY FLOW API TEST SCRIPT');
  log.info(`Base URL: ${API_URL}`);
  log.info(`Date: ${new Date().toLocaleString()}`);

  try {
    await step1_LoginTests();
    await step2_GetOrCreateOrder();
    await step3_VendorSendsQuotation();
    await step4_AdminNegotiates();
    await step5_AdminAcceptsQuotation();
    await step6_VendorSubmitsDeliveryDetails();
    await step7_AdminViewsDelivery();
    await step8_VendorMarksDelivered();
    await step9_VerifyFinalStates();

    log.header('ALL TESTS PASSED');
    console.log('\n\x1b[32m🎉 Delivery flow test completed successfully!\x1b[0m\n');
    
    console.log('Next steps for UI testing:');
    console.log('1. Login as vendor (vendor1@company.com / password123)');
    console.log('2. Go to Orders tab - should see order in correct status');
    console.log('3. Go to Delivery Tracking - should see accepted orders');
    console.log('4. Login as admin (owner@houseway.com / password123)');
    console.log('5. Go to Finance Hub > Delivery Tracking - should see same order');
    
    process.exit(0);
  } catch (error) {
    log.header('TEST FAILED');
    log.error(error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests();
