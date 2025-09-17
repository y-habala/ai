
export type Language = 'en' | 'fr' | 'ar';

export interface LessonFormData {
  subject: string;
  gradeLevel: string;
  lessonTitle: string;
  duration: number;
  unit?: string;
  section?: string;
  teacherName?: string;
  institution?: string;
  schoolYear?: string;
  didacticSupport?: string;
  methodology?: string;
}

export interface LessonStage {
  title: string;
  teacherActions: string[];
  studentActions: string[];
  duration: number;
}

export interface LessonPlan {
  lessonInfo: {
    subject: string;
    gradeLevel: string;
    lessonTitle: string;
    duration: number;
    // Fix: Add optional teacherName and institution to allow them to be part of the generated lesson plan.
    teacherName?: string;
    institution?: string;
  };
  objectives: string[];
  prerequisites: string[];
  materials: string[];
  stages: LessonStage[];
}

export interface PresentationSlide {
  title: string;
  content: string[];
  speakerNotes: string;
}

export interface Presentation {
  slides: PresentationSlide[];
}

export interface StudentHandout {
  htmlContent: string;
}

export type AppState = 'idle' | 'loading' | 'success' | 'error';