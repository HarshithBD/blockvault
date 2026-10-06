const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runPhase8Tests() {
  console.log('--- PHASE 8 SECURITY & LIMIT TESTS ---');
  
  const emailA = `owner_${Date.now()}@gmail.com`;
  const emailB = `recipient_${Date.now()}@gmail.com`;
  const pass = 'SecurePassword123!';
  const sharePass = 'SecretVault42';
  
  await supabase.auth.signUp({ email: emailA, password: pass });
  await supabase.auth.signUp({ email: emailB, password: pass });
  
  const { data: signInA } = await supabase.auth.signInWithPassword({ email: emailA, password: pass });
  const tokenA = signInA.session.access_token;
  const { data: signInB } = await supabase.auth.signInWithPassword({ email: emailB, password: pass });
  const tokenB = signInB.session.access_token;

  // 1. Upload
  const formData = new FormData();
  formData.append('file', new Blob(['Test Logging File'], { type: 'text/plain' }), 'limit_test.txt');
  const resUpload = await fetch('http://localhost:3000/api/files/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData
  });
  const fileId = (await resUpload.json()).file.id;

  // 2. Share with Password and Limit = 1
  const resShare = await fetch('http://localhost:3000/api/shares', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, accessType: 'restricted', recipients: [emailB], password: sharePass, downloadLimit: 1 })
  });
  const share = (await resShare.json()).share;

  // TEST 1: Reject without password
  const resDownB1 = await fetch(`http://localhost:3000/api/shares/access/${share.token}/download`, { 
    method: 'POST', headers: { Authorization: `Bearer ${tokenB}` }
  });
  if (resDownB1.status === 401) console.log('✅ TEST 1 PASS: Rejected without password.');
  else console.log('❌ TEST 1 FAIL: Allowed without password!');

  // TEST 2: Reject wrong password
  const resDownB2 = await fetch(`http://localhost:3000/api/shares/access/${share.token}/download`, { 
    method: 'POST', headers: { Authorization: `Bearer ${tokenB}`, 'x-share-password': 'WrongPassword' }
  });
  if (resDownB2.status === 401) console.log('✅ TEST 2 PASS: Rejected wrong password.');
  else console.log('❌ TEST 2 FAIL: Allowed wrong password!');

  // Verify share_accessed log exists (access before downloading)
  await fetch(`http://localhost:3000/api/shares/access/${share.token}`, {
    headers: { Authorization: `Bearer ${tokenB}`, 'x-share-password': sharePass }
  });

  // TEST 3: Accept correct password
  const resDownB3 = await fetch(`http://localhost:3000/api/shares/access/${share.token}/download`, { 
    method: 'POST', headers: { Authorization: `Bearer ${tokenB}`, 'x-share-password': sharePass }
  });
  if (resDownB3.status === 200) console.log('✅ TEST 3 PASS: Allowed correct password.');
  else console.log('❌ TEST 3 FAIL: Rejected correct password!', await resDownB3.json());


  // TEST 4: Deny second download (Limit = 1)
  const resDownB4 = await fetch(`http://localhost:3000/api/shares/access/${share.token}/download`, { 
    method: 'POST', headers: { Authorization: `Bearer ${tokenB}`, 'x-share-password': sharePass }
  });
  if (resDownB4.status === 403) console.log('✅ TEST 4 PASS: Download limit enforced.');
  else console.log('❌ TEST 4 FAIL: Ignored download limit!');

  // TEST 5: Verify logs exist
  const resAct = await fetch('http://localhost:3000/api/activity', { headers: { Authorization: `Bearer ${tokenA}` }});
  const act = await resAct.json();
  
  const hasAccess = act.activity && act.activity.some(a => a.action === 'share_accessed' && a.details?.share_id === share.id);
  const hasDownload = act.activity && act.activity.some(a => a.action === 'file_downloaded' && a.details?.share_id === share.id);

  if (hasAccess && hasDownload) {
    console.log('✅ TEST 5 PASS: Activity log contains access and download records.');
  } else {
    console.log('❌ TEST 5 FAIL: Activity missing!', act);
  }
}

runPhase8Tests();
