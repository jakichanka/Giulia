exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    if (!BOT_TOKEN || !CHAT_ID) {
      return { statusCode: 500, body: 'Missing Telegram config' };
    }

    // Parse multipart form-data
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.startsWith('multipart/form-data')) {
      return { statusCode: 400, body: 'Expected multipart/form-data' };
    }

    const busboy = require('busboy');
    const bb = busboy({ headers: { 'content-type': contentType } });

    const buffers = [];
    let groom = '';
    let bride = '';
    let filename = 'anketa.pdf';
    let fileBuffer = null;

    await new Promise((resolve, reject) => {
      bb.on('file', (_, file, info) => {
        filename = info.filename || filename;
        file.on('data', (d) => buffers.push(d));
        file.on('end', () => {
          fileBuffer = Buffer.concat(buffers);
        });
      });
      bb.on('field', (name, val) => {
        if (name === 'groom') groom = val;
        if (name === 'bride') bride = val;
      });
      bb.on('error', reject);
      bb.on('close', resolve);
      bb.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
    });

    if (!fileBuffer) {
      return { statusCode: 400, body: 'No file' };
    }

    // Send document to Telegram
    const formData = new (require('form-data'))();
    formData.append('chat_id', CHAT_ID);
    formData.append('caption', `Анкета: ${groom} и ${bride}`.trim());
    formData.append('document', fileBuffer, { filename, contentType: 'application/pdf' });

    const fetch = require('node-fetch');
    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
    const tgRes = await fetch(tgUrl, { method: 'POST', body: formData });
    if (!tgRes.ok) {
      const text = await tgRes.text();
      return { statusCode: 502, body: `Telegram error: ${text}` };
    }

    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};


