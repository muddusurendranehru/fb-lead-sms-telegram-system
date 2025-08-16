require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const twilio = require('twilio');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3021;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize services
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

// Utility functions
function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If it's a 10-digit Indian number, add +91
    if (cleanPhone.length === 10 && cleanPhone.match(/^[6-9]/)) {
        return `+91${cleanPhone}`;
    }
    
    // If it already has country code, ensure it starts with +
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
        return `+${cleanPhone}`;
    }
    
    // If it already has +91, return as is
    if (phone.startsWith('+91')) {
        return phone;
    }
    
    // Default case - add +91
    return `+91${cleanPhone}`;
}

function generatePatientId() {
    const timestamp = Date.now();
    return `HOMA${timestamp}`;
}

function createSMSMessage(name, isHindi = true) {
    if (isHindi) {
        return `नमस्ते ${name}! HOMA Healthcare में आपका स्वागत है। हमारी टीम जल्द ही आपसे संपर्क करेगी। धन्यवाद! 🏥`;
    } else {
        return `Hello ${name}! Welcome to HOMA Healthcare. Our team will contact you soon. Thank you! 🏥`;
    }
}

// Routes
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HOMA Healthcare - Diabetes Care</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .container {
                background: white;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
                width: 100%;
            }
            
            .logo {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .logo h1 {
                color: #2c3e50;
                font-size: 2.5em;
                margin-bottom: 10px;
            }
            
            .logo p {
                color: #7f8c8d;
                font-size: 1.1em;
            }
            
            .form-group {
                margin-bottom: 25px;
            }
            
            label {
                display: block;
                margin-bottom: 8px;
                color: #2c3e50;
                font-weight: 600;
                font-size: 1em;
            }
            
            input[type="text"], input[type="tel"] {
                width: 100%;
                padding: 15px;
                border: 2px solid #ecf0f1;
                border-radius: 8px;
                font-size: 1em;
                transition: border-color 0.3s ease;
            }
            
            input[type="text"]:focus, input[type="tel"]:focus {
                outline: none;
                border-color: #3498db;
            }
            
            .submit-btn {
                width: 100%;
                padding: 15px;
                background: linear-gradient(135deg, #3498db, #2980b9);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 1.1em;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s ease;
            }
            
            .submit-btn:hover {
                transform: translateY(-2px);
            }
            
            .features {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ecf0f1;
            }
            
            .feature {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                color: #2c3e50;
            }
            
            .feature-icon {
                margin-right: 10px;
                font-size: 1.2em;
            }
            
            .success-message {
                background: #d4edda;
                color: #155724;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                display: none;
            }
            
            .error-message {
                background: #f8d7da;
                color: #721c24;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                display: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">
                <h1>🏥 HOMA Healthcare</h1>
                <p>Advanced Diabetes Care & Treatment</p>
            </div>
            
            <div class="success-message" id="successMessage">
                ✅ Registration successful! You'll receive an SMS confirmation shortly.
            </div>
            
            <div class="error-message" id="errorMessage">
                ❌ Please fill in all fields correctly.
            </div>
            
            <form id="patientForm" onsubmit="submitForm(event)">
                <div class="form-group">
                    <label for="name">Full Name *</label>
                    <input type="text" id="name" name="name" required placeholder="Enter your full name">
                </div>
                
                <div class="form-group">
                    <label for="phone">Mobile Number *</label>
                    <input type="tel" id="phone" name="phone" required placeholder="9876543210">
                </div>
                
                <button type="submit" class="submit-btn">
                    📞 Register for Free Consultation
                </button>
            </form>
            
            <div class="features">
                <div class="feature">
                    <span class="feature-icon">✨</span>
                    <span>Free initial diabetes consultation</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">📱</span>
                    <span>Instant SMS confirmation</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">🩺</span>
                    <span>Expert care from Dr. Nehru's team</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">📞</span>
                    <span>Call back within 24 hours</span>
                </div>
            </div>
        </div>
        
        <script>
            async function submitForm(event) {
                event.preventDefault();
                
                const name = document.getElementById('name').value.trim();
                const phone = document.getElementById('phone').value.trim();
                const submitBtn = event.target.querySelector('.submit-btn');
                const successMsg = document.getElementById('successMessage');
                const errorMsg = document.getElementById('errorMessage');
                
                // Hide previous messages
                successMsg.style.display = 'none';
                errorMsg.style.display = 'none';
                
                if (!name || !phone) {
                    errorMsg.style.display = 'block';
                    return;
                }
                
                // Show loading state
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '⏳ Registering...';
                submitBtn.disabled = true;
                
                try {
                    const response = await fetch('/submit-patient', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name, phone })
                    });
                    
                    if (response.ok) {
                        successMsg.style.display = 'block';
                        document.getElementById('patientForm').reset();
                    } else {
                        errorMsg.style.display = 'block';
                    }
                } catch (error) {
                    console.error('Error:', error);
                    errorMsg.style.display = 'block';
                } finally {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        </script>
    </body>
    </html>
    `);
});

app.post('/submit-patient', async (req, res) => {
    try {
        const { name, phone } = req.body;
        
        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone are required' });
        }
        
        // Format phone number
        const formattedPhone = formatPhoneNumber(phone);
        const patientId = generatePatientId();
        
        console.log(`Processing patient: ${name}, Phone: ${formattedPhone}, ID: ${patientId}`);
        
        // Save to database
        const { data: patient, error: dbError } = await supabase
            .from('patients')
            .insert([
                {
                    patient_id: patientId,
                    name: name,
                    first_name: name.split(' ')[0] || name,
                    last_name: name.split(' ').slice(1).join(' ') || '',
                    phone: formattedPhone,
                    created_at: new Date().toISOString()
                }
            ])
            .select();
            
        if (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).json({ error: 'Database error' });
        }
        
        console.log('Patient saved to database:', patient);
        
        // Send SMS using Messaging Service
        try {
            const hindiMessage = createSMSMessage(name, true);
            await twilioClient.messages.create({
                body: hindiMessage,
                messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
                to: formattedPhone
            });
            console.log(`✅ SMS sent to ${formattedPhone}: ${hindiMessage}`);
        } catch (smsError) {
            console.error('❌ SMS failed:', smsError.message);
            // Continue even if SMS fails
        }
        
        // Send Telegram notification
        try {
            const telegramMessage = `🚨 New Patient Registration\n\n👤 Name: ${name}\n📞 Phone: ${formattedPhone}\n🆔 Patient ID: ${patientId}\n⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n📝 Please call patient within 24 hours for consultation booking.`;
            
            await telegramBot.sendMessage(process.env.TELEGRAM_CHAT_ID, telegramMessage);
            console.log('✅ Telegram notification sent');
        } catch (telegramError) {
            console.error('❌ Telegram failed:', telegramError.message);
            // Continue even if Telegram fails
        }
        
        res.json({ 
            success: true, 
            message: 'Patient registered successfully',
            patientId: patientId
        });
        
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'HOMA Healthcare Lead System'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🏥 HOMA Healthcare server running on port ${PORT}`);
    console.log(`📱 Form available at: http://localhost:${PORT}`);
    console.log(`⚡ Ready to capture diabetes patients!`);
});

module.exports = app;
