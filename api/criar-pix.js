// /api/criar-pix.js
const PRECO_BASE = 17.00;
const PRECO_BUMP1 = 7.90; // Hentais +18
const PRECO_BUMP2 = 7.90; // Cenas Perdidas & Versões Proibidas

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { nome, email, telefone, bump1, bump2 } = req.body;
    if (!nome || !email) return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });

    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!ACCESS_TOKEN) return res.status(500).json({ error: 'Access Token não configurado' });

    const totalAmount = parseFloat((PRECO_BASE + (bump1 ? PRECO_BUMP1 : 0) + (bump2 ? PRECO_BUMP2 : 0)).toFixed(2));

    const produtos = ['Pack 70 Mil HQs'];
    if (bump1) produtos.push('Hentais +18');
    if (bump2) produtos.push('Cenas Perdidas & Versões Proibidas');

    const partesNome = nome.trim().split(' ');
    const firstName = partesNome[0];
    const lastName = partesNome.length > 1 ? partesNome.slice(1).join(' ') : firstName;
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2,10)}`;

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: totalAmount,
        description: produtos.join(' + '),
        payment_method_id: 'pix',
        payer: { email, first_name: firstName, last_name: lastName },
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: 'Erro ao criar PIX', details: data });

    const transactionData = data.point_of_interaction?.transaction_data;
    if (!transactionData) return res.status(500).json({ error: 'Sem dados de PIX na resposta' });

    return res.status(200).json({
      id: data.id,
      status: data.status,
      qr_code: transactionData.qr_code,
      qr_code_base64: transactionData.qr_code_base64,
      total: totalAmount,
      produtos,
    });

  } catch (err) {
    console.error('Erro criar-pix:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
