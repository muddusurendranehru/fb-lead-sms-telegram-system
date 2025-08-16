// ============================================================================
// MINIMAL index.js - HOMA Healthcare System (NAME + PHONE ONLY)
// Dr. Nehru's Diabetes Clinic - Simple Lead Capture
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');

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

// Register patient - MINIMAL
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

        // Save to database
        const { data, error } = await supabase
            .from('patients')
            .insert([{ name, phone: cleanPhone }])
            .select();
        
        if (error) throw error;
        const patientId = data[0].id;

        // Send messages
        const smsResult = await sendSMSMessage(cleanPhone, smsMessage(name));
        const whatsappResult = await sendWhatsAppMessage(cleanPhone, name);

        // Notify staff
        const telegramMsg = `🏥 *New Patient*

👤 *Name:* ${name}
📞 *Phone:* +91${cleanPhone}
⏰ *Time:* ${new Date().toLocaleString('en-IN')}

📱 *Status:*
${smsResult.success ? '✅' : '❌'} SMS
${whatsappResult.success ? '✅' : '❌'} WhatsApp

🎯 *Action:* Call ${name} now!
📋 *ID:* ${patientId}`;

        await sendTelegramMessage(telegramMsg);

        // Response
        res.json({
            success: true,
            message: 'Registration successful',
            patientId: patientId,
            sms: smsResult.success,
            whatsapp: whatsappResult.success
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
    console.log(`🚀 HOMA Healthcare Server running on port ${PORT}`);
    console.log(`📱 WhatsApp: ${process.env.TWILIO_WHATSAPP_FROM ? 'ON' : 'OFF'}`);
    console.log(`📧 Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? 'ON' : 'OFF'}`);
    console.log(`🌐 Visit: fb-lead-sms-telegram-system.onrender.com`);
});
