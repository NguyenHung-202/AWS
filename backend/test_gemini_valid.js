const https = require('https');

const data = JSON.stringify({
  contents: [{ parts: [{ text: "Hello" }] }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: '/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCYkrVCvGbRMdDbD9xfKg-2DGJ0NPB3_Ac',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body.substring(0, 200)}...`);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(data);
req.end();
