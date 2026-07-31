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

// Google Drive ve OAuth 2.0 Bilgileri (.env dosyasından çekilir)
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
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, Arial, sans-serif;
      background-color: #F4F7F4;
      color: #1E2D24;
      padding: 12px;
      -webkit-print-color-adjust: exact;
    }
    .container {
      max-width: 780px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 12px;
      padding: 18px 24px;
      border: 1.5px solid #2D5A42;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    }
    .header { text-align: center; margin-bottom: 10px; }
    .logo { max-width: 240px; height: auto; margin-bottom: 4px; }
    .title-badge {
      background-color: #2D5A42;
      color: #FFFDF0;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.2px;
      padding: 7px 18px;
      border-radius: 20px;
      display: inline-block;
      text-transform: uppercase;
      border: 2px solid #E6A100;
      box-shadow: 0 2px 8px rgba(45, 90, 66, 0.2);
    }
    .info-card {
      background-color: #F0F6F2;
      border: 1px solid #B8D8C6;
      border-radius: 10px;
      padding: 8px 12px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 6px;
    }
    .info-item { flex: 1 1 45%; }
    .info-label {
      font-size: 9px;
      font-weight: 800;
      color: #2D5A42;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .info-value { font-size: 11.5px; font-weight: 700; color: #5C2D5C; }
    .section-title {
      font-size: 10.5px;
      font-weight: 800;
      color: #2D5A42;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 5px;
      height: 12px;
      background-color: #E6A100;
      border-radius: 2px;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 10px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #B8D8C6;
    }
    th {
      background: #2D5A42;
      color: #FFFDF0;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 6px 10px;
      text-align: left;
    }
    td { padding: 5.5px 10px; font-size: 10px; border-bottom: 1px solid #E2EFE7; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background-color: #F8FAF8; }
    tr:nth-child(odd) { background-color: #FFFFFF; }
    td strong { color: #2D5A42; }
    .badge-stone { font-weight: 800; color: #5C2D5C; }
    .note-box {
      background-color: #FFFDF2;
      border-left: 5px solid #E6A100;
      border-top: 1px solid #F0E6C2;
      border-right: 1px solid #F0E6C2;
      border-bottom: 1px solid #F0E6C2;
      border-radius: 6px;
      padding: 8px 12px;
    }
    .note-title {
      font-size: 9.5px;
      font-weight: 800;
      color: #2D5A42;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .note-text { font-size: 10px; line-height: 1.35; color: #2D2238; }
    .note-text strong { color: #5C2D5C; }
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
        <div class="info-value">${data.fullName || 'Sıla YAVUZ'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Doğum Bilgileri</div>
        <div class="info-value">${data.birthDate || '20.10.1997'} ${data.birthTime ? '- ' + data.birthTime : ''} ${data.birthPlace ? '(' + data.birthPlace + ')' : ''}</div>
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
        <tr><td><strong>Yaşam Yolu (${data.analysis.lifePath})</strong></td><td>Ruhsal uyanış ve kitlelere rehberlik etme yolu (Üstat Sezgi).</td></tr>
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
        Bu özel tasarım, haritanızdaki <strong>${data.analysis.sunSign}</strong> burcu${data.analysis.risingSign ? ` ve <strong>${data.analysis.risingSign}</strong> yükselen` : ''} enerjisi ile <strong>${data.analysis.lifePath}</strong> Yaşam Yolu sayınızın${data.intent ? ` hem de "<strong>${data.intent}</strong>" niyetinizin` : ''} frekansını dengelemek amacıyla atölyemizde özenle hazırlanmıştır. Tasarımınızın size uğur ve denge getirmesini dileriz.
      </div>
    </div>
  </div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: puppeteer.executablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process',
      '--no-zygote'
    ]
  });
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const safeName = (data.fullName || 'Sila_YAVUZ').replace(/[^a-zA-Z0-9]/g, '_');
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
    const { fullName, birthDate, birthTime, birthPlace, intent, trackingCode } = req.body;
    const generatedCode = trackingCode || Math.floor(100000 + Math.random() * 900000).toString();

    const mockAnalysis = {
      destiny: 1,
      soulUrge: 5,
      personality: 5,
      lifePath: 11,
      sunSign: 'Terazi',
      risingSign: 'Aslan',
      matchedStones: [
        { name: 'KAPLAN GÖZÜ', reason: 'Kader Sayısı (1) & Yükselen Burç (Aslan)', color: 'Kahverengi/Sarı', element: 'Ateş' },
        { name: 'FİRUZE', reason: 'Ruh Güdüsü Sayısı (5) & Kişilik Sayısı (5)', color: 'Mavi/Yeşil', element: 'Hava' },
        { name: 'AMETRİN', reason: 'Yaşam Yolu (11)', color: 'Mor/Sarı', element: 'Hava' },
        { name: 'LAPİS LAZULİ', reason: 'Güneş Burcu (Terazi)', color: 'Mavi', element: 'Hava' },
        { name: 'AMAZONİT', reason: `Niyet Desteği (${intent || 'İçsel Mutluluk, Neşe ve Yaşam Sevinci'})`, color: 'Yeşilimsi Mavi', element: 'Su' }
      ]
    };

    const reportData = {
      fullName,
      birthDate,
      birthTime,
      birthPlace,
      intent,
      trackingCode: generatedCode,
      analysis: mockAnalysis
    };

    (async () => {
      try {
        const { filePath, fileName } = await generateAnalysisPDF(reportData);
        console.log(`PDF yerel depoya kaydedildi: pdfs/${fileName}`);

        const fileId = await uploadToDrive(filePath, fileName);
        console.log(`PDF başarıyla Google Drive'a yüklendi. Drive Dosya ID: ${fileId}`);
      } catch (pdfError) {
        console.error('PDF oluşturma veya Drive yükleme hatası:', pdfError.message);
      }
    })();

    return res.status(200).json({
      success: true,
      analysis: mockAnalysis,
      analysisCode: generatedCode
    });

  } catch (error) {
    console.error('Hesaplama Genel Hata:', error);
    return res.status(500).json({ success: false, error: 'Hesaplama sırasında bir hata oluştu.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu http://localhost:${PORT} adresinde aktif.`));