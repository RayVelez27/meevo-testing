const { meevoApi, corsHeaders } = require('./meevoAuth');

const DEMO_EMPLOYEES = [
  { id: 'demo-1', name: 'Margaret Freedman' },
  { id: 'demo-2', name: 'Sybil Shepard' },
  { id: 'demo-3', name: 'Marco Small' },
];

function generateDemoSlots(date) {
  const slots = [];
  const hours = [9, 9.5, 10, 10.5, 11, 11.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5];

  for (const h of hours) {
    const hour = Math.floor(h);
    const min = (h % 1) * 60;
    const emp = DEMO_EMPLOYEES[Math.floor(Math.random() * DEMO_EMPLOYEES.length)];

    slots.push({
      startTime: `${date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`,
      endTime: `${date}T${String(hour).padStart(2, '0')}:${String(min + 30).padStart(2, '0')}:00`,
      employeeId: emp.id,
      employeeName: emp.name,
      isDemo: true,
    });
  }
  return slots;
}

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

    // Try real API first
    let slots = [];
    try {
      const result = await meevoApi('POST', '/v1/scan/openings', {
        StartDate: `${date}T00:00:00`,
        EndDate: `${date}T23:59:59`,
        ScanServices: [{ ServiceId: serviceId }],
        MaxOpeningsPerDay: 20,
      });

      slots = (result.data || []).map((slot) => ({
        startTime: slot.startTime || slot.StartTime,
        endTime: slot.endTime || slot.EndTime,
        employeeId: slot.employeeId || slot.EmployeeId,
        employeeName: slot.employeeDisplayName || slot.EmployeeDisplayName || '',
      }));
    } catch (apiErr) {
      console.log('API availability failed, using demo slots:', apiErr.message);
    }

    // Fall back to demo slots if none found
    if (slots.length === 0) {
      console.log('No real slots found, generating demo slots for', date);
      slots = generateDemoSlots(date);
    }

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
