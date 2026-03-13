'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { calculateStressScore } from '../../lib/stressCalculator';
import styles from './page.module.css';

export default function StressPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [step, setStep] = useState('input'); // 'input', 'result'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [recoveryPlan, setRecoveryPlan] = useState(null);
  const [customFactors, setCustomFactors] = useState([]);
  const [form, setForm] = useState({
    wake_time: '07:00',
    sleep_time: '23:00',
    food_habits: 'average',
    protein_intake: 40,
    nutrient_intake: 60,
    typing_speed: 50,
    anxiousness: 5,
    nervousness: 5,
  });

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUserId(session.user.id);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(p);
    }
    init();
  }, [router]);

  function updateForm(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function addCustomFactor() {
    setCustomFactors(f => [...f, { name: '', value: 5 }]);
  }

  function updateCustomFactor(index, field, value) {
    setCustomFactors(f => {
      const updated = [...f];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeCustomFactor(index) {
    setCustomFactors(f => f.filter((_, i) => i !== index));
  }

  async function calculateStress() {
    setLoading(true);
    
    const customObj = {};
    customFactors.forEach(cf => {
      if (cf.name) customObj[cf.name] = cf.value;
    });

    const stressData = { ...form, custom_factors: Object.keys(customObj).length > 0 ? customObj : null };
    const scoreResult = calculateStressScore(stressData);
    setResult(scoreResult);

    // Save to database
    await supabase.from('stress_entries').insert({
      user_id: userId,
      wake_time: form.wake_time,
      sleep_time: form.sleep_time,
      food_habits: form.food_habits,
      protein_intake: form.protein_intake,
      nutrient_intake: form.nutrient_intake,
      typing_speed: form.typing_speed,
      anxiousness: form.anxiousness,
      nervousness: form.nervousness,
      custom_factors: customObj,
      stress_score: scoreResult.score,
    });

    // Get AI recovery plan
    try {
      const res = await fetch('/api/ai/recovery-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stressData: { ...stressData, stress_score: scoreResult.score }, userProfile: profile }),
      });
      const plan = await res.json();
      setRecoveryPlan(plan);
    } catch (err) {
      console.error('Failed to get recovery plan:', err);
    }

    setStep('result');
    setLoading(false);
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard')}>← Dashboard</button>
      </div>
      
      <div className="page-header">
        <h1>🧠 Stress Calculator</h1>
        <p>Analyze your daily habits to calculate your stress level</p>
      </div>

      {step === 'input' && (
        <div className={styles.formContainer}>
          <div className={styles.formGrid}>
            {/* Sleep */}
            <div className="glass-card">
              <h3 className={styles.sectionTitle}>😴 Sleep Pattern</h3>
              <div className="form-group">
                <label className="form-label">Sleep Time (last night)</label>
                <input className="form-input" type="time" value={form.sleep_time}
                  onChange={e => updateForm('sleep_time', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Wake Up Time</label>
                <input className="form-input" type="time" value={form.wake_time}
                  onChange={e => updateForm('wake_time', e.target.value)} />
              </div>
            </div>

            {/* Food */}
            <div className="glass-card">
              <h3 className={styles.sectionTitle}>🍽️ Food & Nutrition</h3>
              <div className="form-group">
                <label className="form-label">Food Habits Today</label>
                <select className="form-input form-select" value={form.food_habits}
                  onChange={e => updateForm('food_habits', e.target.value)}>
                  <option value="excellent">Excellent — balanced, home-cooked</option>
                  <option value="good">Good — mostly healthy</option>
                  <option value="average">Average — mix of healthy & junk</option>
                  <option value="poor">Poor — mostly junk food</option>
                  <option value="very_poor">Very Poor — skipped meals</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Protein Intake ({form.protein_intake}g)</label>
                <input type="range" min="0" max="100" value={form.protein_intake}
                  onChange={e => updateForm('protein_intake', parseInt(e.target.value))}
                  className={styles.slider} />
                <div className={styles.sliderLabels}><span>0g</span><span>50g</span><span>100g</span></div>
              </div>
              <div className="form-group">
                <label className="form-label">Nutrient Intake ({form.nutrient_intake}%)</label>
                <input type="range" min="0" max="100" value={form.nutrient_intake}
                  onChange={e => updateForm('nutrient_intake', parseInt(e.target.value))}
                  className={styles.slider} />
                <div className={styles.sliderLabels}><span>0%</span><span>50%</span><span>100%</span></div>
              </div>
            </div>

            {/* Mental */}
            <div className="glass-card">
              <h3 className={styles.sectionTitle}>🧠 Mental State</h3>
              <div className="form-group">
                <label className="form-label">Anxiousness Level ({form.anxiousness}/10)</label>
                <input type="range" min="1" max="10" value={form.anxiousness}
                  onChange={e => updateForm('anxiousness', parseInt(e.target.value))}
                  className={styles.slider} />
                <div className={styles.sliderLabels}><span>Calm</span><span>Moderate</span><span>Very Anxious</span></div>
              </div>
              <div className="form-group">
                <label className="form-label">Nervousness Level ({form.nervousness}/10)</label>
                <input type="range" min="1" max="10" value={form.nervousness}
                  onChange={e => updateForm('nervousness', parseInt(e.target.value))}
                  className={styles.slider} />
                <div className={styles.sliderLabels}><span>Calm</span><span>Moderate</span><span>Very Nervous</span></div>
              </div>
              <div className="form-group">
                <label className="form-label">Typing Speed / Motor Activity ({form.typing_speed} WPM)</label>
                <input type="range" min="10" max="150" value={form.typing_speed}
                  onChange={e => updateForm('typing_speed', parseInt(e.target.value))}
                  className={styles.slider} />
                <div className={styles.sliderLabels}><span>Slow</span><span>Normal</span><span>Very Fast</span></div>
              </div>
            </div>

            {/* Custom Factors */}
            <div className="glass-card">
              <h3 className={styles.sectionTitle}>➕ Custom Factors</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                Add your own stress indicators
              </p>
              {customFactors.map((cf, i) => (
                <div key={i} className={styles.customFactor}>
                  <input className="form-input" placeholder="Factor name" value={cf.name}
                    onChange={e => updateCustomFactor(i, 'name', e.target.value)} style={{ flex: 1 }} />
                  <input type="range" min="1" max="10" value={cf.value}
                    onChange={e => updateCustomFactor(i, 'value', parseInt(e.target.value))}
                    className={styles.slider} style={{ flex: 1 }} />
                  <span style={{ minWidth: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>{cf.value}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => removeCustomFactor(i)}>✕</button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={addCustomFactor} style={{ marginTop: 8 }}>
                + Add Factor
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 24 }}
            onClick={calculateStress} disabled={loading}>
            {loading ? <><span className="spinner" style={{width:20,height:20}}></span> Analyzing...</> : '🧠 Calculate Stress Score'}
          </button>
        </div>
      )}

      {step === 'result' && result && (
        <div className={styles.resultContainer}>
          {/* Score Display */}
          <div className={`glass-card ${styles.scoreCard}`}>
            <div className="stress-gauge" style={{
              background: `conic-gradient(${result.color} ${result.score * 3.6}deg, rgba(255,255,255,0.05) 0deg)`
            }}>
              <div style={{ textAlign: 'center' }}>
                <div className="score" style={{ color: result.color }}>{result.score}</div>
                <div className="label">/ 100</div>
              </div>
            </div>
            <h2 style={{ textAlign: 'center', marginTop: 16 }}>
              <span className="badge" style={{
                background: `${result.color}20`,
                color: result.color,
                fontSize: '1rem',
                padding: '8px 20px'
              }}>
                {result.level} Stress
              </span>
            </h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: 8 }}>
              Based on {result.factorsAnalyzed} factors analyzed
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => router.push('/chat')}>
                🤖 Talk to AI Companion
              </button>
              <button className="btn btn-secondary" onClick={() => { setStep('input'); setResult(null); setRecoveryPlan(null); }}>
                ↩ Recalculate
              </button>
            </div>
          </div>

          {/* Recovery Plan */}
          {recoveryPlan && !recoveryPlan.raw && (
            <div className={styles.planGrid}>
              <div className={`glass-card ${styles.planCard}`}>
                <h3>🌅 Recovery Plan</h3>
                {recoveryPlan.recovery_plan && (
                  <div className={styles.planItems}>
                    <div className={styles.planItem}><span className={styles.planTime}>Right Now</span><p>{recoveryPlan.recovery_plan.right_now}</p></div>
                    <div className={styles.planItem}><span className={styles.planTime}>This Afternoon</span><p>{recoveryPlan.recovery_plan.this_afternoon}</p></div>
                    <div className={styles.planItem}><span className={styles.planTime}>Tonight</span><p>{recoveryPlan.recovery_plan.tonight}</p></div>
                  </div>
                )}
              </div>

              <div className={`glass-card ${styles.planCard}`}>
                <h3>🥗 Nutrition Advice</h3>
                {recoveryPlan.nutrition_advice && (
                  <div className={styles.planItems}>
                    <div className={styles.planItem}><span className={styles.planTime}>Next Meal</span><p>{recoveryPlan.nutrition_advice.next_meal}</p></div>
                    <div className={styles.planItem}><span className={styles.planTime}>Supplements</span><p>{recoveryPlan.nutrition_advice.supplements}</p></div>
                    <div className={styles.planItem}><span className={styles.planTime}>Hydration</span><p>{recoveryPlan.nutrition_advice.hydration}</p></div>
                  </div>
                )}
              </div>

              <div className={`glass-card ${styles.planCard}`}>
                <h3>🧘 Mindset Tips</h3>
                {recoveryPlan.mindset_tips && (
                  <div className={styles.planItems}>
                    <div className={styles.planItem}><span className={styles.planTime}>Breathing</span><p>{recoveryPlan.mindset_tips.breathing_exercise}</p></div>
                    <div className={styles.planItem}><span className={styles.planTime}>Reframe</span><p>{recoveryPlan.mindset_tips.cognitive_reframe}</p></div>
                    <div className={styles.planItem}><span className={styles.planTime}>Evening Ritual</span><p>{recoveryPlan.mindset_tips.evening_ritual}</p></div>
                  </div>
                )}
              </div>

              <div className={`glass-card ${styles.planCard}`}>
                <h3>🌙 Sleep Optimization</h3>
                {recoveryPlan.sleep_optimization && (
                  <div className={styles.planItems}>
                    <div className={styles.planItem}><span className={styles.planTime}>Wind Down</span><p>{recoveryPlan.sleep_optimization.wind_down_time}</p></div>
                    <div className={styles.planItem}><span className={styles.planTime}>Protocol</span><p>{recoveryPlan.sleep_optimization.protocol}</p></div>
                    <div className={styles.planItem}><span className={styles.planTime}>Environment</span><p>{recoveryPlan.sleep_optimization.environment}</p></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {recoveryPlan?.overall_message && (
            <div className={`glass-card ${styles.messageCard}`}>
              <p>💬 {recoveryPlan.overall_message}</p>
            </div>
          )}

          {result.score > 60 && (
            <div className={styles.highStressBanner}>
              <h3>❗ Your stress level is {result.level.toLowerCase()}. Consider talking to our AI companion for immediate support.</h3>
              <button className="btn btn-primary" onClick={() => router.push('/chat')}>
                🤖 Open AI Chat
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
