document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('analysisForm') || document.getElementById('numerologyForm');
  const resultsCard = document.getElementById('resultsCard');
  const resultDiv = document.getElementById('result');

  // Senin isteğine uygun olarak 6 Haneli Benzersiz Kod Üretici (Sadece rakam)
  function generateTrackingCode() {
      return Math.floor(100000 + Math.random() * 900000).toString();
  }

  if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const firstNameElem = document.getElementById('firstName');
        const lastNameElem = document.getElementById('lastName');
        const fullNameElem = document.getElementById('fullName');

        let firstName = firstNameElem ? firstNameElem.value.trim() : '';
        let lastName = lastNameElem ? lastNameElem.value.trim() : '';
        let fullName = '';

        if (firstName || lastName) {
            fullName = `${firstName} ${lastName}`.trim();
        } else if (fullNameElem) {
            fullName = fullNameElem.value.trim();
            const parts = fullName.split(' ');
            if (parts.length > 1) {
                lastName = parts.pop();
                firstName = parts.join(' ');
            } else {
                firstName = fullName;
            }
        }
        
        // Tarih verilerini parçalı alıyoruz
        const day = document.getElementById('birthDay')?.value || '';
        const month = document.getElementById('birthMonth')?.value || '';
        const year = document.getElementById('birthYear')?.value || '';

        // Saat verilerini parçalı alıyoruz
        let hourVal = document.getElementById('birthHour')?.value || '';
        let minuteVal = document.getElementById('birthMinute')?.value || '';
        let hour = '';
        let minute = '';
        
        if (hourVal !== '' && minuteVal !== '') {
            hour = hourVal.replace(':00', '').padStart(2, '0');
            minute = minuteVal.padStart(2, '0');
        }

        const birthPlace = document.getElementById('birthPlace')?.value || '';
        const intent = document.getElementById('intent')?.value || '';

        const trackingCode = generateTrackingCode();

        // Sunucuya gidecek veri paketini parçalı hale getirdik
        const requestPayload = {
            firstName: firstName,
            lastName: lastName,
            day: day,
            month: month,
            year: year,
            hour: hour,
            minute: minute,
            birthPlace: birthPlace,
            intent: intent,
            trackingCode: trackingCode
        };

        const displayCodeElem = document.getElementById('displayAnalysisCode');
        if (displayCodeElem) {
          displayCodeElem.innerText = trackingCode;
        }

        if (resultDiv) {
          resultDiv.innerHTML = `
              <div class="code-box">
                  <h3>Analiz Takip Kodunuz</h3>
                  <p class="code-number">${trackingCode}</p>
                  <small>Lütfen bu kodu bir yere not edin. Analizinizle ilgili tüm süreçlerde bu kodu kullanacaksınız.</small>
              </div>
              <p>Ad Soyad: ${fullName}</p>
              <p>Doğum Tarihi: ${day}/${month}/${year}</p>
              <p style="color: green;">Bilgileriniz alındı. Hesaplanıyor...</p>
          `;
        }

        try {
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

                fetch('/api/numeroloji', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    firstName: firstName,
                    lastName: lastName,
                    day: day,
                    month: month,
                    year: year,
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