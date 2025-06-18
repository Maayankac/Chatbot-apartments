async function sendMessage() {
  const input = document.getElementById('userInput').value.trim();
  if (!input) return;

  const chatLog = document.getElementById('chatLog');
  chatLog.innerHTML += `<div class='user'>${input}</div>`;

  try {
    const response = await fetch('https://chatbot-apartments.onrender.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input })
    });

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      data.results.forEach(a => {
        if (a.text) {
          // 💬 אם זו תגובה עם כפתור התחלת שיחה חדשה
          if (a.button) {
            chatLog.innerHTML += `
              <div class='bot'>
                ${a.text}<br>
                <button class="restart-btn" onclick="startNewChat()">התחל שיחה חדשה</button>
              </div>
            `;
            return;
          }

          // ✅ תגובה רגילה (כולל "אם אהבת את הדירות..." שמגיעה רק פעם אחת)
          chatLog.innerHTML += `<div class='bot'>${a.text}</div>`;
        } else if (a.zone && a.address) {
          // 🏠 תצוגת דירה
          chatLog.innerHTML += `
            <div class='bot'>
              <div class='property-card'>
                <strong>📍 ${a.zone}, ${a.city}</strong><br>
                🏠 רחוב: ${a.address}<br>
                💲 מחיר: ${a.price || 'לא צויין'} ש"ח<br>
                🏢 קומה: ${a.floor || 'לא צוינה'}<br>
                🛏 חדרים: ${a.rooms || 'לא צוינו'}<br>
                📐 שטח: ${a.size || 'לא צויין'} מ"ר
              </div>
            </div>
          `;
        }
      });
    } else {
      chatLog.innerHTML += "<div class='bot'>לא נמצאו דירות מתאימות.</div>";
    }
  } catch (error) {
    console.error('Error:', error);
    chatLog.innerHTML += "<div class='bot'>שגיאה בשליחת הבקשה.</div>";
  }

  document.getElementById('userInput').value = '';
  chatLog.scrollTop = chatLog.scrollHeight;
}

// ❌ פונקציית שליחת "אני מעוניין" – כבר לא בשימוש, אבל נשאיר אם תרצה להפעיל בעתיד
function sendInterest(num) {
  const message = `אני מעוניין בדירה ${num}`;
  document.getElementById('userInput').value = message;
  sendMessage();
}

// 🔁 התחלת שיחה חדשה
async function startNewChat() {
  const chatLog = document.getElementById('chatLog');
  chatLog.innerHTML = '';
  document.getElementById('userInput').value = '';
  document.getElementById('userInput').focus();

  try {
    await fetch('https://chatbot-apartments.onrender.com/reset', {
      method: 'POST'
    });
    chatLog.innerHTML = "<div class='bot'>השיחה אופסה בהצלחה. איך אפשר לעזור? 😊</div>";
  } catch (error) {
    console.error('שגיאה באיפוס:', error);
    chatLog.innerHTML = "<div class='bot'>אירעה שגיאה באיפוס השיחה. נסה שוב.</div>";
  }
}

