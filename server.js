const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Google Drive ve OAuth 2.0 Bilgileri
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1c8RM6LkPgYTNJDOgHPvSy4EQ-WSm2rVZ';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function uploadToDrive(filePath, fileName) {
  const fileMetadata = {
    name: fileName,
    parents: [DRIVE_FOLDER_ID],
  };
  const media = {
    mimeType: 'application/pdf',
    body: fs.createReadStream(filePath),
  };
  
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    supportsAllDrives: true,
    supportsTeamDrives: true,
    fields: 'id',
  });
  return response.data.id;
}

// PDF yerel dizin kontrolü
const pdfDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

app.use('/pdfs', express.static(pdfDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'numeroloji.html'));
});

// --- DİNAMİK HESAPLAMA MOTORU ---

// Türkçe Karakter Temizleme
function trToEn(text) {
  return (text || '')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

// Rakam Tekhaneye/Üstat Sayıya İndirgeme
function reduceNumber(num, keepMaster = true) {
  while (num > 9) {
    if (keepMaster && (num === 11 || num === 22 || num === 33)) break;
    num = num.toString().split('').reduce((acc, curr) => acc + parseInt(curr, 10), 0);
  }
  return num;
}

// Güneş Burcu Tespiti
function calculateSunSign(birthDateStr) {
  if (!birthDateStr) return 'Aslan';
  const date = new Date(birthDateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Koç';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Boğa';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'İkizler';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Yengeç';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Aslan';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Başak';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Terazi';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Akrep';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Yay';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Oğlak';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Kova';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'Balık';
  return 'Aslan';
}

// Yaşam Yolu Sayısı Hesaplama
function calculateLifePath(birthDateStr) {
  if (!birthDateStr) return 11;
  const digits = birthDateStr.replace(/\D/g, '').split('').map(Number);
  const sum = digits.reduce((a, b) => a + b, 0);
  return reduceNumber(sum);
}

// Isim Numerolojisi Hesaplama (Pythagorean)
function calculateNameNumerology(fullName) {
  const charValues = {
    a:1, j:1, s:1, ş:1, b:2, k:2, t:2, c:3, ç:3, l:3, u:3, ü:3,
    d:4, m:4, v:4, e:5, n:5, w:5, f:6, o:6, ö:6, x:6,
    g:7, ğ:7, p:7, y:7, h:8, q:8, z:8, i:9, ı:9, r:9
  };

  const vowels = ['a','e','ı','i','o','ö','u','ü'];
  const cleanName = (fullName || '').toLowerCase().replace(/[^a-zçğıöşü]/g, '');

  let soulUrgeSum = 0;
  let personalitySum = 0;
  let destinySum = 0;

  for (let char of cleanName) {
    const val = charValues[char] || 0;
    destinySum += val;
    if (vowels.includes(char)) {
      soulUrgeSum += val;
    } else {
      personalitySum += val;
    }
  }

  return {
    destiny: reduceNumber(destinySum) || 1,
    soulUrge: reduceNumber(soulUrgeSum) || 5,
    personality: reduceNumber(personalitySum) || 5
  };
}

// Burçlara Göre Taş Haritası
const BURC_TASLARI = {
  'Koç': { name: 'AKİK', color: 'Kırmızı', element: 'Ateş' },
  'Boğa': { name: 'YEŞİM', color: 'Yeşil', element: 'Toprak' },
  'İkizler': { name: 'AMETRİN', color: 'Mor/Sarı', element: 'Hava' },
  'Yengeç': { name: 'AY TAŞI', color: 'Beyaz/Işıltılı', element: 'Su' },
  'Aslan': { name: 'KAPLAN GÖZÜ', color: 'Kahverengi/Altın', element: 'Ateş' },
  'Başak': { name: 'AMAZONİT', color: 'Yeşil/Mavi', element: 'Toprak' },
  'Terazi': { name: 'LAPİS LAZULİ', color: 'Lacivert', element: 'Hava' },
  'Akrep': { name: 'MALAHİT', color: 'Koyu Yeşil', element: 'Su' },
  'Yay': { name: 'SODALİT', color: 'Mavi', element: 'Ateş' },
  'Oğlak': { name: 'HEMATİT', color: 'Metalik Gri', element: 'Toprak' },
  'Kova': { name: 'FİRUZE', color: 'Mavi/Yeşil', element: 'Hava' },
  'Balık': { name: 'PEMBE KUVARS', color: 'Pembe', element: 'Su' }
};

// Tam Dinamik Analiz Üretici
function generateFullAnalysis(fullName, birthDate, intent) {
  const sunSign = calculateSunSign(birthDate);
  const lifePath = calculateLifePath(birthDate);
  const { destiny, soulUrge, personality } = calculateNameNumerology(fullName);

  const burcTasi = BURC_TASLARI[sunSign] || { name: 'KAPLAN GÖZÜ', color: 'Sarı/Kahve', element: 'Ateş' };

  const matchedStones = [
    { name: burcTasi.name, reason: `Güneş Burcu (${sunSign})`, color: burcTasi.color, element: burcTasi.element },
    { name: 'FİRUZE', reason: `Kader Sayısı (${destiny}) & Kişilik (${personality})`, color: 'Mavi/Yeşil', element: 'Hava' },
    { name: 'AMETRİN', reason: `Yaşam Yolu Sayısı (${lifePath})`, color: 'Mor/Sarı', element: 'Hava' },
    { name: 'AMAZONİT', reason: `Niyet Desteği (${intent || 'İçsel Denge & Bolluk'})`, color: 'Yeşilimsi Mavi', element: 'Su' }
  ];

  return {
    destiny,
    soulUrge,
    personality,
    lifePath,
    sunSign,
    risingSign: 'Aslan',
    matchedStones
  };
}

// Input İşleyici
function processNameInputs(reqFirstName, reqLastName, reqFullName) {
  let firstName = (reqFirstName || '').trim();
  let lastName = (reqLastName || '').trim();

  if (!firstName && !lastName && reqFullName) {
    const parts = reqFullName.trim().split(/\s+/);
    if (parts.length === 1) {
      firstName = parts[0];
      lastName = '';
    } else {
      lastName = parts.pop();
      firstName = parts.join(' ');
    }
  }

  const fullName = `${firstName} ${lastName}`.trim() || 'Emriye GÜMÜŞ';
  const formattedFullName = lastName 
    ? `${firstName} ${lastName.toUpperCase()}`
    : firstName;

  return { firstName, lastName, fullName, formattedFullName };
}

async function generateAnalysisPDF(data) {
  const logoPath = path.join(__dirname, 'logo.png');
  let logoBase64 = '';
  if (fs.existsSync(logoPath)) {
    logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, Arial, sans-serif; background-color: #F4F7F4; color: #1E2D24; padding: 12px; }
    .container { max-width: 780px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; padding: 18px 24px; border: 1.5px solid #2D5A42; }
    .header { text-align: center; margin-bottom: 10px; }
    .logo { max-width: 240px; height: auto; margin-bottom: 4px; }
    .title-badge { background-color: #2D5A42; color: #FFFDF0; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; padding: 7px 18px; border-radius: 20px; display: inline-block; text-transform: uppercase; border: 2px solid #E6A100; }
    .info-card { background-color: #F0F6F2; border: 1px solid #B8D8C6; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; }
    .info-item { flex: 1 1 45%; }
    .info-label { font-size: 9px; font-weight: 800; color: #2D5A42; text-transform: uppercase; margin-bottom: 2px; }
    .info-value { font-size: 11.5px; font-weight: 700; color: #5C2D5C; }
    .section-title { font-size: 10.5px; font-weight: 800; color: #2D5A42; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .section-title::before { content: ''; display: inline-block; width: 5px; height: 12px; background-color: #E6A100; border-radius: 2px; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 10px; border-radius: 8px; overflow: hidden; border: 1px solid #B8D8C6; }
    th { background: #2D5A42; color: #FFFDF0; font-size: 9.5px; font-weight: 800; text-transform: uppercase; padding: 6px 10px; text-align: left; }
    td { padding: 5.5px 10px; font-size: 10px; border-bottom: 1px solid #E2EFE7; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background-color: #F8FAF8; }
    .badge-stone { font-weight: 800; color: #5C2D5C; }
    .note-box { background-color: #FFFDF2; border-left: 5px solid #E6A100; border: 1px solid #F0E6C2; border-left-width: 5px; border-radius: 6px; padding: 8px 12px; }
    .note-title { font-size: 9.5px; font-weight: 800; color: #2D5A42; text-transform: uppercase; margin-bottom: 3px; }
    .note-text { font-size: 10px; line-height: 1.35; color: #2D2238; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Logo">` : '<h2 style="color: #2D5A42;">ECHO ZEN CRAFT</h2>'}
      <br>
      <div class="title-badge">Kişisel Numeroloji ve Analiz Raporu</div>
    </div>

    <div class="info-card">
      <div class="info-item">
        <div class="info-label">Müşteri Adı Soyadı</div>
        <div class="info-value">${data.formattedFullName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Doğum Bilgileri</div>
        <div class="info-value">${data.birthDate || '03.08.1975'} ${data.birthTime ? '- ' + data.birthTime : ''} ${data.birthPlace ? '(' + data.birthPlace + ')' : ''}</div>
      </div>
      ${data.intent ? `
      <div class="info-item" style="flex: 1 1 100%; margin-top: 2px;">
        <div class="info-label">Özel Niyet Desteği</div>
        <div class="info-value" style="color: #E6A100;">${data.intent}</div>
      </div>` : ''}
    </div>

    <div class="section-title">Numerolojik ve Astrolojik Harita</div>
    <table>
      <thead>
        <tr>
          <th style="width: 30%;">METRİK</th>
          <th style="width: 70%;">AÇIKLAMA / ANALİZ</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>Kader Sayısı (${data.analysis.destiny})</strong></td><td>Liderlik, bağımsızlık, özgünlük ve cesaret yoludur.</td></tr>
        <tr><td><strong>Ruh Güdüsü (${data.analysis.soulUrge})</strong></td><td>Özgürce deneyimleme ve keşfetme arzusu.</td></tr>
        <tr><td><strong>Kişilik Sayısı (${data.analysis.personality})</strong></td><td>Dinamik, çekici, değişime açık ve meraklı bir profil.</td></tr>
        <tr><td><strong>Yaşam Yolu (${data.analysis.lifePath})</strong></td><td>Ruhsal uyanış ve kitlelere rehberlik etme yolu.</td></tr>
        <tr><td><strong>Güneş Burcu</strong></td><td>${data.analysis.sunSign}</td></tr>
        <tr><td><strong>Yükselen Burç</strong></td><td>${data.analysis.risingSign || 'Belirtilmedi'}</td></tr>
      </tbody>
    </table>

    <div class="section-title">Analize Özel Eşleşen Doğal Taş Koleksiyonu</div>
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">TAŞ İSMİ</th>
          <th style="width: 45%;">EŞLEŞME NEDENİ / FREKANSI</th>
          <th style="width: 15%;">RENK</th>
          <th style="width: 15%;">ELEMENT</th>
        </tr>
      </thead>
      <tbody>
         ${(data.analysis.matchedStones || []).map(s => `
          <tr>
            <td class="badge-stone">${s.name}</td>
            <td>${s.reason}</td>
            <td>${s.color}</td>
            <td>${s.element}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="note-box">
      <div class="note-title">Atölye Tasarım Notu</div>
      <div class="note-text">
        Bu özel tasarım, haritanızdaki <strong>${data.analysis.sunSign}</strong> burcu ve <strong>${data.analysis.lifePath}</strong> Yaşam Yolu sayınızın${data.intent ? ` hem de "<strong>${data.intent}</strong>" niyetinizin` : ''} frekansını dengelemek amacıyla atölyemizde özenle hazırlanmıştır. Tasarımınızın size uğur getirmesini dileriz.
      </div>
    </div>
  </div>
</body>
</html>`;

  process.env.PUPPETEER_CACHE_DIR = path.join(__dirname, '.cache', 'puppeteer');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process', '--no-zygote']
  });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const safeName = trToEn(data.fullName).replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Rapor_${safeName}_${data.trackingCode}.pdf`;
  const filePath = path.join(pdfDir, fileName);

  await page.pdf({
    path: filePath,
    format: 'A4',
    printBackground: true,
    margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' }
  });

  await browser.close();
  return { filePath, fileName };
}

app.post('/api/v1/calculate', async (req, res) => {
  try {
    const { firstName: reqFirstName, lastName: reqLastName, fullName: reqFullName, birthDate, birthTime, birthPlace, intent, trackingCode } = req.body;
    
    const generatedCode = trackingCode || Math.floor(100000 + Math.random() * 900000).toString();
    const nameData = processNameInputs(reqFirstName, reqLastName, reqFullName);

    // Tam Dinamik Hesaplama
    const dynamicAnalysis = generateFullAnalysis(nameData.fullName, birthDate, intent);

    const reportData = {
      fullName: nameData.fullName,
      firstName: nameData.firstName,
      lastName: nameData.lastName,
      formattedFullName: nameData.formattedFullName,
      birthDate,
      birthTime,
      birthPlace,
      intent,
      trackingCode: generatedCode,
      analysis: dynamicAnalysis
    };

    (async () => {
      try {
        const { filePath, fileName } = await generateAnalysisPDF(reportData);
        console.log(`PDF kaydedildi: pdfs/${fileName}`);
        const fileId = await uploadToDrive(filePath, fileName);
        console.log(`Drive Yüklendi. ID: ${fileId}`);
      } catch (pdfError) {
        console.error('PDF/Drive hatası:', pdfError.message);
      }
    })();

    return res.status(200).json({
      success: true,
      analysis: dynamicAnalysis,
      analysisCode: generatedCode
    });

  } catch (error) {
    console.error('Hesaplama Hata:', error);
    return res.status(500).json({ success: false, error: 'Hesaplama hatası oluştu.' });
  }
});

app.post('/api/numeroloji', (req, res) => {
  return res.status(200).json({ success: true, message: 'Bildirim alındı.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu http://localhost:${PORT} adresinde aktif.`));