import { GoogleGenAI, Type } from "@google/genai";
import { LessonFormData, LessonPlan, Presentation, StudentHandout, Language } from '../types';
import { getLessonPlanPrompt, getPresentationPrompt, getStudentHandoutPrompt } from './prompts';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to extract JSON from a string that might be wrapped in markdown code fences.
const extractJson = (text: string): string => {
    const regex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(regex);
    if (match && match[1]) {
        return match[1];
    }
    return text;
};

const lessonPlanSchema = {
  type: Type.OBJECT,
  properties: {
    lessonInfo: {
      type: Type.OBJECT,
      description: "Basic information about the lesson.",
      properties: {
        subject: { type: Type.STRING, description: "The subject of the lesson, e.g., 'Mathematics'." },
        gradeLevel: { type: Type.STRING, description: "The target grade level for the lesson, e.g., '5th Grade'." },
        lessonTitle: { type: Type.STRING, description: "The title of the lesson." },
        duration: { type: Type.INTEGER, description: "The total duration of the lesson in minutes." },
        teacherName: { type: Type.STRING, description: "The name of the teacher (optional)." },
        institution: { type: Type.STRING, description: "The name of the school or institution (optional)." },
      },
      required: ['subject', 'gradeLevel', 'lessonTitle', 'duration']
    },
    objectives: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of key learning objectives for the lesson."
    },
    prerequisites: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of skills or knowledge students should have before this lesson."
    },
    materials: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of necessary materials for the lesson."
    },
    stages: {
      type: Type.ARRAY,
      description: "An array of lesson stages, detailing the flow of the lesson.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The title of the lesson stage, e.g., 'Introduction'." },
          teacherActions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of actions the teacher will perform during this stage."
          },
          studentActions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A list of actions students will perform during this stage."
          },
          duration: { type: Type.INTEGER, description: "The estimated duration of this stage in minutes." },
        },
        required: ['title', 'teacherActions', 'studentActions', 'duration']
      },
    },
  },
  required: ['lessonInfo', 'objectives', 'prerequisites', 'materials', 'stages']
};

const presentationSchema = {
    type: Type.OBJECT,
    properties: {
        slides: {
            type: Type.ARRAY,
            description: "An array of slides for the presentation.",
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The title of the slide." },
                    content: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "A list of bullet points for the slide content."
                    },
                    speakerNotes: { type: Type.STRING, description: "Detailed notes for the presenter." }
                },
                required: ['title', 'content', 'speakerNotes']
            }
        }
    },
    required: ['slides']
};


const studentHandoutSchema = {
    type: Type.OBJECT,
    properties: {
        htmlContent: { type: Type.STRING, description: "A self-contained string of simple HTML for the student handout." }
    },
    required: ['htmlContent']
};


export const generateLessonPlan = async (formData: LessonFormData, lang: Language): Promise<LessonPlan> => {
  try {
    const prompt = getLessonPlanPrompt(formData, lang);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: lessonPlanSchema,
      },
    });
    
    const jsonText = extractJson(response.text.trim());
    return JSON.parse(jsonText) as LessonPlan;
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    throw new Error("Failed to generate lesson plan from API.");
  }
};

export const generatePresentation = async (lessonPlan: LessonPlan, lang: Language): Promise<Presentation> => {
    try {
        const prompt = getPresentationPrompt(lessonPlan, lang);
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: presentationSchema,
          },
        });

        const jsonText = extractJson(response.text.trim());
        return JSON.parse(jsonText) as Presentation;
    } catch (error) {
        console.error("Error generating presentation:", error);
        throw new Error("Failed to generate presentation from API.");
    }
};

export const generateStudentHandout = async (lessonPlan: LessonPlan, lang: Language): Promise<StudentHandout> => {
    try {
        const prompt = getStudentHandoutPrompt(lessonPlan, lang);
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: studentHandoutSchema,
          },
        });
        
        const jsonText = extractJson(response.text.trim());
        return JSON.parse(jsonText) as StudentHandout;
    } catch (error) {
        console.error("Error generating student handout:", error);
        throw new Error("Failed to generate student handout from API.");
    }
};