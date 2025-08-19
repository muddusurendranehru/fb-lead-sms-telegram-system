const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3023;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// FIXED: Use environment variable for redirect URI (production/localhost)
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/auth/google/callback`;

// Initialize Google OAuth2 client with proper redirect URI
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
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
    environment: process.env.NODE_ENV || 'development',
    supabase: process.env.SUPABASE_URL ? 'connected' : 'not configured',
    googleFit: process.env.GOOGLE_CLIENT_ID ? 'configured' : 'not configured',
    redirectUri: REDIRECT_URI,
    uptime: Math.floor(process.uptime()),
    version: '1.0.0'
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
      condition,
      diabetesType, 
      diabetes_type, 
      diagnosisDate,
      diagnosis_date 
    } = req.body;
    
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required fields'
      });
    }
    
    // Prepare data for database (all fields optional except required ones)
    const patientData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      google_fit_connected: false,
      created_at: new Date().toISOString()
    };
    
    // Add optional fields only if provided
    if (phone) {
      patientData.phone = phone.trim();
    }
    
    if (age) {
      patientData.age = parseInt(age);
    }
    
    if (condition) {
      patientData.condition = condition;
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
      patientId: data[0].id,
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
    console.log('Redirect URI being used:', REDIRECT_URI);
    
    // Auto-redirect to Google OAuth
    res.redirect(authUrl);
    
  } catch (error) {
    console.error('Google Fit connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error: ' + error.message
    });
  }
});

// 5. Google OAuth callback (SINGLE ENDPOINT - FIXED)
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code, state: patientId } = req.query;
    
    console.log('OAuth callback received:', { 
      code: !!code, 
      patientId,
      redirect_uri: REDIRECT_URI 
    });
    
    if (!code) {
      return res.status(400).send(`
        <html>
          <head>
            <title>OAuth Error - HOMA Health Care</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
              .error-container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error-icon { font-size: 60px; color: #dc3545; margin-bottom: 20px; }
              .btn { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px; }
            </style>
          </head>
          <body>
            <div class="error-container">
              <div class="error-icon">❌</div>
              <h1>OAuth Error</h1>
              <p>No authorization code received from Google.</p>
              <a href="/" class="btn">Return to Dashboard</a>
            </div>
          </body>
        </html>
      `);
    }
    
    if (!patientId) {
      return res.status(400).send(`
        <html>
          <head>
            <title>OAuth Error - HOMA Health Care</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
              .error-container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error-icon { font-size: 60px; color: #dc3545; margin-bottom: 20px; }
              .btn { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px; }
            </style>
          </head>
          <body>
            <div class="error-container">
              <div class="error-icon">❌</div>
              <h1>OAuth Error</h1>
              <p>No patient ID provided in OAuth flow.</p>
              <a href="/" class="btn">Return to Dashboard</a>
            </div>
          </body>
        </html>
      `);
    }
    
    // Verify patient exists
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
      
    if (patientError || !patient) {
      return res.status(404).send(`
        <html>
          <head>
            <title>Patient Not Found - HOMA Health Care</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
              .error-container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .error-icon { font-size: 60px; color: #dc3545; margin-bottom: 20px; }
              .btn { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px; }
            </style>
          </head>
          <body>
            <div class="error-container">
              <div class="error-icon">👤</div>
              <h1>Patient Not Found</h1>
              <p>Patient ID ${patientId} not found in database.</p>
              <a href="/" class="btn">Return to Dashboard</a>
            </div>
          </body>
        </html>
      `);
    }
    
    // Exchange code for tokens
    console.log('Exchanging authorization code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('Tokens received successfully:', {
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });
    
    // Store tokens in Supabase
    const { error: tokenError } = await supabase
      .from('google_tokens')
      .upsert([
        {
          patient_id: patientId,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(tokens.expiry_date).toISOString(),
          scope: 'fitness.read',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ], {
        onConflict: 'patient_id'
      });
    
    if (tokenError) {
      console.error('Token storage error:', tokenError);
      throw new Error(`Database error storing tokens: ${tokenError.message}`);
    }
    
    // Update patient status
    await supabase
      .from('patients')
      .update({ 
        google_fit_connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', patientId);
    
    console.log(`Google Fit connected successfully for patient ${patientId}`);
    
    // Success page with enhanced styling and functionality
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Fit Connected - HOMA Health Care</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .success-container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            max-width: 500px;
            margin: 0 auto;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          }
          .success-icon { font-size: 80px; margin-bottom: 20px; }
          .btn {
            background: #28a745;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            display: inline-block;
            margin: 10px;
            font-size: 16px;
            transition: background 0.3s;
          }
          .btn:hover { background: #218838; }
          .btn-secondary { background: #17a2b8; }
          .btn-secondary:hover { background: #138496; }
          .patient-info {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .countdown {
            font-size: 14px;
            color: #ccc;
            margin-top: 20px;
          }
          @media (max-width: 768px) {
            .success-container { padding: 30px 20px; margin: 20px; }
            .btn { width: 100%; margin: 10px 0; }
          }
        </style>
      </head>
      <body>
        <div class="success-container">
          <div class="success-icon">🎉</div>
          <h1>Google Fit Connected Successfully!</h1>
          
          <div class="patient-info">
            <p><strong>Patient:</strong> ${patient.name}</p>
            <p><strong>Email:</strong> ${patient.email}</p>
            <p><strong>Status:</strong> 24/7 Health Monitoring Active</p>
            <p><strong>Program:</strong> 90-Day Diabetes Tracking</p>
          </div>
          
          <p>Your health data from Google Fit will now be automatically collected and monitored continuously.</p>
          
          <a href="/diabetes-dashboard.html?patient=${patientId}" class="btn">📊 View Dashboard</a>
          <a href="/api/patient/${patientId}/health-data" class="btn btn-secondary">📈 View Health Data</a>
          
          <div class="countdown">
            <p>Auto-redirecting to dashboard in <span id="countdown">5</span> seconds...</p>
          </div>
          
          <script>
            let countdown = 5;
            const countdownElement = document.getElementById('countdown');
            
            const timer = setInterval(() => {
              countdown--;
              countdownElement.textContent = countdown;
              
              if (countdown <= 0) {
                clearInterval(timer);
                window.location.href = '/diabetes-dashboard.html?patient=${patientId}&connected=true';
              }
            }, 1000);
            
            // Allow user to click anywhere to go to dashboard immediately
            document.addEventListener('click', () => {
              clearInterval(timer);
              window.location.href = '/diabetes-dashboard.html?patient=${patientId}&connected=true';
            });
          </script>
        </div>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <html>
        <head>
          <title>Connection Error - HOMA Health Care</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .error-container { background: white; padding: 40px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .error-icon { font-size: 60px; color: #dc3545; margin-bottom: 20px; }
            .btn { background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px; }
            .error-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: left; font-family: monospace; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h1>Connection Error</h1>
            <p>Failed to complete Google Fit connection.</p>
            <div class="error-details">${error.message}</div>
            <a href="/" class="btn">Return to Dashboard</a>
            <a href="/api/connect-google-fit/${req.query.state || 'UNKNOWN'}" class="btn" style="background: #28a745;">Try Again</a>
          </div>
        </body>
      </html>
    `);
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
    
    // Get patient info
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
    
    // Get patient's Google tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('patient_id', patientId)
      .single();
    
    if (tokenError || !tokens) {
      return res.status(404).json({
        success: false,
        error: 'Google Fit not connected for this patient',
        patient: {
          id: patient.id,
          name: patient.name,
          email: patient.email,
          google_fit_connected: patient.google_fit_connected
        },
        message: 'Please connect Google Fit first',
        connectUrl: `/api/connect-google-fit/${patientId}`
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
    
    console.log(`Fetching health data for patient ${patientId} from ${startTime.toISOString()} to ${endTime.toISOString()}`);
    
    // Fetch different health metrics
    const healthData = {
      steps: await getStepsData(fitness, startTime, endTime),
      heartRate: await getHeartRateData(fitness, startTime, endTime),
      weight: await getWeightData(fitness, startTime, endTime)
    };
    
    // Calculate summary statistics
    const totalSteps = healthData.steps.reduce((sum, day) => sum + (day.steps || 0), 0);
    const avgHeartRate = healthData.heartRate.length > 0 
      ? healthData.heartRate.reduce((sum, day) => sum + (day.averageHeartRate || 0), 0) / healthData.heartRate.length 
      : 0;
    const latestWeight = healthData.weight.length > 0 
      ? healthData.weight[healthData.weight.length - 1].weight 
      : 0;
    
    res.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        age: patient.age,
        condition: patient.condition,
        google_fit_connected: patient.google_fit_connected
      },
      dateRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        days: 7
      },
      healthData: healthData,
      summary: {
        totalSteps7Days: totalSteps,
        avgStepsPerDay: Math.round(totalSteps / 7),
        avgHeartRate: Math.round(avgHeartRate * 100) / 100,
        latestWeight: latestWeight,
        lastSync: new Date().toISOString(),
        dataPoints: {
          steps: healthData.steps.length,
          heartRate: healthData.heartRate.length,
          weight: healthData.weight.length
        }
      },
      googleFitConnected: true,
      lastTokenUpdate: tokens.updated_at
    });
    
  } catch (error) {
    console.error('Health data fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching health data: ' + error.message,
      details: error.stack
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
      steps: bucket.dataset[0]?.point[0]?.value[0]?.intVal || 0,
      timestamp: new Date(parseInt(bucket.startTimeMillis)).toISOString()
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
      averageHeartRate: bucket.dataset[0]?.point[0]?.value[0]?.fpVal || 0,
      timestamp: new Date(parseInt(bucket.startTimeMillis)).toISOString()
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
      weight: bucket.dataset[0]?.point[0]?.value[0]?.fpVal || 0,
      unit: 'kg',
      timestamp: new Date(parseInt(bucket.startTimeMillis)).toISOString()
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
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    service: 'HOMA Health Care'
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
      'GET /auth/google/callback',
      'GET /api/patient/:patientId/health-data'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 HOMA Health Care Phase 3 Server Started');
  console.log('=========================================');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Production URL: https://fb-lead-sms-telegram-system.onrender.com`);
  console.log(`🏥 Dashboard: ${PORT === 3023 ? 'http://localhost:' + PORT : 'https://fb-lead-sms-telegram-system.onrender.com'}`);
  console.log(`❤️  Health check: ${PORT === 3023 ? 'http://localhost:' + PORT : 'https://fb-lead-sms-telegram-system.onrender.com'}/api/health`);
  console.log(`👥 Patient registration: POST ${PORT === 3023 ? 'http://localhost:' + PORT : 'https://fb-lead-sms-telegram-system.onrender.com'}/api/register-patient`);
  console.log('=========================================');
  console.log(`📊 Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
  console.log(`🔑 Google Fit: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🔗 OAuth Redirect: ${REDIRECT_URI}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('=========================================');
  
  // Additional startup checks
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.warn('⚠️  Warning: Supabase credentials not found');
  }
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('⚠️  Warning: Google OAuth credentials not found');
  }
  
  console.log('🎯 Ready for patient registration and Google Fit integration!');
});
