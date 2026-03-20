const { meevoApi, corsHeaders } = require('./meevoAuth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    const result = await meevoApi('GET', '/v1/services?PageNumber=1&ItemsPerPage=100');
    console.log('Meevo services raw response:', JSON.stringify(result).substring(0, 2000));

    // The response might be the array directly, or nested under .data, .items, .results, etc.
    const items = Array.isArray(result) ? result : (result.data || result.items || result.results || []);
    const services = items
      .filter((s) => s.allowBookOnline !== false)
      .map((s) => ({
        serviceId: s.serviceId,
        name: s.serviceDisplayName || s.displayName || s.name,
        description: s.shortDesc || s.longDesc || '',
        category: s.serviceCategoryDisplayName || '',
      }));

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(services),
    };
  } catch (err) {
    console.error('services error:', err.response?.data || err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Failed to fetch services' }),
    };
  }
};
