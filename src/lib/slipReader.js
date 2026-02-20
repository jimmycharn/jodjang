export const readSlipWithAI = async (base64Image, geminiKey, groqKey) => {
  // Prompt to extract information from slip
  const prompt = `Analyze this bank slip image and extract the following information in JSON format:
{
  "amount": <number, the transfer amount>,
  "date": "<YYYY-MM-DD, the date of transfer>",
  "type": "<string, 'expense' if it's an outgoing transfer/payment, 'income' if it's receiving money. Usually slips are outgoing so 'expense' is default>",
  "note": "<string, receiver name or bank name, short description>",
  "ref": "<string, transaction reference number if visible, otherwise empty string>"
}
Only return the raw JSON object, no markdown blocks or other text.`;

  // Try Gemini first
  try {
    if (!geminiKey) throw new Error("No Gemini key provided");
    
    console.log("Attempting to read with Gemini...");
    const geminiResult = await tryGemini(base64Image, prompt, geminiKey);
    return { ...geminiResult, source: 'gemini' };
  } catch (err) {
    console.warn("Gemini failed:", err.message);
    // If it's a quota error or if Gemini fails, fallback to Groq
    if (groqKey) {
      console.log("Falling back to Groq...");
      try {
        const groqResult = await tryGroq(base64Image, prompt, groqKey);
        return { ...groqResult, source: 'groq' };
      } catch (groqErr) {
        console.error("Groq also failed:", groqErr.message);
        throw new Error("Failed to read slip with both AI services.");
      }
    }
    throw err;
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
