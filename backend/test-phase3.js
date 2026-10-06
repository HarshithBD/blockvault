const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function runPhase3Tests() {
  console.log('--- PHASE 3 TESTS ---');
  
  const testEmail = `testuser_${Date.now()}@gmail.com`;
  const testPassword = 'SecurePassword123!';
  
  // 1. Register & Login
  await supabase.auth.signUp({ email: testEmail, password: testPassword });
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail, password: testPassword
  });

  if (signInError) {
    console.log('❌ Auth failed. Cannot proceed with Phase 3 tests.', signInError.message);
    return;
  }
  
  const token = signInData.session.access_token;
  console.log('✅ Logged in successfully.');

  let fileIdToTest = null;

  // 2. Upload File
  console.log('\nTest: File Upload');
  try {
    const formData = new FormData();
    const blob = new Blob(['Hello World Secure Vault'], { type: 'text/plain' });
    formData.append('file', blob, 'secret_test.txt');

    const res = await fetch('http://localhost:3000/api/files/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    const data = await res.json();
    if (res.status === 201) {
      console.log('✅ PASSED: File uploaded successfully.');
      fileIdToTest = data.file.id;
    } else {
      console.log('❌ FAILED: Upload rejected.', res.status, data.error);
      if (data.error && data.error.includes('row-level security')) {
        console.log('   -> This means you need to add Storage RLS policies for vault_storage!');
      }
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
  }

  if (!fileIdToTest) return;

  // 3. List Files
  console.log('\nTest: List My Files');
  try {
    const res = await fetch('http://localhost:3000/api/files', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.status === 200 && data.files.some(f => f.id === fileIdToTest)) {
      console.log('✅ PASSED: File correctly listed in My Files.');
    } else {
      console.log('❌ FAILED: File not found in list.', data);
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
  }

  // 4. Download File (Generate Signed URL)
  console.log('\nTest: Secure Download URL Generation');
  try {
    const res = await fetch(`http://localhost:3000/api/files/${fileIdToTest}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.status === 200 && data.url) {
      console.log('✅ PASSED: Signed URL generated ->', data.url.substring(0, 50) + '...');
    } else {
      console.log('❌ FAILED:', data);
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
  }

  // 5. Delete File
  console.log('\nTest: Delete File');
  try {
    const res = await fetch(`http://localhost:3000/api/files/${fileIdToTest}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.status === 200) {
      console.log('✅ PASSED: File deleted successfully.');
    } else {
      console.log('❌ FAILED:', data);
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
  }
}

runPhase3Tests();
