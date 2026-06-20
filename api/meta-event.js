// /api/meta-event.js
const PIXEL_ID = '3326903237487845';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { eventName, email, phone, nome, value, currency, eventSourceUrl, clientUserAgent, fbp, fbc } = req.body;
    const ACCESS_TOKEN = process.env.META_CAPI_TOKEN;
    if (!ACCESS_TOKEN) return res.status(500).json({ error: 'META_CAPI_TOKEN não configurado' });

    const crypto = require('crypto');
    const hash = (v) => crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = `${eventName}-${Date.now()}-${Math.random().toString(36).substring(2,8)}`;

    const userData = {};
    if (email) userData.em = [hash(email)];
    if (phone) userData.ph = [hash(phone.replace(/\D/g,''))];
    if (nome) {
      const p = nome.trim().split(' ');
      userData.fn = [hash(p[0])];
      if (p.length > 1) userData.ln = [hash(p.slice(1).join(' '))];
    }
    if (clientUserAgent) userData.client_user_agent = clientUserAgent;
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;

    const eventData = {
      event_name: eventName,
      event_time: eventTime,
      event_id: eventId,
      event_source_url: eventSourceUrl || '',
      action_source: 'website',
      user_data: userData,
    };

    if (eventName === 'Purchase' && value) {
      eventData.custom_data = { value: parseFloat(value), currency: currency || 'BRL' };
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [eventData] }) }
    );
    const result = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Erro CAPI', details: result });
    return res.status(200).json({ success: true, eventId, result });

  } catch (err) {
    console.error('Erro meta-event:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
