// ============================================================================
// COMPLETE NEW index.js - HOMA Healthcare System
// Dr. Nehru's Diabetes Clinic - Lead Automation with WhatsApp Integration
// ============================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

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
// WHATSAPP TEMPLATES (ENGLISH & TELUGU)
// ============================================================================

const whatsappTemplates = {
    confirmation: {
        telugu: (name) => `🏥 *HOMA Healthcare Center*
డాక్టర్ నెహ్రూ - డయాబెటిస్ స్పెషలిస్ట్

నమస్కారం ${name} గారు,

✅ *మీ ఆరోగ్య సలహా అభ్యర్థన అందుకున్నాము*

👨‍⚕️ *డాక్టర్:* డాక్టర్ నెహ్రూ (MD, DM డయాబెటిస్)
⏰ *కాల్ సమయం:* 30 నిమిషాల్లో
📍 *క్లినిక్:* HOMA Healthcare Center
📞 *హెల్ప్‌లైన్:* +91-XXXXXXXXXX

📋 *మీ చెకప్ కోసం:*
• ఖాళీ కడుపుతో రండి (12 గంటలు)
• పాత రిపోర్ట్‌లు తీసుకురండి
• మందుల జాబితా సిద్ధం చేసుకోండి

⚠️ *ముఖ్యమైన గమనిక:*
ఇది సాధారణ సమాచారం మాత్రమే. తీవ్రమైన లక్షణాలకు వెంటనే డాక్టర్‌ని సంప్రదించండి లేదా 102కి కాల్ చేయండి.

🌐 *ఆన్‌లైన్:* fb-lead-sms-telegram-system.onrender.com

*HOMA Healthcare - మీ నమ్మకమైన ఆరోగ్య భాగస్వామి* 💚`,

        english: (name) => `🏥 *HOMA Healthcare Center*
Dr. Nehru - Diabetes Specialist

Hello ${name},

✅ *Your health consultation received*

👨‍⚕️ *Doctor:* Dr. Nehru (MD, DM Diabetes)
⏰ *Call time:* Within 30 minutes
📍 *Clinic:* HOMA Healthcare Center
📞 *Helpline:* +91-XXXXXXXXXX

📋 *For your checkup:*
• Come fasting (12 hours)
• Bring previous reports
• Prepare medication list

⚠️ *Important Notice:*
This is for general information only. For serious symptoms, consult doctor immediately or dial 102.

🌐 *Online:* fb-lead-sms-telegram-system.onrender.com

*HOMA Healthcare - Your Trusted Health Partner* 💚`
    },

    followUp: {
        telugu: (name) => `🔔 *HOMA Healthcare - ఫాలో అప్*

${name} గారు, మా కాల్ వచ్చిందా?

📞 రాకపోతే, దయచేసి Reply చేయండి:
• "కాల్ చేయండి" - వెంటనే కాల్ కోసం
• "సమయం ఇవ్వండి" - మీకు సౌకర్యవంతమైన సమయం చెప్పండి

⚠️ *అత్యవసర పరిస్థితిలో:*
వెంటనే 102కి కాల్ చేయండి లేదా సమీప హాస్పిటల్‌కి వెళ్లండి

📞 *సహాయం:* +91-XXXXXXXXXX
🏥 *HOMA Healthcare Center*

*మీ ఆరోగ్యమే మా ప్రాధాన్యత* 💚`,

        english: (name) => `🔔 *HOMA Healthcare - Follow Up*

Hi ${name}, did you receive our call?

📞 If not, please reply:
• "CALL ME" - for immediate callback
• "TIME" - to schedule convenient time

⚠️ *For emergency:*
Immediately dial 102 or visit nearest hospital

📞 *Support:* +91-XXXXXXXXXX
🏥 *HOMA Healthcare Center*

*Your health is our priority* 💚`
    },

    reminder: {
        telugu: (name, date, time) => `⏰ *అపాయింట్‌మెంట్ రిమైండర్*

${name} గారు, మీ డయాబెటిస్ చెకప్ రేపు:

📅 *తేదీ:* ${date || 'రేపు'}
🕐 *సమయం:* ${time || 'ఉదయం 10:00 గంటలకు'}
🏥 *చోటు:* HOMA Healthcare Center

✅ *చెక్‌లిస్ట్:*
☐ 12 గంటలు ఖాళీ కడుపు
☐ పాత రిపోర్ట్‌లు తీసుకురండి
☐ ప్రస్తుత మందుల జాబితా
☐ ఆధార్ కార్డ్

📞 *కన్ఫర్మ్ చేయడానికి* Reply చేయండి:
• "అవును" - నేను వస్తాను
• "సమయం మార్చండి" - వేరే సమయం కావాలి

*HOMA Healthcare Center* 🏥`,

        english: (name, date, time) => `⏰ *Appointment Reminder*

${name}, your diabetes checkup is tomorrow:

📅 *Date:* ${date || 'Tomorrow'}
🕐 *Time:* ${time || '10:00 AM'}
🏥 *Location:* HOMA Healthcare Center

✅ *Checklist:*
☐ 12 hours fasting
☐ Bring previous reports
☐ Current medication list
☐ ID proof (Aadhar card)

📞 *Please confirm* by replying:
• "YES" - I'll be there
• "RESCHEDULE" - Need different time

*HOMA Healthcare Center* 🏥`
    }
};

