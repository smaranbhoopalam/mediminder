'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import styles from './page.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState({
    full_name: '', age: '', health_issues: '',
    user_email: '', user_phone: '',
    guardian_name: '', guardian_email: '', guardian_phone: '',
    guardian_social: '',
    medication_opted_in: true,
  });

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUserId(session.user.id);
      setForm(f => ({ ...f, user_email: session.user.email || '' }));
    }
    getUser();
  }, [router]);

  function updateForm(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setLoading(true);
    const healthIssuesArr = form.health_issues
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: form.full_name,
      age: parseInt(form.age),
      health_issues: healthIssuesArr,
      user_email: form.user_email,
      user_phone: form.user_phone,
      guardian_name: form.guardian_name,
      guardian_email: form.guardian_email,
      guardian_phone: form.guardian_phone,
      guardian_social: form.guardian_social,
      medication_opted_in: form.medication_opted_in,
    });

    if (error) {
      alert('Error saving profile: ' + error.message);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  }

  const totalSteps = 3;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoIcon}>🛡️</div>
          <h1>Complete Your Profile</h1>
          <p>Let&apos;s personalize your wellness experience</p>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${(step / totalSteps) * 100}%` }}></div>
          </div>
          <div className={styles.progressSteps}>
            {['Personal', 'Health', 'Guardian'].map((label, i) => (
              <div key={i} className={`${styles.progressStep} ${step > i ? styles.progressStepActive : ''}`}>
                <div className={styles.progressDot}>{step > i + 1 ? '✓' : i + 1}</div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h2>👤 Personal Information</h2>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="John Doe" value={form.full_name}
                onChange={e => updateForm('full_name', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Age</label>
              <input className="form-input" type="number" placeholder="25" value={form.age}
                onChange={e => updateForm('age', e.target.value)} required min={1} max={120} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.user_email}
                onChange={e => updateForm('user_email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" type="tel" placeholder="+1 234 567 890" value={form.user_phone}
                onChange={e => updateForm('user_phone', e.target.value)} />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
              onClick={() => form.full_name && form.age ? setStep(2) : null}
              disabled={!form.full_name || !form.age}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Health Details */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <h2>🏥 Health Information</h2>
            <div className="form-group">
              <label className="form-label">Health Issues / Diseases</label>
              <textarea className="form-input form-textarea"
                placeholder="Diabetes, Hypertension, Anxiety (comma separated)"
                value={form.health_issues}
                onChange={e => updateForm('health_issues', e.target.value)}
                style={{ minHeight: 100 }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Leave empty if none</span>
            </div>
            <div className={styles.toggleGroup}>
              <label className={styles.toggleLabel}>
                <span>I need medication reminders</span>
                <div className={`${styles.toggle} ${form.medication_opted_in ? styles.toggleActive : ''}`}
                  onClick={() => updateForm('medication_opted_in', !form.medication_opted_in)}>
                  <div className={styles.toggleThumb}></div>
                </div>
              </label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Turn off if you only want stress tracking & AI recovery plans
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(3)}>Continue →</button>
            </div>
          </div>
        )}

        {/* Step 3: Guardian Details */}
        {step === 3 && (
          <div className={styles.stepContent}>
            <h2>🛡️ Guardian Information</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 16 }}>
              Your guardian will receive alerts about your medications and wellness
            </p>
            <div className="form-group">
              <label className="form-label">Guardian Name</label>
              <input className="form-input" placeholder="Jane Doe" value={form.guardian_name}
                onChange={e => updateForm('guardian_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Guardian Email *</label>
              <input className="form-input" type="email" placeholder="guardian@email.com" value={form.guardian_email}
                onChange={e => updateForm('guardian_email', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Guardian Phone</label>
              <input className="form-input" type="tel" placeholder="+1 234 567 890" value={form.guardian_phone}
                onChange={e => updateForm('guardian_phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Guardian Social (Optional)</label>
              <input className="form-input" placeholder="Instagram, WhatsApp, etc." value={form.guardian_social}
                onChange={e => updateForm('guardian_social', e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={loading || !form.guardian_email}>
                {loading ? <span className="spinner" style={{width:20,height:20}}></span> : '✨ Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}