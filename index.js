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
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg || msg.type !== 'text') return;

  const texto  = msg.text.body;
  const numero = msg.from;

  const { data } = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: `Sos el asistente del Laboratorio Clínico.
Respondé preguntas sobre turnos, resultados y precios.
Si el caso es urgente o necesita atención humana, respondé solo: ESCALAR`,
      messages: [{ role: 'user', content: texto }]
    },
    { headers: {
        'x-api-key': CLAUDE_KEY,
        'anthropic-version': '2023-06-01'
    }}
  );

  const respuesta = data.content[0].text;

  await axios.post(
    `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: numero,
      type: 'text',
      text: { body: respuesta }
    },
    { headers: { Authorization: `Bearer ${WA_TOKEN}` } }
  );
});

app.listen(3000, () => console.log('Servidor corriendo'));