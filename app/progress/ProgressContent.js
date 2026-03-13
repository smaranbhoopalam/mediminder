'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import styles from './page.module.css';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function ProgressContent() {
  const router = useRouter();
  const [stressData, setStressData] = useState([]);
  const [medData, setMedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyAvg, setWeeklyAvg] = useState(null);
  const [trend, setTrend] = useState('stable');

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: stress } = await supabase.from('stress_entries')
        .select('stress_score, created_at')
        .eq('user_id', session.user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      setStressData(stress || []);

      const { data: logs } = await supabase.from('medication_logs')
        .select('status, created_at')
        .eq('user_id', session.user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      setMedData(logs || []);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekEntries = (stress || []).filter(s => new Date(s.created_at) >= sevenDaysAgo);
      if (weekEntries.length > 0) {
        const avg = Math.round(weekEntries.reduce((a, b) => a + b.stress_score, 0) / weekEntries.length);
        setWeeklyAvg(avg);

        if (weekEntries.length >= 3) {
          const firstHalf = weekEntries.slice(0, Math.floor(weekEntries.length / 2));
          const secondHalf = weekEntries.slice(Math.floor(weekEntries.length / 2));
          const firstAvg = firstHalf.reduce((a, b) => a + b.stress_score, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((a, b) => a + b.stress_score, 0) / secondHalf.length;
          if (secondAvg < firstAvg - 5) setTrend('improving');
          else if (secondAvg > firstAvg + 5) setTrend('worsening');
          else setTrend('stable');
        }
      }

      setLoading(false);
    }
    loadData();
  }, [router]);

  const stressChartData = {
    labels: stressData.map(d => new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Stress Score',
      data: stressData.map(d => d.stress_score),
      borderColor: '#8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#8b5cf6',
      pointBorderColor: '#fff',
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      y: {
        min: 0, max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b' },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#64748b' },
      },
    },
  };

  const medByDay = {};
  medData.forEach(log => {
    const day = new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!medByDay[day]) medByDay[day] = { taken: 0, missed: 0 };
    if (log.status === 'taken') medByDay[day].taken++;
    else medByDay[day].missed++;
  });

  const medChartData = {
    labels: Object.keys(medByDay),
    datasets: [
      { label: 'Taken', data: Object.values(medByDay).map(d => d.taken), backgroundColor: 'rgba(16, 185, 129, 0.7)', borderRadius: 6 },
      { label: 'Missed', data: Object.values(medByDay).map(d => d.missed), backgroundColor: 'rgba(239, 68, 68, 0.7)', borderRadius: 6 },
    ],
  };

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', position: 'relative', zIndex: 1 }}><div className="spinner" style={{ width: 48, height: 48 }}></div></div>;
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard')}>← Dashboard</button>
      </div>

      <div className="page-header">
        <h1>📊 Progress & Analytics</h1>
        <p>Track your wellness journey with weekly insights</p>
      </div>

      <div className={styles.summaryGrid}>
        <div className={`glass-card ${styles.summaryCard}`}>
          <span className={styles.summaryIcon}>📈</span>
          <div className={styles.summaryValue}>{weeklyAvg !== null ? weeklyAvg : '—'}</div>
          <div className={styles.summaryLabel}>Weekly Average Stress</div>
        </div>
        <div className={`glass-card ${styles.summaryCard}`}>
          <span className={styles.summaryIcon}>{trend === 'improving' ? '🎉' : trend === 'worsening' ? '⚠️' : '➡️'}</span>
          <div className={styles.summaryValue} style={{
            color: trend === 'improving' ? '#10b981' : trend === 'worsening' ? '#ef4444' : '#f8fafc',
            textTransform: 'capitalize'
          }}>{trend}</div>
          <div className={styles.summaryLabel}>Weekly Trend</div>
        </div>
        <div className={`glass-card ${styles.summaryCard}`}>
          <span className={styles.summaryIcon}>📝</span>
          <div className={styles.summaryValue}>{stressData.length}</div>
          <div className={styles.summaryLabel}>Total Check-ins</div>
        </div>
        <div className={`glass-card ${styles.summaryCard}`}>
          <span className={styles.summaryIcon}>💊</span>
          <div className={styles.summaryValue}>
            {medData.length > 0 ? Math.round((medData.filter(m => m.status === 'taken').length / medData.length) * 100) + '%' : '—'}
          </div>
          <div className={styles.summaryLabel}>Med Adherence</div>
        </div>
      </div>

      <div className={`glass-card ${styles.chartCard}`}>
        <h3>🧠 Stress Score Trend</h3>
        {stressData.length > 0 ? (
          <div className={styles.chartContainer}>
            <Line data={stressChartData} options={chartOptions} />
          </div>
        ) : (
          <div className={styles.noData}>
            <p>No stress data yet. Use the Stress Calculator to start tracking!</p>
            <button className="btn btn-primary" onClick={() => router.push('/stress')}>🧠 Calculate Stress</button>
          </div>
        )}
      </div>

      {medData.length > 0 && (
        <div className={`glass-card ${styles.chartCard}`} style={{ marginTop: 20 }}>
          <h3>💊 Medication Adherence</h3>
          <div className={styles.chartContainer}>
            <Bar data={medChartData} options={{
              ...chartOptions,
              plugins: { ...chartOptions.plugins, legend: { display: true, labels: { color: '#94a3b8' } } },
              scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, min: 0, max: undefined }, x: { ...chartOptions.scales.x, stacked: true } },
            }} />
          </div>
        </div>
      )}

      {stressData.length > 0 && (
        <div className={`glass-card ${styles.motivationCard}`}>
          <span className={styles.motivationEmoji}>{trend === 'improving' ? '🌟' : '💪'}</span>
          <p>
            {trend === 'improving'
              ? "You're making great progress! Your stress levels are going down. Keep up the amazing work! 🎉"
              : trend === 'worsening'
              ? "It looks like stress has been creeping up. Remember, it's okay to take a step back and focus on self-care. You've got this! 💪"
              : "You're staying consistent! Keep tracking your habits and stress levels. Small steps lead to big changes. 🌱"}
          </p>
        </div>
      )}
    </div>
  );
}
