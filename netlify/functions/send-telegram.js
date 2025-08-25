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

    const body = JSON.parse(event.body || '{}');
    const text = formatMessage(body);

    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    if (!tgRes.ok) {
      const text = await tgRes.text();
      return { statusCode: 502, body: `Telegram error: ${text}` };
    }

    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatMessage(data) {
  const lines = [];
  const add = (label, val) => {
    if (val) lines.push(`<b>${label}</b> ${escapeHtml(val)}`);
  };
  lines.push('<b>Новая анкета</b>');
  add('Жених:', data.groom);
  add('Невеста:', data.bride);
  add('Дата свадьбы:', data.wedding_date);
  add('Время церемонии:', data.ceremony_time);
  add('Площадка / адрес:', data.venue);
  add('Количество гостей:', data.guests);
  add('Контакт для связи:', data.contact);
  add('Музыкальные предпочтения:', data.music);
  if (data.priorities) {
    lines.push('<b>Самое важное в этом дне:</b>');
    lines.push(escapeHtml(data.priorities));
  }
  if (data.notes) {
    lines.push('<b>Комментарии и пожелания:</b>');
    lines.push(escapeHtml(data.notes));
  }
  return lines.join('\n');
}


