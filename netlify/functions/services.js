const { meevoApi, corsHeaders } = require('./meevoAuth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    let items = [];
    let page = 1;
    const perPage = 50;

    while (true) {
      const result = await meevoApi('GET', `/v1/services?PageNumber=${page}&ItemsPerPage=${perPage}`);
      const data = result.Data || result.data || [];
      items = items.concat(data);
      if (data.length < perPage) break;
      page++;
    }
    // Log first item's keys to debug category field name
    if (items.length > 0) {
      console.log('Sample service keys:', Object.keys(items[0]));
      console.log('Sample service:', JSON.stringify(items[0]).substring(0, 1000));
    }

    const services = items.map((s) => ({
      serviceId: s.ServiceId || s.serviceId,
      name: s.ServiceDisplayName || s.serviceDisplayName || s.DisplayName || s.displayName,
      description: s.ShortDesc || s.shortDesc || s.LongDesc || s.longDesc || '',
      category: s.ServiceCategoryDisplayName || s.serviceCategoryDisplayName || s.CategoryName || s.categoryName || '',
    }));

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(services) };
  } catch (err) {
    console.error('services error:', err.response?.data || err.message);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
  }
};
