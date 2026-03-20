import { useState, useEffect } from 'react';

const API_BASE = '/.netlify/functions';

export default function Home() {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/services`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setServices(data);
        } else {
          setError(data.error || 'Failed to load services');
        }
      })
      .catch(() => setError('Failed to load services'))
      .finally(() => setLoading(false));
  }, []);

  async function fetchSlots(serviceId, selectedDate) {
    setLoading(true);
    setError(null);
    setSlots([]);
    try {
      const res = await fetch(`${API_BASE}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, date: selectedDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlots(data);
      if (data.length === 0) setError('No available times on this date. Try another day.');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBook() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.serviceId,
          startTime: selectedSlot.startTime,
          employeeId: selectedSlot.employeeId || undefined,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBooking(data);
      setStep(4);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return iso;
    }
  }

  function reset() {
    setStep(1);
    setSelectedService(null);
    setDate('');
    setSlots([]);
    setSelectedSlot(null);
    setForm({ firstName: '', lastName: '', email: '', phone: '' });
    setBooking(null);
    setError(null);
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Book an Appointment</h1>
        <div style={styles.steps}>
          {['Service', 'Date & Time', 'Your Info', 'Confirmed'].map((label, i) => (
            <div
              key={label}
              style={{
                ...styles.stepDot,
                background: step >= i + 1 ? '#4f46e5' : '#e5e7eb',
                color: step >= i + 1 ? '#fff' : '#6b7280',
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {loading && <div style={styles.loading}>Loading...</div>}

        {/* Step 1: Pick Service */}
        {step === 1 && !loading && (
          <div>
            <h2 style={styles.subtitle}>Choose a Service</h2>
            <div style={styles.list}>
              {services.map((s) => (
                <button
                  key={s.serviceId}
                  style={styles.serviceBtn}
                  onClick={() => {
                    setSelectedService(s);
                    setStep(2);
                    setError(null);
                  }}
                >
                  <strong>{s.name}</strong>
                  {s.category && <span style={styles.category}>{s.category}</span>}
                  {s.description && <span style={styles.desc}>{s.description}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Pick Date & Time */}
        {step === 2 && (
          <div>
            <h2 style={styles.subtitle}>
              Pick a Date & Time
              <span style={styles.selectedLabel}>{selectedService?.name}</span>
            </h2>
            <button style={styles.backBtn} onClick={() => setStep(1)}>
              &larr; Back
            </button>
            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                fetchSlots(selectedService.serviceId, e.target.value);
              }}
              style={styles.dateInput}
            />
            {!loading && slots.length > 0 && (
              <div style={styles.slotGrid}>
                {slots.map((slot, i) => (
                  <button
                    key={i}
                    style={{
                      ...styles.slotBtn,
                      ...(selectedSlot === slot ? styles.slotBtnSelected : {}),
                    }}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {formatTime(slot.startTime)}
                    {slot.employeeName && (
                      <span style={styles.empName}>{slot.employeeName}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {selectedSlot && (
              <button
                style={styles.primaryBtn}
                onClick={() => {
                  setStep(3);
                  setError(null);
                }}
              >
                Continue
              </button>
            )}
          </div>
        )}

        {/* Step 3: Client Info */}
        {step === 3 && (
          <div>
            <h2 style={styles.subtitle}>Your Information</h2>
            <button style={styles.backBtn} onClick={() => setStep(2)}>
              &larr; Back
            </button>
            <div style={styles.formGrid}>
              <input
                placeholder="First Name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                style={styles.input}
              />
              <input
                placeholder="Last Name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                style={styles.input}
              />
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={styles.input}
              />
              <input
                type="tel"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.summary}>
              <p><strong>Service:</strong> {selectedService?.name}</p>
              <p><strong>Date:</strong> {date}</p>
              <p><strong>Time:</strong> {formatTime(selectedSlot?.startTime)}</p>
              {selectedSlot?.employeeName && (
                <p><strong>With:</strong> {selectedSlot.employeeName}</p>
              )}
            </div>
            <button
              style={styles.primaryBtn}
              disabled={!form.firstName || !form.lastName || !form.email || !form.phone || loading}
              onClick={handleBook}
            >
              {loading ? 'Booking...' : 'Book Now'}
            </button>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && booking && (
          <div style={styles.confirmation}>
            <div style={styles.checkmark}>&#10003;</div>
            <h2 style={styles.subtitle}>Appointment Confirmed!</h2>
            <div style={styles.summary}>
              <p><strong>Service:</strong> {selectedService?.name}</p>
              <p><strong>Date:</strong> {date}</p>
              <p><strong>Time:</strong> {formatTime(selectedSlot?.startTime)}</p>
              {selectedSlot?.employeeName && (
                <p><strong>With:</strong> {selectedSlot.employeeName}</p>
              )}
              <p><strong>Name:</strong> {form.firstName} {form.lastName}</p>
              <p><strong>Email:</strong> {form.email}</p>
            </div>
            <button style={styles.primaryBtn} onClick={reset}>
              Book Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f3f4f6',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '40px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '32px',
    maxWidth: '600px',
    width: '100%',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    textAlign: 'center',
    margin: '0 0 20px',
    color: '#111827',
  },
  subtitle: {
    fontSize: '18px',
    fontWeight: 600,
    margin: '0 0 16px',
    color: '#111827',
  },
  steps: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  stepDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '20px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  serviceBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
    padding: '14px 16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s',
    fontSize: '15px',
  },
  category: {
    fontSize: '12px',
    color: '#4f46e5',
    fontWeight: 500,
  },
  desc: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4,
  },
  selectedLabel: {
    fontSize: '14px',
    fontWeight: 400,
    color: '#4f46e5',
    marginLeft: '8px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0 0 12px',
  },
  dateInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '15px',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '8px',
    marginBottom: '16px',
  },
  slotBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  slotBtnSelected: {
    borderColor: '#4f46e5',
    background: '#eef2ff',
    color: '#4f46e5',
  },
  empName: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '2px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '15px',
    outline: 'none',
  },
  summary: {
    background: '#f9fafb',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    lineHeight: 1.8,
  },
  primaryBtn: {
    width: '100%',
    padding: '12px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmation: {
    textAlign: 'center',
  },
  checkmark: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#10b981',
    color: '#fff',
    fontSize: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
};
