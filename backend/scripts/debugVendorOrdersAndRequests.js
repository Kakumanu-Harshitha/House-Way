/*
 * Debug helper: show MaterialRequests assigned to a vendor and PurchaseOrders for that vendor.
 * Usage:
 *   node scripts/debugVendorOrdersAndRequests.js vendoor@example.com
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../src/models/User');
const MaterialRequest = require('../src/models/MaterialRequest');
const PurchaseOrder = require('../src/models/PurchaseOrder');

const main = async () => {
  const emailArg = process.argv[2];
  const email = String(emailArg || '').trim().toLowerCase();

  if (!email) {
    console.error('Please pass a vendor email.');
    process.exitCode = 1;
    return;
  }

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set.');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });

  const user = await User.findOne({ email }).select('_id email role isActive');
  console.log('USER:', user ? { email: user.email, id: String(user._id), role: user.role, active: user.isActive } : null);

  if (!user) {
    await mongoose.disconnect();
    return;
  }

  const mrQuery = { 'assignedVendors.vendor': user._id };
  const poQuery = { vendor: user._id };

  const assignedMRs = await MaterialRequest.find(mrQuery)
    .select('_id title status createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const purchaseOrders = await PurchaseOrder.find(poQuery)
    .select('_id purchaseOrderNumber title status createdAt materialRequest')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  console.log('\nAssigned MaterialRequests:', assignedMRs.length);
  console.log(assignedMRs.map((r) => ({ id: String(r._id), status: r.status, title: r.title })));

  console.log('\nPurchaseOrders:', purchaseOrders.length);
  console.log(purchaseOrders.map((o) => ({ id: String(o._id), status: o.status, po: o.purchaseOrderNumber, title: o.title, materialRequest: o.materialRequest ? String(o.materialRequest) : null })));

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('ERROR:', err?.message || err);
  process.exitCode = 1;
});
