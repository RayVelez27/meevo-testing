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

async function apiCall(token, method, url, data) {
  const config = {
    method,
    url,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
  };
  if (data) config.data = data;
  const res = await axios(config);
  return res.data;
}

exports.handler = async () => {
  try {
    const token = await getToken();
    const base = process.env.MEEVO_BASE_URL;

    const locations = [
      { tenantId: 4, locationId: 3 },
      { tenantId: 4, locationId: 4 },
      { tenantId: 4, locationId: 5 },
      { tenantId: 11, locationId: 9 },
    ];

    const results = [];

    for (const loc of locations) {
      const locResult = { ...loc, employees: [], services: [], availability: [] };

      try {
        // Get employees
        const empRes = await apiCall(token, 'GET', `${base}/v1/employees?PageNumber=1&ItemsPerPage=10&TenantId=${loc.tenantId}&LocationId=${loc.locationId}`);
        locResult.employees = (empRes.data || []).map(e => ({
          id: e.employeeId,
          name: e.displayName || e.firstName + ' ' + e.lastName,
        }));

        // Get first service
        const svcRes = await apiCall(token, 'GET', `${base}/v1/services?PageNumber=1&ItemsPerPage=5&TenantId=${loc.tenantId}&LocationId=${loc.locationId}`);
        const svcs = svcRes.data || [];
        locResult.services = svcs.map(s => ({ id: s.serviceId, name: s.serviceDisplayName }));

        if (svcs.length > 0) {
          // Check next Monday-Friday for availability with first service
          for (let i = 0; i < 14; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const day = d.getDay();
            if (day === 0 || day === 6) continue; // skip weekends
            const dateStr = d.toISOString().split('T')[0];

            try {
              const avRes = await apiCall(token, 'POST', `${base}/v1/scan/openings?TenantId=${loc.tenantId}&LocationId=${loc.locationId}`, {
                StartDate: `${dateStr}T00:00:00`,
                EndDate: `${dateStr}T23:59:59`,
                ScanServices: [{ ServiceId: svcs[0].serviceId }],
                MaxOpeningsPerDay: 5,
              });
              const slots = avRes.data || [];
              if (slots.length > 0) {
                locResult.availability.push({
                  date: dateStr,
                  day: d.toLocaleDateString('en-US', { weekday: 'short' }),
                  count: slots.length,
                  firstSlot: slots[0],
                });
              }
            } catch (err) {
              // skip
            }
          }
        }
      } catch (err) {
        locResult.error = err.response?.data?.error?.message || err.message;
      }

      results.push(locResult);
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
