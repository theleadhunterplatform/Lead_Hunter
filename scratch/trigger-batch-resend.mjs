async function main() {
  console.log('Testing live endpoints to trigger batch resend...');
  const endpoints = [
    'https://www.theleadhunterclub.com/api/admin/users',
    'https://www.theleadhunterclub.com/api/admin/users/resend-all-failed',
  ];

  for (let attempt = 1; attempt <= 30; attempt++) {
    console.log(`\n--- Attempt ${attempt}/30 ---`);
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'x-admin-key': process.env.ADMIN_API_KEY || process.env.ADMIN_REGISTRATION_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'RESEND_ALL_FAILED' }),
        });

        console.log(`URL: ${url} | Status: ${res.status}`);
        if (res.status === 200) {
          const json = await res.json();
          console.log('\n🎉 SUCCESS! BATCH RESEND COMPLETED:');
          console.log(JSON.stringify(json, null, 2));
          return json;
        } else {
          const txt = await res.text();
          if (txt.length < 200) console.log('Response:', txt);
        }
      } catch (e) {
        console.error('Fetch error for', url, e.message);
      }
    }
    console.log('Waiting 10s for Vercel deployment propagation...');
    await new Promise((r) => setTimeout(r, 10000));
  }
}

main().catch(console.error);
