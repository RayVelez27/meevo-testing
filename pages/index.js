import { useState, useEffect } from 'react';
import Head from 'next/head';

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

  const stepLabels = ['Service', 'Date & Time', 'Your Info', 'Confirmed'];

  return (
    <>
      <Head>
        <title>Book an Appointment</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="sn-booking-widget">
        {/* Header */}
        <div className="sn-header">
          <span className="sn-header-label">Appointments</span>
          <h2>Book Your Visit</h2>
          <p>Select a service, choose your preferred time, and we&rsquo;ll take care of the rest.</p>
        </div>

        {/* Progress Steps */}
        <div className="sn-steps">
          {stepLabels.map((label, i) => (
            <div key={label} className="sn-step-item">
              <div className={`sn-step-dot ${step >= i + 1 ? 'active' : ''} ${step === i + 1 ? 'current' : ''}`}>
                {step > i + 1 ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`sn-step-label ${step >= i + 1 ? 'active' : ''}`}>{label}</span>
              {i < stepLabels.length - 1 && <div className={`sn-step-line ${step > i + 1 ? 'active' : ''}`} />}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="sn-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="sn-loading">
            <div className="sn-spinner" />
            <span>Loading...</span>
          </div>
        )}

        {/* Step 1: Pick Service */}
        {step === 1 && !loading && (
          <div className="sn-step-content">
            <div className="sn-filter-row">
              <span className="sn-filter-label">Services</span>
              <div className="sn-filter-divider" />
              <span className="sn-filter-count">{services.length} available</span>
            </div>
            <div className="sn-grid">
              {services.map((s) => (
                <div
                  key={s.serviceId}
                  className="sn-card"
                  onClick={() => {
                    setSelectedService(s);
                    setStep(2);
                    setError(null);
                  }}
                >
                  {s.category && <div className="sn-card-category">{s.category}</div>}
                  <div className="sn-card-name">{s.name}</div>
                  {s.description && <div className="sn-card-desc">{s.description}</div>}
                  <div className="sn-card-footer">
                    <span />
                    <button className="sn-card-book">
                      Select
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Pick Date & Time */}
        {step === 2 && (
          <div className="sn-step-content">
            <button className="sn-back-btn" onClick={() => setStep(1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to services
            </button>
            <div className="sn-selected-service">
              <span className="sn-header-label">Selected</span>
              <h3>{selectedService?.name}</h3>
            </div>
            <div className="sn-date-section">
              <label className="sn-filter-label">Choose a Date</label>
              <input
                type="date"
                min={today}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  fetchSlots(selectedService.serviceId, e.target.value);
                }}
                className="sn-date-input"
              />
            </div>
            {!loading && slots.length > 0 && (
              <div>
                <div className="sn-filter-row">
                  <span className="sn-filter-label">Available Times</span>
                  <div className="sn-filter-divider" />
                  <span className="sn-filter-count">{slots.length} slots</span>
                </div>
                <div className="sn-slot-grid">
                  {slots.map((slot, i) => (
                    <button
                      key={i}
                      className={`sn-slot-btn ${selectedSlot === slot ? 'active' : ''}`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {formatTime(slot.startTime)}
                      {slot.employeeName && (
                        <span className="sn-slot-emp">{slot.employeeName}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedSlot && (
              <button className="sn-primary-btn" onClick={() => { setStep(3); setError(null); }}>
                Continue
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            )}
          </div>
        )}

        {/* Step 3: Client Info */}
        {step === 3 && (
          <div className="sn-step-content">
            <button className="sn-back-btn" onClick={() => setStep(2)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back
            </button>
            <div className="sn-filter-row">
              <span className="sn-filter-label">Your Information</span>
              <div className="sn-filter-divider" />
            </div>
            <div className="sn-form-grid">
              <div className="sn-input-group">
                <label className="sn-input-label">First Name</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="sn-input"
                />
              </div>
              <div className="sn-input-group">
                <label className="sn-input-label">Last Name</label>
                <input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="sn-input"
                />
              </div>
              <div className="sn-input-group">
                <label className="sn-input-label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="sn-input"
                />
              </div>
              <div className="sn-input-group">
                <label className="sn-input-label">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="sn-input"
                />
              </div>
            </div>
            <div className="sn-summary">
              <div className="sn-summary-row"><span>Service</span><strong>{selectedService?.name}</strong></div>
              <div className="sn-summary-row"><span>Date</span><strong>{date}</strong></div>
              <div className="sn-summary-row"><span>Time</span><strong>{formatTime(selectedSlot?.startTime)}</strong></div>
              {selectedSlot?.employeeName && (
                <div className="sn-summary-row"><span>With</span><strong>{selectedSlot.employeeName}</strong></div>
              )}
            </div>
            <button
              className="sn-primary-btn"
              disabled={!form.firstName || !form.lastName || !form.email || !form.phone || loading}
              onClick={handleBook}
            >
              {loading ? 'Booking...' : 'Book Now'}
            </button>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && booking && (
          <div className="sn-step-content sn-confirmation">
            <div className="sn-check-circle">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2>Appointment Confirmed</h2>
            <p className="sn-confirm-sub">You&rsquo;re all set. We look forward to seeing you.</p>
            <div className="sn-summary">
              <div className="sn-summary-row"><span>Service</span><strong>{selectedService?.name}</strong></div>
              <div className="sn-summary-row"><span>Date</span><strong>{date}</strong></div>
              <div className="sn-summary-row"><span>Time</span><strong>{formatTime(selectedSlot?.startTime)}</strong></div>
              {selectedSlot?.employeeName && (
                <div className="sn-summary-row"><span>With</span><strong>{selectedSlot.employeeName}</strong></div>
              )}
              <div className="sn-summary-row"><span>Name</span><strong>{form.firstName} {form.lastName}</strong></div>
              <div className="sn-summary-row"><span>Email</span><strong>{form.email}</strong></div>
            </div>
            <button className="sn-primary-btn sn-outline-btn" onClick={reset}>
              Book Another Appointment
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        :root {
          --color-bg: #FFFFFF;
          --color-surface: #FFFFFF;
          --color-text: #1a1a1a;
          --color-text-muted: #6b7280;
          --color-accent: #2b5144;
          --color-accent-hover: #1e3a30;
          --color-accent-light: #eef4f1;
          --color-border: #e5e7eb;
          --color-tag-bg: #f3f4f6;
          --color-tag-active-bg: #2b5144;
          --color-tag-active-text: #FFFFFF;
          --font-display: 'Inter', system-ui, sans-serif;
          --font-body: 'Inter', system-ui, sans-serif;
          --radius-sm: 6px;
          --radius-md: 12px;
          --radius-lg: 20px;
          --shadow-card: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(43,81,68,0.05);
          --shadow-card-hover: 0 2px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(43,81,68,0.1);
          --transition: 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: var(--color-bg); }

        .sn-booking-widget {
          font-family: var(--font-body);
          color: var(--color-text);
          background: var(--color-bg);
          padding: 48px 24px 64px;
          min-height: 100vh;
          max-width: 1200px;
          margin: 0 auto;
          -webkit-font-smoothing: antialiased;
        }

        /* Header */
        .sn-header {
          text-align: center;
          max-width: 640px;
          margin: 0 auto 48px;
          animation: snFadeUp 0.6s ease both;
        }
        .sn-header-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--color-accent);
          margin-bottom: 16px;
          display: block;
        }
        .sn-header h2 {
          font-family: var(--font-display);
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 300;
          line-height: 1.1;
          color: var(--color-text);
          margin-bottom: 16px;
          letter-spacing: -0.5px;
        }
        .sn-header p {
          font-size: 15px;
          font-weight: 300;
          line-height: 1.7;
          color: var(--color-text-muted);
          max-width: 480px;
          margin: 0 auto;
        }

        /* Progress Steps */
        .sn-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 48px;
          animation: snFadeUp 0.6s 0.1s ease both;
        }
        .sn-step-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sn-step-dot {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          background: var(--color-tag-bg);
          color: var(--color-text-muted);
          transition: all var(--transition);
          flex-shrink: 0;
        }
        .sn-step-dot.active {
          background: var(--color-tag-active-bg);
          color: var(--color-tag-active-text);
        }
        .sn-step-dot.current {
          box-shadow: 0 0 0 4px var(--color-accent-light);
        }
        .sn-step-label {
          font-size: 13px;
          font-weight: 400;
          color: var(--color-text-muted);
          white-space: nowrap;
          transition: color var(--transition);
        }
        .sn-step-label.active {
          color: var(--color-text);
          font-weight: 500;
        }
        .sn-step-line {
          width: 32px;
          height: 2px;
          background: var(--color-border);
          margin: 0 8px;
          transition: background var(--transition);
          flex-shrink: 0;
        }
        .sn-step-line.active {
          background: var(--color-accent);
        }
        @media (max-width: 600px) {
          .sn-step-label { display: none; }
          .sn-step-line { width: 24px; }
        }

        /* Error */
        .sn-error {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fef2f2;
          color: #dc2626;
          padding: 14px 18px;
          border-radius: var(--radius-md);
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 400;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          animation: snFadeUp 0.3s ease both;
        }

        /* Loading */
        .sn-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 48px;
          color: var(--color-text-muted);
          font-size: 14px;
        }
        .sn-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: snSpin 0.8s linear infinite;
        }
        @keyframes snSpin {
          to { transform: rotate(360deg); }
        }

        /* Step Content */
        .sn-step-content {
          animation: snFadeUp 0.5s ease both;
        }

        /* Filter Row */
        .sn-filter-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .sn-filter-label {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--color-text-muted);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .sn-filter-divider {
          flex: 1;
          height: 1px;
          background: var(--color-border);
        }
        .sn-filter-count {
          font-size: 13px;
          font-weight: 400;
          color: var(--color-text-muted);
          white-space: nowrap;
        }

        /* Service Cards Grid */
        .sn-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
        }
        @media (max-width: 420px) {
          .sn-grid { grid-template-columns: 1fr; }
        }

        /* Card */
        .sn-card {
          background: var(--color-surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-card);
          padding: 28px 28px 24px;
          display: flex;
          flex-direction: column;
          transition: all var(--transition);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          animation: snFadeUp 0.5s ease both;
        }
        .sn-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--color-accent), transparent);
          opacity: 0;
          transition: opacity var(--transition);
        }
        .sn-card:hover {
          box-shadow: var(--shadow-card-hover);
          border-color: rgba(43,81,68,0.3);
          transform: translateY(-2px);
        }
        .sn-card:hover::before { opacity: 1; }
        .sn-card-category {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--color-accent);
          background: var(--color-accent-light);
          padding: 4px 12px;
          border-radius: 100px;
          white-space: nowrap;
          align-self: flex-start;
          margin-bottom: 12px;
        }
        .sn-card-name {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 500;
          line-height: 1.25;
          color: var(--color-text);
          margin-bottom: 10px;
          letter-spacing: -0.2px;
        }
        .sn-card-desc {
          font-size: 13.5px;
          font-weight: 300;
          line-height: 1.65;
          color: var(--color-text-muted);
          margin-bottom: 18px;
          flex: 1;
        }
        .sn-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 18px;
          border-top: 1px solid var(--color-border);
        }
        .sn-card-book {
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 500;
          padding: 10px 24px;
          border-radius: 100px;
          border: none;
          background: var(--color-tag-active-bg);
          color: var(--color-tag-active-text);
          cursor: pointer;
          transition: all var(--transition);
          display: inline-flex;
          align-items: center;
          gap: 6px;
          letter-spacing: 0.3px;
        }
        .sn-card-book:hover {
          background: var(--color-accent-hover);
          transform: scale(1.03);
        }
        .sn-card-book:hover svg { transform: translateX(2px); }
        .sn-card-book svg { transition: transform var(--transition); }

        /* Back Button */
        .sn-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--color-accent);
          cursor: pointer;
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 500;
          padding: 0 0 24px;
          transition: color var(--transition);
        }
        .sn-back-btn:hover { color: var(--color-accent-hover); }

        /* Selected Service Banner */
        .sn-selected-service {
          background: var(--color-accent-light);
          border-radius: var(--radius-md);
          padding: 20px 24px;
          margin-bottom: 32px;
        }
        .sn-selected-service .sn-header-label { margin-bottom: 6px; }
        .sn-selected-service h3 {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 500;
          color: var(--color-text);
          letter-spacing: -0.3px;
        }

        /* Date Input */
        .sn-date-section {
          margin-bottom: 32px;
        }
        .sn-date-section .sn-filter-label {
          display: block;
          margin-bottom: 10px;
        }
        .sn-date-input {
          width: 100%;
          max-width: 300px;
          padding: 12px 16px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: 15px;
          color: var(--color-text);
          background: var(--color-surface);
          outline: none;
          transition: border-color var(--transition);
        }
        .sn-date-input:focus {
          border-color: var(--color-accent);
        }

        /* Time Slots */
        .sn-slot-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 10px;
          margin-bottom: 32px;
        }
        .sn-slot-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-surface);
          cursor: pointer;
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text);
          transition: all var(--transition);
        }
        .sn-slot-btn:hover {
          border-color: var(--color-accent);
          background: var(--color-accent-light);
        }
        .sn-slot-btn.active {
          border-color: var(--color-accent);
          background: var(--color-tag-active-bg);
          color: var(--color-tag-active-text);
        }
        .sn-slot-emp {
          font-size: 11px;
          font-weight: 400;
          color: var(--color-text-muted);
          margin-top: 3px;
        }
        .sn-slot-btn.active .sn-slot-emp {
          color: rgba(255,255,255,0.7);
        }

        /* Form */
        .sn-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 32px;
        }
        @media (max-width: 500px) {
          .sn-form-grid { grid-template-columns: 1fr; }
        }
        .sn-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .sn-input-label {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--color-text-muted);
        }
        .sn-input {
          padding: 12px 16px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-family: var(--font-body);
          font-size: 15px;
          color: var(--color-text);
          outline: none;
          transition: border-color var(--transition);
        }
        .sn-input:focus {
          border-color: var(--color-accent);
        }

        /* Summary */
        .sn-summary {
          background: var(--color-accent-light);
          border-radius: var(--radius-md);
          padding: 20px 24px;
          margin-bottom: 24px;
        }
        .sn-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(43,81,68,0.1);
        }
        .sn-summary-row:last-child { border-bottom: none; }
        .sn-summary-row span {
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .sn-summary-row strong {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text);
        }

        /* Primary Button */
        .sn-primary-btn {
          width: 100%;
          max-width: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 0 auto;
          padding: 14px 32px;
          background: var(--color-tag-active-bg);
          color: var(--color-tag-active-text);
          border: none;
          border-radius: 100px;
          font-family: var(--font-body);
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition);
          letter-spacing: 0.3px;
        }
        .sn-primary-btn:hover {
          background: var(--color-accent-hover);
          transform: scale(1.02);
        }
        .sn-primary-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .sn-primary-btn svg { transition: transform var(--transition); }
        .sn-primary-btn:hover svg { transform: translateX(2px); }

        /* Outline variant */
        .sn-outline-btn {
          background: transparent;
          color: var(--color-accent);
          border: 1px solid var(--color-border);
        }
        .sn-outline-btn:hover {
          background: var(--color-accent-light);
          border-color: var(--color-accent);
        }

        /* Confirmation */
        .sn-confirmation {
          text-align: center;
          max-width: 500px;
          margin: 0 auto;
        }
        .sn-check-circle {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: var(--color-accent);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          animation: snFadeUp 0.5s ease both;
        }
        .sn-confirmation h2 {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 400;
          color: var(--color-text);
          margin-bottom: 8px;
          letter-spacing: -0.3px;
        }
        .sn-confirm-sub {
          font-size: 15px;
          color: var(--color-text-muted);
          margin-bottom: 32px;
          font-weight: 300;
        }

        @keyframes snFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
