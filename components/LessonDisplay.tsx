import React, { useState, useRef, useEffect } from 'react';
import { LessonPlan, Presentation, StudentHandout, AppState } from '../types';
import { useI18n } from '../hooks/useI18n';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { PrintIcon } from './icons/PrintIcon';
import { CopyIcon } from './icons/CopyIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { Tooltip } from './Tooltip';
import { GenerateIcon } from './icons/GenerateIcon';

// Fix: Add declarations for global libraries to avoid TypeScript errors.
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}
declare var PptxGenJS: any;


interface LessonDisplayProps {
    appState: AppState;
    errorMessage: string | null;
    lessonPlan: LessonPlan | null;
    onGeneratePresentation: () => Promise<Presentation | null>;
    onGenerateStudentHandout: () => Promise<StudentHandout | null>;
}

type Tab = 'plan' | 'presentation' | 'handout';

const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const LessonDisplay: React.FC<LessonDisplayProps> = ({ appState, errorMessage, lessonPlan, onGeneratePresentation, onGenerateStudentHandout }) => {
    const { t, dir } = useI18n();
    const [activeTab, setActiveTab] = useState<Tab>('plan');
    const [viewMode, setViewMode] = useState<'standard' | 'table'>('standard');
    
    const [presentation, setPresentation] = useState<Presentation | null>(null);
    const [isPresentationLoading, setIsPresentationLoading] = useState(false);
    const [presentationError, setPresentationError] = useState<string | null>(null);
    const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(true);

    const [studentHandout, setStudentHandout] = useState<StudentHandout | null>(null);
    const [isHandoutLoading, setIsHandoutLoading] = useState(false);
    const [handoutError, setHandoutError] = useState<string | null>(null);

    const [copyStatus, setCopyStatus] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if(appState === 'success') {
            setActiveTab('plan');
            setPresentation(null);
            setStudentHandout(null);
            setPresentationError(null);
            setHandoutError(null);
        }
    }, [appState, lessonPlan]);

    const handleGeneratePresentation = async () => {
        setIsPresentationLoading(true);
        setPresentationError(null);
        setPresentation(null);
        try {
            const result = await onGeneratePresentation();
            if (result) {
                setPresentation(result);
            }
        } catch (error) {
            setPresentationError((error as Error).message || t('errorMessage'));
        } finally {
            setIsPresentationLoading(false);
        }
    };

    const handleGenerateHandout = async () => {
        setIsHandoutLoading(true);
        setHandoutError(null);
        setStudentHandout(null);
        try {
            const result = await onGenerateStudentHandout();
            if (result) {
                setStudentHandout(result);
            }
        } catch (error) {
            setHandoutError((error as Error).message || t('errorMessage'));
        } finally {
            setIsHandoutLoading(false);
        }
    };

    const handlePrint = () => {
        const printContent = contentRef.current;
        if (printContent) {
            const printWindow = window.open('', '', 'height=600,width=800');
            printWindow?.document.write('<html><head><title>Print</title>');
            printWindow?.document.write('<style>body{font-family:sans-serif;line-height:1.5;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ddd; padding:8px; text-align:left;} h1,h2,h3,h4{color:#0891b2;}</style>');
            printWindow?.document.write('</head><body>');
            printWindow?.document.write(printContent.innerHTML);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            printWindow?.focus();
            printWindow?.print();
        }
    };
    
    const handleCopy = () => {
        if (contentRef.current) {
            navigator.clipboard.writeText(contentRef.current.innerText).then(() => {
                setCopyStatus(true);
                setTimeout(() => setCopyStatus(false), 2000);
            });
        }
    };

    const handleDownloadPdf = () => {
        const { jsPDF } = window.jspdf;
        const content = contentRef.current;
        if(content){
             window.html2canvas(content, { scale: 2 }).then((canvas: any) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                const imgX = (pdfWidth - imgWidth * ratio) / 2;
                const imgY = 0;
                pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
                pdf.save('lesson-plan.pdf');
            });
        }
    };

    const handleDownloadTxt = () => {
        if (!presentation) return;
        let content = `${t('appTitle')}\n\n`;
        presentation.slides.forEach((slide, index) => {
            content += `--- ${t('slide')} ${index + 1}: ${slide.title} ---\n\n`;
            content += `- ${slide.content.join('\n- ')}\n\n`;
            if (includeSpeakerNotes) {
                content += `${t('speakerNotes')}:\n${slide.speakerNotes}\n\n`;
            }
        });
        downloadFile(content, 'presentation.txt', 'text/plain');
    };

    const handleDownloadPptx = () => {
        if (!presentation || typeof PptxGenJS === 'undefined') {
            console.error("Presentation data or PptxGenJS is not available.");
            return;
        }

        const pptx = new PptxGenJS();
        
        pptx.layout = 'LAYOUT_WIDE';
        // Fix: Correctly access teacherName and institution from the lessonInfo object within lessonPlan.
        pptx.author = lessonPlan?.lessonInfo.teacherName || 'AI Teacher';
        pptx.company = lessonPlan?.lessonInfo.institution || 'School';
        pptx.subject = lessonPlan?.lessonInfo.subject || 'Lesson';
        pptx.title = lessonPlan?.lessonInfo.lessonTitle || 'Presentation';

        presentation.slides.forEach(slideData => {
            const slide = pptx.addSlide();
            
            slide.addText(slideData.title, {
                x: 0.5, y: 0.25, w: '90%', h: 1,
                fontSize: 32, bold: true, color: '005f73',
                align: dir === 'rtl' ? 'right' : 'left',
            });

            slide.addText(slideData.content.join('\n'), {
                x: 0.5, y: 1.5, w: '90%', h: 3.8,
                fontSize: 18, bullet: { type: 'number' }, color: '333333',
                align: dir === 'rtl' ? 'right' : 'left',
            });
            
            if (includeSpeakerNotes) {
                slide.addNotes(slideData.speakerNotes);
            }
        });

        pptx.writeFile({ fileName: `${lessonPlan?.lessonInfo.lessonTitle || 'presentation'}.pptx` });
    };


    const handleDownloadDoc = () => {
        if (!studentHandout) return;
        const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Student Handout</title></head><body dir="${dir}">`;
        const footer = '</body></html>';
        const content = header + studentHandout.htmlContent + footer;
        downloadFile(content, 'student-handout.doc', 'application/msword');
    };

    const renderInitial = () => (
        <div className="text-center p-10 flex flex-col items-center justify-center h-full">
            <div className="p-6 bg-cyan-100 rounded-full mb-6">
                 <GenerateIcon className="h-12 w-12 text-cyan-700" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{t('welcomeTitle')}</h2>
            <p className="mt-4 text-slate-600 max-w-md mx-auto">{t('welcomeMessage')}</p>
        </div>
    );

    const renderLoading = () => (
        <div className="flex flex-col items-center justify-center p-10 h-full">
            <SpinnerIcon className="h-12 w-12 text-cyan-600 animate-spin" />
            <p className="mt-6 text-slate-600 text-lg font-medium">{t('loadingMessage')}</p>
        </div>
    );

    const renderError = () => (
        <div className="text-center p-10 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-xl font-bold text-red-700">{t('errorMessage')}</h2>
            <p className="mt-2 text-red-600">{errorMessage}</p>
        </div>
    );
    
    const renderSuccess = () => (
        <>
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-4 rtl:space-x-reverse" aria-label="Tabs">
                    {(['plan', 'presentation', 'handout'] as Tab[]).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`${activeTab === tab ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}>
                            {t(tab === 'plan' ? 'lessonPlanTab' : tab === 'presentation' ? 'presentationTab' : 'studentHandoutTab')}
                        </button>
                    ))}
                </nav>
            </div>
            <div className="pt-8">
                {activeTab === 'plan' && renderLessonPlan()}
                {activeTab === 'presentation' && renderPresentation()}
                {activeTab === 'handout' && renderStudentHandout()}
            </div>
        </>
    );
    
    const renderLessonPlan = () => (
        <div>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                    <button onClick={() => setViewMode('standard')} className={`px-4 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'standard' ? 'bg-white shadow text-cyan-700' : 'text-slate-600 hover:bg-slate-200'}`}>{t('standardView')}</button>
                    <button onClick={() => setViewMode('table')} className={`px-4 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow text-cyan-700' : 'text-slate-600 hover:bg-slate-200'}`}>{t('tableView')}</button>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Tooltip text={t('print_tooltip')}><button onClick={handlePrint} className="p-2 text-slate-500 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors"><PrintIcon className="h-5 w-5"/></button></Tooltip>
                    <Tooltip text={copyStatus ? t('copied_message') : t('copy_tooltip')}><button onClick={handleCopy} className="p-2 text-slate-500 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors"><CopyIcon className="h-5 w-5"/></button></Tooltip>
                    <Tooltip text={t('downloadPdf_tooltip')}><button onClick={handleDownloadPdf} className="p-2 text-slate-500 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors"><DownloadIcon className="h-5 w-5"/></button></Tooltip>
                </div>
            </div>
            
            <div ref={contentRef} className="prose max-w-none text-slate-700">
                <div className={`p-6 bg-cyan-50 border-${dir === 'rtl' ? 'r' : 'l'}-4 border-cyan-500 mb-8 rounded-r-lg`}>
                     <h1 className="text-3xl font-bold text-cyan-900 !mt-0">{lessonPlan?.lessonInfo.lessonTitle}</h1>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-sm mt-4 not-prose">
                        <span className="flex flex-col"><strong>{t('subject')}:</strong> <span className="text-slate-600">{lessonPlan?.lessonInfo.subject}</span></span>
                        <span className="flex flex-col"><strong>{t('gradeLevel')}:</strong> <span className="text-slate-600">{lessonPlan?.lessonInfo.gradeLevel}</span></span>
                        <span className="flex flex-col"><strong>{t('duration')}:</strong> <span className="text-slate-600">{lessonPlan?.lessonInfo.duration} {t('duration').split(' ')[1]}</span></span>
                     </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">
                        <h4 className="font-bold text-cyan-800 !mt-0">{t('objectives')}</h4>
                        <ul className="!ps-5 !mt-2 space-y-1">{(lessonPlan?.objectives || []).map((o, i) => <li key={i}>{o}</li>)}</ul>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">
                        <h4 className="font-bold text-cyan-800 !mt-0">{t('prerequisites')}</h4>
                        <ul className="!ps-5 !mt-2 space-y-1">{(lessonPlan?.prerequisites || []).map((p, i) => <li key={i}>{p}</li>)}</ul>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">
                        <h4 className="font-bold text-cyan-800 !mt-0">{t('materials')}</h4>
                        <ul className="!ps-5 !mt-2 space-y-1">{(lessonPlan?.materials || []).map((m, i) => <li key={i}>{m}</li>)}</ul>
                    </div>
                </div>

                <h3 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-2 mb-6">{t('lessonStages')}</h3>

                {viewMode === 'standard' ? (
                    <div className="space-y-6">
                    {(lessonPlan?.stages || []).map((stage, i) => (
                        <div key={i} className="p-6 border border-slate-200 rounded-xl shadow-sm bg-white">
                            <h4 className="font-bold text-lg text-cyan-800 !mt-0">{stage.title} <span className="text-sm font-medium text-slate-500">({stage.duration} min)</span></h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
                                <div><h5 className="font-semibold !mb-2">{t('teacherActions')}</h5><ul className="!ps-5 text-sm space-y-1 !mt-0">{(stage.teacherActions || []).map((a, j) => <li key={j}>{a}</li>)}</ul></div>
                                <div><h5 className="font-semibold !mb-2">{t('studentActions')}</h5><ul className="!ps-5 text-sm space-y-1 !mt-0">{(stage.studentActions || []).map((a, j) => <li key={j}>{a}</li>)}</ul></div>
                            </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                        <table className="min-w-full bg-white">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('stage')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('teacherActions')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('studentActions')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t('duration')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                            {(lessonPlan?.stages || []).map((stage, i) => (
                                <tr key={i} className="even:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">{stage.title}</td>
                                    <td className="px-6 py-4"><ul className="!ps-5 !my-0 space-y-1">{(stage.teacherActions || []).map((a, j) => <li key={j}>{a}</li>)}</ul></td>
                                    <td className="px-6 py-4"><ul className="!ps-5 !my-0 space-y-1">{(stage.studentActions || []).map((a, j) => <li key={j}>{a}</li>)}</ul></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{stage.duration} min</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
    
    const renderPresentation = () => {
        if (isPresentationLoading) {
            return <div className="flex items-center justify-center p-10"><SpinnerIcon className="h-8 w-8 text-cyan-600 animate-spin" /><span className="ms-3 text-slate-600">{t('generatingPresentation')}</span></div>;
        }
        if (presentationError) {
            return (
                <div className="text-center p-10 bg-red-50 border border-red-200 rounded-lg">
                    <h2 className="text-xl font-bold text-red-700">{t('errorMessage')}</h2>
                    <p className="mt-2 text-red-600">{presentationError}</p>
                    <button onClick={handleGeneratePresentation} className="mt-4 px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">{t('retry')}</button>
                </div>
            );
        }
        if (!presentation) {
            return (
                <div className="text-center p-10">
                    <p className="mb-4 text-slate-600">{t('presentation_prompt')}</p>
                    <button onClick={handleGeneratePresentation} className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">{t('generatePresentation')}</button>
                </div>
            );
        }
        return (
            <div>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="include-notes"
                            checked={includeSpeakerNotes}
                            onChange={(e) => setIncludeSpeakerNotes(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <label htmlFor="include-notes" className="ms-2 block text-sm font-medium text-slate-700">
                            {t('includeSpeakerNotes')}
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleDownloadTxt} className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
                            <DownloadIcon className="w-4 h-4 me-2" /> {t('downloadAsTxt')}
                        </button>
                        <button onClick={handleDownloadPptx} className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
                            <DownloadIcon className="w-4 h-4 me-2" /> {t('downloadAsPptx')}
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {presentation.slides.map((slide, i) => (
                        <div key={i} className="border border-slate-200 rounded-xl shadow-md overflow-hidden bg-white">
                            <div className="bg-slate-50 p-4 border-b border-slate-200">
                               <h4 className="font-bold text-slate-800 text-lg">{t('slide')} {i+1}: {slide.title}</h4>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <ul className="list-disc ps-5 space-y-2 text-slate-700">
                                        {slide.content.map((point, j) => <li key={j}>{point}</li>)}
                                    </ul>
                                </div>
                                <div className="bg-amber-50 p-4 rounded-lg text-sm border border-amber-200">
                                    <p className="font-semibold text-amber-900">{t('speakerNotes')}</p>
                                    <p className="mt-2 text-amber-800">{slide.speakerNotes}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderStudentHandout = () => {
        if (isHandoutLoading) {
            return <div className="flex items-center justify-center p-10"><SpinnerIcon className="h-8 w-8 text-cyan-600 animate-spin" /><span className="ms-3 text-slate-600">{t('generatingHandout')}</span></div>;
        }
        if (handoutError) {
             return (
                <div className="text-center p-10 bg-red-50 border border-red-200 rounded-lg">
                    <h2 className="text-xl font-bold text-red-700">{t('errorMessage')}</h2>
                    <p className="mt-2 text-red-600">{handoutError}</p>
                    <button onClick={handleGenerateHandout} className="mt-4 px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">{t('retry')}</button>
                </div>
            );
        }
        if (!studentHandout) {
            return (
                <div className="text-center p-10">
                    <p className="mb-4 text-slate-600">{t('handout_prompt')}</p>
                    <button onClick={handleGenerateHandout} className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors">{t('generateHandout')}</button>
                </div>
            );
        }
        return (
            <div>
                <div className="flex justify-end mb-4">
                    <Tooltip text={t('downloadDoc_tooltip')}>
                        <button onClick={handleDownloadDoc} className="p-2 text-slate-500 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors"><DownloadIcon className="h-5 w-5"/></button>
                    </Tooltip>
                </div>
                <div className="prose max-w-none p-8 border border-slate-200 rounded-xl bg-white" dangerouslySetInnerHTML={{ __html: studentHandout.htmlContent }} />
            </div>
        );
    };

    return (
        <div className="p-8 bg-white rounded-xl shadow-lg border border-slate-200 min-h-[80vh]">
            {appState === 'idle' && renderInitial()}
            {appState === 'loading' && renderLoading()}
            {appState === 'error' && renderError()}
            {appState === 'success' && lessonPlan && renderSuccess()}
        </div>
    );
};