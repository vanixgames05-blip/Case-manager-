
import React, { useState, useRef, useEffect } from 'react';
import { generateDraft, reviewDocumentStream, DocumentAnalysis, getSeniorCounselChatAdviceStream } from '../services/geminiService';
import { DocumentTextIcon, DownloadIcon, SparklesIcon, UploadIcon, DocumentSearchIcon, BrainIcon, PaperAirplaneIcon, UserIcon } from './icons';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import saveAs from 'file-saver';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs';
import Tesseract from 'tesseract.js';
import { Content } from '@google/genai';


// Configure the worker for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://aistudiocdn.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type Mode = 'create' | 'review' | 'strategy';

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

const templates = {
    civilApp: `IN THE COURT OF ____________\n\nCivil Suit No. _____ / ______\nTitle: _______________________\n\nAPPLICATION UNDER SECTION ______ CPC\n\nRespectfully Sheweth:\n\n1. That the facts of the case are ...\n2. That ...\n3. That ...\n\nPRAYER\nIn view of the above, it is most respectfully prayed that:\na) ...\nb) Any other equitable relief deemed fit.\n\nFiled by:\nAdvocate High Court`,
    criminalApp: `IN THE COURT OF _________\n\nFIR No. _____\nU/S: ________\nP.S: ________\n\nAPPLICATION UNDER SECTION ______ Cr.P.C\n\nIt is submitted as under:\n\n1. That the applicant is innocent and has been falsely implicated...\n2. That ...\n3. That ...\n\nPRAYER\nIt is humbly prayed that this Hon’ble Court may kindly:\na) ...\nb) Grant any other relief deemed appropriate.\n\nFiled by:\nAdvocate`,
    writtenStatement: `IN THE COURT OF _______________\n\nSuit No: ________\n\nWRITTEN STATEMENT\n\nOn behalf of Defendant\n\nPreliminary Objections:\na) That the suit is not maintainable in its present form.\nb) That the suit is barred by law.\n\nPara-wise reply:\nPara-1: That the contents of para 1 are denied...\nPara-2: That the contents of para 2 are admitted to the extent of...\n\nPrayer:\nIt is therefore prayed that the suit of the plaintiff may kindly be dismissed with costs.\n\nFiled by:\nAdvocate`,
};

