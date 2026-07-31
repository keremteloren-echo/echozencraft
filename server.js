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

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '1c8RM6LkPgYTNJDOgHPvSy4EQ-WSm2rVZ';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://developers.google.com/oauthplayground';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function uploadToDrive(filePath, fileName) {
  const fileMetadata = { name: fileName, parents: [DRIVE_FOLDER_ID] };
  const media = { mimeType: 'application/pdf', body: fs.createReadStream(filePath) };
  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    supportsAllDrives: true,
    supportsTeamDrives: true,
    fields: 'id',
  });
  return response.data.id;
}

const pdfDir = path.join(__dirname, 'pdfs');
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
app.use('/pdfs', express.static(pdfDir));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'numeroloji.html')));

function trToEn(text) {
  return (text || '')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
}

function reduceNumber(num, keepMaster = true) {
  while (num > 9) {
    if (keepMaster && (num === 11 || num === 22 || num === 33)) break;
    num = num.toString().split('').reduce((acc, curr) => acc + parseInt(curr, 10), 0);
  }
  return num;
}

function calculateSunSign(birthDateStr) {
  if (!birthDateStr) return 'Yengeç';
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
  return 'Yengeç';
}

function calculateRisingSign(birthDateStr, birthTimeStr) {
  if (!birthTimeStr) return 'Başak';
  const signs = ['Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak', 'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'];
  const [hours, minutes] = birthTimeStr.split(':').map(Number);
  const timeInHours = hours + (minutes || 0) / 60;
  const sunSign = calculateSunSign(birthDateStr);
  const sunIndex = signs.indexOf(sunSign);

  let hoursSinceSunrise = timeInHours - 6;
  if (hoursSinceSunrise < 0) hoursSinceSunrise += 24;

  const signOffset = Math.floor(hoursSinceSunrise / 2);
  return signs[(sunIndex + signOffset) % 12];
}

function calculateLifePath(birthDateStr) {
  if (!birthDateStr) return 2;
  const digits = birthDateStr.replace(/\D/g, '').split('').map(Number);
  return reduceNumber(digits.reduce((a, b) => a + b, 0));
}

function calculateNameNumerology(fullName) {
  const charValues = {
    a:1, j:1, s:1, ş:1, b:2, k:2, t:2, c:3, ç:3, l:3, u:3, ü:3,
    d:4, m:4, v:4, e:5, n:5, w:5, f:6, o:6, ö:6, x:6,
    g:7, ğ:7, p:7, y:7, h:8, q:8, z:8, i:9, ı:9, r:9
  };
  const vowels = ['a','e','ı','i','o','ö','u','ü'];
  const cleanName = (fullName || '').toLowerCase().replace(/[^a-zçğıöşü]/g, '');

  let soulUrgeSum = 0, personalitySum = 0, destinySum = 0;

  for (let char of cleanName) {
    const val = charValues[char] || 0;
    destinySum += val;
    if (vowels.includes(char)) soulUrgeSum += val;
    else personalitySum += val;
  }

  return {
    destiny: reduceNumber(destinySum) || 11,
    soulUrge: reduceNumber(soulUrgeSum) || 3,
    personality: reduceNumber(personalitySum) || 8
  };
}

// METRİK ANLAMLARI SÖZLÜĞÜ (DOĞRU TANIMLAR)
const NUMBER_DESCRIPTIONS = {
  1: "Liderlik, bağımsızlık, özgünlük ve cesaret yoludur.",
  2: "Birlikteliği öğrenme ve arabulucu olma dersi.",
  3: "Kendini neşeyle ifade etme ve ilham verme arzusu.",
  4: "Disiplin, düzen, güvenilirlik ve pratik çözümler.",
  5: "Dinamik, çekici, değişime açık ve meraklı bir profil.",
  6: "Sorumluluk, sevgi, fedakarlık ve aile odaklılık.",
  7: "Özgürce deneyimleme, analiz ve keşfetme arzusu.",
  8: "Başarı, güç, prestij, finansal bağımsızlık ve yetkinlik arayışını simgeler.",
  9: "Evrensel sevgi, merhamet ve insanlığa hizmet.",
  11: "Yüksek sezgi, ilham, ruhsal rehberlik ve aydınlanmayı simgeler (Üstat Sezgi).",
  22: "Büyük projeleri hayata geçirme ve evrensel inşa gücü.",
  33: "Ruhsal uyanış ve kitlelere rehberlik etme yolu."
};

