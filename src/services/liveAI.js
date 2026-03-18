const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function processLiveTranscript(sessionId, fullTranscript) {
  try {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: { class: true }
    });

    // 1. AI summarizes the transcript into professional notes
    const prompt = `
      The following is a transcript from a live class titled "${session.title}".
      Summarize this into structured study notes. 
      Include:
      - Main topics discussed.
      - Key definitions.
      - A "Action Items" list for students.
      
      TRANSCRIPT: ${fullTranscript}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });

    const summaryNotes = response.choices[0].message.content;

    // 2. Save these notes automatically as CourseContent
    // This allows the "Live Tutor" AI to answer questions about this specific class later
    const liveNote = await prisma.courseContent.create({
      data: {
        title: `Notes: ${session.title} (${new Date().toLocaleDateString()})`,
        type: 'LESSON',
        notes: summaryNotes,
        courseId: session.courseId || "", // Ensure you have courseId linked to session
      }
    });

    return liveNote;
  } catch (error) {
    console.error("Live AI Processing Error:", error);
  }
}

module.exports = { processLiveTranscript };