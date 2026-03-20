const { meevoApi, corsHeaders } = require('./meevoAuth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    const { serviceId, date } = JSON.parse(event.body);
    if (!serviceId || !date) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'serviceId and date are required' }),
      };
    }

    const result = await meevoApi('POST', '/v1/scan/openings', {
      StartDate: `${date}T00:00:00`,
      EndDate: `${date}T23:59:59`,
      ScanServices: [{ ServiceId: serviceId }],
      MaxOpeningsPerDay: 20,
    });

    const slots = (result.data || []).map((slot) => ({
      startTime: slot.startTime || slot.StartTime,
      endTime: slot.endTime || slot.EndTime,
      employeeId: slot.employeeId || slot.EmployeeId,
      employeeName: slot.employeeDisplayName || slot.EmployeeDisplayName || '',
    }));

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(slots),
    };
  } catch (err) {
    console.error('availability error:', err.response?.data || err.message);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Failed to fetch availability' }),
    };
  }
};
