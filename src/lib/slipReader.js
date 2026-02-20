export const readSlipWithAI = async (base64Image, geminiKey) => {
  // Prompt to extract information from slip (Thai bank slips)
  const prompt = `วิเคราะห์รูปสลิปธนาคารนี้และดึงข้อมูลออกมาเป็น JSON:
{
  "amount": <number, จำนวนเงินที่โอน>,
  "date_raw": "<string, วันที่ตามที่เห็นในสลิป คัดลอกมาตรงๆ เช่น '18 ก.พ. 2569' หรือ '18/02/69'>",
  "type": "<string, 'expense' ถ้าเป็นการโอนออก/จ่ายเงิน, 'income' ถ้าเป็นการรับเงิน โดยปกติสลิปจะเป็น expense>",
  "note": "<string, ชื่อผู้รับหรือธนาคาร คำอธิบายสั้นๆ>",
  "ref": "<string, เลขอ้างอิงธุรกรรม ถ้าไม่มีให้ใส่ string ว่าง>"
}
ตอบเป็น JSON เท่านั้น ห้ามใส่ markdown หรือข้อความอื่น`;

  if (!geminiKey) {
    throw new Error("ไม่พบ VITE_GEMINI_API_KEY ใน .env");
  }

  try {
    console.log("Reading slip with Gemini...");
    const geminiResult = await tryGemini(base64Image, prompt, geminiKey);
    // Post-process: convert raw Thai date to YYYY-MM-DD
    geminiResult.date = parseThaiDate(geminiResult.date_raw || geminiResult.date);
    return { ...geminiResult, source: 'gemini' };
  } catch (err) {
    console.error("Gemini failed:", err.message);
    throw new Error("ไม่สามารถอ่านสลิปได้: " + err.message);
  }
};

// Thai month abbreviations to month number
const THAI_MONTHS = {
  'ม.ค.': '01', 'มกราคม': '01', 'มค': '01',
  'ก.พ.': '02', 'กุมภาพันธ์': '02', 'กพ': '02',
  'มี.ค.': '03', 'มีนาคม': '03', 'มีค': '03',
  'เม.ย.': '04', 'เมษายน': '04', 'เมย': '04',
  'พ.ค.': '05', 'พฤษภาคม': '05', 'พค': '05',
  'มิ.ย.': '06', 'มิถุนายน': '06', 'มิย': '06',
  'ก.ค.': '07', 'กรกฎาคม': '07', 'กค': '07',
  'ส.ค.': '08', 'สิงหาคม': '08', 'สค': '08',
  'ก.ย.': '09', 'กันยายน': '09', 'กย': '09',
  'ต.ค.': '10', 'ตุลาคม': '10', 'ตค': '10',
  'พ.ย.': '11', 'พฤศจิกายน': '11', 'พย': '11',
  'ธ.ค.': '12', 'ธันวาคม': '12', 'ธค': '12',
};

const parseThaiDate = (rawDate) => {
  if (!rawDate) return new Date().toISOString().split('T')[0];
  
  console.log("Parsing raw date:", rawDate);

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    // Check if year is Buddhist Era (> 2400)
    const year = parseInt(rawDate.split('-')[0]);
    if (year > 2400) {
      return `${year - 543}-${rawDate.split('-')[1]}-${rawDate.split('-')[2]}`;
    }
    return rawDate;
  }

  // Try Thai month text: "18 ก.พ. 2569" or "18 กุมภาพันธ์ 2569"
  for (const [thaiMonth, monthNum] of Object.entries(THAI_MONTHS)) {
    if (rawDate.includes(thaiMonth)) {
      const numbers = rawDate.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const day = numbers[0].padStart(2, '0');
        let year = numbers[numbers.length - 1];
        // Convert Buddhist Era to CE
        if (parseInt(year) > 2400) year = String(parseInt(year) - 543);
        // Handle 2-digit year
        if (year.length === 2) year = (parseInt(year) > 40 ? '19' : '20') + year;
        return `${year}-${monthNum}-${day}`;
      }
    }
  }

  // Try DD/MM/YYYY or DD/MM/YY format
  const slashMatch = rawDate.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    let year = slashMatch[3];
    if (year.length === 2) year = (parseInt(year) > 40 ? '19' : '20') + year;
    if (parseInt(year) > 2400) year = String(parseInt(year) - 543);
    return `${year}-${month}-${day}`;
  }

  // Fallback: return today
  console.warn("Could not parse date, using today:", rawDate);
  return new Date().toISOString().split('T')[0];
};

const tryGemini = async (base64Image, prompt, apiKey) => {
  // Remove data:image/...;base64, prefix if present
  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  
  try {
    return JSON.parse(text);
  } catch (e) {
    // Attempt to extract JSON from markdown if AI ignored the prompt
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match) return JSON.parse(match[1]);
    throw new Error("Failed to parse Gemini response as JSON");
  }
};