// DOĞAL TAŞ SÖZLÜĞÜ
const NUMBER_STONES = {
  1: { name: 'KAPLAN GÖZÜ', color: 'Kahverengi/Sarı', element: 'Ateş' },
  2: { name: 'AY TAŞI', color: 'Beyaz / Yanardöner', element: 'Su' },
  3: { name: 'AMAZONİT', color: 'Yeşilimsi Mavi', element: 'Su' },
  4: { name: 'LAV TAŞI', color: 'Siyah', element: 'Toprak' },
  5: { name: 'FİRUZE', color: 'Mavi/Yeşil', element: 'Hava' },
  6: { name: 'PEMBE KUVARS', color: 'Pembe', element: 'Su' },
  7: { name: 'AMETİST', color: 'Mor', element: 'Hava' },
  8: { name: 'HEMATİT', color: 'Metalik Gri', element: 'Ateş' },
  9: { name: 'LABRADORİT', color: 'Mavi/Gri', element: 'Hava' },
  11: { name: 'AMETRİN', color: 'Mor/Sarı', element: 'Hava' },
  22: { name: 'KAPLAN GÖZÜ', color: 'Kahverengi/Altın', element: 'Ateş' },
  33: { name: 'AMETRİN', color: 'Mor/Sarı', element: 'Hava' }
};

const ZODIAC_STONES = {
  'Koç': { name: 'AKİK', color: 'Kırmızı', element: 'Ateş' },
  'Boğa': { name: 'YEŞİM', color: 'Yeşil', element: 'Toprak' },
  'İkizler': { name: 'AMETRİN', color: 'Mor/Sarı', element: 'Hava' },
  'Yengeç': { name: 'AY TAŞI', color: 'Beyaz / Yanardöner', element: 'Su' },
  'Aslan': { name: 'KAPLAN GÖZÜ', color: 'Kahverengi/Altın', element: 'Ateş' },
  'Başak': { name: 'YEŞİM', color: 'Yeşil', element: 'Toprak' },
  'Terazi': { name: 'LAPİS LAZULİ', color: 'Lacivert', element: 'Hava' },
  'Akrep': { name: 'MALAHİT', color: 'Koyu Yeşil', element: 'Su' },
  'Yay': { name: 'SODALİT', color: 'Mavi', element: 'Ateş' },
  'Oğlak': { name: 'HEMATİT', color: 'Metalik Gri', element: 'Toprak' },
  'Kova': { name: 'FİRUZE', color: 'Mavi/Yeşil', element: 'Hava' },
  'Balık': { name: 'PEMBE KUVARS', color: 'Pembe', element: 'Su' }
};

