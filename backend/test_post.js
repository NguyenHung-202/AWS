const http = require('http');

const data = JSON.stringify({
  filename: 'test.txt',
  fileKey: 'test-key'
});

const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/essays',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Mock-User-Id': 'local-mock-user',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${body}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
