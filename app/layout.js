import './globals.css';

export const metadata = {
  title: 'MediMinder',
  description: 'AI-powered health & wellness platform with medication reminders, stress tracking, and personalized recovery plans.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div id="toast-root"></div>
        {children}
      </body>
    </html>
  );
}
