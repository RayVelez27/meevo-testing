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
      const lookupData = lookup.Data || lookup.data;
      if (lookupData && lookupData.length > 0) {
        clientId = lookupData[0].clientId || lookupData[0].ClientId;
      }
    } catch (lookupErr) {
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
      const clientData = newClient.Data || newClient.data;
      clientId = clientData?.clientId || clientData?.ClientId || clientData?.Id;
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
    const bookingData = booking.Data || booking.data || booking;

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        success: true,
        appointmentId: bookingData?.appointmentId || bookingData?.AppointmentId,
        appointmentServiceId:
          bookingData?.appointmentServiceId || bookingData?.AppointmentServiceId,
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
