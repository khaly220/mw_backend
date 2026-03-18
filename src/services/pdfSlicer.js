const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Transforms raw PDF text into a structured CourseContent hierarchy
 */
async function slicePdfToContent(rawText, courseId) {
  try {
    const prompt = `
      Analyze the following educational text and organize it into a JSON hierarchy.
      
      STRUCTURE RULES:
      1. Main Chapters = LESSON
      2. Large Sections = TOPIC
      3. Specific Concepts = SUBTOPIC
      
      For each item, provide:
      - title
      - type (LESSON, TOPIC, or SUBTOPIC)
      - notes (The actual teaching content)
      - reviewPoints (An array of 3-5 short summary bullets)
      
      TEXT: ${rawText.substring(0, 15000)}
      
      RETURN ONLY VALID JSON.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const structuredData = JSON.parse(response.choices[0].message.content);

    // This is a recursive function to save the nested items into your Prisma DB
    const saveContent = async (item, parentId = null) => {
      const created = await prisma.courseContent.create({
        data: {
          title: item.title,
          type: item.type,
          notes: item.notes,
          reviewPoints: item.reviewPoints || [],
          courseId: courseId,
          parentId: parentId,
        }
      });

      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          await saveContent(child, created.id);
        }
      }
      return created;
    };

    // Assuming the AI returns a 'lessons' array
    for (const lesson of structuredData.lessons) {
      await saveContent(lesson);
    }

    return { success: true };
  } catch (error) {
    console.error("Slicing Error:", error);
    throw error;
  }
}

module.exports = { slicePdfToContent };