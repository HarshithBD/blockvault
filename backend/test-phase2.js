const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function runTests() {
  console.log('--- PHASE 2 TESTS ---');
  
  const testEmail = `testuser_${Date.now()}@gmail.com`; // Changed from example.com to avoid invalid email block
  const testPassword = 'SecurePassword123!';
  
  // 1. Unauthenticated Request
  try {
    console.log('Test: Unauthenticated Request');
    const res = await fetch('http://localhost:3000/api/me');
    if (res.status === 401) {
      console.log('✅ PASSED: Unauthenticated request blocked (401)');
    } else {
      console.log('❌ FAILED: Unexpected status', res.status);
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
  }

  // 2. Register
  console.log('\nTest: Register');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword
  });
  
  if (signUpError) {
    console.log('❌ FAILED: Registration failed:', signUpError.message);
    return;
  }
  console.log('✅ PASSED: User registered successfully.');

  // 3. Login
  console.log('\nTest: Login');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  if (signInError) {
    console.log('❌ FAILED: Login failed:', signInError.message);
    console.log('Note: If this says "Email not confirmed", you must disable "Confirm email" in Supabase Auth Settings.');
    return;
  }
  
  const token = signInData.session.access_token;
  console.log('✅ PASSED: Login successful. Token retrieved.');

  // 4. Authenticated Request
  console.log('\nTest: Authenticated Request');
  try {
    const res = await fetch('http://localhost:3000/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 200) {
      console.log('✅ PASSED: Authenticated request succeeded (200).');
    } else {
      console.log('❌ FAILED: Unexpected status', res.status);
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
  }

  // 5. Unauthorized Resource Access
  console.log('\nTest: Unauthorized Resource Access');
  try {
    const res = await fetch('http://localhost:3000/api/admin-only', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 403) {
      console.log('✅ PASSED: Unauthorized resource blocked (403)');
    } else {
      console.log('❌ FAILED: Unexpected status', res.status);
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
  }

  // 6. Logout
  console.log('\nTest: Logout');
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) {
    console.log('❌ FAILED: Logout error:', signOutError.message);
  } else {
    console.log('✅ PASSED: Logout successful.');
  }
}

runTests();
