# HOMA Healthcare Lead Automation System

Facebook Lead Capture with SMS & Telegram Automation for Dr. Nehru's diabetes clinic in India.

## 🚀 Features

- **Facebook Lead Capture**: Web form for patient registration
- **Automatic SMS**: Hindi/English SMS via Twilio to patients
- **Telegram Notifications**: Instant alerts to medical staff
- **Database Storage**: Supabase PostgreSQL with patient records
- **Indian Phone Formatting**: Auto-format numbers (+91 prefix)
- **Patient ID Generation**: HOMA + timestamp format

## ✅ System Status

- ✅ **Form submission**: Working
- ✅ **Database storage**: Patient records saved
- ✅ **SMS delivery**: Hindi/English messages sent
- ✅ **Telegram alerts**: Staff notifications working
- ✅ **Phone formatting**: +91 prefix added automatically

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: Supabase PostgreSQL 
- **SMS**: Twilio API
- **Notifications**: Telegram Bot API
- **Frontend**: HTML form

## 📋 Prerequisites

1. Node.js installed
2. Supabase account and database
3. Twilio account for SMS
4. Telegram bot token

## 🔧 Environment Variables

Create a `.env` file with:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

## 🚀 Quick Deploy

### Railway (Recommended)
1. Fork this repo
2. Connect to Railway
3. Add environment variables
4. Deploy automatically

### Render
1. Connect GitHub repo
2. Set environment variables
3. Deploy with auto-deploy on push

### Local Development
```bash
npm install
npm start
# Server runs on localhost:3021
```

## 📊 Database Schema

```sql
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(50) UNIQUE,
  name VARCHAR(100),
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Business Goals

- Facebook/Instagram ads → Live form → Automatic patient capture
- Staff gets instant notifications → Calls patients within 24 hours
- Replace manual lead management with automated pipeline
- Grow Dr. Nehru's diabetes clinic patient base in India

## 📞 Contact

For support: Dr. Nehru's Diabetes Clinic
Phone: +91-XXXXXXXXXX
