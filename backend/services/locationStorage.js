const fs = require('fs').promises;
const path = require('path');
const LocationPing = require('../models/LocationPing');
const mongoose = require('mongoose');

const PING_FILE = path.join(__dirname, '../data/location_pings.json');

const ensurePingFile = async () => {
  try {
    await fs.access(PING_FILE);
  } catch {
    await fs.writeFile(PING_FILE, '[]', 'utf-8');
  }
};

const saveToFile = async (payload) => {
  await ensurePingFile();
  const raw = await fs.readFile(PING_FILE, 'utf-8');
  const list = JSON.parse(raw || '[]');
  list.push(payload);
  await fs.writeFile(PING_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return payload;
};

const saveLocationPing = async (payload) => {
  if (mongoose.connection.readyState === 1) {
    return await LocationPing.create(payload);
  }
  return await saveToFile(payload);
};

module.exports = { saveLocationPing };
