const { meevoApi, corsHeaders } = require('./meevoAuth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    const result = await meevoApi('GET', '/v1/services?PageNumber=1&ItemsPerPage=50');

    const items = result.data || [];
    const services = items.map((s) => ({
      serviceId: s.serviceId,
      name: s.serviceDisplayName || s.displayName,
      description: s.shortDesc || s.longDesc || '',
      category: s.serviceCategoryDisplayName || '',
    }));

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(services) };
  } catch (err) {
    console.error('services error:', err.response?.data || err.message);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
  }
};
