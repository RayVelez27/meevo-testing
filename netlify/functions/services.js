const axios = require('axios');
const { corsHeaders } = require('./meevoAuth');

let cachedToken = null;
let tokenExpiry = 0;

async function getFreshToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const params = new URLSearchParams();
  params.append('client_id', process.env.MEEVO_APP_ID);
  params.append('client_secret', process.env.MEEVO_APP_SECRET);
  params.append('grant_type', 'client_credentials');

  const res = await axios.post(process.env.MEEVO_AUTH_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
  });

  cachedToken = res.data.access_token;
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return cachedToken;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    const token = await getFreshToken();
    const tenantId = process.env.MEEVO_TENANT_ID;
    const locationId = process.env.MEEVO_LOCATION_ID;
    const url = `${process.env.MEEVO_BASE_URL}/v1/services?PageNumber=1&ItemsPerPage=100&TenantId=${tenantId}&LocationId=${locationId}`;

    console.log('Services URL:', url);

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    console.log('Raw response:', JSON.stringify(res.data).substring(0, 2000));

    const items = Array.isArray(res.data) ? res.data : (res.data.data || []);
    console.log('Items count:', items.length);

    const services = items
      .filter((s) => s.allowBookOnline !== false)
      .map((s) => ({
        serviceId: s.serviceId,
        name: s.serviceDisplayName || s.displayName || s.name,
        description: s.shortDesc || s.longDesc || '',
        category: s.serviceCategoryDisplayName || '',
      }));

    console.log('Final services count:', services.length);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(services),
    };
  } catch (err) {
    console.error('services error:', err.response?.status, err.response?.data || err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.response?.data?.error?.message || err.message }),
    };
  }
};
