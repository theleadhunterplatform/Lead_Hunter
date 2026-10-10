async function main() {
    const loginRes = await fetch('http://137.23.56.134:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@leadhunter.com', password: 'admin@leadhunter.com' }),
    });
    console.log('Login status:', loginRes.status);
    const loginJson = await loginRes.json();
    if (!loginJson.data?.access_token) {
        console.error('Login failed:', loginJson);
        return;
    }
    const token = loginJson.data.access_token;
    console.log('Got token!');

    const autoRes = await fetch('http://137.23.56.134:5001/api/settings/automation', {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Automation status:', autoRes.status);
    const autoJson = await autoRes.json();
    console.log('Automation settings:', JSON.stringify(autoJson, null, 2));

    const kwRes = await fetch('http://137.23.56.134:5001/api/keywords', {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Keywords status:', kwRes.status);
    const kwJson = await kwRes.json();
    console.log('Keywords count:', kwJson.data?.length);
    console.log('Keywords:', JSON.stringify(kwJson, null, 2));

    const targetsRes = await fetch('http://137.23.56.134:5001/api/targets', {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Targets status:', targetsRes.status);
    const targetsJson = await targetsRes.json();
    console.log('Targets count:', targetsJson.data?.length);
    console.log('Targets:', JSON.stringify(targetsJson.data?.map(t => ({ name: t.name, last_scraped_at: t.last_scraped_at, comments: t.last_comments_found })), null, 2));
}

main().catch(console.error);
