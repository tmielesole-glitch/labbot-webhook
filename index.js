const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const WA_TOKEN     = process.env.WA_TOKEN;
const PHONE_ID     = process.env.PHONE_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const CLAUDE_KEY   = process.env.CLAUDE_KEY;

app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe') {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg || msg.type !== 'text') return;

    const texto  = msg.text.body;
    const numero = '5491131032509';
console.log('Número destino:', numero);
    console.log('Mensaje recibido:', texto, 'de', numero);

    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `Sos el asistente del Laboratorio Clínico. Respondé preguntas sobre turnos, resultados y precios. Si el caso es urgente respondé solo: ESCALAR`,
        messages: [{ role: 'user', content: texto }]
      },
      { headers: {
          'x-api-key': CLAUDE_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
      }}
    );

    const respuesta = data.content[0].text;
    console.log('Respuesta Claude:', respuesta);

    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: numero,
        type: 'text',
        text: { body: respuesta }
      },
      { headers: { Authorization: `Bearer ${WA_TOKEN}` }}
    );
    console.log('Mensaje enviado a WhatsApp');

  } catch (err) {
    console.log('ERROR:', err.response?.data || err.message);
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Servidor corriendo'));
