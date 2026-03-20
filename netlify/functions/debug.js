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
    const baseUrl = process.env.MEEVO_BASE_URL;

    // Get services from location 3
    const svcRes = await axios.get(`${baseUrl}/v1/services?PageNumber=1&ItemsPerPage=10&TenantId=4&LocationId=3`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const services = svcRes.data.data || [];
    if (services.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ error: 'No services found' }) };
    }

    const firstService = services[0];

    // Check availability for the next 7 days using the first service
    const results = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      try {
        const avRes = await axios({
          method: 'POST',
          url: `${baseUrl}/v1/scan/openings?TenantId=4&LocationId=3`,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          data: {
            StartDate: `${dateStr}T00:00:00`,
            EndDate: `${dateStr}T23:59:59`,
            ScanServices: [{ ServiceId: firstService.serviceId }],
            MaxOpeningsPerDay: 20,
          },
        });

        const raw = avRes.data;
        const slots = raw.data || raw.openings || raw.results || (Array.isArray(raw) ? raw : []);
        results.push({
          date: dateStr,
          dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'long' }),
          slotsCount: Array.isArray(slots) ? slots.length : 'not array',
          rawKeys: typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw) : 'is array',
          sample: Array.isArray(slots) ? slots.slice(0, 2) : JSON.stringify(raw).substring(0, 500),
        });
      } catch (err) {
        results.push({
          date: dateStr,
          error: err.response?.data || err.message,
        });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testService: { id: firstService.serviceId, name: firstService.serviceDisplayName },
        availability: results,
      }, null, 2),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.response?.data || err.message }) };
  }
};
