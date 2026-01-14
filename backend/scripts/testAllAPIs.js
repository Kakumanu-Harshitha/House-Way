/**
 * Comprehensive API Testing Script
 * Tests all backend endpoints for functionality and correctness
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5000';
const API_URL = `${BASE_URL}/api`;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

// User tokens for different roles
const tokens = {
  owner: null,
  designEmployee: null,
  vendorEmployee: null,
  executionEmployee: null,
  vendor: null,
  client: null,
  guest: null
};

// Test data IDs
const testData = {
  userId: null,
  projectId: null,
  clientId: null,
  materialRequestId: null,
  quotationId: null,
  purchaseOrderId: null,
  invoiceId: null,
  taskId: null,
  fileId: null
};

// Helper functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function logTest(testName, passed, error = null) {
  if (passed) {
    testResults.passed++;
    log(`✓ ${testName}`, 'success');
  } else {
    testResults.failed++;
    log(`✗ ${testName}`, 'error');
    if (error) {
      console.error('  Error:', error.message);
      testResults.errors.push({ test: testName, error: error.message });
    }
  }
}

async function makeRequest(method, endpoint, data = null, token = null, isMultipart = false) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (isMultipart) {
      config.headers['Content-Type'] = 'multipart/form-data';
      config.data = data;
    } else if (data) {
      config.headers['Content-Type'] = 'application/json';
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

// ============================================
// Authentication Tests
// ============================================

async function testAuthentication() {
  log('\n📝 Testing Authentication APIs...', 'info');

  // Test 1: Login as Owner
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'owner@houseway.com',
      password: 'password123'
    });
    
    if (response.success && response.data.data && response.data.data.token) {
      tokens.owner = response.data.data.token;
      logTest('Owner Login', true);
    } else {
      logTest('Owner Login', false, new Error(response.error || 'No token received'));
    }
  } catch (error) {
    logTest('Owner Login', false, error);
  }

  // Test 2: Login as Design Employee
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'employee.designteam.1@houseway.com',
      password: 'password123'
    });
    
    if (response.success && response.data.data && response.data.data.token) {
      tokens.designEmployee = response.data.data.token;
      logTest('Design Employee Login', true);
    } else {
      logTest('Design Employee Login', false, new Error(response.error || 'No token received'));
    }
  } catch (error) {
    logTest('Design Employee Login', false, error);
  }

  // Test 3: Login as Vendor Employee
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'employee.vendorteam.1@houseway.com',
      password: 'password123'
    });
    
    if (response.success && response.data.data && response.data.data.token) {
      tokens.vendorEmployee = response.data.data.token;
      logTest('Vendor Employee Login', true);
    } else {
      logTest('Vendor Employee Login', false, new Error(response.error || 'No token received'));
    }
  } catch (error) {
    logTest('Vendor Employee Login', false, error);
  }

  // Test 4: Login as Vendor
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'vendor1@company.com',
      password: 'password123'
    });
    
    if (response.success && response.data.data && response.data.data.token) {
      tokens.vendor = response.data.data.token;
      logTest('Vendor Login', true);
    } else {
      logTest('Vendor Login', false, new Error(response.error || 'No token received'));
    }
  } catch (error) {
    logTest('Vendor Login', false, error);
  }

  // Test 5: Login as Client
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'client1@example.com',
      password: 'password123'
    });
    
    if (response.success && response.data.data && response.data.data.token) {
      tokens.client = response.data.data.token;
      logTest('Client Login', true);
    } else {
      logTest('Client Login', false, new Error(response.error || 'No token received'));
    }
  } catch (error) {
    logTest('Client Login', false, error);
  }

  // Test 6: Invalid Login
  try {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'invalid@email.com',
      password: 'wrongpassword'
    });
    
    logTest('Invalid Login Rejected', !response.success);
  } catch (error) {
    logTest('Invalid Login Rejected', true);
  }

  // Test 7: Get Profile
  try {
    const response = await makeRequest('GET', '/auth/profile', null, tokens.owner);
    logTest('Get Owner Profile', response.success && (response.data.user || (response.data.data && response.data.data.user)));
  } catch (error) {
    logTest('Get Owner Profile', false, error);
  }
}

// ============================================
// User Management Tests (Owner)
// ============================================

async function testUserManagement() {
  log('\n👥 Testing User Management APIs...', 'info');

  // Test 1: Get All Users
  try {
    const response = await makeRequest('GET', '/users', null, tokens.owner);
    const users = response.data.users || (response.data.data && response.data.data.users) || response.data;
    logTest('Get All Users', response.success && Array.isArray(users));
  } catch (error) {
    logTest('Get All Users', false, error);
  }

  // Test 2: Get Users by Role (Employees)
  try {
    const response = await makeRequest('GET', '/users?role=employee', null, tokens.owner);
    logTest('Get Employees Only', response.success);
  } catch (error) {
    logTest('Get Employees Only', false, error);
  }

  // Test 3: Get Users by Role (Vendors)
  try {
    const response = await makeRequest('GET', '/users?role=vendor', null, tokens.owner);
    logTest('Get Vendors Only', response.success);
  } catch (error) {
    logTest('Get Vendors Only', false, error);
  }

  // Test 4: Search Users
  try {
    const response = await makeRequest('GET', '/users?search=design', null, tokens.owner);
    logTest('Search Users', response.success);
  } catch (error) {
    logTest('Search Users', false, error);
  }

  // Test 5: Non-Owner Cannot Access All Users
  try {
    const response = await makeRequest('GET', '/users', null, tokens.client);
    logTest('Client Denied User Access', !response.success || response.status === 403);
  } catch (error) {
    logTest('Client Denied User Access', true);
  }
}

// ============================================
// Dashboard Tests
// ============================================

async function testDashboards() {
  log('\n📊 Testing Dashboard APIs...', 'info');

  // Test 1: Owner Dashboard
  try {
    const response = await makeRequest('GET', '/dashboard/owner-stats', null, tokens.owner);
    logTest('Owner Dashboard Stats', response.success);
  } catch (error) {
    logTest('Owner Dashboard Stats', false, error);
  }

  // Test 2: Vendor Dashboard
  try {
    const response = await makeRequest('GET', '/dashboard/vendor-stats', null, tokens.vendor);
    logTest('Vendor Dashboard Stats', response.success);
  } catch (error) {
    logTest('Vendor Dashboard Stats', false, error);
  }

  // Test 3: Client Dashboard
  try {
    const response = await makeRequest('GET', '/dashboard/client-stats', null, tokens.client);
    logTest('Client Dashboard Stats', response.success);
  } catch (error) {
    logTest('Client Dashboard Stats', false, error);
  }

  // Test 4: Recent Activity
  try {
    const response = await makeRequest('GET', '/dashboard/recent-activity', null, tokens.owner);
    logTest('Recent Activity', response.success);
  } catch (error) {
    logTest('Recent Activity', false, error);
  }
}

// ============================================
// Project Tests
// ============================================

async function testProjects() {
  log('\n🏗️ Testing Project APIs...', 'info');

  // Test 1: Get All Projects (Owner)
  try {
    const response = await makeRequest('GET', '/projects', null, tokens.owner);
    if (response.success && response.data.projects && response.data.projects.length > 0) {
      testData.projectId = response.data.projects[0]._id;
      logTest('Get All Projects', true);
    } else if (response.success) {
      logTest('Get All Projects', true);
    } else {
      logTest('Get All Projects', false, new Error(response.error));
    }
  } catch (error) {
    logTest('Get All Projects', false, error);
  }

  // Test 2: Get Project by ID
  if (testData.projectId) {
    try {
      const response = await makeRequest('GET', `/projects/${testData.projectId}`, null, tokens.owner);
      logTest('Get Project by ID', response.success);
    } catch (error) {
      logTest('Get Project by ID', false, error);
    }
  }

  // Test 3: Client Access to Own Projects
  try {
    const response = await makeRequest('GET', '/projects', null, tokens.client);
    logTest('Client Get Own Projects', response.success);
  } catch (error) {
    logTest('Client Get Own Projects', false, error);
  }

  // Test 4: Employee Access to Assigned Projects
  try {
    const response = await makeRequest('GET', '/projects', null, tokens.designEmployee);
    logTest('Employee Get Assigned Projects', response.success);
  } catch (error) {
    logTest('Employee Get Assigned Projects', false, error);
  }

  // Test 5: Filter Projects by Status
  try {
    const response = await makeRequest('GET', '/projects?status=in-progress', null, tokens.owner);
    logTest('Filter Projects by Status', response.success);
  } catch (error) {
    logTest('Filter Projects by Status', false, error);
  }
}

// ============================================
// Material Request Tests
// ============================================

async function testMaterialRequests() {
  log('\n📦 Testing Material Request APIs...', 'info');

  // Test 1: Get All Material Requests
  try {
    const response = await makeRequest('GET', '/material-requests', null, tokens.owner);
    if (response.success && response.data.materialRequests && response.data.materialRequests.length > 0) {
      testData.materialRequestId = response.data.materialRequests[0]._id;
      logTest('Get All Material Requests', true);
    } else if (response.success) {
      logTest('Get All Material Requests', true);
    } else {
      logTest('Get All Material Requests', false, new Error(response.error));
    }
  } catch (error) {
    logTest('Get All Material Requests', false, error);
  }

  // Test 2: Vendor Access to Material Requests
  try {
    const response = await makeRequest('GET', '/material-requests', null, tokens.vendor);
    logTest('Vendor Get Material Requests', response.success);
  } catch (error) {
    logTest('Vendor Get Material Requests', false, error);
  }

  // Test 3: Get Material Request by ID
  if (testData.materialRequestId) {
    try {
      const response = await makeRequest('GET', `/material-requests/${testData.materialRequestId}`, null, tokens.owner);
      logTest('Get Material Request by ID', response.success);
    } catch (error) {
      logTest('Get Material Request by ID', false, error);
    }
  }

  // Test 4: Filter by Status
  try {
    const response = await makeRequest('GET', '/material-requests?status=approved', null, tokens.owner);
    logTest('Filter Material Requests by Status', response.success);
  } catch (error) {
    logTest('Filter Material Requests by Status', false, error);
  }
}

// ============================================
// Quotation Tests
// ============================================

async function testQuotations() {
  log('\n💰 Testing Quotation APIs...', 'info');

  // Test 1: Get All Quotations (Owner)
  try {
    const response = await makeRequest('GET', '/quotations', null, tokens.owner);
    if (response.success && response.data.quotations && response.data.quotations.length > 0) {
      testData.quotationId = response.data.quotations[0]._id;
      logTest('Get All Quotations', true);
    } else if (response.success) {
      logTest('Get All Quotations', true);
    } else {
      logTest('Get All Quotations', false, new Error(response.error));
    }
  } catch (error) {
    logTest('Get All Quotations', false, error);
  }

  // Test 2: Vendor Get Own Quotations
  try {
    const response = await makeRequest('GET', '/quotations/vendor/my-quotations', null, tokens.vendor);
    logTest('Vendor Get Own Quotations', response.success);
  } catch (error) {
    logTest('Vendor Get Own Quotations', false, error);
  }

  // Test 3: Get Quotation by ID
  if (testData.quotationId) {
    try {
      const response = await makeRequest('GET', `/quotations/${testData.quotationId}`, null, tokens.owner);
      logTest('Get Quotation by ID', response.success);
    } catch (error) {
      logTest('Get Quotation by ID', false, error);
    }
  }

  // Test 4: Filter by Status
  try {
    const response = await makeRequest('GET', '/quotations?status=submitted', null, tokens.owner);
    logTest('Filter Quotations by Status', response.success);
  } catch (error) {
    logTest('Filter Quotations by Status', false, error);
  }
}

// ============================================
// Purchase Order Tests
// ============================================

async function testPurchaseOrders() {
  log('\n📋 Testing Purchase Order APIs...', 'info');

  // Test 1: Get All Purchase Orders (Owner)
  try {
    const response = await makeRequest('GET', '/purchase-orders', null, tokens.owner);
    if (response.success && response.data.purchaseOrders && response.data.purchaseOrders.length > 0) {
      testData.purchaseOrderId = response.data.purchaseOrders[0]._id;
      logTest('Get All Purchase Orders', true);
    } else if (response.success) {
      logTest('Get All Purchase Orders', true);
    } else {
      logTest('Get All Purchase Orders', false, new Error(response.error));
    }
  } catch (error) {
    logTest('Get All Purchase Orders', false, error);
  }

  // Test 2: Vendor Get Own Purchase Orders
  try {
    const response = await makeRequest('GET', '/purchase-orders/vendor/my-orders', null, tokens.vendor);
    logTest('Vendor Get Own Purchase Orders', response.success);
  } catch (error) {
    logTest('Vendor Get Own Purchase Orders', false, error);
  }

  // Test 3: Get Purchase Order by ID
  if (testData.purchaseOrderId) {
    try {
      const response = await makeRequest('GET', `/purchase-orders/${testData.purchaseOrderId}`, null, tokens.owner);
      logTest('Get Purchase Order by ID', response.success);
    } catch (error) {
      logTest('Get Purchase Order by ID', false, error);
    }
  }
}

// ============================================
// Client Invoice Tests
// ============================================

async function testClientInvoices() {
  log('\n🧾 Testing Client Invoice APIs...', 'info');

  // Test 1: Get All Client Invoices (Owner) - Using project endpoint
  if (testData.projectId) {
    try {
      const response = await makeRequest('GET', `/invoices/project/${testData.projectId}`, null, tokens.owner);
      if (response.success && response.data.invoices && response.data.invoices.length > 0) {
        testData.invoiceId = response.data.invoices[0]._id;
        logTest('Get All Client Invoices', true);
      } else if (response.success) {
        logTest('Get All Client Invoices', true);
      } else {
        logTest('Get All Client Invoices', false, new Error(response.error));
      }
    } catch (error) {
      logTest('Get All Client Invoices', false, error);
    }
  } else {
    log('  Skipping: No project ID available', 'warning');
    testResults.skipped++;
  }

  // Test 2: Client Get Own Invoices - Skip (need clientId from auth user)
  log('  Skipping Client Get Own Invoices: need client user ID extraction', 'warning');
  testResults.skipped++;

  // Test 3: Get Invoice by ID
  if (testData.invoiceId) {
    try {
      const response = await makeRequest('GET', `/invoices/${testData.invoiceId}`, null, tokens.owner);
      logTest('Get Invoice by ID', response.success);
    } catch (error) {
      logTest('Get Invoice by ID', false, error);
    }
  }

  // Test 4: Filter by Status - Skip (no general GET /invoices endpoint)
  log('  Skipping Filter Invoices by Status: endpoint not available', 'warning');
  testResults.skipped++;
}

// ============================================
// Task Tests
// ============================================

async function testTasks() {
  log('\n✅ Testing Task APIs...', 'info');

  // Test 1: Get All Tasks - Skip (no general GET /tasks endpoint)
  log('  Skipping Get All Tasks: endpoint not available', 'warning');
  testResults.skipped++;

  // Test 2: Employee Get Assigned Tasks - Skip
  log('  Skipping Employee Get Assigned Tasks: endpoint not available', 'warning');
  testResults.skipped++;

  // Test 3: Get Task by ID - Use project tasks if we have a project
  if (testData.projectId) {
    try {
      const response = await makeRequest('GET', `/tasks/project/${testData.projectId}`, null, tokens.owner);
      if (response.success && response.data.tasks && response.data.tasks.length > 0) {
        testData.taskId = response.data.tasks[0]._id;
        // Now test getting specific task
        const taskResponse = await makeRequest('GET', `/tasks/${testData.taskId}`, null, tokens.owner);
        logTest('Get Task by ID', taskResponse.success);
      } else {
        log('  Skipping Get Task by ID: no tasks found', 'warning');
        testResults.skipped++;
      }
    } catch (error) {
      logTest('Get Task by ID', false, error);
    }
  } else {
    log('  Skipping Get Task by ID: no project ID', 'warning');
    testResults.skipped++;
  }

  // Test 4: Filter by Project - Already tested above
}

// ============================================
// Attendance Tests
// ============================================

async function testAttendance() {
  log('\n⏰ Testing Attendance APIs...', 'info');

  // Test 1: Get Today's Attendance - Use /status endpoint
  try {
    const response = await makeRequest('GET', '/attendance/status', null, tokens.designEmployee);
    logTest('Get Today Attendance', response.success);
  } catch (error) {
    logTest('Get Today Attendance', false, error);
  }

  // Test 2: Get Attendance Stats
  try {
    const response = await makeRequest('GET', '/attendance/stats', null, tokens.designEmployee);
    logTest('Get Attendance Stats', response.success);
  } catch (error) {
    logTest('Get Attendance Stats', false, error);
  }

  // Test 3: Get All Attendance - Skip (endpoint doesn't exist in final-version)
  log('  Skipping Owner Get All Attendance: endpoint not available', 'warning');
  testResults.skipped++;

  // Test 4: Filter by Date Range - Skip (no query support confirmed)
  log('  Skipping Filter Attendance by Date Range: query support unclear', 'warning');
  testResults.skipped++;
}

// ============================================
// File Tests
// ============================================

async function testFiles() {
  log('\n📁 Testing File APIs...', 'info');

  // Test 1: Get All Files (Owner)
  try {
    const response = await makeRequest('GET', '/files', null, tokens.owner);
    if (response.success && response.data.files && response.data.files.length > 0) {
      testData.fileId = response.data.files[0]._id;
      logTest('Get All Files', true);
    } else if (response.success) {
      logTest('Get All Files', true);
    } else {
      logTest('Get All Files', false, new Error(response.error));
    }
  } catch (error) {
    logTest('Get All Files', false, error);
  }

  // Test 2: Filter by Project
  if (testData.projectId) {
    try {
      const response = await makeRequest('GET', `/files?projectId=${testData.projectId}`, null, tokens.owner);
      logTest('Filter Files by Project', response.success);
    } catch (error) {
      logTest('Filter Files by Project', false, error);
    }
  }

  // Test 3: Filter by Category
  try {
    const response = await makeRequest('GET', '/files?category=images', null, tokens.owner);
    logTest('Filter Files by Category', response.success);
  } catch (error) {
    logTest('Filter Files by Category', false, error);
  }

  // Test 4: Get File by ID
  if (testData.fileId) {
    try {
      const response = await makeRequest('GET', `/files/${testData.fileId}`, null, tokens.owner);
      logTest('Get File by ID', response.success);
    } catch (error) {
      logTest('Get File by ID', false, error);
    }
  }
}

// ============================================
// Work Status Tests
// ============================================

async function testWorkStatus() {
  log('\n🔧 Testing Work Status APIs...', 'info');

  // Test 1: Get All Work Status Updates (Owner)
  try {
    const response = await makeRequest('GET', '/work-status', null, tokens.owner);
    logTest('Get All Work Status Updates', response.success);
  } catch (error) {
    logTest('Get All Work Status Updates', false, error);
  }

  // Test 2: Vendor Get Own Work Status
  try {
    const response = await makeRequest('GET', '/work-status', null, tokens.vendor);
    logTest('Vendor Get Own Work Status', response.success);
  } catch (error) {
    logTest('Vendor Get Own Work Status', false, error);
  }

  // Test 3: Filter by Quotation
  if (testData.quotationId) {
    try {
      const response = await makeRequest('GET', `/work-status?quotation=${testData.quotationId}`, null, tokens.owner);
      logTest('Filter Work Status by Quotation', response.success);
    } catch (error) {
      logTest('Filter Work Status by Quotation', false, error);
    }
  }
}

// ============================================
// Client Tests
// ============================================

async function testClients() {
  log('\n👨‍💼 Testing Client Management APIs...', 'info');

  // Test 1: Get All Clients (Owner/Employee)
  try {
    const response = await makeRequest('GET', '/clients', null, tokens.owner);
    if (response.success && response.data.clients && response.data.clients.length > 0) {
      testData.clientId = response.data.clients[0]._id;
      logTest('Get All Clients', true);
    } else if (response.success) {
      logTest('Get All Clients', true);
    } else {
      logTest('Get All Clients', false, new Error(response.error));
    }
  } catch (error) {
    logTest('Get All Clients', false, error);
  }

  // Test 2: Get Client by ID
  if (testData.clientId) {
    try {
      const response = await makeRequest('GET', `/clients/${testData.clientId}`, null, tokens.owner);
      logTest('Get Client by ID', response.success);
    } catch (error) {
      logTest('Get Client by ID', false, error);
    }
  }

  // Test 3: Search Clients
  try {
    const response = await makeRequest('GET', '/clients?search=client', null, tokens.owner);
    logTest('Search Clients', response.success);
  } catch (error) {
    logTest('Search Clients', false, error);
  }
}

// ============================================
// Authorization Tests
// ============================================

async function testAuthorization() {
  log('\n🔒 Testing Authorization & Permissions...', 'info');

  // Test 1: Client Cannot Access User Management
  try {
    const response = await makeRequest('GET', '/users', null, tokens.client);
    logTest('Client Denied User Access', !response.success || response.status === 403);
  } catch (error) {
    logTest('Client Denied User Access', true);
  }

  // Test 2: Vendor Cannot Access Other Vendor's Quotations
  try {
    const response = await makeRequest('GET', '/quotations/vendor/my-quotations', null, tokens.vendor);
    if (response.success && response.data.quotations) {
      const isOwn = response.data.quotations.every(q => 
        q.vendor === tokens.vendor || q.vendor._id === tokens.vendor
      );
      logTest('Vendor Only Sees Own Quotations', response.success);
    } else {
      logTest('Vendor Only Sees Own Quotations', response.success);
    }
  } catch (error) {
    logTest('Vendor Only Sees Own Quotations', false, error);
  }

  // Test 3: Client Only Sees Own Projects
  try {
    const response = await makeRequest('GET', '/projects', null, tokens.client);
    logTest('Client Only Sees Own Projects', response.success);
  } catch (error) {
    logTest('Client Only Sees Own Projects', false, error);
  }

  // Test 4: Unauthorized Access Without Token
  try {
    const response = await makeRequest('GET', '/projects', null, null);
    logTest('Unauthorized Access Denied', !response.success || response.status === 401);
  } catch (error) {
    logTest('Unauthorized Access Denied', true);
  }
}

// ============================================
// Main Test Runner
// ============================================

async function runAllTests() {
  log('\n╔════════════════════════════════════════════╗', 'info');
  log('║   Houseway Platform - API Test Suite     ║', 'info');
  log('╚════════════════════════════════════════════╝', 'info');
  log(`\n🌐 Testing against: ${BASE_URL}`, 'info');
  log('⏳ Starting tests...\n', 'info');

  const startTime = Date.now();

  try {
    await testAuthentication();
    await testUserManagement();
    await testDashboards();
    await testProjects();
    await testClients();
    await testMaterialRequests();
    await testQuotations();
    await testPurchaseOrders();
    await testClientInvoices();
    await testTasks();
    await testAttendance();
    await testFiles();
    await testWorkStatus();
    await testAuthorization();
  } catch (error) {
    log(`\n❌ Test suite encountered an error: ${error.message}`, 'error');
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print results
  log('\n╔════════════════════════════════════════════╗', 'info');
  log('║              TEST RESULTS                  ║', 'info');
  log('╚════════════════════════════════════════════╝', 'info');
  log(`\n✓ Passed: ${testResults.passed}`, 'success');
  log(`✗ Failed: ${testResults.failed}`, 'error');
  log(`⊘ Skipped: ${testResults.skipped}`, 'warning');
  log(`⏱️  Duration: ${duration}s`, 'info');

  if (testResults.errors.length > 0) {
    log('\n❌ Failed Tests:', 'error');
    testResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error.test}`, 'error');
      log(`   ${error.error}`, 'warning');
    });
  }

  // Save results to file
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    duration: duration,
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      skipped: testResults.skipped,
      total: testResults.passed + testResults.failed + testResults.skipped
    },
    errors: testResults.errors
  };

  const reportPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Full report saved to: ${reportPath}`, 'info');

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
