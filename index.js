require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Telegram Config
const TELEGRAM_BOT_TOKEN = '8214864800:AAEtYsHUOv07OkQcP-szHCN-gY8yeVkTPGQ';
const TELEGRAM_GROUP_ID = '-4849748858'; 
const PERSONAL_CHAT_ID = '5892544777';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3017;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL || 'https://oztndjdowoewkbeznjvd.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dG5kamRvd29ld2tiZXpuanZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODkyMzksImV4cCI6MjA3MDY2NTIzOX0.yr6CC6zdXFzGOmwHARJwWlSaAmwOWH1VnvcODtdNwAc'
);

// API Routes
app.post('/api/register-patient', async (req, res) => {
    try {
        console.log('📝 Patient registration request:', req.body);
        
        const patientData = {
            first_name: req.body.name?.split(' ')[0] || req.body.first_name || '',
            last_name: req.body.name?.split(' ').slice(1).join(' ') || req.body.last_name || '',
            email: req.body.email,
            phone: req.body.phone,
            age: req.body.age || null,
            diabetes_type: req.body.diabetes_type || 'type2',
            current_medications: req.body.medications || '',
            program_status: 'active',
            days_completed: 0,
            total_program_days: 90,
            next_reminder_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            enrollment_date: new Date().toISOString(),
            source: 'web_form',
            notes: `Enrolled via web form on ${new Date().toLocaleDateString()}`
        };

        // Insert into Supabase
        const { data, error } = await supabase
            .from('patients')
            .insert([patientData])
            .select();

        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        console.log('✅ Patient enrolled:', data[0]);
        
        // Here you would also trigger your existing Telegram/SMS notifications
        // Add your existing notification code here
        
        res.json({ 
            success: true, 
            patient: data[0],
            message: 'Patient enrolled in diabetes program successfully!'
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get patients for dashboard
app.get('/api/patients', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('enrollment_date', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, patients: data });
    } catch (error) {
        console.error('❌ Get patients error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        system: 'Homa Health Care - Diabetes Management'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🏥 HOMA Healthcare System Active`);
    console.log(`📊 Visit: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/diabetes-dashboard.html`);
});