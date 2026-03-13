'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import styles from './page.module.css';

export default function MedicationsPage() {
  const router = useRouter();
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '', dosage: '', frequency: 1, times: ['08:00'], stock_count: 30, per_day: 1
  });
  const [activeReminder, setActiveReminder] = useState(null);
  const [reminderTimer, setReminderTimer] = useState(null);
  const [photoMode, setPhotoMode] = useState(null); // {medId, logId, type: 'before'|'after'}
  const [alarmAudio, setAlarmAudio] = useState(null);

  const loadMeds = useCallback(async (uid) => {
    const { data } = await supabase.from('medications').select('*').eq('user_id', uid).order('created_at');
    setMeds(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUserId(session.user.id);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(p);
      loadMeds(session.user.id);
    }
    init();
  }, [router, loadMeds]);

  async function addMedication(e) {
    e.preventDefault();

    const { error } = await supabase.from('medications').insert({
      user_id: userId,
      name: form.name,
      dosage: form.dosage,
      schedule_time: form.times[0],
      frequency: form.frequency,
      times: form.times,
      stock_count: form.stock_count,
      per_day: form.per_day
    });

    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    setShowAdd(false);

    setForm({
      name: '',
      dosage: '',
      frequency: 1,
      times: ['08:00'],
      stock_count: 30,
      per_day: 1
    });

    loadMeds(userId);
  }

  async function deleteMed(id) {
    if (confirm('Delete this medication?')) {
      await supabase.from('medications').delete().eq('id', id);
      loadMeds(userId);
    }
  }

  function updateTimes(index, value) {
    const newTimes = [...form.times];
    newTimes[index] = value;
    setForm(f => ({ ...f, times: newTimes }));
  }

  function setFrequency(freq) {
    const times = Array.from({ length: freq }, (_, i) => {
      const hour = Math.round(8 + (i * (14 / freq)));
      return `${String(hour).padStart(2, '0')}:00`;
    });
    setForm(f => ({ ...f, frequency: freq, times }));
  }

  function startAlarm() {
    const audio = new Audio('/alarm.mp3');
    audio.loop = true;
    audio.play();
    setAlarmAudio(audio);
  }

  function stopAlarm() {
    if (alarmAudio) {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
    }
  }

  async function startReminder(med) {

    startAlarm();

    // Create a medication log
    const { data: log } = await supabase.from('medication_logs').insert({
      medication_id: med.id,
      user_id: userId,
      scheduled_time: new Date().toISOString(),
      status: 'pending'
    }).select().single();

    setActiveReminder({ med, log, startTime: Date.now(), elapsed: 0 });
    setPhotoMode({ medId: med.id, logId: log.id, type: 'before' });
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file || !photoMode) return;

    const fileName = `${userId}/${photoMode.logId}_${photoMode.type}_${Date.now()}.jpg`;
    const { data, error } = await supabase.storage.from('medication-photos').upload(fileName, file);

    if (!error) {
      const { data: urlData } = supabase.storage.from('medication-photos').getPublicUrl(fileName);
      const updateField = photoMode.type === 'before' ? 'photo_before_url' : 'photo_after_url';

      await supabase.from('medication_logs').update({
        [updateField]: urlData.publicUrl,
        ...(photoMode.type === 'after' ? { status: 'taken', taken_at: new Date().toISOString() } : {}),
      }).eq('id', photoMode.logId);

      if (photoMode.type === 'before') {
        setPhotoMode({ ...photoMode, type: 'after' });
      } else {

        stopAlarm();
        
        // Medication taken! Notify guardian
        await notifyGuardian(activeReminder.med, 'taken');
        setActiveReminder(null);
        setPhotoMode(null);

        // Update stock
        const med = meds.find(m => m.id === photoMode.medId);
        if (med) {
          const newStock = med.stock_count - 1;
          await supabase.from('medications').update({ stock_count: newStock }).eq('id', med.id);

          // Check low stock
          if (newStock <= med.per_day * 3) {
            await notifyGuardian(med, 'low_stock');
          }
          loadMeds(userId);
        }
      }
    }
  }

  async function notifyGuardian(med, type) {
    try {
      await fetch('/api/medications/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardianEmail: profile?.guardian_email,
          guardianName: profile?.guardian_name,
          userName: profile?.full_name,
          medicationName: med.name,
          type,
        }),
      });
    } catch (err) {
      console.error('Failed to notify guardian:', err);
    }
  }

  // Reminder timer effect
  useEffect(() => {
    if (!activeReminder) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeReminder.startTime) / 1000);
      setActiveReminder(prev => prev ? { ...prev, elapsed } : null);

      // Remind every 5 minutes
      if (elapsed > 0 && elapsed % 300 === 0 && elapsed <= 1800) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('💊 Medication Reminder', {
            body: `Time to take ${activeReminder.med.name}!`,
          });
        }
      }

      // After 30 minutes, alert guardian if not taken
      if (elapsed >= 1800 && !reminderTimer) {
        notifyGuardian(activeReminder.med, 'not_taken');
        setReminderTimer('expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeReminder, reminderTimer]);

  // ✅ AUTOMATIC MEDICATION TIME CHECK
  useEffect(() => {

    const checkMedicationTimes = () => {

      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      meds.forEach((med) => {

        if (!med.times) return;

        if (med.times.includes(currentTime)) {

          if (!activeReminder) {
            startReminder(med);
          }

        }

      });

    };

    const interval = setInterval(checkMedicationTimes, 60000);

    return () => clearInterval(interval);

  }, [meds, activeReminder]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  function getDaysLeft(med) {
    return Math.floor(med.stock_count / (med.per_day || 1));
  }

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', position: 'relative', zIndex: 1 }}><div className="spinner" style={{ width: 48, height: 48 }}></div></div>;
  }

  return (
    <div className="page-container">
      <div className={styles.topBar}>
        <div>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard')}>← Dashboard</button>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Medication</button>
      </div>

      <div className="page-header">
        <h1>💊 Medication Reminders</h1>
        <p>Track your medications, set reminders, and keep your guardian informed</p>
      </div>

      {/* Active Reminder Banner */}
      {activeReminder && (
        <div className={styles.reminderBanner}>
          <div className={styles.reminderInfo}>
            <h3>⏰ Active Reminder: {activeReminder.med.name}</h3>
            <p>Time elapsed: {Math.floor(activeReminder.elapsed / 60)}:{String(activeReminder.elapsed % 60).padStart(2, '0')}</p>
            {activeReminder.elapsed >= 1800 && <span className="badge badge-danger">Guardian has been notified</span>}
          </div>

          {photoMode && (
            <div className={styles.photoUpload}>
              <p>📸 Upload a photo <strong>{photoMode.type === 'before' ? 'BEFORE' : 'AFTER'}</strong> taking your medication</p>
              <label className="btn btn-primary">
                📷 {photoMode.type === 'before' ? 'Photo Before' : 'Photo After (confirms taken)'}
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Medication Cards */}
      {meds.length === 0 && !showAdd ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>💊</span>
          <h3>No Medications Registered</h3>
          <p>Add your first medication to start getting reminders</p>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Medication</button>
        </div>
      ) : (
        <div className={styles.medGrid}>
          {meds.map(med => (
            <div key={med.id} className={`glass-card ${styles.medCard}`}>
              <div className={styles.medHeader}>
                <h3>{med.name}</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => deleteMed(med.id)}>🗑️</button>
              </div>
              <div className={styles.medDetails}>
                <div className={styles.medDetail}><span>💉 Dosage</span><strong>{med.dosage}</strong></div>
                <div className={styles.medDetail}><span>🔄 Frequency</span><strong>{med.frequency}x/day</strong></div>
                <div className={styles.medDetail}><span>⏰ Times</span><strong>{med.times?.join(', ')}</strong></div>
                <div className={styles.medDetail}>
                  <span>📦 Stock</span>
                  <strong style={{ color: getDaysLeft(med) <= 3 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {med.stock_count} ({getDaysLeft(med)} days)
                  </strong>
                </div>
              </div>
              {getDaysLeft(med) <= 3 && (
                <div className={styles.stockAlert}>
                  ⚠️ Low stock! Please restock {med.name}
                </div>
              )}
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}
                onClick={() => startReminder(med)} disabled={!!activeReminder}>
                🔔 Take Now
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Medication Modal */}
      {showAdd && (
        <div className={styles.modal} onClick={() => setShowAdd(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>Add New Medication</h2>
            <form onSubmit={addMedication}>
              <div className="form-group">
                <label className="form-label">Medication Name</label>
                <input className="form-input" placeholder="e.g. Metformin" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Dosage</label>
                <input className="form-input" placeholder="e.g. 500mg" value={form.dosage}
                  onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Times per day</label>
                <select className="form-input form-select" value={form.frequency}
                  onChange={e => setFrequency(parseInt(e.target.value))}>
                  {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}x per day</option>)}
                </select>
              </div>
              {form.times.map((time, i) => (
                <div className="form-group" key={i}>
                  <label className="form-label">Time #{i + 1}</label>
                  <input className="form-input" type="time" value={time}
                    onChange={e => updateTimes(i, e.target.value)} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Current Stock (number of pills/doses)</label>
                <input className="form-input" type="number" value={form.stock_count}
                  onChange={e => setForm(f => ({ ...f, stock_count: parseInt(e.target.value) }))} min={1} />
              </div>
              <div className="form-group">
                <label className="form-label">Doses per day</label>
                <input className="form-input" type="number" value={form.per_day}
                  onChange={e => setForm(f => ({ ...f, per_day: parseInt(e.target.value) }))} min={1} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Add Medication</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
