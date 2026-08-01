const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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
app.get('/api/keep-alive', (req, res) => res.status(200).send('Alive'));

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

function calculateRisingSign(birthDateStr, hour, minute, birthPlace) {
  if (!hour || !minute || !birthPlace) return 'Belirtilmedi';
  const birthTimeStr = `${hour}:${minute}`;
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

const NUMBER_DESCRIPTIONS = {
  1: "Liderlik, bağımsızlık, özgünlük ve cesaret yoludur.",
  2: "Birlikteliği öğrenme ve arabulucu olma dersi.",
  3: "Kendini neşeyle ifade etme ve ilham verme arzusu.",
  4: "Disiplin, düzen, güvenilirlik ve pratik çözümler.",
  5: "Dinamik, çekici, değişime açık ve meraklı bir profil.",
  6: "Sorumluluk, sevgi, fedakarlık ve aile odaklılık.",
  7: "Özgürce deneyimleme, analiz ve keşfetme arzusu.",
  8: "Başarı, güç, prestij, finansal bağımsızlık ve yetkinlik arayışı.",
  9: "Evrensel sevgi, merhamet ve insanlığa hizmet.",
  11: "Yüksek sezgi, ilham, ruhsal rehberlik ve aydınlanma.",
  22: "Büyük projeleri hayata geçirme ve evrensel inşa gücü.",
  33: "Ruhsal uyanış ve kitlelere rehberlik etme yolu."
};

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

function generateFullAnalysis(fullName, birthDateStr, hour, minute, birthPlace, intent) {
  const sunSign = calculateSunSign(birthDateStr);
  const risingSign = calculateRisingSign(birthDateStr, hour, minute, birthPlace);
  const lifePath = calculateLifePath(birthDateStr);
  const { destiny, soulUrge, personality } = calculateNameNumerology(fullName);

  const getNumStone = (num) => NUMBER_STONES[num] || { name: 'AMAZONİT', color: 'Yeşilimsi Mavi', element: 'Su' };
  const getZodiacStone = (sign) => ZODIAC_STONES[sign] || { name: 'YEŞİM', color: 'Yeşil', element: 'Toprak' };

  const destStone = getNumStone(destiny);
  const soulStone = getNumStone(soulUrge);
  const persStone = getNumStone(personality);
  const risingStone = risingSign.includes('Belirtilmedi') ? { name: 'BEYAZ KUVARS', color: 'Şeffaf Beyaz', element: 'Tümü' } : getZodiacStone(risingSign);

  const matchedStones = [
    { name: destStone.name, reason: `Kader Sayısı (${destiny})`, color: destStone.color, element: destStone.element },
    { name: soulStone.name, reason: `Ruh Güdüsü Sayısı (${soulUrge})`, color: soulStone.color, element: soulStone.element },
    { name: persStone.name, reason: `Kişilik Sayısı (${personality})`, color: persStone.color, element: persStone.element },
    { name: 'AY TAŞI', reason: `Yaşam Yolu (${lifePath}) & Güneş Burcu (${sunSign})`, color: 'Beyaz / Yanardöner', element: 'Su' },
    { name: risingStone.name, reason: `Yükselen Burç (${risingSign})`, color: risingStone.color, element: risingStone.element },
    { name: 'KAPLAN GÖZÜ', reason: `Niyet Desteği (${intent || 'bolluk'})`, color: 'Kahverengi / Sarı', element: 'Ateş' }
  ];

  return {
    destiny, destinyDesc: NUMBER_DESCRIPTIONS[destiny] || NUMBER_DESCRIPTIONS[11],
    soulUrge, soulUrgeDesc: NUMBER_DESCRIPTIONS[soulUrge] || NUMBER_DESCRIPTIONS[3],
    personality, personalityDesc: NUMBER_DESCRIPTIONS[personality] || NUMBER_DESCRIPTIONS[8],
    lifePath, lifePathDesc: NUMBER_DESCRIPTIONS[lifePath] || NUMBER_DESCRIPTIONS[2],
    sunSign, risingSign, matchedStones
  };
}

function processNameInputs(firstName, lastName) {
  const fName = (firstName || '').trim();
  const lName = (lastName || '').trim();
  const fullName = `${fName} ${lName}`.trim() || 'Ege Buğra TELÖREN';
  const formattedFullName = lName ? `${fName} ${lName.toUpperCase()}` : fName;
  return { firstName: fName, lastName: lName, fullName, formattedFullName };
}

// PDFKit ile doğrudan güvenli PDF üretimi
function generateAnalysisPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const safeName = trToEn(data.fullName).replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Rapor_${safeName}_${data.trackingCode}.pdf`;
      const filePath = path.join(pdfDir, fileName);

      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Renk Paleti
      const primaryColor = '#2D5A42';
      const accentColor = '#E6A100';
      const textColor = '#1E2D24';

      // Başlık Rozeti
      doc.rect(40, 40, 515, 30).fill(primaryColor);
      doc.fillColor('#FFFDF0').fontSize(11).font('Helvetica-Bold').text('KISISEL NUMEROLOJI VE ANALIZ RAPORU', 40, 48, { align: 'center', width: 515 });
      doc.moveDown(2);

      // Bilgi Kartı
      doc.fillColor(textColor).fontSize(10);
      doc.font('Helvetica-Bold').text('MUSTERI: ', { continued: true }).font('Helvetica').text(data.formattedFullName);
      doc.font('Helvetica-Bold').text('SIPARIS KODU: ', { continued: true }).font('Helvetica').text(`#${data.trackingCode}`);
      doc.font('Helvetica-Bold').text('DOGUM BILGILERI: ', { continued: true }).font('Helvetica').text(`${data.birthDate || ''} ${data.hour ? data.hour + ':' + data.minute : ''} (${data.birthPlace || 'Belirtilmedi'})`);
      if (data.intent) {
        doc.font('Helvetica-Bold').text('OZEL NIYET: ', { continued: true }).font('Helvetica').text(data.intent);
      }
      doc.moveDown(1.5);

      // Bölüm 1: Numerolojik ve Astrolojik Harita
      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('NUMEROLOJIK VE ASTROLOJIK HARITA');
      doc.moveDown(0.5);

      const metrics = [
        ['Kader Sayisi', `${data.analysis.destiny} - ${data.analysis.destinyDesc}`],
        ['Ruh Gudusu', `${data.analysis.soulUrge} - ${data.analysis.soulUrgeDesc}`],
        ['Kisilik Sayisi', `${data.analysis.personality} - ${data.analysis.personalityDesc}`],
        ['Yasam Yolu', `${data.analysis.lifePath} - ${data.analysis.lifePathDesc}`],
        ['Gunes Burcu', data.analysis.sunSign],
        ['Yukselen Burc', data.analysis.risingSign]
      ];

      metrics.forEach(([label, desc]) => {
        doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor).text(label, { continued: true, width: 120 });
        doc.font('Helvetica').fillColor(textColor).text(`: ${desc}`);
        doc.moveDown(0.3);
      });

      doc.moveDown(1);

      // Bölüm 2: Doğal Taş Koleksiyonu
      doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('ESLESEN DOGAL TAS KOLEKSIYONU');
      doc.moveDown(0.5);

      (data.analysis.matchedStones || []).forEach(stone => {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#5C2D5C').text(stone.name, { continued: true, width: 120 });
        doc.font('Helvetica').fillColor(textColor).text(`: ${stone.reason} (${stone.color}, ${stone.element})`);
        doc.moveDown(0.3);
      });

      doc.moveDown(1.5);

      // Atölye Tasarım Notu
      doc.rect(40, doc.y, 515, 50).fillAndStroke('#FFFDF2', accentColor);
      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('ATOLYE TASARIM NOTU', 50, doc.y - 40);
      doc.fillColor('#2D2238').font('Helvetica').fontSize(8.5).text(
        `Bu ozel tasarım, haritanızdaki ${data.analysis.sunSign} burcu ve ${data.analysis.lifePath} Yaşam Yolu sayınız ile "${data.intent || 'bolluk'}" niyetinizin frekansını dengelemek amacıyla atölyemizde özenle hazırlanmıştır.`,
        50, doc.y - 25, { width: 495 }
      );

      doc.end();

      stream.on('finish', () => resolve({ filePath, fileName }));
      stream.on('error', (err) => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}

