export const readSlipWithAI = async (base64Image, geminiKey, groqKey) => {
  // Prompt to extract information from slip (Thai bank slips)
  const prompt = `วิเคราะห์รูปสลิปธนาคารนี้และดึงข้อมูลออกมาเป็น JSON:
{
  "amount": <number, จำนวนเงินที่โอน>,
  "date": "<YYYY-MM-DD, วันที่โอน>",
  "type": "<string, 'expense' ถ้าเป็นการโอนออก/จ่ายเงิน, 'income' ถ้าเป็นการรับเงิน โดยปกติสลิปจะเป็น expense>",
  "note": "<string, ชื่อผู้รับหรือธนาคาร คำอธิบายสั้นๆ>",
  "ref": "<string, เลขอ้างอิงธุรกรรม ถ้าไม่มีให้ใส่ string ว่าง>"
}
ตอบเป็น JSON เท่านั้น ห้ามใส่ markdown หรือข้อความอื่น`;

  // Check if we have at least one API key
  if (!geminiKey && !groqKey) {
    throw new Error("ไม่พบ API Key สำหรับอ่านสลิป");
  }

  // Try Gemini first
  if (geminiKey) {
    try {
      console.log("Attempting to read with Gemini...");
      const geminiResult = await tryGemini(base64Image, prompt, geminiKey);
      return { ...geminiResult, source: 'gemini' };
    } catch (err) {
      console.warn("Gemini failed:", err.message);
      // If Groq is available, try it as fallback
      if (groqKey) {
        console.log("Falling back to Groq...");
        try {
          const groqResult = await tryGroq(base64Image, prompt, groqKey);
          return { ...groqResult, source: 'groq' };
        } catch (groqErr) {
          console.error("Groq also failed:", groqErr.message);
          throw new Error("ไม่สามารถอ่านสลิปได้ กรุณาลองใหม่");
        }
      }
      throw new Error("Gemini: " + err.message);
    }
  }

  // If only Groq is available
  if (groqKey) {
    try {
      console.log("Using Groq...");
      const groqResult = await tryGroq(base64Image, prompt, groqKey);
      return { ...groqResult, source: 'groq' };
    } catch (groqErr) {
      console.error("Groq failed:", groqErr.message);
      throw new Error("Groq: " + groqErr.message);
    }
  }
};

const tryGemini = async (base64Image, prompt, apiKey) => {
  // Remove data:image/...;base64, prefix if present
  const base64Data = base64Image.split(',')[1] || base64Image;
  const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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

const tryGroq = async (base64Image, prompt, apiKey) => {
  // Ensure we have the full data URI for Groq
  const dataUrl = base64Image.includes('data:image') 
    ? base64Image 
    : `data:image/jpeg;base64,${base64Image}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "llama-3.2-90b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: dataUrl
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Groq Error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const text = data.choices[0].message.content;
  
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Failed to parse Groq response as JSON");
  }
};
