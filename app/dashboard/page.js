'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import styles from './page.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ todayMeds: 0, pendingMeds: 0, totalMeds: 0, lastStress: null, weeklyAvg: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push('/login');
      return;
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profileData) {
      router.push('/register');
      return;
    }

    setProfile(profileData);

    const { data: meds } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', session.user.id);

    const today = new Date().toISOString().split('T')[0];

    const { data: todayLogs } = await supabase
      .from('medication_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('created_at', today);

    const { data: stressEntries } = await supabase
      .from('stress_entries')
      .select('stress_score, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(7);

    const lastStress = stressEntries?.[0]?.stress_score ?? null;

    const weeklyAvg =
      stressEntries?.length > 0
        ? Math.round(
            stressEntries.reduce((a, b) => a + b.stress_score, 0) /
            stressEntries.length
          )
        : null;

    setStats({
      todayMeds: todayLogs?.filter(log => log.status === 'taken')?.length || 0,
      pendingMeds: todayLogs?.filter(log => log.status === 'pending')?.length || 0,
      totalMeds: meds?.length || 0,
      lastStress,
      weeklyAvg,
    });

  } catch (err) {
    console.error("Dashboard error:", err);
  }

  setLoading(false);
}

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        <div className="spinner" style={{ width: 48, height: 48 }}></div>
      </div>
    );
  }

  const features = [
    {
      id: 'medications',
      icon: '💊',
      title: 'Medication Reminders',
      description: 'Track doses, upload proof, and alert your guardian automatically.',
      gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      stat: stats.totalMeds > 0 ? `${stats.totalMeds} active` : 'No medications',
      path: '/medications',
      hidden: !profile?.medication_opted_in,
    },
    {
      id: 'stress',
      icon: '🧠',
      title: 'Stress Calculator',
      description: 'Analyze daily habits to calculate your stress score and get recovery tips.',
      gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
      stat: stats.lastStress !== null ? `Score: ${stats.lastStress}/100` : 'Not calculated',
      path: '/stress',
    },
    {
      id: 'chat',
      icon: '🤖',
      title: 'AI Wellness Chat',
      description: 'Talk to your AI companion for personalized guidance and support.',
      gradient: 'linear-gradient(135deg, #10b981, #34d399)',
      stat: 'Always available',
      path: '/chat',
    },
    {
      id: 'progress',
      icon: '📊',
      title: 'Progress & Graphs',
      description: 'View weekly trends, averages, and track your wellness journey.',
      gradient: 'linear-gradient(135deg, #f97316, #ef4444)',
      stat: stats.weeklyAvg !== null ? `Weekly avg: ${stats.weeklyAvg}` : 'Start tracking',
      path: '/progress',
    },
  ];

  return (
    <div className="page-container">
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.greeting}>{getGreeting()}, {profile?.full_name?.split(' ')[0]} 👋</h1>
          <p className={styles.subtitle}>Here&apos;s your wellness overview for today</p>
        </div>
        <div className={styles.topActions}>
          <button className="btn btn-secondary btn-sm" onClick={() => router.push('/register')}>⚙️ Profile</button>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={styles.statsRow}>
        {profile?.medication_opted_in && (
          <div className={`${styles.statCard} ${styles.statMeds}`}>
            <div className={styles.statIcon}>💊</div>
            <div>
              <div className={styles.statValue}>{stats.todayMeds}/{stats.pendingMeds + stats.todayMeds || 0}</div>
              <div className={styles.statLabel}>Meds Taken Today</div>
            </div>
          </div>
        )}
        <div className={`${styles.statCard} ${styles.statStress}`}>
          <div className={styles.statIcon}>🧠</div>
          <div>
            <div className={styles.statValue}>{stats.lastStress !== null ? stats.lastStress : '—'}</div>
            <div className={styles.statLabel}>Last Stress Score</div>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statAvg}`}>
          <div className={styles.statIcon}>📈</div>
          <div>
            <div className={styles.statValue}>{stats.weeklyAvg !== null ? stats.weeklyAvg : '—'}</div>
            <div className={styles.statLabel}>Weekly Average</div>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className={styles.featuresGrid}>
        {features.filter(f => !f.hidden).map((feature, i) => (
          <div
            key={feature.id}
            className={styles.featureCard}
            onClick={() => router.push(feature.path)}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className={styles.featureIconBg} style={{ background: feature.gradient }}>
              <span className={styles.featureIcon}>{feature.icon}</span>
            </div>
            <h3 className={styles.featureTitle}>{feature.title}</h3>
            <p className={styles.featureDesc}>{feature.description}</p>
            <div className={styles.featureStat}>
              <span className="badge badge-info">{feature.stat}</span>
            </div>
            <div className={styles.featureArrow}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

