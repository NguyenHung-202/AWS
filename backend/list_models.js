const https = require('https');

const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: '/v1beta/models?key=AIzaSyCYkrVCvGbRMdDbD9xfKg-2DGJ0NPB3_Ac',
  method: 'GET'
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Models: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