// ============================================================================
// SMS MESSAGE FUNCTION
// ============================================================================

async function sendSMSMessage(phoneNumber, message) {
    try {
        const response = await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+91${phoneNumber}`
        });
        
        console.log(`✅ SMS sent to ${phoneNumber}:`, response.sid);
        return { success: true, messageId: response.sid };
    } catch (error) {
        console.error('❌ SMS error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================================================
// WHATSAPP MESSAGE FUNCTION
// ============================================================================

async function sendWhatsAppMessage(phoneNumber, templateType, language, patientName, additionalData = {}) {
    // Safety check - only run if WhatsApp is enabled
    if (!process.env.TWILIO_WHATSAPP_FROM) {
        console.log('📱 WhatsApp not configured, continuing with SMS only...');
        return { success: false, reason: 'not_configured' };
    }

    try {
        // Clean and format phone number
        const cleanPhone = phoneNumber.replace(/^\+?91/, '');
        const whatsappNumber = `whatsapp:+91${cleanPhone}`;
        
        // Get the appropriate message template
        const message = whatsappTemplates[templateType][language](
            patientName, 
            additionalData.date, 
            additionalData.time
        );
        
        // Send WhatsApp message via Twilio
        const response = await client.messages.create({
            from: process.env.TWILIO_WHATSAPP_FROM,
            to: whatsappNumber,
            body: message
        });
        
        console.log(`✅ WhatsApp sent to ${phoneNumber}:`, response.sid);
        
        // Log to database for tracking
        await logWhatsAppMessage(phoneNumber, templateType, response.sid, 'sent');
        
        return {
            success: true,
            messageId: response.sid,
            service: 'twilio_whatsapp',
            cost: 0.10 // Approximate USD cost
        };
        
    } catch (error) {
        console.error('❌ WhatsApp error (SMS backup will work):', error);
        
        // Log error but don't crash the system
        await logWhatsAppMessage(phoneNumber, templateType, null, 'failed', error.message);
        
        return {
            success: false,
            error: error.message,
            fallback: 'sms_working'
        };
    }
}

// ============================================================================
// TELEGRAM MESSAGE FUNCTION
// ============================================================================

async function sendTelegramMessage(message) {
    if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
        console.log('Telegram not configured');
        return;
    }

    try {
        const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        console.log('✅ Telegram notification sent');
    } catch (error) {
        console.error('❌ Telegram error:', error);
    }
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

async function logWhatsAppMessage(phone, template, messageId, status, error = null) {
    try {
        if (supabase) {
            await supabase
                .from('whatsapp_logs')
                .insert([{
                    phone_number: phone,
                    template_type: template,
                    message_id: messageId,
                    status: status,
                    error_message: error,
                    service: 'twilio_whatsapp',
                    sent_at: new Date().toISOString()
                }]);
        }
    } catch (error) {
        console.error('Error logging WhatsApp message:', error);
        // Don't crash if logging fails
    }
}

// ============================================================================
// FOLLOW-UP SCHEDULER
// ============================================================================

function scheduleWhatsAppFollowUp(phoneNumber, language, patientName, delayHours = 2) {
    if (!process.env.TWILIO_WHATSAPP_FROM) return;
    
    setTimeout(async () => {
        try {
            await sendWhatsAppMessage(phoneNumber, 'followUp', language, patientName);
            console.log(`📱 Follow-up WhatsApp sent to ${patientName}`);
        } catch (error) {
            console.error('Follow-up WhatsApp failed:', error);
        }
    }, delayHours * 60 * 60 * 1000); // Convert hours to milliseconds
}

// ============================================================================
// ROUTES
// ============================================================================

// Serve the main HTML form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Patient registration endpoint
app.post('/api/register-patient', async (req, res) => {
    const { name, phone, age, symptoms, preferredLanguage = 'english' } = req.body;
    
    try {
        // Validate required fields
        if (!name || !phone || !age || !symptoms) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        // Clean phone number
        const cleanPhone = phone.replace(/^\+?91/, '').replace(/\D/g, '');
        
        if (cleanPhone.length !== 10) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number. Please enter 10-digit mobile number'
            });
        }

        // Save patient to Supabase
        const { data, error } = await supabase
            .from('patients')
            .insert([{
                name,
                phone: cleanPhone,
                age,
                symptoms,
                preferred_language: preferredLanguage,
                registration_time: new Date().toISOString(),
                source: 'facebook_ad',
                status: 'new'
            }])
            .select();
        
        if (error) throw error;
        const patientId = data[0].id;

        // Send SMS
        const smsMessage = preferredLanguage === 'telugu' 
            ? `నమస్కారం ${name} గారు, మీ డయాబెటిస్ సలహా అభ్యర్థన అందుకున్నాము. డాక్టర్ నెహ్రూ త్వరలోనే మీకు కాల్ చేస్తారు. HOMA Healthcare - +91-XXXXXXXXXX`
            : `Hello ${name}, your diabetes consultation request has been received. Dr. Nehru will call you shortly. HOMA Healthcare - +91-XXXXXXXXXX`;
        
        const smsResult = await sendSMSMessage(cleanPhone, smsMessage);

        // Send WhatsApp message
        const whatsappResult = await sendWhatsAppMessage(cleanPhone, 'confirmation', preferredLanguage, name);

        // Send Telegram notification to staff
        const telegramMessage = `🏥 *New Diabetes Patient - HOMA Healthcare*

👤 *Patient:* ${name}
📞 *Mobile:* +91${cleanPhone}
🎂 *Age:* ${age} years
🔍 *Symptoms:* ${symptoms}
🗣️ *Language:* ${preferredLanguage}
⏰ *Registration:* ${new Date().toLocaleString('en-IN')}

📱 *Message Status:*
${smsResult.success ? '✅' : '❌'} SMS
${whatsappResult.success ? '✅' : '⚠️'} WhatsApp ${whatsappResult.success ? '(sent)' : '(SMS backup active)'}

💰 *Communication Cost:* ₹${whatsappResult.success ? '8' : '0.50'} (${whatsappResult.success ? 'WhatsApp' : 'SMS only'})

🎯 *Action:* Please call ${name} within 30 minutes!
📋 *Patient ID:* ${patientId}

${whatsappResult.success ? '📱 *WhatsApp Active* - Patient received professional message!' : '📱 *WhatsApp Failed* - SMS backup working fine'}`;

        await sendTelegramMessage(telegramMessage);

        // Schedule follow-up WhatsApp (only if first message succeeded)
        if (whatsappResult.success) {
            scheduleWhatsAppFollowUp(cleanPhone, preferredLanguage, name, 2); // Follow up after 2 hours
        }

        // Success response
        res.json({
            success: true,
            message: 'Patient registered successfully with enhanced communication',
            patientId: patientId,
            communicationStatus: {
                sms: smsResult.success ? 'sent' : 'failed',
                whatsapp: whatsappResult.success ? 'sent' : 'fallback_to_sms',
                whatsappService: whatsappResult.service || 'not_available'
            },
            followUpScheduled: whatsappResult.success
        });

    } catch (error) {
        console.error('Enhanced registration error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// WhatsApp webhook for delivery status tracking
app.post('/webhook/whatsapp-status', (req, res) => {
    const { MessageSid, MessageStatus, To, From, ErrorCode } = req.body;
    
    console.log(`📱 WhatsApp Status Update: ${MessageStatus} for ${MessageSid}`);
    
    // Log status update to database
    if (MessageStatus === 'delivered') {
        console.log(`✅ WhatsApp delivered to ${To}`);
    } else if (MessageStatus === 'failed') {
        console.log(`❌ WhatsApp failed to ${To}: Error ${ErrorCode}`);
    }
    
    // Update status in database
    logWhatsAppMessage(
        To.replace('whatsapp:+91', ''), 
        'status_update', 
        MessageSid, 
        MessageStatus
    );
    
    res.sendStatus(200);
});

// Get all patients (admin endpoint)
app.get('/api/patients', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('registration_time', { ascending: false });
        
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            sms: !!process.env.TWILIO_PHONE_NUMBER,
            whatsapp: !!process.env.TWILIO_WHATSAPP_FROM,
            telegram: !!process.env.TELEGRAM_BOT_TOKEN,
            database: !!process.env.SUPABASE_URL
        }
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
    console.log(`🚀 HOMA Healthcare Server running on port ${PORT}`);
    console.log(`📱 WhatsApp: ${process.env.TWILIO_WHATSAPP_FROM ? 'Enabled' : 'Disabled (SMS only)'}`);
    console.log(`📧 Telegram: ${process.env.TELEGRAM_BOT_TOKEN ? 'Enabled' : 'Disabled'}`);
    console.log(`💾 Database: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`🌐 Visit: http://localhost:${PORT}`);
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
