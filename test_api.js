import fetch from 'node-fetch';

async function testAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/modules');
    const data = await response.json();
    console.log('--- API MODULES ---');
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('API Test failed:', err);
    process.exit(1);
  }
}

testAPI();
