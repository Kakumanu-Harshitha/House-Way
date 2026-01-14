/*
 * Debug helper: prints material requests assigned to given vendor emails.
 * Usage:
 *   node scripts/debugVendorAssignedRequests.js vendor15@company.com vendor20@company.com
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('../src/models/User');
const MaterialRequest = require('../src/models/MaterialRequest');

const main = async () => {
  const emails = process.argv.slice(2).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0) {
    console.error('Please pass at least one vendor email.');
    process.exitCode = 1;
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set.');
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });

  for (const email of emails) {
    const user = await User.findOne({ email }).select('_id email role isActive');
    if (!user) {
      console.log(`\n${email} -> USER NOT FOUND`);
      continue;
    }

    const baseQuery = { 'assignedVendors.vendor': user._id };
    const total = await MaterialRequest.countDocuments(baseQuery);
    const pending = await MaterialRequest.countDocuments({ ...baseQuery, status: 'pending' });
    const latest = await MaterialRequest.find(baseQuery)
      .select('_id title status createdAt assignedVendors')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`\nUSER ${user.email} (${String(user._id)}) role=${user.role} active=${user.isActive}`);
    console.log(`Assigned requests: total=${total} pending=${pending}`);
    console.log('Latest:', latest.map((r) => ({ id: String(r._id), status: r.status, title: r.title })));
  }

  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('ERROR:', err?.message || err);
  process.exitCode = 1;
});
