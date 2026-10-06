const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runPhase4Tests() {
  console.log('--- PHASE 4 SECURE SHARING TESTS ---');
  
  const emailA = `owner_${Date.now()}@gmail.com`;
  const emailB = `recipient_${Date.now()}@gmail.com`;
  const emailC = `stranger_${Date.now()}@gmail.com`;
  const pass = 'SecurePassword123!';
  
  // Register Users
  await supabase.auth.signUp({ email: emailA, password: pass });
  await supabase.auth.signUp({ email: emailB, password: pass });
  await supabase.auth.signUp({ email: emailC, password: pass });
  
  // Login Owner (A)
  const { data: signInA } = await supabase.auth.signInWithPassword({ email: emailA, password: pass });
  const tokenA = signInA.session.access_token;
  
  // Login Recipient (B)
  const { data: signInB } = await supabase.auth.signInWithPassword({ email: emailB, password: pass });
  const tokenB = signInB.session.access_token;

  // Login Stranger (C)
  const { data: signInC } = await supabase.auth.signInWithPassword({ email: emailC, password: pass });
  const tokenC = signInC.session.access_token;

  // 1. Upload File as A
  const formData = new FormData();
  formData.append('file', new Blob(['Test Share File'], { type: 'text/plain' }), 'share_test.txt');
  const resUpload = await fetch('http://localhost:3000/api/files/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: formData
  });
  const fileData = await resUpload.json();
  const fileId = fileData.file?.id;
  if (!fileId) {
     console.log('❌ FAILED: Phase 3 regression failure. Upload failed.', fileData);
     return;
  }
  console.log('✅ Setup: File uploaded by Owner A.');

  // 2. Create Restricted Share for B
  const resShare = await fetch('http://localhost:3000/api/shares', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId,
      accessType: 'restricted',
      recipients: [emailB],
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    })
  });
  const shareData = await resShare.json();
  const shareToken = shareData.share?.token;
  if (resShare.status === 201) console.log('✅ Test: Owner can create a restricted share.');
  else console.log('❌ FAILED: Owner could not create share.', shareData);

  // 3. Authorized Recipient B accesses share
  const resAccessB = await fetch(`http://localhost:3000/api/shares/access/${shareToken}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  if (resAccessB.status === 200) console.log('✅ Test: Authorized recipient can access restricted share.');
  else console.log('❌ FAILED: Authorized recipient blocked.', await resAccessB.json());

  // 4. Unauthorized Stranger C attempts access
  const resAccessC = await fetch(`http://localhost:3000/api/shares/access/${shareToken}`, {
    headers: { Authorization: `Bearer ${tokenC}` }
  });
  if (resAccessC.status === 404 || resAccessC.status === 403) console.log('✅ Test: Unauthorized user CANNOT access restricted share.');
  else console.log('❌ FAILED: Unauthorized user accessed share!', await resAccessC.json());

  // 5. Authorized Recipient B generates download link
  const resDownloadB = await fetch(`http://localhost:3000/api/shares/access/${shareToken}/download`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const downloadData = await resDownloadB.json();
  if (resDownloadB.status === 200 && downloadData.url?.includes('token=')) console.log('✅ Test: Valid share generates a short-lived signed URL (no permanent exposure).');
  else console.log('❌ FAILED: Download link generation failed.', downloadData);

  // 6. Non-owner (B) attempts to revoke share
  const resRevokeB = await fetch(`http://localhost:3000/api/shares/${shareData.share.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  if (resRevokeB.status === 404 || resRevokeB.status === 403) console.log('✅ Test: Non-owner CANNOT revoke share.');
  else console.log('❌ FAILED: Non-owner revoked share!', await resRevokeB.json());

  // 7. Owner (A) revokes share
  const resRevokeA = await fetch(`http://localhost:3000/api/shares/${shareData.share.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  if (resRevokeA.status === 200) console.log('✅ Test: Owner revoked share successfully.');
  else console.log('❌ FAILED: Owner could not revoke share.', await resRevokeA.json());

  // 8. Authorized Recipient B attempts access after revocation
  const resAccessRevoked = await fetch(`http://localhost:3000/api/shares/access/${shareToken}`, {
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  if (resAccessRevoked.status === 403 || resAccessRevoked.status === 404) console.log('✅ Test: Revoked share CANNOT be accessed.');
  else console.log('❌ FAILED: Revoked share was accessed!', await resAccessRevoked.json());

  // 9. File remains available to owner
  const resFilesA = await fetch('http://localhost:3000/api/files', {
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  const filesA = await resFilesA.json();
  if (filesA.files?.some(f => f.id === fileId)) console.log('✅ Test: File remains available to owner after share revocation.');
  else console.log('❌ FAILED: File disappeared after share revocation.');
}

runPhase4Tests();