function generateFullAnalysis(fullName, birthDate, birthTime, intent) {
  const sunSign = calculateSunSign(birthDate);
  const risingSign = calculateRisingSign(birthDate, birthTime);
  const lifePath = calculateLifePath(birthDate);
  const { destiny, soulUrge, personality } = calculateNameNumerology(fullName);

  const getNumStone = (num) => NUMBER_STONES[num] || { name: 'AMAZONİT', color: 'Yeşilimsi Mavi', element: 'Su' };
  const getZodiacStone = (sign) => ZODIAC_STONES[sign] || { name: 'YEŞİM', color: 'Yeşil', element: 'Toprak' };

  const destStone = getNumStone(destiny);
  const soulStone = getNumStone(soulUrge);
  const persStone = getNumStone(personality);
  const risingStone = getZodiacStone(risingSign);

  const matchedStones = [
    { name: destStone.name, reason: `Kader Sayısı (${destiny})`, color: destStone.color, element: destStone.element },
    { name: soulStone.name, reason: `Ruh Güdüsü Sayısı (${soulUrge})`, color: soulStone.color, element: soulStone.element },
    { name: persStone.name, reason: `Kişilik Sayısı (${personality})`, color: persStone.color, element: persStone.element },
    { name: 'AY TAŞI', reason: `Yaşam Yolu (${lifePath}) & Güneş Burcu (${sunSign})`, color: 'Beyaz / Yanardöner', element: 'Su' },
    { name: risingStone.name, reason: `Yükselen Burç (${risingSign})`, color: risingStone.color, element: risingStone.element },
    { name: 'KAPLAN GÖZÜ', reason: `Niyet Desteği (${intent || 'Bolluk, Bereket, Servet ve Zenginlik'})`, color: 'Kahverengi / Sarı', element: 'Ateş' }
  ];

  return {
    destiny,
    destinyDesc: NUMBER_DESCRIPTIONS[destiny] || NUMBER_DESCRIPTIONS[11],
    soulUrge,
    soulUrgeDesc: NUMBER_DESCRIPTIONS[soulUrge] || NUMBER_DESCRIPTIONS[3],
    personality,
    personalityDesc: NUMBER_DESCRIPTIONS[personality] || NUMBER_DESCRIPTIONS[8],
    lifePath,
    lifePathDesc: NUMBER_DESCRIPTIONS[lifePath] || NUMBER_DESCRIPTIONS[2],
    sunSign,
    risingSign,
    matchedStones
  };
}

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

  const fullName = `${firstName} ${lastName}`.trim() || 'Ege Buğra TELÖREN';
  const formattedFullName = lastName ? `${firstName} ${lastName.toUpperCase()}` : firstName;
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
    .logo { max-width: 180px; height: auto; margin-bottom: 4px; }
    .title-badge { background-color: #2D5A42; color: #FFFDF0; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; padding: 6px 16px; border-radius: 20px; display: inline-block; text-transform: uppercase; border: 2px solid #E6A100; }
    .info-card { background-color: #F0F6F2; border: 1px solid #B8D8C6; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; }
    .info-item { flex: 1 1 45%; }
    .info-label { font-size: 9px; font-weight: 800; color: #2D5A42; text-transform: uppercase; margin-bottom: 2px; }
    .info-value { font-size: 11px; font-weight: 700; color: #5C2D5C; }
    .section-title { font-size: 10px; font-weight: 800; color: #2D5A42; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .section-title::before { content: ''; display: inline-block; width: 5px; height: 12px; background-color: #E6A100; border-radius: 2px; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 10px; border-radius: 8px; overflow: hidden; border: 1px solid #B8D8C6; }
    th { background: #2D5A42; color: #FFFDF0; font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 5px 8px; text-align: left; }
    td { padding: 4.5px 8px; font-size: 9.5px; border-bottom: 1px solid #E2EFE7; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background-color: #F8FAF8; }
    .badge-stone { font-weight: 800; color: #5C2D5C; }
    .note-box { background-color: #FFFDF2; border-left: 5px solid #E6A100; border: 1px solid #F0E6C2; border-radius: 6px; padding: 8px 12px; }
    .note-title { font-size: 9px; font-weight: 800; color: #2D5A42; text-transform: uppercase; margin-bottom: 3px; }
    .note-text { font-size: 9.5px; line-height: 1.3; color: #2D2238; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="Logo"><br>` : ''}
      <div class="title-badge">KİŞİSEL NUMEROLOJİ VE ANALİZ RAPORU</div>
    </div>

    <div class="info-card">
      <div class="info-item">
        <div class="info-label">MÜŞTERİ ADI SOYADI</div>
        <div class="info-value">${data.formattedFullName}</div>
      </div>
      <div class="info-item">
        <div class="info-label">SİPARİŞ / ANALİZ KODU</div>
        <div class="info-value" style="color: #E6A100;">#${data.trackingCode}</div>
      </div>
      <div class="info-item">
        <div class="info-label">DOĞUM BİLGİLERİ</div>
        <div class="info-value">${data.birthDate || ''} ${data.birthTime ? '- ' + data.birthTime : ''} ${data.birthPlace ? '(' + data.birthPlace + ')' : ''}</div>
      </div>
      ${data.intent ? `
      <div class="info-item">
        <div class="info-label">ÖZEL NİYET DESTEĞİ</div>
        <div class="info-value" style="color: #2D5A42;">${data.intent}</div>
      </div>` : ''}
    </div>

    <div class="section-title">NUMEROLOJİK VE ASTROLOJİK HARİTA</div>
    <table>
      <thead>
        <tr>
          <th style="width: 30%;">METRİK</th>
          <th style="width: 70%;">AÇIKLAMA / ANALİZ</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>Kader Sayısı (${data.analysis.destiny})</strong></td><td>${data.analysis.destinyDesc}</td></tr>
        <tr><td><strong>Ruh Güdüsü (${data.analysis.soulUrge})</strong></td><td>${data.analysis.soulUrgeDesc}</td></tr>
        <tr><td><strong>Kişilik Sayısı (${data.analysis.personality})</strong></td><td>${data.analysis.personalityDesc}</td></tr>
        <tr><td><strong>Yaşam Yolu (${data.analysis.lifePath})</strong></td><td>${data.analysis.lifePathDesc}</td></tr>
        <tr><td><strong>Güneş Burcu</strong></td><td>${data.analysis.sunSign}</td></tr>
        <tr><td><strong>Yükselen Burç</strong></td><td>${data.analysis.risingSign}</td></tr>
      </tbody>
    </table>

    <div class="section-title">ANALİZE ÖZEL EŞLEŞEN DOĞAL TAŞ KOLEKSİYONU</div>
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
        Bu özel tasarım, haritanızdaki <strong>${data.analysis.sunSign}</strong> burcu ve <strong>${data.analysis.risingSign}</strong> yükselen enerjisi ile <strong>${data.analysis.lifePath}</strong> Yaşam Yolu sayınızın hem de "<strong>${data.intent || 'Bolluk, Bereket, Servet ve Zenginlik'}</strong>" niyetinizin frekansını dengelemek amacıyla atölyemizde özenle hazırlanmıştır. Tasarımınızın size uğur ve denge getirmesini dileriz.
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
    margin: { top: '6mm', bottom: '6mm', left: '6mm', right: '6mm' }
  });

  await browser.close();
  return { filePath, fileName };
}

app.post('/api/v1/calculate', async (req, res) => {
  try {
    const { firstName: reqFirstName, lastName: reqLastName, fullName: reqFullName, birthDate, birthTime, birthPlace, intent, trackingCode } = req.body;
    const generatedCode = trackingCode || Math.floor(100000 + Math.random() * 900000).toString();
    const nameData = processNameInputs(reqFirstName, reqLastName, reqFullName);
    const dynamicAnalysis = generateFullAnalysis(nameData.fullName, birthDate, birthTime, intent);

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

    return res.status(200).json({ success: true, analysis: dynamicAnalysis, analysisCode: generatedCode });
  } catch (error) {
    console.error('Hesaplama Hata:', error);
    return res.status(500).json({ success: false, error: 'Hesaplama hatası oluştu.' });
  }
});

app.post('/api/numeroloji', (req, res) => res.status(200).json({ success: true, message: 'Bildirim alındı.' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu http://localhost:${PORT} adresinde aktif.`));