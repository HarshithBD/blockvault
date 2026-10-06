const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runPhase5Tests() {
  console.log('--- PHASE 5 ACCESS CONTROL TESTS ---');
  
  const emailA = `owner_${Date.now()}@gmail.com`;
  const emailB = `recipient_${Date.now()}@gmail.com`;
  const emailC = `stranger_${Date.now()}@gmail.com`;
  const pass = 'SecurePassword123!';
  
  await supabase.auth.signUp({ email: emailA, password: pass });
  await supabase.auth.signUp({ email: emailB, password: pass });
  await supabase.auth.signUp({ email: emailC, password: pass });
  
  const { data: signInA } = await supabase.auth.signInWithPassword({ email: emailA, password: pass });
  const tokenA = signInA.session.access_token;
  const { data: signInB } = await supabase.auth.signInWithPassword({ email: emailB, password: pass });
  const tokenB = signInB.session.access_token;
  const { data: signInC } = await supabase.auth.signInWithPassword({ email: emailC, password: pass });
  const tokenC = signInC.session.access_token;

  // Setup: Upload file
  const formData = new FormData();
  formData.append('file', new Blob(['Test Share File Phase 5'], { type: 'text/plain' }), 'phase5.txt');
  const resUpload = await fetch('http://localhost:3000/api/files/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData
  });
  const fileId = (await resUpload.json()).file.id;

  // TEST 1: Owner creates active share
  const resShare = await fetch('http://localhost:3000/api/shares', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, accessType: 'restricted', recipients: [emailB], expiresAt: new Date(Date.now() + 86400000).toISOString() })
  });
  const activeShare = (await resShare.json()).share;
  if (resShare.status === 201) console.log('✅ TEST 1 PASS: Owner creates active share.');
  else console.log('❌ TEST 1 FAIL');

  // TEST 2: Authorized recipient accesses active share
  const resAccessB = await fetch(`http://localhost:3000/api/shares/access/${activeShare.token}`, { headers: { Authorization: `Bearer ${tokenB}` }});
  if (resAccessB.status === 200) console.log('✅ TEST 2 PASS: Authorized recipient accesses active share.');
  else console.log('❌ TEST 2 FAIL');

  // TEST 3: Unauthorized user accesses share
  const resAccessC = await fetch(`http://localhost:3000/api/shares/access/${activeShare.token}`, { headers: { Authorization: `Bearer ${tokenC}` }});
  if (resAccessC.status !== 200) console.log('✅ TEST 3 PASS: Unauthorized user denied.');
  else console.log('❌ TEST 3 FAIL');

  // TEST 4: Create share with expiry in the past
  const resExpShare = await fetch('http://localhost:3000/api/shares', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, accessType: 'restricted', recipients: [emailB], expiresAt: new Date(Date.now() - 86400000).toISOString() })
  });
  const expShare = (await resExpShare.json()).share;
  
  // TEST 5: Active share reaches expiry (Using the expired share)
  const resAccessExp = await fetch(`http://localhost:3000/api/shares/access/${expShare.token}`, { headers: { Authorization: `Bearer ${tokenB}` }});
  if (resAccessExp.status !== 200) console.log('✅ TEST 4 & 5 PASS: Expired share is inaccessible.');
  else console.log('❌ TEST 4 & 5 FAIL');

  // TEST 10 & 11: Expired share attempts download & signed URL
  const resDownExp = await fetch(`http://localhost:3000/api/shares/access/${expShare.token}/download`, { method: 'POST', headers: { Authorization: `Bearer ${tokenB}` }});
  if (resDownExp.status !== 200) console.log('✅ TEST 10 & 11 PASS: Expired share cannot generate signed URL or download.');
  else console.log('❌ TEST 10 & 11 FAIL');

  // TEST 7: Recipient attempts revoke
  const resRevB = await fetch(`http://localhost:3000/api/shares/${activeShare.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenB}` }});
  if (resRevB.status !== 200) console.log('✅ TEST 7 PASS: Recipient cannot revoke.');
  else console.log('❌ TEST 7 FAIL');

  // TEST 8: Another user attempts revoke
  const resRevC = await fetch(`http://localhost:3000/api/shares/${activeShare.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenC}` }});
  if (resRevC.status !== 200) console.log('✅ TEST 8 PASS: Unauthorized user cannot revoke.');
  else console.log('❌ TEST 8 FAIL');

  // TEST 6: Owner revokes active share
  const resRevA = await fetch(`http://localhost:3000/api/shares/${activeShare.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` }});
  if (resRevA.status === 200) console.log('✅ TEST 6 PASS: Owner revokes active share.');
  else console.log('❌ TEST 6 FAIL');

  // TEST 9: Owner accesses original file after revocation
  const resListA = await fetch('http://localhost:3000/api/files', { headers: { Authorization: `Bearer ${tokenA}` }});
  const filesA = await resListA.json();
  if (filesA.files.some(f => f.id === fileId)) console.log('✅ TEST 9 PASS: Owner retains access to original file.');
  else console.log('❌ TEST 9 FAIL');

  // TEST 12: Existing spoofing protections (ensure target spoofing fails)
  // Try to create a share for someone else's file
  const resUploadC = await fetch('http://localhost:3000/api/files/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenC}` },
    body: formData
  });
  const fileIdC = (await resUploadC.json()).file.id;

  const resSpoof = await fetch('http://localhost:3000/api/shares', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId: fileIdC, accessType: 'restricted', recipients: [emailB] })
  });
  if (resSpoof.status !== 201) console.log('✅ TEST 12 PASS: Share target spoofing blocked.');
  else console.log('❌ TEST 12 FAIL: Owner A was able to share User C\'s file!');
}

runPhase5Tests();
