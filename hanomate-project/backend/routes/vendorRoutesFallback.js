const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const dataPath = path.resolve(__dirname, '../data/vendors.json');

function loadVendors() {
  try {
    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, JSON.stringify([], null, 2), 'utf-8');
    }
    return JSON.parse(fs.readFileSync(dataPath, 'utf-8')) || [];
  } catch (err) {
    return [];
  }
}

function saveVendors(vendors) {
  fs.writeFileSync(dataPath, JSON.stringify(vendors, null, 2), 'utf-8');
}

function makeId() {
  return require('crypto').randomUUID?.() || `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

router.get('/', (req, res) => {
  const vendors = loadVendors();
  res.json({ success: true, data: vendors });
});

router.get('/:id', (req, res) => {
  const vendors = loadVendors();
  const vendor = vendors.find((v) => v.id === req.params.id);
  if (!vendor) {
    return res.status(404).json({ success: false, message: 'Vendor không tìm thấy' });
  }
  res.json({ success: true, data: vendor });
});

router.post('/', (req, res) => {
  const vendors = loadVendors();
  const payload = { id: makeId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...req.body };
  vendors.push(payload);
  saveVendors(vendors);
  res.status(201).json({ success: true, data: payload });
});

router.put('/:id', (req, res) => {
  const vendors = loadVendors();
  const index = vendors.findIndex((v) => v.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Vendor không tìm thấy' });
  }
  vendors[index] = { ...vendors[index], ...req.body, updatedAt: new Date().toISOString() };
  saveVendors(vendors);
  res.json({ success: true, data: vendors[index] });
});

router.delete('/:id', (req, res) => {
  let vendors = loadVendors();
  vendors = vendors.filter((v) => v.id !== req.params.id);
  saveVendors(vendors);
  res.json({ success: true, message: 'Vendor đã được xóa' });
});

module.exports = router;