const DraftingTool: React.FC = () => {
  const [mode, setMode] = useState<Mode>('create');
  // Create Mode State
  const [request, setRequest] = useState('');
  const [draft, setDraft] = useState('');
  
  // Review Mode State
  const [uploadedText, setUploadedText] = useState('');
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Strategy Mode State (Chat)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);


  // Common State
  const [isLoading, setIsLoading] = useState(false);
  const [rawStreamedText, setRawStreamedText] = useState('');
  
  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, rawStreamedText]);


  const handleGenerate = async () => {
    if (!request.trim()) return;
    setIsLoading(true);
    setDraft('');
    const result = await generateDraft(request);
    setDraft(result);
    setIsLoading(false);
  };
  
  const handleReview = async () => {
    if (!uploadedText.trim()) return;
    setIsLoading(true);
    setAnalysis(null);
    setRawStreamedText('');
    
    let fullResponse = '';
    try {
        const stream = reviewDocumentStream(uploadedText);
        for await (const chunk of stream) {
            fullResponse += chunk;
            setRawStreamedText(fullResponse);
        }
        
        const jsonStartIndex = fullResponse.indexOf('{');
        const jsonEndIndex = fullResponse.lastIndexOf('}');

        if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex < jsonStartIndex) {
            throw new Error("Valid JSON object not found in the AI response.");
        }

        const jsonString = fullResponse.substring(jsonStartIndex, jsonEndIndex + 1);
        const finalAnalysis = JSON.parse(jsonString);

        if (finalAnalysis.error) {
            setAnalysis({ error: finalAnalysis.error } as DocumentAnalysis);
        } else {
            setAnalysis(finalAnalysis);
        }

    } catch (e) {
        console.error("Failed to parse AI response:", e);
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        setAnalysis({ error: `Failed to process the AI's response. Reason: ${errorMessage}` } as DocumentAnalysis);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userMessage.trim() || isLoading) return;

    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    const updatedChatHistory = [...chatHistory, newUserMessage];
    
    setChatHistory(updatedChatHistory);
    setUserMessage('');
    setIsLoading(true);
    setRawStreamedText('');
    
    const geminiHistory: Content[] = updatedChatHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));

    let fullResponse = '';
    try {
        const stream = getSeniorCounselChatAdviceStream(geminiHistory);
        for await (const chunk of stream) {
            fullResponse += chunk;
            setRawStreamedText(fullResponse);
        }
        
        setChatHistory(prev => [...prev, { role: 'model', content: fullResponse }]);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        setChatHistory(prev => [...prev, { role: 'model', content: `Error: ${errorMessage}` }]);
    } finally {
        setIsLoading(false);
        setRawStreamedText('');
    }
  };


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setProcessingMessage('Starting file processing...');
    setUploadedFileName(file.name);
    setUploadedText('');
    setAnalysis(null);

    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    try {
        if (fileType.startsWith('image/')) {
            setProcessingMessage('Image detected. Preparing OCR engine...');
            const worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setProcessingMessage(`Scanning document... Progress: ${Math.round(m.progress * 100)}%`);
                    } else if (m.status === 'loading language traineddata' || m.status === 'initializing api') {
                        setProcessingMessage(`Initializing AI Model (${m.status})...`);
                    } else {
                        setProcessingMessage(`Processing... (${m.status})`);
                    }
                },
            });
            const { data: { text } } = await worker.recognize(file);
            setUploadedText(text);
            await worker.terminate();
        } else if (fileName.endsWith('.pdf')) {
            setProcessingMessage('Processing PDF file...');
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            let textContent = '';

            setProcessingMessage('Extracting text layers from PDF...');
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const text = await page.getTextContent();
                textContent += text.items.map((item: any) => 'str' in item ? item.str : '').join(' ') + '\n';
            }

            if (textContent.trim().length < 150 * pdf.numPages) {
                setProcessingMessage('Scanned PDF detected. Preparing OCR engine...');
                textContent = '';
                const worker = await Tesseract.createWorker('eng', 1, {
                     logger: m => {
                        if (m.status === 'recognizing text') {
                            setProcessingMessage(`Scanning page ${m.userJobId}... Progress: ${Math.round(m.progress * 100)}%`);
                        } else if (m.status === 'loading language traineddata' || m.status === 'initializing api') {
                           setProcessingMessage(`Initializing AI Model (${m.status})...`);
                        } else {
                            setProcessingMessage(`Processing... (${m.status})`);
                        }
                    },
                });

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (context) {
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        const renderContext = { canvasContext: context, viewport: viewport };
                        await page.render(renderContext).promise;
                        // FIX: The `userJobId` property is not in the Tesseract.js type definition for `RecognizeOptions`.
                        // Casting to `any` to bypass the type check, as the logger functionality depends on it.
                        const { data: { text } } = await worker.recognize(canvas, {userJobId: `${i}`} as any);
                        textContent += text + '\n';
                    }
                }
                await worker.terminate();
            }
            setUploadedText(textContent);
        } else if (fileName.endsWith('.docx')) {
            setProcessingMessage('Processing DOCX file...');
            const arrayBuffer = await file.arrayBuffer();
            const { value } = await mammoth.extractRawText({ arrayBuffer });
            setUploadedText(value);
        } else if (fileName.endsWith('.txt')) {
             setProcessingMessage('Reading text file...');
             const text = await file.text();
             setUploadedText(text);
        } else {
            throw new Error(`Unsupported file type: ${file.name}`);
        }
        setProcessingMessage('File processed successfully!');
    } catch (error) {
        console.error('File processing error:', error);
        setProcessingMessage(`Error: ${error instanceof Error ? error.message : 'An unknown error occurred'}`);
    } finally {
        setIsProcessingFile(false);
        // Reset file input to allow uploading the same file again
        if (event.target) {
            event.target.value = '';
        }
    }
  };

  const downloadDraft = (content: string, fileName: string) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: content.split('\n').map(p => new Paragraph({
          children: [new TextRun(p)],
        })),
      }],
    });
    Packer.toBlob(doc).then(blob => {
      saveAs(blob, fileName);
    });
  };

  const ModeButton: React.FC<{ current: Mode; target: Mode; icon: React.ReactNode; label: string }> = ({ current, target, icon, label }) => (
    <button
      onClick={() => setMode(target)}
      className={`flex-1 flex items-center justify-center p-3 text-sm font-semibold rounded-t-lg transition-colors duration-200 border-b-4 ${current === target ? 'text-primary border-primary bg-secondary' : 'text-gray-500 border-transparent hover:bg-gray-100'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const AnalysisCard: React.FC<{ title: string; content: string }> = ({ title, content }) => (
    <div className="mb-4">
        <h4 className="font-bold text-primary border-b border-secondary pb-1 mb-2">{title}</h4>
        <p className="whitespace-pre-wrap">{content.replace(/\\n/g, '\n')}</p>
    </div>
  );

  return (
    <div className="bg-surface rounded-lg shadow-md flex flex-col h-[calc(100vh-170px)]">
      <div className="flex border-b border-gray-200 shrink-0">
        <ModeButton current={mode} target="create" icon={<DocumentTextIcon className="w-5 h-5 mr-2" />} label="Create Draft" />
        <ModeButton current={mode} target="review" icon={<DocumentSearchIcon className="w-5 h-5 mr-2" />} label="AI Document Review" />
        <ModeButton current={mode} target="strategy" icon={<BrainIcon className="w-5 h-5 mr-2" />} label="Senior Counsel" />
      </div>

      {mode === 'create' && (
        <div className="p-4 overflow-y-auto space-y-4">
            <h3 className="text-lg font-bold text-primary">Templates</h3>
            <div className="flex flex-wrap gap-2">
                {Object.entries(templates).map(([key, value]) => (
                    <button key={key} onClick={() => setRequest(value)} className="text-xs bg-secondary text-primary font-semibold px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                    </button>
                ))}
            </div>
            <div>
                <label htmlFor="draft-request" className="block text-sm font-medium text-textSecondary mb-1">Enter your drafting request or paste a template</label>
                <textarea
                id="draft-request"
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                rows={5}
                className="w-full p-2 bg-white text-textPrimary border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                placeholder="e.g., 'Draft a bail application for a client accused under section 324 PPC...'"
                />
            </div>
            <button
                onClick={handleGenerate}
                disabled={isLoading || !request.trim()}
                className="w-full flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md hover:bg-indigo-900 disabled:opacity-50"
            >
                <SparklesIcon className="w-5 h-5 mr-2"/>
                {isLoading ? 'Generating...' : 'Generate AI Draft'}
            </button>
            {draft && (
                <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                <h3 className="text-lg font-bold text-primary mb-2">Generated Draft</h3>
                <textarea
                    readOnly
                    value={draft}
                    rows={15}
                    className="w-full p-2 bg-white border border-gray-300 rounded-md font-mono text-sm"
                />
                <button onClick={() => downloadDraft(draft, 'Generated-Draft.docx')} className="mt-2 flex items-center justify-center px-4 py-2 bg-secondary text-primary font-semibold rounded-md hover:bg-primary hover:text-white">
                    <DownloadIcon className="w-5 h-5 mr-2"/>
                    Download as .docx
                </button>
                </div>
            )}
        </div>
      )}

      {mode === 'review' && (
         <div className="p-4 overflow-y-auto space-y-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.docx,.txt,image/*" className="hidden"/>
            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-primary hover:text-primary transition-colors">
                <UploadIcon className="w-6 h-6 mr-2"/>
                <span>{uploadedFileName ? `Selected: ${uploadedFileName}` : 'Upload Document for Review (.pdf, .docx, .txt, image)'}</span>
            </button>
            {(isProcessingFile || processingMessage) && (
                <div className={`p-2 rounded-md text-sm ${isProcessingFile ? 'bg-yellow-100 text-yellow-800 animate-pulse' : 'bg-green-100 text-green-800'}`}>
                    {processingMessage}
                </div>
            )}
            {uploadedText && (
                <textarea
                    readOnly
                    value={uploadedText}
                    rows={8}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md font-mono text-xs"
                    placeholder="Extracted text from your document will appear here."
                />
            )}
            <button onClick={handleReview} disabled={isLoading || !uploadedText.trim()} className="w-full flex items-center justify-center px-4 py-2 bg-primary text-white rounded-md hover:bg-indigo-900 disabled:opacity-50">
                <SparklesIcon className="w-5 h-5 mr-2"/>
                {isLoading ? 'Analyzing...' : 'Start AI Review'}
            </button>
            {isLoading && rawStreamedText && (
                 <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                    <h3 className="text-lg font-bold text-primary mb-2 animate-pulse">AI is analyzing...</h3>
                    <div className="prose prose-sm max-w-none text-textPrimary">
                        <pre className="whitespace-pre-wrap bg-white p-2 rounded-md">{rawStreamedText}</pre>
                    </div>
                 </div>
            )}
            {!isLoading && analysis && (
                <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50">
                     <h3 className="text-lg font-bold text-primary mb-2">AI Analysis Complete</h3>
                     {analysis.error ? (
                         <p className="text-red-600 bg-red-100 p-3 rounded-md">{analysis.error}</p>
                     ) : (
                        <div className="prose prose-sm max-w-none text-textPrimary">
                            <AnalysisCard title="Summary of Issues" content={analysis.summaryOfIssues} />
                            <AnalysisCard title="Missing Legal Elements" content={analysis.missingLegalElements} />
                            <AnalysisCard title="Procedural Defects" content={analysis.proceduralDefects} />
                            <AnalysisCard title="Suggested Improvements" content={analysis.suggestedImprovements} />
                            <AnalysisCard title="Questions for Clarification" content={analysis.questionsForClarification} />
                            
                            <h4 className="font-bold text-primary border-b border-secondary pb-1 mb-2">Revised Full Draft</h4>
                            <textarea readOnly value={analysis.revisedFullDraft} rows={15} className="w-full p-2 bg-white border border-gray-300 rounded-md font-mono text-sm"/>
                            <button onClick={() => downloadDraft(analysis.revisedFullDraft, 'Revised-Draft.docx')} className="mt-2 flex items-center justify-center px-4 py-2 bg-secondary text-primary font-semibold rounded-md hover:bg-primary hover:text-white">
                                <DownloadIcon className="w-5 h-5 mr-2"/>
                                Download Revised Draft
                            </button>
                        </div>
                     )}
                </div>
            )}
        </div>
      )}

      {mode === 'strategy' && (
         <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto p-4 space-y-6" ref={chatContainerRef}>
                {chatHistory.length === 0 && !isLoading && (
                    <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full">
                        <BrainIcon className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold">Consult the Senior Counsel</h3>
                        <p className="max-w-md">Describe your legal problem, case facts, or strategic dilemma. Mr. Mirza is here to provide mentorship and guide you.</p>
                    </div>
                )}
                {chatHistory.map((message, index) => (
                    <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                        {message.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <BrainIcon className="w-5 h-5 text-primary" />
                        </div>
                        )}
                        <div className={`p-3 rounded-lg max-w-md ${message.role === 'user' ? 'bg-secondary text-primary' : 'bg-gray-200 text-textPrimary'}`}>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                            <UserIcon className="w-5 h-5 text-gray-700" />
                        </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <BrainIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="p-3 rounded-lg max-w-md bg-gray-200 text-textPrimary">
                            {rawStreamedText ? (
                                <p className="whitespace-pre-wrap">{rawStreamedText}</p>
                            ) : (
                                <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75"></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <div className="p-2 border-t border-gray-200 shrink-0 bg-white">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <textarea
                        value={userMessage}
                        onChange={(e) => setUserMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Ask your legal question..."
                        rows={1}
                        className="w-full p-2 bg-white text-textPrimary border border-gray-300 rounded-lg focus:ring-primary focus:border-primary resize-none"
                    />
                    <button type="submit" disabled={isLoading || !userMessage.trim()} className="p-2 text-white bg-primary rounded-full disabled:opacity-50 transition-colors">
                        <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
         </div>
      )}

    </div>
  );
};

export default DraftingTool;