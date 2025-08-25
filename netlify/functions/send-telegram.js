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

    const { pdfBase64, fileName, groom, bride } = JSON.parse(event.body || '{}');
    if (!pdfBase64) {
      return { statusCode: 400, body: 'Missing pdfBase64' };
    }

    const buffer = Buffer.from(pdfBase64, 'base64');

    // Use Node 18+ global fetch and FormData/Blob
    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption', `Анкета: ${groom || ''} ${bride ? 'и ' + bride : ''}`.trim());
    form.append('document', new Blob([buffer], { type: 'application/pdf' }), fileName || 'anketa.pdf');

    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
    const tgRes = await fetch(tgUrl, { method: 'POST', body: form });
    if (!tgRes.ok) {
      const text = await tgRes.text();
      return { statusCode: 502, body: `Telegram error: ${text}` };
    }

    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};


