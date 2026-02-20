const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const buildSystemPrompt = (categories) => {
  let catsString = "อื่นๆ";
  if (categories && categories.length > 0) {
    catsString = categories.map(c => `${c.name} (${c.type})`).join(", ");
  }

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dayName = today.toLocaleDateString('th-TH', { weekday: 'long' });

  return `คุณคือผู้ช่วยวิเคราะห์รายรับรายจ่ายภาษาไทย ตอบกลับเป็น JSON เท่านั้น ห้ามใช้ Markdown code block

## ข้อมูลสำคัญ
- วันที่ปัจจุบัน: ${dateStr} (${dayName})
- หมวดหมู่ที่มี: ${catsString}

## กฎการวิเคราะห์
1. **ชื่อคน vs สิ่งของ**: หากมีคำที่อาจเป็นชื่อคน (เช่น ข้าวหอม, มะลิ, น้ำผึ้ง) ให้พิจารณาบริบท:
   - "ให้เงินข้าวหอมไปโรงเรียน" → ข้าวหอม = ชื่อคน, หมวด = การศึกษา/ลูก
   - "ซื้อข้าวหอมมะลิ 5 กิโล" → ข้าวหอมมะลิ = สินค้า, หมวด = อาหาร

2. **การจัดหมวดหมู่ตามบริบท**:
   - "ให้เงิน/ค่าขนม + ไปโรงเรียน" → การศึกษา, ลูก, หรือ อื่นๆ
   - "ให้เงินแม่/พ่อ" → ครอบครัว หรือ อื่นๆ
   - "ค่ารถ/แท็กซี่/Grab" → เดินทาง
   - "กินข้าว/อาหาร/ชานม" → อาหาร

3. **เกี่ยวกับวันที่**
   - ไม่มีข้อมูลวันที่ในประโยค → วันที่ปัจจุบัน
   - คำที่บอกวันที่แบบภาษาพูดทั่วไปเช่น เมื่อวาน → วันที่ปัจจุบัน - 1 วัน
   - คำที่บอกวันที่แบบภาษาพูดทั่วไปเช่น เมื่อวานซืน → วันที่ปัจจุบัน - 2 วัน
   - บอกวันที่มาอย่างเดียวเช่น เมื่อวันที่ 5 → ให้หมายถึงวันที่ 5 เดือนปัจจุบัน ยกเว้นจะระบุเดือนด้วย

4. **note**: ใส่รายละเอียดที่เป็นประโยชน์ เช่น "ให้ข้าวหอมไปโรงเรียน", "ค่าอาหารกลางวัน"

5. **ถ้าไม่แน่ใจหมวด**: ให้ใช้ "อื่นๆ" แทนการเดาผิด

## Format JSON (ต้องตอบ JSON เท่านั้น)
{
  "amount": number,
  "type": "expense" | "income",
  "categoryName": string (ต้องเป็นหมวดที่มีอยู่หรือ "อื่นๆ"),
  "date": "YYYY-MM-DD",
  "note": string (สรุปสั้นๆ)
}`;
};

// Gemini API
const callGemini = async (text, systemPrompt) => {
  const modelName = 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { response_mime_type: "application/json" }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    const errorMsg = result.error?.message || '';
    if (response.status === 429 || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('QUOTA_EXCEEDED');
    }
    throw new Error(errorMsg || `HTTP ${response.status}`);
  }

  if (result.candidates && result.candidates.length > 0) {
    return JSON.parse(result.candidates[0].content.parts[0].text);
  }

  throw new Error('No response from Gemini');
};

// Groq API (fallback)
const callGroq = async (text, systemPrompt) => {
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const payload = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || `HTTP ${response.status}`);
  }

  if (result.choices && result.choices.length > 0) {
    return JSON.parse(result.choices[0].message.content);
  }

  throw new Error('No response from Groq');
};

export const processWithGemini = async (text, categories) => {
  if (!GEMINI_API_KEY && !GROQ_API_KEY) {
    return { success: false, error: "API Key ไม่ถูกต้อง" };
  }

  const systemPrompt = buildSystemPrompt(categories);

  // ลอง Gemini ก่อน
  if (GEMINI_API_KEY) {
    try {
      const data = await callGemini(text, systemPrompt);
      return { success: true, data };
    } catch (error) {
      // ถ้า quota หมด หรือ error อื่นๆ ลอง Groq
      if (GROQ_API_KEY) {
        console.log('Gemini failed, trying Groq...', error.message);
      } else {
        if (error.message === 'QUOTA_EXCEEDED') {
          return { success: false, error: 'Gemini API quota หมด กรุณารอสักครู่แล้วลองใหม่' };
        }
        return { success: false, error: `Gemini Error: ${error.message}` };
      }
    }
  }

  // Fallback ไป Groq
  if (GROQ_API_KEY) {
    try {
      const data = await callGroq(text, systemPrompt);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: `Groq Error: ${error.message}` };
    }
  }

  return { success: false, error: "AI ไม่สามารถวิเคราะห์ได้" };
};

export default processWithGemini;
