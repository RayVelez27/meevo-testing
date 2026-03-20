const { meevoApi, corsHeaders } = require('./meevoAuth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    console.log('ENV check:', {
      hasAppId: !!process.env.MEEVO_APP_ID,
      hasAppSecret: !!process.env.MEEVO_APP_SECRET,
      authUrl: process.env.MEEVO_AUTH_URL,
      baseUrl: process.env.MEEVO_BASE_URL,
      tenantId: process.env.MEEVO_TENANT_ID,
      locationId: process.env.MEEVO_LOCATION_ID,
    });

    const result = await meevoApi('GET', '/v1/services?PageNumber=1&ItemsPerPage=100');
    console.log('Raw response type:', typeof result);
    console.log('Raw response keys:', result ? Object.keys(result) : 'null/undefined');
    console.log('Raw response:', JSON.stringify(result).substring(0, 3000));

    const items = Array.isArray(result) ? result : (result.data || result.items || result.results || []);
    console.log('Items type:', typeof items, 'isArray:', Array.isArray(items), 'length:', items.length);

    if (items.length > 0) {
      console.log('First item keys:', Object.keys(items[0]));
      console.log('First item:', JSON.stringify(items[0]).substring(0, 500));
    }

    const services = items
      .filter((s) => s.allowBookOnline !== false)
      .map((s) => ({
        serviceId: s.serviceId,
        name: s.serviceDisplayName || s.displayName || s.name,
        description: s.shortDesc || s.longDesc || '',
        category: s.serviceCategoryDisplayName || '',
      }));

    console.log('Final services count:', services.length);
    if (services.length > 0) {
      console.log('First service:', JSON.stringify(services[0]));
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(services),
    };
  } catch (err) {
    console.error('services error:', err.response?.status, err.response?.data || err.message);
    console.error('Full error:', err.stack);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.response?.data?.error?.message || err.message || 'Failed to fetch services' }),
    };
  }
};
