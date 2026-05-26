const PriceReport = require('../models/PriceReport');
const Vendor = require('../models/Vendor');

/**
 * Thuật toán xác thực chéo (Cross-verification)
 * So sánh giá báo cáo mới với các báo cáo đã có để phát hiện bất thường
 */
const crossVerify = async (vendorId, itemName, reportedPrice) => {
  const existingReports = await PriceReport.find({
    vendor: vendorId,
    itemName: { $regex: itemName, $options: 'i' },
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 ngày gần đây
  });

  if (existingReports.length === 0) {
    return { isReasonable: true, confidence: 'low', message: 'Chưa có dữ liệu để so sánh' };
  }

  const prices = existingReports.map((r) => r.price);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const deviation = Math.abs(reportedPrice - avgPrice) / avgPrice;

  if (deviation > 0.5) {
    return {
      isReasonable: false,
      confidence: 'high',
      message: `Giá báo cáo lệch ${(deviation * 100).toFixed(0)}% so với trung bình ${avgPrice.toLocaleString()} VND`,
    };
  }

  return { isReasonable: true, confidence: 'high', message: 'Giá hợp lý' };
};

/**
 * @desc    Tạo báo cáo giá mới (Crowdsourcing)
 * @route   POST /api/reports
 * @access  Public
 */
const createReport = async (req, res) => {
  try {
    const { vendorId, itemName, price, notes } = req.body;

    // Xác thực chéo
    const verification = await crossVerify(vendorId, itemName, price);

    const report = await PriceReport.create({
      vendor: vendorId,
      itemName,
      price,
      notes,
      isVerified: verification.isReasonable,
      verificationCount: verification.isReasonable ? 1 : 0,
    });

    res.status(201).json({
      report,
      verification,
    });
  } catch (error) {
    console.error('Report Controller Error:', error);
    res.status(500).json({ error: 'Lỗi tạo báo cáo. Vui lòng thử lại.' });
  }
};

/**
 * @desc    Lấy tất cả báo cáo giá
 * @route   GET /api/reports
 * @access  Public
 */
const getReports = async (req, res) => {
  try {
    const reports = await PriceReport.find()
      .sort({ createdAt: -1 })
      .populate('vendor', 'name category address');

    res.json(reports);
  } catch (error) {
    console.error('Get Reports Error:', error);
    res.status(500).json({ error: 'Lỗi lấy dữ liệu báo cáo.' });
  }
};

module.exports = { createReport, getReports };
