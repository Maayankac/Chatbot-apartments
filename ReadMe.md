# Chatbot-Apartments

זוהי אפליקציית צ'אטבוט פשוטה שמאפשרת למשתמשים לחפש דירות בצורה קלה ונוחה.  
האפליקציה כוללת:
- Node.js + Express בצד השרת
- Supabase לאחסון נתוני הדירות
- OpenAI API לשיחות עם הצ'אטבוט

## קבצים בפרויקט:
- `chatbot.js` – קוד השרת (Backend) שמטפל בבקשות חיפוש דירות ובשיחות עם OpenAI.
- `chat.js` – קוד צד הלקוח (Frontend) שמטפל בשליחת הודעות והצגתן בדפדפן.
- `index.html` – עמוד ה-HTML הראשי שבו מופיע הצ'אט.
- `index.css` – עיצוב הצ'אט והעמוד.
- `.env` – קובץ הגדרות המכיל את המפתחות לשירותי Supabase ו-OpenAI.

## איך להפעיל את הפרויקט?
1️⃣ התקן את התלויות (אם יש):  
```bash
npm install
2️⃣ ודא שקובץ .env קיים בתיקייה הראשית וכולל את המפתחות שלך:

SUPABASE_URL=https://hfoiltcedecpbghybtfz.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_KEY=sk-proj-iHr_0X3jx8ezT3Nnzw33xVuvHTd2...

3️⃣ הפעל את השרת:
node chatbot.js
4️⃣ פתח את index.html בדפדפן והתחל לשוחח בצ'אט!