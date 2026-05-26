const { reverseGeocode } = require('../services/vietmapService');
const { saveLocationPing } = require('../services/locationStorage');

// Receive a location ping from frontend and persist it
const receiveLocation = async (req, res) => {
  try {
    const { coords, accuracy, timestamp } = req.body;
    if (!coords || !Array.isArray(coords) || coords.length !== 2) {
      return res.status(400).json({ error: 'coords must be [lng, lat]' });
    }

    const locationInfo = await reverseGeocode(coords);
    const rawUserAgent = req.headers['user-agent'] || null;
    const storedData = {
      userId: req.user?._id || null,
      coords,
      accuracy: typeof accuracy === 'number' ? accuracy : undefined,
      timestamp: timestamp ? new Date(timestamp) : Date.now(),
      source: 'browser',
      provider: locationInfo?.provider || 'unknown',
      address: locationInfo?.address || null,
      placeName: locationInfo?.placeName || null,
      district: locationInfo?.district || null,
      city: locationInfo?.city || null,
      country: locationInfo?.country || null,
      raw: locationInfo?.raw || null,
      userAgent: rawUserAgent,
    };

    const doc = await saveLocationPing(storedData);
    const responseData = {
      ok: true,
      id: doc._id || null,
      address: storedData.address,
      placeName: storedData.placeName,
      district: storedData.district,
      city: storedData.city,
      provider: storedData.provider,
      storedVia: doc._id ? 'mongo' : 'file',
    };

    return res.json(responseData);
  } catch (err) {
    console.error('Location save error:', err.message || err);
    return res.status(500).json({ error: 'Không thể lưu vị trí' });
  }
};

const detectIpLocation = async (req, res) => {
  try {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    // Clean IPv6 loopback prefix
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:')) {
      ip = '';
    }

    const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`IP Geolocation API returned status ${response.status}`);
    }
    const data = await response.json();
    if (data.latitude && data.longitude) {
      return res.json({
        success: true,
        coords: [data.longitude, data.latitude],
        city: data.city || 'Hà Nội',
        country: data.country_name || 'Việt Nam',
        address: `${data.city || 'Hà Nội'}, ${data.country_name || 'Việt Nam'}`
      });
    }
    throw new Error('No coordinates returned from IP Geolocation API');
  } catch (err) {
    console.warn('IP detection fallback warning:', err.message || err);
    // Graceful fallback to FPT Hoa Lac Center if API fails/times out/rate-limits
    return res.json({
      success: true,
      coords: [105.52522, 21.01354], // FPT Hoa Lac center
      city: 'Hà Nội',
      country: 'Việt Nam',
      address: 'Đại học FPT Hoà Lạc, Thạch Thất, Hà Nội (Mặc định)'
    });
  }
};

module.exports = { receiveLocation, detectIpLocation };
