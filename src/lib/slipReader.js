export const readSlipWithAI = async (base64Image, geminiKey) => {
  // Prompt to extract information from slip (Thai bank slips)
  const prompt = `วิเคราะห์รูปสลิปธนาคารนี้และดึงข้อมูลออกมาเป็น JSON:
{
  "amount": <number, จำนวนเงินที่โอน>,
  "date": "<YYYY-MM-DD, วันที่โอน>",
  "type": "<string, 'expense' ถ้าเป็นการโอนออก/จ่ายเงิน, 'income' ถ้าเป็นการรับเงิน โดยปกติสลิปจะเป็น expense>",
  "note": "<string, ชื่อผู้รับหรือธนาคาร คำอธิบายสั้นๆ>",
  "ref": "<string, เลขอ้างอิงธุรกรรม ถ้าไม่มีให้ใส่ string ว่าง>"
}

## การแปลงเดือนภาษาไทย (สำคัญมาก):
- ม.ค. = มกราคม = 01
- ก.พ. = กุมภาพันธ์ = 02
- มี.ค. = มีนาคม = 03
- เม.ย. = เมษายน = 04
- พ.ค. = พฤษภาคม = 05
- มิ.ย. = มิถุนายน = 06
- ก.ค. = กรกฎาคม = 07
- ส.ค. = สิงหาคม = 08
- ก.ย. = กันยายน = 09
- ต.ค. = ตุลาคม = 10
- พ.ย. = พฤศจิกายน = 11
- ธ.ค. = ธันวาคม = 12

## การแปลงปี พ.ศ. เป็น ค.ศ.:
- ปี พ.ศ. 2569 = ค.ศ. 2026
- ปี พ.ศ. 2568 = ค.ศ. 2025
- สูตร: ค.ศ. = พ.ศ. - 543

ตอบเป็น JSON เท่านั้น ห้ามใส่ markdown หรือข้อความอื่น`;

  if (!geminiKey) {
    throw new Error("ไม่พบ VITE_GEMINI_API_KEY ใน .env");
  }

  try {
    console.log("Reading slip with Gemini...");
    const geminiResult = await tryGemini(base64Image, prompt, geminiKey);
    return { ...geminiResult, source: 'gemini' };
  } catch (err) {
    console.error("Gemini failed:", err.message);
    throw new Error("ไม่สามารถอ่านสลิปได้: " + err.message);
  }
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

