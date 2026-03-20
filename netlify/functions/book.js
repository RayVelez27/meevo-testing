const { meevoApi, corsHeaders } = require('./meevoAuth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    const { serviceId, startTime, employeeId, firstName, lastName, email, phone } =
      JSON.parse(event.body);

    if (!serviceId || !startTime || !firstName || !lastName || !email || !phone) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'All fields are required' }),
      };
    }

    // Step 1: Look up existing client by email
    let clientId = null;
    try {
      const lookup = await meevoApi('POST', '/v1/clients/lookup', {
        EmailIds: [email],
      });
      if (lookup.data && lookup.data.length > 0) {
        clientId = lookup.data[0].clientId || lookup.data[0].ClientId;
      }
    } catch (lookupErr) {
      // Client not found — will create below
      console.log('Client lookup returned no match, creating new client');
    }

    // Step 2: Create client if not found
    if (!clientId) {
      const newClient = await meevoApi('POST', '/v1/client', {
        FirstName: firstName,
        LastName: lastName,
        EmailAddress: email,
        OnlineBookingAccess: true,
        PhoneNumbers: [
          {
            PhoneTypeEnum: 2049,
            Number: phone,
            IsPrimary: true,
          },
        ],
      });
      clientId =
        newClient.data?.clientId || newClient.data?.ClientId || newClient.data?.Id;
    }

    if (!clientId) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Failed to create or find client' }),
      };
    }

    // Step 3: Book the appointment
    const bookingPayload = {
      ServiceId: serviceId,
      StartTime: startTime,
      ClientId: clientId,
    };
    if (employeeId) {
      bookingPayload.EmployeeId = employeeId;
    }

    const booking = await meevoApi('POST', '/v1/book/service', bookingPayload);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        appointmentId: booking.data?.appointmentId || booking.data?.AppointmentId,
        appointmentServiceId:
          booking.data?.appointmentServiceId || booking.data?.AppointmentServiceId,
        message: 'Appointment booked successfully!',
      }),
    };
  } catch (err) {
    console.error('booking error:', err.response?.data || err.message);
    const meevoError = err.response?.data?.error?.message || err.message;
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: meevoError || 'Failed to book appointment' }),
    };
  }
};
