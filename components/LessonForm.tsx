import React, { useState, useEffect } from 'react';
import { LessonFormData, AppState } from '../types';
import { useI18n } from '../hooks/useI18n';
import { Tooltip } from './Tooltip';
import { GenerateIcon } from './icons/GenerateIcon';
import { ClearIcon } from './icons/ClearIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface LessonFormProps {
    formData: LessonFormData;
    setFormData: React.Dispatch<React.SetStateAction<LessonFormData>>;
    onSubmit: () => void;
    onClear: () => void;
    appState: AppState;
}

export const LessonForm: React.FC<LessonFormProps> = ({ formData, setFormData, onSubmit, onClear, appState }) => {
    const { t } = useI18n();
    const isLoading = appState === 'loading';
    const [errors, setErrors] = useState<Partial<Record<keyof LessonFormData, string>>>({});

    const validateField = (name: keyof LessonFormData, value: any): string | null => {
        switch (name) {
            case 'subject':
            case 'gradeLevel':
            case 'lessonTitle':
                return value.trim() ? null : `${t(name)} is required.`;
            case 'duration':
                return value > 0 ? null : 'Duration must be a positive number.';
            default:
                return null;
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target as { name: keyof LessonFormData; value: any };
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error || undefined }));
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target as { name: keyof LessonFormData; value: any };
        setFormData(prev => ({ ...prev, [name]: name === 'duration' ? parseInt(value) || 0 : value }));
        // Clear error on change
        if (errors[name]) {
            setErrors(prev => ({...prev, [name]: undefined}));
        }
    };

    const isFormValid = () => {
        const newErrors: Partial<Record<keyof LessonFormData, string>> = {};
        (Object.keys(formData) as Array<keyof LessonFormData>).forEach(key => {
            const error = validateField(key, formData[key]);
            if (error) {
                newErrors[key] = error;
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isFormValid()) {
            onSubmit();
        }
    };

    const renderInput = (name: keyof LessonFormData, type: string, required: boolean) => (
        <div className="mb-4">
            <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">
                {t(name)} {required && <span className="text-red-500">*</span>}
            </label>
            <Tooltip text={t(`${name}_tooltip`)}>
                <input
                    type={type}
                    id={name}
                    name={name}
                    value={formData[name] || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required={required}
                    className={`mt-1 block w-full px-3 py-2 bg-white border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none sm:text-sm transition-colors ${errors[name] ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300 focus:ring-cyan-500 focus:border-cyan-500'}`}
                    disabled={isLoading}
                    aria-invalid={!!errors[name]}
                    aria-describedby={errors[name] ? `${name}-error` : undefined}
                />
            </Tooltip>
            {errors[name] && <p id={`${name}-error`} className="mt-1 text-xs text-red-600">{errors[name]}</p>}
        </div>
    );
    
    const canSubmit = formData.subject.trim() && formData.gradeLevel.trim() && formData.lessonTitle.trim() && formData.duration > 0 && !isLoading;

    return (
        <form onSubmit={handleSubmit} className="p-8 bg-white rounded-xl shadow-lg border border-slate-200">
            {renderInput('subject', 'text', true)}
            {renderInput('gradeLevel', 'text', true)}
            {renderInput('lessonTitle', 'text', true)}
            {renderInput('duration', 'number', true)}
            {renderInput('unit', 'text', false)}
            {renderInput('section', 'text', false)}
            {renderInput('teacherName', 'text', false)}
            {renderInput('institution', 'text', false)}
            {renderInput('schoolYear', 'text', false)}
            {renderInput('didacticSupport', 'text', false)}

            <div className="mb-4">
                <label htmlFor="methodology" className="block text-sm font-medium text-slate-700 mb-1">{t('methodology')}</label>
                <Tooltip text={t('methodology_tooltip')}>
                    <textarea
                        id="methodology"
                        name="methodology"
                        rows={3}
                        value={formData.methodology || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm transition-colors"
                        disabled={isLoading}
                    />
                </Tooltip>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <button type="submit" disabled={!canSubmit} className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105">
                    {isLoading ? <SpinnerIcon className="animate-spin -ms-1 me-3 h-5 w-5 text-white" /> : <GenerateIcon className="-ms-1 me-2 h-5 w-5" />}
                    {t('generatePlan')}
                </button>
                <button type="button" onClick={onClear} disabled={isLoading} className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-slate-300 text-sm font-medium rounded-lg shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:bg-slate-200 transition-colors">
                    <ClearIcon className="-ms-1 me-2 h-5 w-5" />
                    {t('clearFields')}
                </button>
            </div>
        </form>
    );
};