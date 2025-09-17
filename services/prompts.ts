
import { LessonFormData, LessonPlan, Language } from '../types';

const languageMap: { [key in Language]: string } = {
  en: 'English',
  fr: 'French',
  ar: 'Arabic',
};

const optionalField = (label: string, value?: string) => value ? `${label}: ${value}\n` : '';

export const getLessonPlanPrompt = (formData: LessonFormData, lang: Language): string => {
  const languageName = languageMap[lang];
  return `
    You are an expert instructional designer. Your task is to generate a comprehensive lesson plan based on the following details.
    The entire output, including all keys and values, must be in ${languageName}.

    Lesson Details:
    - Subject: ${formData.subject}
    - Grade Level: ${formData.gradeLevel}
    - Lesson Title: ${formData.lessonTitle}
    - Duration: ${formData.duration} minutes
    ${optionalField('- Unit', formData.unit)}
    ${optionalField('- Section', formData.section)}
    ${optionalField('- Teacher\'s Name', formData.teacherName)}
    ${optionalField('- Institution', formData.institution)}
    ${optionalField('- School Year', formData.schoolYear)}
    ${optionalField('- Didactic Support', formData.didacticSupport)}
    ${optionalField('- Lesson Methodology', formData.methodology)}

    // Fix: Explicitly request teacherName and institution in the lessonInfo object to ensure they are returned by the model.
    Generate a detailed lesson plan with the following structure.
    - lessonInfo: An object containing:
      - subject: The lesson subject.
      - gradeLevel: The grade level.
      - lessonTitle: The lesson title.
      - duration: The total duration in minutes.
      - teacherName: The teacher's name, if provided.
      - institution: The institution's name, if provided.
    - objectives: A list of 3-5 key learning objectives.
    - prerequisites: A list of skills or knowledge students should have before this lesson.
    - materials: A list of necessary materials for the lesson.
    - stages: An array of lesson stages (e.g., Introduction, Activity 1, Assessment, Conclusion). Each stage must include:
      - title: The name of the stage.
      - teacherActions: A list of actions the teacher will perform.
      - studentActions: A list of actions the students will perform.
      - duration: The estimated duration of this stage in minutes. The sum of all stage durations should equal the total lesson duration of ${formData.duration} minutes.

    Your response must be a valid JSON object matching the provided schema. Do not include any text before or after the JSON object.
  `;
};

export const getPresentationPrompt = (lessonPlan: LessonPlan, lang: Language): string => {
  const languageName = languageMap[lang];
  return `
    You are an expert in creating educational presentations. Based on the following lesson plan, generate a slide-by-slide presentation.
    The entire output must be in ${languageName}.

    Lesson Plan:
    ${JSON.stringify(lessonPlan, null, 2)}

    Generate a presentation with an array of slides. Each slide should have:
    - title: A concise title for the slide.
    - content: A list of key bullet points (3-5 per slide).
    - speakerNotes: Detailed notes for the teacher to use when presenting the slide.

    Create a logical flow, starting with an introduction/title slide, covering each lesson stage, and ending with a summary or conclusion slide.
    Your response must be a valid JSON object matching the provided schema. Do not include any text before or after the JSON object.
  `;
};

export const getStudentHandoutPrompt = (lessonPlan: LessonPlan, lang: Language): string => {
  const languageName = languageMap[lang];
  return `
    You are a teacher skilled at simplifying complex topics for students. Based on the following lesson plan, create a student-friendly handout in HTML format.
    The entire HTML content must be in ${languageName}.

    Lesson Plan:
    ${JSON.stringify(lessonPlan, null, 2)}

    The HTML should be a single, self-contained block of content. Use simple and engaging language.
    - Start with a clear title (<h1>).
    - Briefly explain the main goals of the lesson in a section (<h2>What will we learn today?</h2>).
    - Summarize the key information from each stage of the lesson using headings (<h3>) and paragraphs (<p>) or lists (<ul>, <li>).
    - Include a short summary or key takeaways at the end.
    - Use basic HTML tags only: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>. Do not include <style>, <script>, <html>, <head>, or <body> tags.

    Your response must be a valid JSON object containing a single key "htmlContent" with the full HTML string as its value.
  `;
};