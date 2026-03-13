import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { guardianEmail, guardianName, userName, medicationName, type } = await request.json();

    if (!guardianEmail) {
      return Response.json({ error: 'No guardian email provided' }, { status: 400 });
    }

    let subject, html;

    switch (type) {

      case 'reminder':
        subject = `⏰ Medication Reminder for ${userName}`;
        html = `
          <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h1 style="color: #3b82f6; font-size: 24px;">⏰ Medication Reminder</h1>
            <p style="color: #94a3b8; line-height: 1.6;">
              Hi ${guardianName || 'Guardian'},<br><br>
              This is a reminder that <strong>${userName}</strong> should now take their medication <strong>${medicationName}</strong>.
            </p>
            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">— MediMinder Wellness App</p>
          </div>`;
        break;

      case 'taken':
        subject = `✅ ${userName} has taken their medication — ${medicationName}`;
        html = `
          <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h1 style="color: #10b981; font-size: 24px;">✅ Medication Taken</h1>
            <p style="color: #94a3b8; line-height: 1.6;">
              Hi ${guardianName || 'Guardian'},<br><br>
              Great news! <strong>${userName}</strong> has successfully taken their medication <strong>${medicationName}</strong> and uploaded photo proof.
            </p>
            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">— MindGuard Wellness App</p>
          </div>`;
        break;

      case 'not_taken':
        subject = `⚠️ ALERT: ${userName} has NOT taken ${medicationName}`;
        html = `
          <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h1 style="color: #ef4444; font-size: 24px;">⚠️ Medication Not Taken</h1>
            <p style="color: #94a3b8; line-height: 1.6;">
              Hi ${guardianName || 'Guardian'},<br><br>
              <strong>${userName}</strong> has NOT taken their medication <strong>${medicationName}</strong> within the 30-minute reminder window. Please check in on them.
            </p>
            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">— MindGuard Wellness App</p>
          </div>`;
        break;

      case 'low_stock':
        subject = `📦 Low Stock Alert: ${medicationName} for ${userName}`;
        html = `
          <div style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h1 style="color: #f97316; font-size: 24px;">📦 Low Stock Alert</h1>
            <p style="color: #94a3b8; line-height: 1.6;">
              Hi ${guardianName || 'Guardian'},<br><br>
              <strong>${userName}</strong>'s medication <strong>${medicationName}</strong> is running low (3 days or less remaining). Please help arrange a refill.
            </p>
            <p style="color: #64748b; font-size: 14px; margin-top: 24px;">— MindGuard Wellness App</p>
          </div>`;
        break;

      default:
        return Response.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    // Try sending via Resend
    try {
      const { data, error } = await resend.emails.send({
        from: 'MediMinder <onboarding@resend.dev>',
        to: ["smaran.sai79@gmail.com"],
        subject,
        html,
      });

      if (error) {
        console.error('Resend error:', error);
        return Response.json({ success: false, error: error.message });
      }

      return Response.json({ success: true, id: data?.id });
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // Log the notification even if email fails
      return Response.json({ success: false, logged: true, error: emailError.message });
    }
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
