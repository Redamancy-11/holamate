const VIETMAP_API_KEY = process.env.VIETMAP_API_KEY?.trim();

const buildVietmapUrls = (lat, lon) => {
  if (!VIETMAP_API_KEY) return [];
  return [
    `https://api.vietmap.vn/v2/reverse?lat=${lat}&lon=${lon}&key=${VIETMAP_API_KEY}`,
    `https://api.vietmap.vn/v1/reverse?lat=${lat}&lon=${lon}&key=${VIETMAP_API_KEY}`,
    `https://api.vietmap.vn/v2/reverse?lat=${lat}&lon=${lon}&apiKey=${VIETMAP_API_KEY}`,
    `https://api.vietmap.vn/v1/reverse?lat=${lat}&lon=${lon}&apiKey=${VIETMAP_API_KEY}`,
    `https://api.vietmap.vn/v2/geocoding/reverse?latitude=${lat}&longitude=${lon}&key=${VIETMAP_API_KEY}`,
    `https://api.vietmap.vn/v2/geocoding/reverse?lat=${lat}&lon=${lon}&key=${VIETMAP_API_KEY}`,
  ];
};

const normalizeReverseResponse = (data) => {
  const results = data?.results || data?.features || data?.data || [];
  const first = Array.isArray(results) ? results[0] : results;
  const props = first?.properties || first?.address || {};

  const address = first?.formatted || first?.display_name || props?.label || props?.road || props?.name;
  const placeName = first?.name || props?.name || props?.label || (typeof address === 'string' ? address.split(',')[0] : null);

  return {
    address: address || null,
    placeName: placeName || null,
    district: props?.district || props?.suburb || props?.county || props?.city_district || null,
    city: props?.city || props?.town || props?.village || props?.state || null,
    country: props?.country || null,
  };
};

const tryVietmapReverse = async (lat, lon) => {
  const urls = buildVietmapUrls(lat, lon);
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) continue;
      const json = await response.json();
      const parsed = normalizeReverseResponse(json);
      if (parsed.address) {
        return { ...parsed, provider: 'vietmap', raw: json };
      }
    } catch (err) {
      continue;
    }
  }
  return null;
};

const tryNominatimReverse = async (lat, lon) => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=vi`;
    const response = await fetch(url, { headers: { 'User-Agent': 'HanoMate App', Accept: 'application/json' } });
    if (!response.ok) return null;
    const json = await response.json();
    return {
      address: json.display_name || null,
      placeName: json.name || json.address?.road || json.address?.attraction || json.address?.village || json.address?.city || null,
      district: json.address?.suburb || json.address?.city_district || json.address?.county || null,
      city: json.address?.city || json.address?.town || json.address?.village || null,
      country: json.address?.country || null,
      provider: 'nominatim',
      raw: json,
    };
  } catch (err) {
    return null;
  }
};

const reverseGeocode = async (coords) => {
  if (!coords || coords.length !== 2) return null;
  const [lon, lat] = coords;
  let result = null;
  if (VIETMAP_API_KEY) {
    result = await tryVietmapReverse(lat, lon);
  }
  if (!result) {
    result = await tryNominatimReverse(lat, lon);
  }
  return result || { address: null, placeName: null, district: null, city: null, country: null, provider: 'unknown', raw: null };
};

module.exports = { reverseGeocode };
