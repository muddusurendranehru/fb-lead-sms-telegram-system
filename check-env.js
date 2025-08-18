require('dotenv').config({ path: '.env.local' });
console.log('?? ENVIRONMENT CHECK:');
console.log('? SUPABASE_URL:', process.env.SUPABASE_URL ? 'configured' : 'NOT SET');
console.log('? SUPABASE_KEY:', process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_ANON_KEY.includes('your-') ? 'configured' : 'NEEDS UPDATE');
console.log('? GOOGLE_FIT_ID:', process.env.GOOGLE_FIT_CLIENT_ID ? 'configured' : 'NOT SET');
console.log('? GOOGLE_FIT_SECRET:', process.env.GOOGLE_FIT_CLIENT_SECRET && !process.env.GOOGLE_FIT_CLIENT_SECRET.includes('your-') ? 'configured' : 'NEEDS UPDATE');
