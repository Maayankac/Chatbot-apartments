
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

  const priceAboveMatch = lower.match(/מעל\s*(\d{3,7})/);
  if (priceAboveMatch) params.minPrice = priceAboveMatch[1];
  const priceAboveMatch = lower.match(/(?:מעל|יותר מ)\s*(\d{3,7})/);
  if (priceAboveMatch) params.minPrice = priceAboveMatch[1];
  const priceBelowMatch = lower.match(/(?:עד|מתחת ל)\s*(\d{3,7})/);
  if (priceBelowMatch) params.maxPrice = priceBelowMatch[1];
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

  const realEstateKeywords = ["דירה", "דירות", "חדר", "קומה", "מיקום", "מחיר", "נדלן", "חיפוש"];
  const isRelated = realEstateKeywords.some(word => lower.includes(word));
  if (!isRelated && !params.casual) {
    params.unrelated = true;
  }

  return params;
}

const lastSearches = {};
const userState = {};

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  const userId = req.ip;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  const containsHebrew = /[\u0590-\u05FF]/.test(message);
const containsEnglishLetters = /[a-zA-Z]/.test(message);
  if (!containsHebrew && containsEnglishLetters) {
    return res.json({
      results: [
        { text: "The chatbot currently understands Hebrew only. Please phrase your request in Hebrew 😊" }
      ]
    });
  }

  const state = userState[userId] || {};

  
  if (state.awaitingBudget) {
    state.budget = message.trim();
    state.awaitingBudget = false;
    state.awaitingRooms = true;
    return res.json({ results: [{ text: "כמה חדרים אתה מחפש?" }] });
  } else if (state.awaitingRooms) {
    state.rooms = message.trim();
    const { budget, rooms } = state;
    return res.json({
      results: [{ text: `מעולה! רשמנו שחיפשת דירה עם תקציב של ${budget} ש"ח ולפחות ${rooms} חדרים. נתחיל את תהליך הרישום לדירה ✨` }]
    });
  } else if (state.awaitingAptNumber) {

    state.aptNumber = message.trim();
    state.awaitingAptNumber = false;
    state.awaitingPhone = true;
    return res.json({ results: [{ text: "מה מספר הטלפון שלך?" }] });
  } else if (state.awaitingPhone) {
    state.phone = message.trim();
    state.awaitingPhone = false;
    state.awaitingFirstName = true;
    return res.json({ results: [{ text: "מה שמך הפרטי?" }] });
  } else if (state.awaitingFirstName) {
    state.firstName = message.trim();
    state.awaitingFirstName = false;
    state.awaitingLastName = true;
    return res.json({ results: [{ text: "מה שם המשפחה שלך?" }] });
  } else if (state.awaitingLastName) {
    state.lastName = message.trim();
    const { aptNumber, phone, firstName, lastName } = state;
    userState[userId] = { awaitingFeedback: true };
    return res.json({
      results: [
        { text: `הפרטים שלך עבור דירה ${aptNumber} התקבלו בהצלחה! בעל הדירה יקבל את הפרטים שלך (שם: ${firstName} ${lastName}, טלפון: ${phone}) וייצור איתך קשר בהקדם האפשרי. שיהיה המון בהצלחה! 😊` },
        { text: "האם הצ'אט עזר לך? (כן / לא)" }
      ]
    });
  } else if (state.awaitingFeedback) {
    userState[userId] = {};
    if (message.trim() === "כן") {
      return res.json({ results: [
        { text: "תודה רבה על הפידבק שלך! 🙏" },
        { text: "לחץ כאן כדי להתחיל שיחה חדשה", button: true }
      ] });
    } else {
      return res.json({ results: [
        { text: "אני מצטער לשמוע 😔 תרצה להתחיל שיחה חדשה?", button: true }
      ] });
    }
  }

  const interestMatch = message.match(/אני מעוניין בדירה\s*(\d+)/);
  if (interestMatch) {
    userState[userId] = { awaitingBudget: true };
    return res.json({
      results: [
        { text: `בשמחה! נרשום אותך עבור דירה ${interestMatch[1]}. נתחיל בלבקש כמה פרטים...` },
        { text: "מה מספר הטלפון שלך?" }
      ]
    });
  }

  const params = detectParams(message);

  if (params.casual) {
    return res.json({ results: [{ text: "אני כאן כדי לעזור בחיפוש דירות 🏠.
תוכל לרשום לי מה אתה מחפש – כמה חדרים, באיזו עיר, ומעל איזה תקציב?" }] });
  }

  if (params.unrelated) {
    return res.json({ results: [{ text: "אני כאן רק כדי לעזור בחיפוש דירות 🏠. תוכל לרשום לי מה אתה מחפש – כמה חדרים, באיזו עיר, ומעל איזה תקציב?" }] });
  }

  if (params.city || params.zone || params.maxPrice || params.rooms || params.floor) {
    let url = `${supabaseUrl}/rest/v1/apartments1?select=*`;
    const filters = [];
    if (params.city) filters.push(`city=ilike.${encodeURIComponent('%' + params.city + '%')}`);
    if (params.zone) filters.push(`zone=ilike.${encodeURIComponent('%' + params.zone + '%')}`);
    if (params.maxPrice) filters.push(`price=lte.${encodeURIComponent(params.maxPrice)}`);
  if (params.minPrice) filters.push(`price=gte.${encodeURIComponent(params.minPrice)}`);
    if (params.rooms) filters.push(`rooms=eq.${encodeURIComponent(params.rooms)}`);
    if (params.floor) filters.push(`floor=eq.${encodeURIComponent(params.floor)}`);
    if (filters.length > 0) url += `&${filters.join('&')}`;
    const limit = params.limit ? params.limit : 10;
    url += `&limit=${limit}&order=price.asc`;

    lastSearches[userId] = { url, offset: 0 };

    const supabaseRes = await fetch(`${url}&offset=0`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    const data = await supabaseRes.json();
    const formattedResults = data.map((apt, index) => {
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.address + ', ' + apt.city)}`;
      return {
        text:
          `🏠 דירה ${index + 1}:<br>` +
          `📍 עיר: ${apt.city}, אזור: ${apt.zone}<br>` +
          `🏠 רחוב: <a href="${mapsUrl}" target="_blank">${apt.address}</a><br>` +
          `🛏 חדרים: ${apt.rooms}<br>` +
          `🏢 קומה: ${apt.floor}<br>` +
          `💲 מחיר: ${apt.price} ש"ח`
      };
    });

    formattedResults.push({
      text: 'אם אהבת את הדירות המוצעות, כתוב: "כן" או "לא"'
    });

    return res.json({ results: formattedResults });
  }

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
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
