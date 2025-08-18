const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const app = express();
const PORT = 3023;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `http://localhost:${PORT}/auth/google/callback`
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes

// 1. Dashboard route - serves main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'HOMA Health Care Phase 3',
    port: PORT,
    supabase: process.env.SUPABASE_URL ? 'connected' : 'not configured',
    googleFit: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not configured'
  });
});

// 3. Patient registration endpoint
app.post('/api/register-patient', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    // Handle both camelCase and snake_case field names for flexibility
    const { 
      name, 
      email, 
      phone, 
      age, 
      diabetesType, 
      diabetes_type, 
      diagnosisDate,
      diagnosis_date 
    } = req.body;
    
    // Validate required fields
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and phone are required fields'
      });
    }
    
    // Prepare data for database (all fields optional except required ones)
    const patientData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      google_fit_connected: false,
      created_at: new Date().toISOString()
    };
    
    // Add optional fields only if provided
    if (age) {
      patientData.age = parseInt(age);
    }
    
    if (diabetesType || diabetes_type) {
      patientData.diabetes_type = diabetesType || diabetes_type;
    }
    
    if (diagnosisDate || diagnosis_date) {
      patientData.diagnosis_date = diagnosisDate || diagnosis_date;
    }
    
    console.log('Inserting patient data:', patientData);
    
    // Insert patient into Supabase
    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select();
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error: ' + error.message
      });
    }
    
    console.log('Patient registered successfully:', data[0]);
    
    res.json({
      success: true,
      message: 'Patient registered successfully',
      patient: data[0],
      nextStep: `Connect Google Fit at /api/connect-google-fit/${data[0].id}`
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
});

// 4. Google Fit connection endpoint
app.get('/api/connect-google-fit/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid patient ID format'
      });
    }
    
    // Verify patient exists
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
    
    if (patientError || !patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }
    
    // Generate Google OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.body.read',
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
      'https://www.googleapis.com/auth/fitness.sleep.read'
    ];
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: patientId, // Pass patient ID in state parameter
      prompt: 'consent'
    });
    
    console.log(`Generated auth URL for patient ${patientId}`);
    
    res.json({
      success: true,
      authUrl,
      message: 'Redirect user to this URL to connect Google Fit',
      patient: patient.name
    });
    
  } catch (error) {
    console.error('Google Fit connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
});

// 5. Google OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state: patientId } = req.query;
    
    if (!code) {
      return res.status(400).send('Authorization code not provided');
    }
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in Supabase
    const { error: tokenError } = await supabase
      .from('google_tokens')
      .upsert([
        {
          patient_id: patientId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(tokens.expiry_date).toISOString(),
          created_at: new Date().toISOString()
        }
      ]);
    
    if (tokenError) {
      console.error('Token storage error:', tokenError);
      return res.status(500).send('Error storing Google Fit tokens');
    }
    
    // Update patient status
    await supabase
      .from('patients')
      .update({ google_fit_connected: true })
      .eq('id', patientId);
    
    console.log(`Google Fit connected successfully for patient ${patientId}`);
    
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: green;">✅ Google Fit Connected Successfully!</h2>
          <p>Your health data tracking is now active.</p>
          <p>You can close this window and return to the HOMA Health Care dashboard.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Error connecting Google Fit: ' + error.message);
  }
});

// 6. Get patient health data
app.get('/api/patient/:patientId/health-data', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid patient ID format'
      });
    }
    
    // Get patient's Google tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('patient_id', patientId)
      .single();
    
    if (tokenError || !tokens) {
      return res.status(404).json({
        success: false,
        error: 'Google Fit not connected for this patient'
      });
    }
    
    // Set up OAuth client with stored tokens
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token
    });
    
    const fitness = google.fitness({ version: 'v1', auth: oauth2Client });
    
    // Get last 7 days of data
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Fetch different health metrics
    const healthData = {
      steps: await getStepsData(fitness, startTime, endTime),
      heartRate: await getHeartRateData(fitness, startTime, endTime),
      weight: await getWeightData(fitness, startTime, endTime)
    };
    
    res.json({
      success: true,
      patientId,
      dateRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      },
      data: healthData
    });
    
  } catch (error) {
    console.error('Health data fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching health data: ' + error.message
    });
  }
});

// Helper functions for Google Fit data
async function getStepsData(fitness, startTime, endTime) {
  try {
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{
          dataTypeName: 'com.google.step_count.delta'
        }],
        bucketByTime: { durationMillis: 86400000 }, // Daily buckets
        startTimeMillis: startTime.getTime(),
        endTimeMillis: endTime.getTime()
      }
    });
    
    return response.data.bucket?.map(bucket => ({
      date: new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0],
      steps: bucket.dataset[0]?.point[0]?.value[0]?.intVal || 0
    })) || [];
  } catch (error) {
    console.error('Steps data error:', error);
    return [];
  }
}

async function getHeartRateData(fitness, startTime, endTime) {
  try {
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{
          dataTypeName: 'com.google.heart_rate.bpm'
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime.getTime(),
        endTimeMillis: endTime.getTime()
      }
    });
    
    return response.data.bucket?.map(bucket => ({
      date: new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0],
      averageHeartRate: bucket.dataset[0]?.point[0]?.value[0]?.fpVal || 0
    })) || [];
  } catch (error) {
    console.error('Heart rate data error:', error);
    return [];
  }
}

async function getWeightData(fitness, startTime, endTime) {
  try {
    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [{
          dataTypeName: 'com.google.weight'
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startTime.getTime(),
        endTimeMillis: endTime.getTime()
      }
    });
    
    return response.data.bucket?.map(bucket => ({
      date: new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0],
      weight: bucket.dataset[0]?.point[0]?.value[0]?.fpVal || 0
    })) || [];
  } catch (error) {
    console.error('Weight data error:', error);
    return [];
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/register-patient',
      'GET /api/connect-google-fit/:patientId',
      'GET /api/patient/:patientId/health-data'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 HOMA Health Care Phase 3 Server Started');
  console.log('=========================================');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Dashboard: http://localhost:${PORT}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  console.log(`👥 Patient registration: POST http://localhost:${PORT}/api/register-patient`);
  console.log('=========================================');
  console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`🔑 Google Fit: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Not configured'}`);
  console.log('=========================================');
});
