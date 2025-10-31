/**
 * One-shot job to scan expirations and populate ExpirationAlert collection.
 * Invoke with: node jobs/expirationJob.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const controller = require('../controllers/expirations.controller');

const MONGODB = process.env.MONGODB_URI || 'mongodb://localhost:27017/mercadona';

async function run() {
  await mongoose.connect(MONGODB, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB, running expiration scan...');
  const fakeReq = { query: {} };
  const fakeRes = {
    json: (payload) => {
      console.log('Scan result:', payload);
    }
  };
  const fakeNext = (err) => {
    if (err) console.error(err);
  };

  try {
    await controller.scanExpirations(fakeReq, fakeRes, fakeNext);
  } catch (err) {
    console.error('Scan failed', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

if (require.main === module) {
  run();
}
