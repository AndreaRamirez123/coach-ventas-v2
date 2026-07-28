
import React from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { UploadedFile, Theme } from '../types';
import { useLanguage } from '../context/LanguageContext';

// Ensure worker is set
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.5.136/build/pdf.worker.mjs';

interface FileUploadProps {
    onFileChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    customHandleUpload?: (files: UploadedFile[]) => void;
    files: UploadedFile[];
    theme: Theme;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const DocIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-cyan-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

export default function FileUpload({ onFileChange, customHandleUpload, files, theme }: FileUploadProps): React.ReactElement {
    const { t } = useLanguage();
    const hasFiles = files.length > 0;

    const processFile = async (file: File): Promise<UploadedFile> => {
        return new Promise((resolve, reject) => {
            if (file.type === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target?.result as ArrayBuffer;
                        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                        let fullText = '';
                        for (let i = 1; i <= pdf.numPages; i++) {
                            const page = await pdf.getPage(i);
                            const textContent = await page.getTextContent();
                            fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                        }
                        resolve({ name: file.name, content: fullText, type: 'pdf' });
                    } catch (err) {
                        reject(err);
                    }
                };
                reader.onerror = () => reject(new Error(`Error reading file ${file.name}`));
                reader.readAsArrayBuffer(file);
            } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const text = e.target?.result as string;
                    resolve({ name: file.name, content: text, type: 'text' });
                };
                reader.onerror = () => reject(new Error(`Error reading file ${file.name}`));
                reader.readAsText(file);
            }
        });
    };

    const handleInternalChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (onFileChange) {
            onFileChange(event);
            return;
        }

        const rawFiles = event.target.files;
        if (rawFiles && rawFiles.length > 0 && customHandleUpload) {
            const processedFiles: UploadedFile[] = [];
            for (let i = 0; i < rawFiles.length; i++) {
                try {
                    const fileData = await processFile(rawFiles[i]);
                    processedFiles.push(fileData);
                } catch (e) {
                    console.error("Error processing file", e);
                }
            }
            customHandleUpload(processedFiles);
            event.target.value = '';
        }
    };

    const containerClass = theme === 'dark' 
        ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-800' 
        : 'bg-gray-50 border-gray-300 hover:bg-gray-100';
    
    const fileItemClass = theme === 'dark'
        ? 'bg-gray-900/80 border-gray-700 text-gray-300'
        : 'bg-white border-gray-200 text-gray-700';

    return (
        <div className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-colors ${containerClass}`}>
            
            {hasFiles && (
                <div className="w-full space-y-2 mb-4">
                    {files.map((file, index) => (
                        <div key={index} className={`flex items-center px-3 py-2 rounded-lg text-xs border shadow-sm ${fileItemClass}`}>
                            <DocIcon />
                            <span className="truncate flex-grow">{file.name}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="text-center">
                {!hasFiles && (
                    <>
                        <p className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{t.uploadDocs}</p>
                        <p className={`text-xs mb-3 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>{t.uploadDesc}</p>
                    </>
                )}

                <label className={`cursor-pointer inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-full transition-all duration-200 active:scale-95 border ${theme === 'dark' ? 'text-white bg-gray-700 border-gray-600 hover:bg-gray-600' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'}`}>
                    <UploadIcon />
                    {hasFiles ? t.addAnother : t.selectFile}
                    <input 
                        type="file" 
                        className="sr-only" 
                        accept=".txt,.md,.pdf" 
                        multiple 
                        onChange={handleInternalChange} 
                    />
                </label>
            </div>
        </div>
    );
}
