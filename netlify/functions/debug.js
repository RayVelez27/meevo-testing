const { meevoApi, corsHeaders } = require('./meevoAuth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    // Try fetching locations to see what's available
    const locations = await meevoApi('GET', '/v1/locations?PageNumber=1&ItemsPerPage=100');
    console.log('Locations:', JSON.stringify(locations).substring(0, 3000));

    // Also try services without the online booking filter
    const services = await meevoApi('GET', '/v1/services?PageNumber=1&ItemsPerPage=100');
    console.log('Services:', JSON.stringify(services).substring(0, 3000));

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ locations, services }, null, 2),
    };
  } catch (err) {
    console.error('debug error:', err.response?.data || err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.response?.data || err.message }),
    };
  }
};
