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
          // בדיקה אם זו תגובת דירה עם מספר
          const match = a.text.match(/דירה\s*(\d+)/);
          if (match) {
            const aptNum = match[1];
            chatLog.innerHTML += `
              <div class='bot'>
                ${a.text}<br>
                <button onclick="sendInterest(${aptNum})">אני מעוניין</button>
              </div>
            `;
          } else {
            // תגובה רגילה
chatLog.innerHTML += `<div class='bot'>${a.text}</div>`;
          }
        } else if (a.zone && a.address) {
          // תצוגת דירה לפי פרטי אובייקט
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

// שליחה אוטומטית של הודעת עניין בדירה
function sendInterest(num) {
  const message = `אני מעוניין בדירה ${num}`;
  document.getElementById('userInput').value = message;
  sendMessage();
}
