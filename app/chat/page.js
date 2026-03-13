'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import styles from './page.module.css';

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(p);

      // Get recent stress data for context
      const { data: stressData } = await supabase.from('stress_entries')
        .select('*').eq('user_id', session.user.id)
        .order('created_at', { ascending: false }).limit(1);

      const welcomeMsg = stressData?.[0]?.stress_score > 60
        ? `I notice your recent stress score was ${stressData[0].stress_score}/100. I'm here to help you through this. What's been on your mind?`
        : `Hi ${p?.full_name?.split(' ')[0] || 'there'}! 👋 I'm WellBot, your wellness companion. How are you feeling today?`;

      setMessages([{ role: 'assistant', content: welcomeMsg }]);
    }
    init();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          userContext: {
            name: profile?.full_name,
            age: profile?.age,
            health_issues: profile?.health_issues,
          },
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble responding. Please try again.' }]);
    }
    setLoading(false);
  }

  const quickPrompts = [
    '😤 I\'m feeling very stressed right now',
    '😴 I can\'t sleep well lately',
    '🍽️ Suggest a healthy meal plan',
    '🧘 Guide me through a breathing exercise',
    '💪 I need motivation today',
  ];

  return (
    <div className="page-container" style={{ maxWidth: 800, height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard')}>← Dashboard</button>
        <h2 style={{ fontFamily: 'Outfit', fontSize: '1.2rem', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🤖 WellBot
        </h2>
      </div>

      <div className={`glass-card ${styles.chatBox}`}>
        <div className={styles.chatMessages}>
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
              {msg.role === 'assistant' && <div className={styles.botAvatar}>🤖</div>}
              <div className={styles.messageContent}>
                <div className={styles.messageBubble}>{msg.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className={`${styles.message} ${styles.assistant}`}>
              <div className={styles.botAvatar}>🤖</div>
              <div className={styles.messageBubble}>
                <div className={styles.typingDots}><span></span><span></span><span></span></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 1 && (
          <div className={styles.quickPrompts}>
            {quickPrompts.map((prompt, i) => (
              <button key={i} className={styles.quickPrompt}
                onClick={() => { setInput(prompt); }}>
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={sendMessage} className={styles.inputArea}>
          <input
            className="form-input"
            placeholder="Type your message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
