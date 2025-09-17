
import { GoogleGenAI, Type } from "@google/genai";
import { LessonFormData, LessonPlan, Presentation, StudentHandout, Language } from '../types';
import { getLessonPlanPrompt, getPresentationPrompt, getStudentHandoutPrompt } from './prompts';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const lessonPlanSchema = {
  type: Type.OBJECT,
  properties: {
    lessonInfo: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        gradeLevel: { type: Type.STRING },
        lessonTitle: { type: Type.STRING },
        duration: { type: Type.INTEGER },
        // Fix: Add teacherName and institution to the schema to match the updated LessonPlan type and prompt.
        teacherName: { type: Type.STRING },
        institution: { type: Type.STRING },
      },
      required: ['subject', 'gradeLevel', 'lessonTitle', 'duration']
    },
    objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
    materials: { type: Type.ARRAY, items: { type: Type.STRING } },
    stages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          teacherActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          studentActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          duration: { type: Type.INTEGER },
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
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.ARRAY, items: { type: Type.STRING } },
                    speakerNotes: { type: Type.STRING }
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
        htmlContent: { type: Type.STRING }
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
    
    const jsonText = response.text.trim();
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

        const jsonText = response.text.trim();
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
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as StudentHandout;
    } catch (error) {
        console.error("Error generating student handout:", error);
        throw new Error("Failed to generate student handout from API.");
    }
};