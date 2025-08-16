// ============================================================================
// SCHEMA-CORRECT index.js - HOMA Healthcare System
// Dr. Nehru's Diabetes Clinic - Matches Database Schema Exactly
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const TELEGRAM_BOT_TOKEN = '8214864800:AAEtYsHUOv07OkQcP-szHCN-gY8yeVkTPGQ';
const TELEGRAM_GROUP_ID = '-4849748858'; 
const PERSONAL_CHAT_ID = '5892544777';
// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Generate unique patient ID
function generatePatientId() {
    const prefix = 'HH'; // HOMA Healthcare
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
}

// Split full name into first and last name
function splitName(fullName) {
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) {
        return {
            firstName: nameParts[0],
            lastName: 'Patient' // Default last name if only one name provided
        };
    } else {
        return {
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(' ') // Rest of the name as last name
        };
    }
}

// ============================================================================
// SIMPLE MESSAGE TEMPLATES
// ============================================================================

const smsMessage = (name) => `Hello ${name}, your consultation request received. Dr. Nehru will call you shortly. HOMA Healthcare`;

const whatsappMessage = (name) => `🏥 *HOMA Healthcare Center*
Dr. Nehru - Diabetes Specialist

Hello ${name},

✅ Your consultation request received
👨‍⚕️ Dr. Nehru will call you within 30 minutes
📞 Helpline: +91-XXXXXXXXXX

*HOMA Healthcare - Your Health Partner* 💚`;

// ============================================================================
// SMS FUNCTION
// ============================================================================

async function sendSMSMessage(phoneNumber, message) {
    try {
        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+91${phoneNumber}`
        });
        
        console.log(`✅ SMS sent to ${phoneNumber}:`, response.sid);
        return { success: true };
    } catch (error) {
        console.error('❌ SMS error:', error);
        return { success: false };
    }
}

// ============================================================================
// WHATSAPP FUNCTION
// ============================================================================

async function sendWhatsAppMessage(phoneNumber, patientName) {
    if (!process.env.TWILIO_WHATSAPP_FROM) {
        console.log('📱 WhatsApp not configured');
        return { success: false };
    }

    try {
        const response = await client.messages.create({
            from: process.env.TWILIO_WHATSAPP_FROM,
            to: `whatsapp:+91${phoneNumber}`,
            body: whatsappMessage(patientName)
        });
        
        console.log(`✅ WhatsApp sent to ${phoneNumber}:`, response.sid);
        return { success: true };
        
    } catch (error) {
        console.error('❌ WhatsApp error:', error);
        return { success: false };
    }
}

// ============================================================================
// TELEGRAM FUNCTION
// ============================================================================

async function sendTelegramMessage(message) {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;

    try {
        const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        console.log('✅ Telegram sent');
    } catch (error) {
        console.error('❌ Telegram error:', error);
    }
}

// ============================================================================
// ROUTES
// ============================================================================

// Serve form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register patient - MATCHES DATABASE SCHEMA EXACTLY
app.post('/api/register-patient', async (req, res) => {
    const { name, phone } = req.body;
    
    try {
        // Validate
        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Name and phone required'
            });
        }

        // Clean phone
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number'
            });
        }

        // Split name into first and last name
        const { firstName, lastName } = splitName(name);
        
        // Generate unique patient ID
        const patientId = generatePatientId();

        // ✅ CORRECT: Save to database matching exact schema
        const { data, error } = await supabase
            .from('patients')
            .insert([{
                patient_id: patientId,           // Required
                first_name: firstName,           // Required  
                last_name: lastName,             // Required
                phone: cleanPhone,               // Optional
                name: name,                      // Optional (full name for reference)
                source: 'facebook_lead',         // Optional
                status: 'new'                    // Optional
            }])
            .select();
        
        if (error) {
            console.error('Database error:', error);
            throw error;
        }
        
        const savedPatient = data[0];

        // Send messages
        const smsResult = await sendSMSMessage(cleanPhone, smsMessage(name));
        const whatsappResult = await sendWhatsAppMessage(cleanPhone, name);

        // Notify staff
        const telegramMsg = `🏥 *New Patient - HOMA Healthcare*

👤 *Name:* ${firstName} ${lastName}
📋 *Patient ID:* ${patientId}
📞 *Phone:* +91${cleanPhone}
⏰ *Time:* ${new Date().toLocaleString('en-IN')}

📱 *Message Status:*
${smsResult.success ? '✅' : '❌'} SMS
${whatsappResult.success ? '✅' : '❌'} WhatsApp

🎯 *Action:* Call ${name} now!
💾 *Database ID:* ${savedPatient.id}`;

        await sendTelegramMessage(telegramMsg);

        // Response
        res.json({
            success: true,
            message: 'Registration successful',
            patientId: patientId,
            databaseId: savedPatient.id,
            sms: smsResult.success,
            whatsapp: whatsappResult.success
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'schema-matched'
    });
});

// Get patients (admin)
app.get('/api/patients', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            patients: data
        });
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
    console.log(`🚀 HOMA Healthcare Server running on port ${PORT}`);
    console.log(`📱 WhatsApp: ${process.env.TWILIO_WHATSAPP_FROM ? 'ON' : 'OFF'}`);
    console.log(`📧 Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? 'ON' : 'OFF'}`);
    console.log(`💾 Database: SCHEMA MATCHED`);
    console.log(`🌐 Visit: fb-lead-sms-telegram-system.onrender.com`);
});

// ============================================================================
// ENVIRONMENT VARIABLES REQUIRED:
// ============================================================================
/*
TWILIO_ACCOUNT_SID=AC1cc2ad09edc74744d48f448e25b9005d
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
SUPABASE_URL=https://oztndjdowoewkbeznjvd.supabase.co
SUPABASE_ANON_KEY=your_supabase_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=-1002557630252
PORT=3000
*/
