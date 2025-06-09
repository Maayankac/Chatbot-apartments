import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// הגדרת __dirname ב-ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const openaiKey = process.env.OPENAI_KEY;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// דף הבית
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function detectParams(message) {
  const params = {};
  const lower = message.toLowerCase();

  const locations = [
    { correct: "תל אביב", variants: ["תל אביב", "תל אבב", "תל אבי", "טל אביב"] },
    { correct: "רמת גן", variants: ["רמת גן", "רמתגן", "רמאת גן", "רמט גן"] },
    { correct: "ירושלים", variants: ["ירושלים", "ירושלם", "ירושליים", "ירשלים"] },
    { correct: "חיפה", variants: ["חיפה", "חיפא", "חיפהה"] },
    { correct: "באר שבע", variants: ["באר שבע", "באר שובע", "באר שוע", "באר שסע", "בר שבע", "באר שבעה"] }
  ];

  for (const loc of locations) {
    if (loc.variants.some(variant => lower.includes(variant))) {
      params.city = loc.correct;
      break;
    }
  }

  const zones = ["כרם התימנים", "תל ברוך צפון", "הצפון הישן", "מרכז העיר", "רמת החייל"];
  for (const z of zones) {
    if (lower.includes(z)) {
      params.zone = z;
      break;
    }
  }

  const priceMatch = lower.match(/(\d{3,7})/);
  if (priceMatch) params.maxPrice = priceMatch[1];

  const roomsMatch = lower.match(/(\d+)\s*חדר/);
  if (roomsMatch) params.rooms = roomsMatch[1];

  const floorMatch = lower.match(/קומה\s*(\d+)/);
  if (floorMatch) params.floor = floorMatch[1];

  const limitMatch = lower.match(/(\d+)\s*דירות?/);
  if (limitMatch) params.limit = limitMatch[1];

  const casualGreetings = ["היי", "מה נשמע", "מה שלומך", "בוקר טוב", "שלום", "צהריים טובים"];
  if (casualGreetings.some(greet => lower.includes(greet))) {
    params.casual = true;
  }

  const realEstateKeywords = ["דירה", "דירות", "חדר", "קומה", "מיקום", "מחיר", "נדל\"ן", "חיפוש"];
  const isRelated = realEstateKeywords.some(word => lower.includes(word));
  if (!isRelated && !params.casual) {
    params.unrelated = true;
  }

  return params;
}

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  try {
    // שלב א: בדיקה אם המשתמש מתעניין בדירה
    const interestMatch = message.match(/אני מעוניין בדירה\s*(\d+)/);
    if (interestMatch) {
      return res.json({
        results: [
          {
            text: `מעולה! אני קובע לך פגישה עם בעל הדירה מספר ${interestMatch[1]} 😊 נדאג לעדכן אותך בפרטים בקרוב.`,
          },
        ],
      });
    }

    // שלב ב: זיהוי פרמטרים מהודעה
    const params = detectParams(message);

    if (params.casual) {
      return res.json({ results: [{ text: "היי! אני כאן כדי לעזור לך עם חיפוש דירות 😊" }] });
    }

    if (params.unrelated) {
      return res.json({ results: [{ text: "אני כאן רק כדי לעזור בחיפוש דירות. שאל אותי על דירות! 🏠" }] });
    }

    // שלב ג: חיפוש דירות עם פרמטרים
    if (params.city || params.zone || params.maxPrice || params.rooms || params.floor) {
      let url = `${supabaseUrl}/rest/v1/apartments1?select=*`;
      const filters = [];
      if (params.city) filters.push(`city=ilike.${encodeURIComponent('%' + params.city + '%')}`);
      if (params.zone) filters.push(`zone=ilike.${encodeURIComponent('%' + params.zone + '%')}`);
      if (params.maxPrice) filters.push(`price=lte.${encodeURIComponent(params.maxPrice)}`);
      if (params.rooms) filters.push(`rooms=eq.${encodeURIComponent(params.rooms)}`);
      if (params.floor) filters.push(`floor=eq.${encodeURIComponent(params.floor)}`);
      if (filters.length > 0) url += `&${filters.join('&')}`;
      const limit = params.limit ? params.limit : 10;
      url += `&limit=${limit}&order=price.asc`;

      const supabaseRes = await fetch(url, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      const data = await supabaseRes.json();

      // פורמט התגובה כך שכל דירה תסומן במספר
 const formattedResults = data.map((apt, index) => ({
  text: `🏠 דירה ${index + 1}: ב${apt.city}, אזור ${apt.zone}, 🛏 ${apt.rooms} חדרים, 🏢 קומה ${apt.floor}, 💲 מחיר: ${apt.price} ש"ח\nאם אתה מעוניין, כתוב: "אני מעוניין בדירה ${index + 1}"`
}));


      return res.json({ results: formattedResults });
    }

    // שלב ד: תשובה מ־OpenAI
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a friendly chatbot. Respond naturally to the user." },
          { role: "user", content: message },
        ],
        temperature: 0.7,
      }),
    });

    const openaiJson = await openaiRes.json();
    const reply = openaiJson.choices[0].message.content;
    return res.json({ results: [{ text: reply }] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error processing request', details: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