app.post('/api/v1/calculate', async (req, res) => {
  try {
    const { firstName, lastName, email, day, month, year, hour, minute, birthPlace, intent, trackingCode } = req.body;
    
    console.log('\n--- YENİ FORM GİRİŞİ (PDFKIT) ---');
    console.log(`Ad Soyad: ${firstName || ''} ${lastName || ''}`);

    const birthDate = (year && month && day) ? `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` : '';
    const generatedCode = trackingCode || Math.floor(100000 + Math.random() * 900000).toString();
    const nameData = processNameInputs(firstName, lastName);
    const dynamicAnalysis = generateFullAnalysis(nameData.fullName, birthDate, hour, minute, birthPlace, intent);

    const reportData = {
      fullName: nameData.fullName,
      firstName: nameData.firstName,
      lastName: nameData.lastName,
      formattedFullName: nameData.formattedFullName,
      birthDate, hour, minute, birthPlace, intent,
      trackingCode: generatedCode,
      analysis: dynamicAnalysis
    };

    try {
        const dbPath = path.join(__dirname, 'database.json');
        let db = { records: [] };
        if (fs.existsSync(dbPath)) {
            db = JSON.parse(fs.readFileSync(dbPath));
        }
        db.records.push({
            id: Date.now().toString(),
            code: generatedCode,
            createdAt: new Date().toISOString(),
            status: "PENDING",
            user: { firstName: nameData.firstName, lastName: nameData.lastName, fullName: nameData.fullName, email, birthDate, birthTime: `${hour}:${minute}`, birthPlace },
            intent, analysis: dynamicAnalysis
        });
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    } catch (bErr) { console.error("DB Hata:", bErr); }

    (async () => {
      try {
        const { filePath, fileName } = await generateAnalysisPDF(reportData);
        let driveUrl = "Drive Hatası";
        try {
            const fileId = await uploadToDrive(filePath, fileName);
            driveUrl = `Dosya ID: ${fileId}`;
        } catch(dErr) { console.error("Drive Hata:", dErr.message); }

        await transporter.sendMail({
          from: `"Echo Zen Craft Sistem" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER,
          subject: `Yeni Sipariş PDF Raporu: ${nameData.formattedFullName} - #${generatedCode}`,
          text: `Merhaba,\n\n${nameData.formattedFullName} için hazırlanan analiz raporu ekte yer almaktadır.\nDrive Durumu: ${driveUrl}\n\nKolay gelsin,\nEcho Zen Craft`,
          attachments: [{ filename: fileName, path: filePath }]
        });
        console.log(`PDF başarıyla oluşturuldu, mail atıldı ve Drive'a yüklendi!`);
      } catch (pErr) {
        console.error('PDF/Mail işlem hatası:', pErr.message);
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