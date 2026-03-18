const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// FIXED: Correct model name - use "gemini-1.5-flash" or "gemini-1.5-pro"
const getModel = () => genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash", // Removed "-latest" suffix - this is the correct model name
  safetySettings 
});

// Also available options:
// - "gemini-1.5-pro" (more capable, higher cost)
// - "gemini-1.0-pro" (older version)
// - "gemini-2.0-flash-exp" (experimental, if you have access)

router.post('/explain', async (req, res) => {
  try {
    const { lessonTitle, topicTitle, subtopicTitle, subtopicContent } = req.body;
    
    // Validate required fields
    if (!subtopicContent) {
      return res.status(400).json({ 
        error: "subtopicContent is required",
        boards: {
          board1: "Unable to generate explanation",
          board2: "Content is missing",
          board3: "Please provide the content to explain"
        }
      });
    }

    const model = getModel();

    const prompt = `Explain: ${subtopicContent}. Lesson: ${lessonTitle || 'General'}. Topic: ${topicTitle || 'General'}...`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            board1: { type: "string" },
            board2: { type: "string" },
            board3: { type: "string" }
          },
          required: ["board1", "board2", "board3"]
        }
      },
    });

    const responseText = result.response.text();
    
    try {
      const parsedBoards = JSON.parse(responseText);
      res.json({ boards: parsedBoards });
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      // Fallback if response isn't valid JSON
      res.json({ 
        boards: {
          board1: "Explanation:",
          board2: responseText.substring(0, 200) + "...",
          board3: "Continue with your questions below!"
        }
      });
    }
    
  } catch (error) {
    console.error("AI Error Details:", {
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });

    // FIXED: Safely access subtopicContent with a fallback
    const safeSubtopicContent = req.body?.subtopicContent || "Content loading...";
    
    res.json({ 
      boards: {
        board1: "🔄 Having trouble connecting to AI service. Please try again.",
        board2: safeSubtopicContent,
        board3: "💡 Feel free to ask questions manually below!"
      }
    });
  }
});

router.post('/ask', async (req, res) => {
  try {
    const { question, currentNotes, studentName } = req.body;
    
    if (!question) {
      return res.status(400).json({ text: "Question is required" });
    }

    const model = getModel();

    const prompt = `
      You are MwarimuAI. A student named ${studentName || 'Learner'} is studying this content: "${currentNotes || 'No notes provided'}" .
      They asked: "${question}".
      
      RULES:
      - Answer briefly (max 60 words).
      - If the question is off-topic, gently bring them back to the lesson.
      - No cheating or code generation.
      - Be helpful and encouraging.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      safetySettings,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 150,
      }
    });

    res.json({ text: result.response.text() });
  } catch (error) {
    console.error("Ask Error:", error.message);
    res.status(500).json({ 
      text: "🤖 I'm having trouble connecting right now. Please try again in a moment!" 
    });
  }
});

// NEW ROUTE: Check available models
router.get('/models', async (req, res) => {
  try {
    const models = await genAI.listModels();
    res.json({ available: models });
  } catch (error) {
    res.json({ 
      error: "Could not fetch models",
      knownModels: [
        "gemini-1.5-flash",
        "gemini-1.5-pro", 
        "gemini-1.0-pro"
      ]
    });
  }
});

module.exports = router;