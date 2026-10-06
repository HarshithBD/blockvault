const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runPhase6Tests() {
  console.log('--- PHASE 6 LOGGING & HISTORY TESTS ---');
  
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

  // TEST 1: Owner uploads file. Expected: upload activity recorded.
  const formData = new FormData();
  formData.append('file', new Blob(['Test Logging File'], { type: 'text/plain' }), 'log_test.txt');
  const resUpload = await fetch('http://localhost:3000/api/files/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData
  });
  const fileId = (await resUpload.json()).file.id;

  const resAct1 = await fetch('http://localhost:3000/api/activity', { headers: { Authorization: `Bearer ${tokenA}` }});
  const act1 = await resAct1.json();
  if (act1.activity.some(a => a.action === 'file_uploaded' && a.file_id === fileId)) console.log('✅ TEST 1 PASS: Upload activity recorded.');
  else console.log('❌ TEST 1 FAIL');

  // TEST 2: Owner creates share. Expected: share activity recorded.
  const resShare = await fetch('http://localhost:3000/api/shares', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, accessType: 'restricted', recipients: [emailB] })
  });
  const share = (await resShare.json()).share;

  const resAct2 = await fetch('http://localhost:3000/api/activity', { headers: { Authorization: `Bearer ${tokenA}` }});
  const act2 = await resAct2.json();
  if (act2.activity.some(a => a.action === 'share_created' && a.details?.share_id === share.id)) console.log('✅ TEST 2 PASS: Share activity recorded.');
  else console.log('❌ TEST 2 FAIL');

  // TEST 3: Authorized recipient downloads.
  const resDownB = await fetch(`http://localhost:3000/api/shares/access/${share.token}/download`, { method: 'POST', headers: { Authorization: `Bearer ${tokenB}` }});
  if (resDownB.status === 200) {
    const resSharesA = await fetch('http://localhost:3000/api/shares', { headers: { Authorization: `Bearer ${tokenA}` }});
    const sharesA = await resSharesA.json();
    const updatedShare = sharesA.shares.find(s => s.id === share.id);
    if (updatedShare && updatedShare.downloads_count === 1) console.log('✅ TEST 3 PASS: Download succeeded, log created, count increased.');
    else console.log('❌ TEST 3 FAIL: Count did not increase.', updatedShare);
  } else console.log('❌ TEST 3 FAIL: Download failed.');

  // TEST 4: Unauthorized user attempts download.
  const resDownC = await fetch(`http://localhost:3000/api/shares/access/${share.token}/download`, { method: 'POST', headers: { Authorization: `Bearer ${tokenC}` }});
  if (resDownC.status !== 200) {
    const resSharesA = await fetch('http://localhost:3000/api/shares', { headers: { Authorization: `Bearer ${tokenA}` }});
    const updatedShare = (await resSharesA.json()).shares.find(s => s.id === share.id);
    if (updatedShare.downloads_count === 1) console.log('✅ TEST 4 PASS: Unauthorized download denied, NO log created.');
    else console.log('❌ TEST 4 FAIL: Log was created!');
  } else console.log('❌ TEST 4 FAIL: Unauthorized user downloaded!');

  // TEST 5: Owner revokes share.
  const resRevA = await fetch(`http://localhost:3000/api/shares/${share.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` }});
  const resAct5 = await fetch('http://localhost:3000/api/activity', { headers: { Authorization: `Bearer ${tokenA}` }});
  if ((await resAct5.json()).activity.some(a => a.action === 'share_revoked' && a.details?.share_id === share.id)) console.log('✅ TEST 5 PASS: Revoke activity recorded.');
  else console.log('❌ TEST 5 FAIL');

  // TEST 6: Owner requests history. Expected: only their authorized history returned
  const actA = await (await fetch('http://localhost:3000/api/activity', { headers: { Authorization: `Bearer ${tokenA}` }})).json();
  if (actA.activity.length >= 3 && actA.activity.every(a => a.file_id === fileId)) console.log('✅ TEST 6 PASS: Only authorized history returned.');
  else console.log('❌ TEST 6 FAIL', actA);

  // TEST 7: User attempts to access another user's activity.
  const actB = await (await fetch('http://localhost:3000/api/activity', { headers: { Authorization: `Bearer ${tokenB}` }})).json();
  if (actB.activity.length === 0) console.log('✅ TEST 7 PASS: Denied/empty unauthorized result.');
  else console.log('❌ TEST 7 FAIL: Recipient saw owner activity!', actB);

}

runPhase6Tests();
