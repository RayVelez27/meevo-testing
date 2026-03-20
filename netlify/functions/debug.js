const axios = require('axios');

async function getToken() {
  const params = new URLSearchParams();
  params.append('client_id', process.env.MEEVO_APP_ID);
  params.append('client_secret', process.env.MEEVO_APP_SECRET);
  params.append('grant_type', 'client_credentials');

  const res = await axios.post(process.env.MEEVO_AUTH_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
  });
  return res.data.access_token;
}

exports.handler = async () => {
  try {
    const token = await getToken();
    const locations = [
      { tenantId: 4, locationId: 3 },
      { tenantId: 4, locationId: 4 },
      { tenantId: 4, locationId: 5 },
      { tenantId: 11, locationId: 9 },
    ];

    const results = [];
    for (const loc of locations) {
      try {
        const url = `${process.env.MEEVO_BASE_URL}/v1/services?PageNumber=1&ItemsPerPage=10&TenantId=${loc.tenantId}&LocationId=${loc.locationId}`;
        const res = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        results.push({ ...loc, serviceCount: (res.data.data || []).length, sample: (res.data.data || []).slice(0, 2) });
      } catch (err) {
        results.push({ ...loc, error: err.response?.data?.error?.message || err.message });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results, null, 2),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
