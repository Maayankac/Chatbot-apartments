
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
const shownIntroMessage = {};

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  const userId = req.ip;
  if (!message) return res.status(400).json({ error: 'Missing message' });

  const containsHebrew = /[֐-׿]/.test(message);
  const containsEnglishLetters = /[a-zA-Z]/.test(message);
  if (!containsHebrew && containsEnglishLetters) {
    return res.json({
      results: [{ text: "The chatbot currently understands Hebrew only. Please phrase your request in Hebrew 😊" }]
    });
  }

  const state = userState[userId] || {};
  const params = detectParams(message);
  const hasActiveFlow = Object.values(state).some(val => val === true);

  if (!hasActiveFlow && !params.casual && params.unrelated && !shownIntroMessage[userId]) {
    shownIntroMessage[userId] = true;
    return res.json({
      results: [{ text: "אני כאן רק כדי לעזור בחיפוש דירות 🏠. תוכל לרשום לי מה אתה מחפש – כמה חדרים, באיזו עיר, ומעל איזה תקציב?" }]
    });
  }

  if (
    params.unrelated &&
    !state.awaitingInterest &&
    !state.awaitingAptNumber &&
    !state.awaitingPhone &&
    !state.awaitingFirstName &&
    !state.awaitingLastName &&
    !state.awaitingRooms &&
    !state.awaitingBudget &&
    !state.awaitingFeedback
  ) {
    return res.json({
      results: [{ text: "אני כרגע מתמקד בחיפוש דירות בלבד. נסה לשאול אותי משהו שקשור לדירה 😊" }]
    });
  }

  return res.json({ results: [{ text: "✔️ הכל עובד — שאר הלוגיקה כאן..." }] });
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
