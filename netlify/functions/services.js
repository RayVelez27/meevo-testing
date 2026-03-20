const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // Get token
    const params = new URLSearchParams();
    params.append('client_id', process.env.MEEVO_APP_ID);
    params.append('client_secret', process.env.MEEVO_APP_SECRET);
    params.append('grant_type', 'client_credentials');

    const authRes = await axios.post(process.env.MEEVO_AUTH_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    });
    const token = authRes.data.access_token;
    console.log('Token (first 20 chars):', token.substring(0, 20));

    // Fetch services - exact same URL as debug
    const url = `${process.env.MEEVO_BASE_URL}/v1/services?PageNumber=1&ItemsPerPage=10&TenantId=4&LocationId=3`;
    console.log('URL:', url);

    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(res.data).substring(0, 2000));

    const items = res.data.data || [];
    console.log('Items count:', items.length);

    const services = items.map((s) => ({
      serviceId: s.serviceId,
      name: s.serviceDisplayName || s.displayName,
      description: s.shortDesc || s.longDesc || '',
      category: s.serviceCategoryDisplayName || '',
    }));

    return { statusCode: 200, headers, body: JSON.stringify(services) };
  } catch (err) {
    console.error('ERROR:', err.response?.status, JSON.stringify(err.response?.data || err.message));
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
