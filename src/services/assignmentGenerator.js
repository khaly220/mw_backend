const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateTopicAssignment(contentId, teacherId) {
  try {
    // 1. Fetch the notes for the topic to give the AI context
    const topic = await prisma.courseContent.findUnique({
      where: { id: contentId },
      select: { title: true, notes: true, courseId: true }
    });

    if (!topic || !topic.notes) throw new Error("No notes found for this topic.");

    // 2. AI Prompt to create the Assignment
    const prompt = `
      Topic: "${topic.title}"
      Content: "${topic.notes.substring(0, 6000)}"
      
      Task: Generate a formal Assignment based on the text above.
      The assignment must include:
      - 3 Multiple Choice Questions (MCQ)
      - 2 True or False Questions
      
      Return ONLY a JSON object with this structure:
      {
        "title": "Assignment: ${topic.title}",
        "instruction": "Read the lesson notes carefully before attempting these questions.",
        "questions": [
          {
            "prompt": "Question text...",
            "type": "MCQ",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "answer": "Option 1",
            "weight": 10
          },
          {
            "prompt": "Statement text...",
            "type": "TRUE_FALSE",
            "options": ["True", "False"],
            "answer": "True",
            "weight": 10
          }
        ]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const aiData = JSON.parse(response.choices[0].message.content);

    // 3. Save to Prisma using your 'assignment' and 'Question' models
    const newAssignment = await prisma.assignment.create({
      data: {
        title: aiData.title,
        instruction: aiData.instruction,
        teacherId: teacherId,
        contentId: contentId,
        courseId: topic.courseId,
        questions: {
          create: aiData.questions.map(q => ({
            prompt: q.prompt,
            type: q.type,
            options: q.options, // Stored as Json in your schema
            answer: q.answer,
            weight: q.weight
          }))
        }
      }
    });

    return newAssignment;
  } catch (error) {
    console.error("Assignment Generation Error:", error);
    throw error;
  }
}

module.exports = { generateTopicAssignment };