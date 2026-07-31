document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('analysisForm') || document.getElementById('numerologyForm');
  const resultsCard = document.getElementById('resultsCard');
  const resultDiv = document.getElementById('result');

  // 8 Haneli Benzersiz Kod Üretici (Örn: EZC-8921)
  function generateTrackingCode() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = 'EZC-';
      for (let i = 0; i < 4; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
  }

  if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const fullNameElem = document.getElementById('fullName');
        const birthDateElem = document.getElementById('birthDate');

        const fullName = fullNameElem ? fullNameElem.value : '';
        
        // Doğum tarihi ister tek inputtan ister ayrı açılır menülerden gelsin kontrol edelim
        let birthDate = birthDateElem ? birthDateElem.value : '';
        if (!birthDate) {
          const day = document.getElementById('birthDay')?.value || '';
          const month = document.getElementById('birthMonth')?.value || '';
          const year = document.getElementById('birthYear')?.value || '';
          if (day && month && year) {
            birthDate = `${year}-${month}-${day}`;
          }
        }

        const hour = document.getElementById('birthHour')?.value || '';
        const minute = document.getElementById('birthMinute')?.value || '';
        const birthTime = (hour && minute) ? `${hour.replace(':00', '')}:${minute}` : '';
        const birthPlace = document.getElementById('birthPlace')?.value || '';
        const intent = document.getElementById('intent')?.value || '';

        const trackingCode = generateTrackingCode();

        const requestPayload = {
            fullName: fullName,
            name: fullName,
            birthDate: birthDate,
            birthTime: birthTime,
            birthPlace: birthPlace,
            intent: intent,
            trackingCode: trackingCode
        };

        // UI'da kod gösterimi
        const displayCodeElem = document.getElementById('displayAnalysisCode');
        if (displayCodeElem) {
          displayCodeElem.innerText = trackingCode;
        }

        if (resultDiv) {
          resultDiv.innerHTML = `
              <div class="code-box">
                  <h3>Analiz Takip Kodunuz</h3>
                  <p class="code-number"><strong>${trackingCode}</strong></p>
                  <small>Lütfen bu kodu bir yere not edin. Analizinizle ilgili tüm süreçlerde bu kodu kullanacaksınız.</small>
              </div>
              <p><strong>Ad Soyad:</strong> ${fullName}</p>
              <p><strong>Doğum Tarihi:</strong> ${birthDate}</p>
              <p style="color: green;">Bilgileriniz alındı. Hesaplanıyor...</p>
          `;
        }

        try {
            // Server.js üzerindeki hesaplama endpoint'ine istek atıyoruz
            const response = await fetch('/api/v1/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const analysis = data.analysis;

                // Sonuçları HTML alanlarına basma
                if (document.getElementById('destinyNumber')) {
                  document.getElementById('destinyNumber').innerText = analysis?.destiny ?? '-';
                }
                if (document.getElementById('soulUrge')) {
                  document.getElementById('soulUrge').innerText = analysis?.soulUrge ?? '-';
                }
                if (document.getElementById('personalityNumber')) {
                  document.getElementById('personalityNumber').innerText = analysis?.personality ?? '-';
                }
                if (document.getElementById('lifePath')) {
                  document.getElementById('lifePath').innerText = analysis?.lifePath ?? '-';
                }

                if (resultsCard) {
                  resultsCard.classList.remove('hidden');
                  resultsCard.scrollIntoView({ behavior: 'smooth' });
                }

                // Mail servisi / Bildirim kaydı için ikincil istek
                fetch('/api/numeroloji', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: fullName,
                    birthDate: birthDate,
                    trackingCode: trackingCode
                  })
                }).catch(err => console.error('Mail bildirimi hatası:', err));

            } else {
                console.error('Sunucu hatası:', data.message || data.error);
                alert('Hesaplama yapılırken bir hata oluştu: ' + (data.message || data.error || 'Bilinmeyen hata'));
            }
        } catch (error) {
            console.error('İstek gönderilirken hata oluştu:', error);
            alert('Sunucuya bağlanırken bir sorun oluştu.');
        }
    });
  }
});