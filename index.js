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

// Initialize Supabase client (hardcoded for now)
const supabase = createClient(
    'https://oztndjdowoewkbeznjvd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dG5kamRvd29ld2tiZXpuanZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwODkyMzksImV4cCI6MjA3MDY2NTIzOX0.yr6CC6zdXFzGOmwHARJwWlSaAmwOWH1VnvcODtdNwAc'
);

// Basic route
app.get('/', (req, res) => {
    res.send('🏥 HOMA Healthcare System Active!');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🏥 HOMA Healthcare System Active`);
    console.log(`📊 Visit: http://localhost:${PORT}`);
});