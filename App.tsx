import React, { useState, useMemo, useEffect } from 'react';
import { LessonForm } from './components/LessonForm';
import { LessonDisplay } from './components/LessonDisplay';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { I18nContext, translations } from './i18n';
import { LessonFormData, LessonPlan, Presentation, StudentHandout, Language, AppState } from './types';
import { generateLessonPlan, generatePresentation, generateStudentHandout } from './services/geminiService';

const initialFormData: LessonFormData = {
  subject: '',
  gradeLevel: '',
  lessonTitle: '',
  duration: 45,
  unit: '',
  section: '',
  teacherName: '',
  institution: '',
  schoolYear: '',
  didacticSupport: '',
  methodology: '',
};

const getInitialLanguage = (): Language => {
    const browserLang = navigator.language.slice(0, 2); // e.g., 'en-US' -> 'en'
    if (browserLang === 'fr' || browserLang === 'ar') {
        return browserLang;
    }
    return 'en'; // Default to English for 'en' or any unsupported language
};

const getStoredFormData = (): LessonFormData => {
    try {
        const storedData = localStorage.getItem('lessonFormData');
        if (storedData) {
            // Basic validation to ensure it's not empty or malformed
            const parsed = JSON.parse(storedData);
            if (typeof parsed === 'object' && parsed !== null && parsed.subject !== undefined) {
                 return parsed;
            }
        }
    } catch (error) {
        console.error("Failed to parse form data from localStorage", error);
        localStorage.removeItem('lessonFormData');
    }
    return initialFormData;
};

const App: React.FC = () => {
    const [lang, setLang] = useState<Language>(getInitialLanguage());
    const [formData, setFormData] = useState<LessonFormData>(getStoredFormData);
    const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
    const [appState, setAppState] = useState<AppState>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const i18nValue = useMemo(() => {
        const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';
        return {
            lang,
            setLang,
            t: (key: string) => translations[lang][key] || key,
            dir,
        };
    }, [lang]);

    useEffect(() => {
        const dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        document.documentElement.dir = dir;
    }, [lang]);

    useEffect(() => {
        try {
            localStorage.setItem('lessonFormData', JSON.stringify(formData));
        } catch (error) {
            console.error("Failed to save form data to localStorage", error);
        }
    }, [formData]);

    const handleGeneratePlan = async () => {
        setAppState('loading');
        setLessonPlan(null);
        setErrorMessage(null);
        try {
            const plan = await generateLessonPlan(formData, lang);
            setLessonPlan(plan);
            setAppState('success');
        } catch (error) {
            console.error(error);
            setErrorMessage((error as Error).message);
            setAppState('error');
        }
    };

    const handleGeneratePresentation = async (): Promise<Presentation | null> => {
        if (!lessonPlan) return null;
        return await generatePresentation(lessonPlan, lang);
    };

    const handleGenerateStudentHandout = async (): Promise<StudentHandout | null> => {
        if (!lessonPlan) return null;
        return await generateStudentHandout(lessonPlan, lang);
    };

    const handleClearForm = () => {
        localStorage.removeItem('lessonFormData');
        setFormData(initialFormData);
        setLessonPlan(null);
        setAppState('idle');
    };

    return (
        <I18nContext.Provider value={i18nValue}>
            <div className={`min-h-screen bg-slate-50 font-sans text-slate-800 ${i18nValue.dir} antialiased flex flex-col`}>
                <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 border-b border-slate-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-cyan-700">{i18nValue.t('appTitle')}</h1>
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                            <span className="text-sm text-slate-600 hidden sm:block">{i18nValue.t('language')}:</span>
                            <LanguageSwitcher />
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-1">
                             <div className="sticky top-24">
                                <LessonForm 
                                    formData={formData}
                                    setFormData={setFormData}
                                    onSubmit={handleGeneratePlan}
                                    onClear={handleClearForm}
                                    appState={appState}
                                />
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                            <LessonDisplay
                                appState={appState}
                                errorMessage={errorMessage}
                                lessonPlan={lessonPlan}
                                onGeneratePresentation={handleGeneratePresentation}
                                onGenerateStudentHandout={handleGenerateStudentHandout}
                                onRetry={handleGeneratePlan}
                            />
                        </div>
                    </div>
                </main>
                
                <footer className="text-center py-6 text-sm text-slate-500">
                    <p>{i18nValue.t('developedBy')}</p>
                </footer>
            </div>
        </I18nContext.Provider>
    );
}

export default App;