require("dotenv").config();

const https = require("https");

const apiKey = process.env.GEMINI_API_KEY;

const data = JSON.stringify({
  contents: [
    {
      parts: [
        {
          text: "Hello"
        }
      ]
    }
  ]
});

const options = {
  hostname: "generativelanguage.googleapis.com",
  port: 443,
  path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = "";

  res.on("data", (chunk) => {
    body += chunk;
  });

  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log(body);
  });
});

req.on("error", (err) => {
  console.error(err);
});

req.write(data);
req.end();