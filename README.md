🩺 MediMinder
AI-Powered Medication Reminder & Wellness Monitoring System

MediMinder is a smart healthcare web application that helps users manage their medications, track stress levels, and keep guardians informed about their health status.

It combines AI assistance, medication reminders, proof verification, and real-time alerts to ensure medication adherence and better wellness tracking.

🚀 Features
💊 Medication Reminder System

Add medications with dosage and schedule

Smart reminders with alarms

Requires photo verification before and after taking medicine

Automatically updates medication logs

⏰ Guardian Alert System

Sends alerts if medication is:

Taken ✅

Not taken within reminder window ⚠️

Running low 📦

Email notifications sent to guardian

📊 Wellness Dashboard

Personalized dashboard for users

Displays:

Medication statistics

Stress score

Weekly averages

Progress graphs

🧠 Stress Calculator

Analyzes daily habits and calculates a stress score to help users understand their mental wellness.

🤖 AI Wellness Assistant

Integrated AI chat for:

Health guidance

Wellness tips

Recovery recommendations

🏗️ Tech Stack
Frontend

Next.js 16

React

CSS Modules

Backend

Supabase

Authentication

PostgreSQL Database

Storage (photo verification)

Notifications

Resend Email API

Browser Notifications

Alarm system

Deployment

Vercel

🗄️ Database Structure

Key tables used:

profiles
medications
medication_logs
stress_entries
family_contacts

These store user data, medication schedules, logs, and guardian contact details.

🔐 Security

Secure authentication via Supabase Auth

Protected API routes

Email notifications via verified domain

Sensitive keys stored in environment variables

🌐 Deployment

This project is deployed using Vercel.

Steps:

Push code to GitHub

Import repository into Vercel

Add environment variables

Deploy

🧠 Future Improvements

Mobile push notifications

AI health insights

Medication refill automation

Wearable device integration

Advanced health analytics

👨‍💻 Author

Smaran Bhoopalam
Manvil G Shetty

Built for a healthcare hackathon to improve medication adherence and wellness tracking using modern web technologies.

❤️ Inspiration

Many people forget to take medications or lack proper monitoring.
MediMinder aims to make healthcare safer, smarter, and more accountable.