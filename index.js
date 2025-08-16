const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

console.log('🏥 HOMA Healthcare Starting...');

const app = express();
const PORT = process.env.PORT || 3021;
app.use(express.json());

// Initialize services
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Add new patient - SIMPLE
async function addPatient(patientData) {
  try {
    const nameParts = patientData.name.split(' ');
    
    const patient = {
      patient_id: 'HOMA' + Date.now(),
      first_name: nameParts[0] || 'Patient',
      last_name: nameParts.slice(1).join(' ') || '',
      name: patientData.name,
      phone: patientData.number
    };

    const { data, error } = await supabase
      .from('patients')
      .insert(patient)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Patient added:', data.name, data.phone);

    // Send SMS
    try {
      await twilioClient.messages.create({
        body: `🏥 नमस्ते ${data.name}! HOMA Healthcare में आपका स्वागत है। Dr. Nehru की team 24 घंटे में संपर्क करेगी।`,
        from: process.env.TWILIO_PHONE,
        to: '+91' + data.phone
      });
      console.log('✅ SMS sent');
    } catch (smsError) {
      console.log('❌ SMS failed:', smsError.message);
    }
