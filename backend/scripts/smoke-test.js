/* eslint-disable no-console */
const path = require('path');
const { spawn } = require('child_process');

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000';
const API = `${BASE_URL}/api`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function httpJson(url, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status: res.status, ok: res.ok, json };
}

async function waitForHealth({ timeoutMs = 15000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await httpJson(`${API}/health`);
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await sleep(500);
  }
  return false;
}

function startServerDetached() {
  const backendDir = path.join(__dirname, '..');
  const child = spawn(process.execPath, [path.join('src', 'server.js')], {
    cwd: backendDir,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
}

async function login(email, password) {
  const res = await httpJson(`${API}/auth/login`, {
    method: 'POST',
    body: { email, password },
  });

  if (!res.ok) {
    const msg = res.json?.message || `HTTP ${res.status}`;
    throw new Error(`Login failed for ${email}: ${msg}`);
  }

  const token = res.json?.data?.token;
  if (!token) throw new Error(`Login response missing token for ${email}`);
  return token;
}

async function run() {
  console.log(`\n[smoke] Base URL: ${BASE_URL}`);

  // 1) Ensure server reachable; if not, start it
  let healthy = await waitForHealth({ timeoutMs: 2500 });
  if (!healthy) {
    console.log('[smoke] Server not reachable; starting backend...');
    startServerDetached();
    healthy = await waitForHealth({ timeoutMs: 20000 });
  }

  if (!healthy) {
    throw new Error('Backend did not become healthy at /api/health');
  }
  console.log('[smoke] ✅ /api/health OK');

  // 2) Login with seeded credentials
  const ownerToken = await login('owner@houseway.com', 'password123');
  const vendorToken = await login('vendor1@company.com', 'password123');
  console.log('[smoke] ✅ Logged in owner + vendor');

  // 3) Key admin endpoints (status checks)
  const adminEndpoints = [
    '/dashboard/admin-overview',
    '/projects',
    '/users',
    '/material-requests',
    '/quotations',
    '/purchase-orders/unread-count',
  ];

  for (const ep of adminEndpoints) {
    const res = await httpJson(`${API}${ep}`, { token: ownerToken });
    if (!res.ok) throw new Error(`Admin endpoint failed ${ep}: HTTP ${res.status}`);
  }
  console.log('[smoke] ✅ Admin endpoints OK');

  // 4) Vendor endpoints (status checks)
  const vendorEndpoints = [
    '/dashboard/vendor-overview',
    '/material-requests?available=true&limit=1',
    '/purchase-orders/vendor/my-orders',
  ];

  for (const ep of vendorEndpoints) {
    const res = await httpJson(`${API}${ep}`, { token: vendorToken });
    if (!res.ok) throw new Error(`Vendor endpoint failed ${ep}: HTTP ${res.status}`);
  }
  console.log('[smoke] ✅ Vendor endpoints OK');

  // 5) End-to-end business flow:
  // vendor picks an available material request → accepts → creates quotation → submits → owner approves → owner creates PO → vendor can open PO chat
  const mrRes = await httpJson(`${API}/material-requests?available=true&limit=1`, { token: vendorToken });
  const mr = mrRes.json?.data?.materialRequests?.[0];
  if (!mr) throw new Error('No available material requests found for vendor (seed data missing?)');

  const mrId = mr._id;
  const item = mr.materials?.[0];
  if (!item?._id) throw new Error('Material request missing materials[0]._id');

  const acceptRes = await httpJson(`${API}/material-requests/${mrId}/accept`, {
    method: 'POST',
    token: vendorToken,
  });
  if (!acceptRes.ok && acceptRes.status !== 400) {
    // 400 can happen if already accepted; allow it
    throw new Error(`Accept material request failed: HTTP ${acceptRes.status}`);
  }

  const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const qty = Number(item.quantity || 1);
  const unitPrice = 100;

  const quotationCreateRes = await httpJson(`${API}/quotations`, {
    method: 'POST',
    token: vendorToken,
    body: {
      materialRequestId: mrId,
      title: `Quotation for ${item.name || 'Material'}`,
      description: 'Smoke test quotation',
      items: [
        {
          materialRequestItem: item._id,
          materialName: item.name || 'Material',
          description: item.description || '',
          quantity: qty,
          unit: item.unit || 'pcs',
          unitPrice,
          totalPrice: qty * unitPrice,
        },
      ],
      tax: { percentage: 0, amount: 0 },
      discount: { percentage: 0, amount: 0 },
      validUntil,
      deliveryTerms: { deliveryTime: 7, deliveryLocation: 'Project site', deliveryCharges: 0 },
      paymentTerms: { paymentMethod: 'bank_transfer', advancePercentage: 0, creditDays: 0 },
    },
  });

  if (!quotationCreateRes.ok) {
    const msg = quotationCreateRes.json?.message || `HTTP ${quotationCreateRes.status}`;
    throw new Error(`Create quotation failed: ${msg}`);
  }

  const quotationId = quotationCreateRes.json?.data?.quotation?._id;
  if (!quotationId) throw new Error('Create quotation response missing quotation id');

  const submitRes = await httpJson(`${API}/quotations/${quotationId}/submit`, {
    method: 'PUT',
    token: vendorToken,
  });
  if (!submitRes.ok) throw new Error(`Submit quotation failed: HTTP ${submitRes.status}`);

  // Note: The direct approve endpoint is deprecated. Quotations are now accepted 
  // via the Purchase Order negotiation chat flow. Skip this step for smoke test.
  console.log('[smoke] ✅ Quotation created and submitted (approval via PO chat flow)');

  // Skip PO creation via quotation - this requires the full negotiation flow
  // The testDeliveryFlow.js script tests the complete flow

  console.log('[smoke] ✅ E2E flow OK (MR→Quotation submission tested)');
  console.log('\n[smoke] ALL CHECKS PASSED');
}

run().catch((err) => {
  console.error('\n[smoke] FAILED:', err.message);
  process.exitCode = 1;
});
