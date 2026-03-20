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

    // Try all known locations and merge services
    const locations = [
      { tenantId: 4, locationId: 3 },
      { tenantId: 4, locationId: 4 },
      { tenantId: 4, locationId: 5 },
      { tenantId: 11, locationId: 9 },
    ];

    const allServices = [];
    const seenIds = new Set();

    for (const loc of locations) {
      try {
        const url = `${process.env.MEEVO_BASE_URL}/v1/services?PageNumber=1&ItemsPerPage=100&TenantId=${loc.tenantId}&LocationId=${loc.locationId}`;
        console.log('Fetching:', url);

        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });

        console.log(`Location ${loc.tenantId}/${loc.locationId}: ${(res.data.data || []).length} services`);

        for (const s of (res.data.data || [])) {
          if (!seenIds.has(s.serviceId)) {
            seenIds.add(s.serviceId);
            allServices.push({
              serviceId: s.serviceId,
              name: s.serviceDisplayName || s.displayName || s.name,
              description: s.shortDesc || s.longDesc || '',
              category: s.serviceCategoryDisplayName || '',
            });
          }
        }
      } catch (err) {
        console.error(`Location ${loc.tenantId}/${loc.locationId} error:`, err.response?.data?.error?.message || err.message);
      }
    }

    console.log('Total unique services:', allServices.length);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(allServices),
    };
  } catch (err) {
    console.error('services error:', err.response?.status, err.response?.data || err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};
