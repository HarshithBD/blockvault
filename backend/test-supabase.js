require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testConnection() {
  console.log('Testing Supabase connection...');
  // Check auth health
  const { error } = await supabase.auth.getSession();
  if (error) {
    console.error('Connection failed:', error);
    process.exit(1);
  }
  
  console.log('Successfully connected to Supabase!');
  process.exit(0);
}

testConnection();
