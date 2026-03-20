const axios = require('axios');

let cachedToken = null;
let tokenExpiry = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const params = new URLSearchParams();
  params.append('client_id', process.env.MEEVO_APP_ID);
  params.append('client_secret', process.env.MEEVO_APP_SECRET);
  params.append('grant_type', 'client_credentials');

  const res = await axios.post(process.env.MEEVO_AUTH_URL, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
  });

  cachedToken = res.data.access_token;
  // Expire 60 seconds early to avoid edge-case 401s
  tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
  return cachedToken;
}

async function meevoApi(method, path, data) {
  const token = await getToken();
  const separator = path.includes('?') ? '&' : '?';
  const url = `${process.env.MEEVO_BASE_URL}${path}${separator}TenantId=${process.env.MEEVO_TENANT_ID}&LocationId=${process.env.MEEVO_LOCATION_ID}`;

  console.log('meevoApi calling:', method, url);

  const config = {
    method,
    url,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.headers['Content-Type'] = 'application/json';
    config.data = data;
  }

  const res = await axios(config);
  console.log('meevoApi response status:', res.status);
  return res.data;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

module.exports = { getToken, meevoApi, corsHeaders };
