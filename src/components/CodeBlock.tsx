import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Copy, Play, Code, Edit2, RotateCcw, Maximize2, Minimize2, Terminal, Eye, Layout, Loader2 } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
  onOpenCanvas?: (code: string, lang: string) => void;
}

type Tab = 'code' | 'preview' | 'console';

declare global {
  interface Window {
    loadPyodide: any;
    pyodideInstance: any;
  }
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, value, onOpenCanvas }) => {
  const [code, setCode] = useState(value);
  const [activeTab, setActiveTab] = useState<Tab>('code');
  const [logs, setLogs] = useState<Array<{ type: 'log' | 'error' | 'warn', content: string }>>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [runTrigger, setRunTrigger] = useState(0); 
  const [isRunning, setIsRunning] = useState(false);
  const blockId = useRef(Math.random().toString(36).substr(2, 9));

  const lang = language.toLowerCase();
  const isWeb = ['html', 'xml', 'svg'].includes(lang);
  const isJS = ['javascript', 'js', 'jsx', 'ts', 'typescript', 'react'].includes(lang);
  const isPython = ['python', 'py'].includes(lang);
  const isExecutable = isWeb || isJS || isPython;

  useEffect(() => {
    if (value && value !== code && !value.includes(code)) {
        if(value.length > code.length) setCode(value);
    }
  }, [value]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRun = async () => {
    setLogs([]); 
    setActiveTab(isWeb ? 'preview' : 'console');
    if (isPython) {
        await runPython();
    } else {
        setRunTrigger(prev => prev + 1);
    }
  };

  const runPython = async () => {
    setIsRunning(true);
    try {
        if (!window.loadPyodide) {
            setLogs([{ type: 'error', content: 'Pyodide not loaded. Please refresh.' }]);
            setIsRunning(false);
            return;
        }
        if (!window.pyodideInstance) {
            setLogs([{ type: 'log', content: 'Initializing Python Engine...' }]);
            window.pyodideInstance = await window.loadPyodide();
            await window.pyodideInstance.loadPackage("micropip");
        }
        const pyodide = window.pyodideInstance;
        pyodide.setStdout({
            batched: (msg: string) => { setLogs(prev => [...prev, { type: 'log', content: msg }]); }
        });
        await pyodide.runPythonAsync(code);
    } catch (err: any) {
        setLogs(prev => [...prev, { type: 'error', content: err.message }]);
    } finally {
        setIsRunning(false);
    }
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.source === `iframe-${blockId.current}`) {
        setLogs(prev => [...prev, { type: event.data.type, content: event.data.message }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getLangColor = () => {
    switch (lang) {
      case 'js': case 'javascript': return 'text-yellow-400';
      case 'ts': case 'typescript': return 'text-blue-400';
      case 'html': return 'text-orange-400';
      case 'python': case 'py': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  const PreviewRunner = useCallback(() => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    useEffect(() => {
      if (!iframeRef.current || isPython) return;
      const doc = iframeRef.current.contentDocument;
      if (!doc) return;
      const consoleScript = `
        <script>
          (function() {
            const send = (type, args) => {
              const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
              window.parent.postMessage({ source: 'iframe-${blockId.current}', type, message }, '*');
            };
            const originalLog = console.log;
            console.log = (...args) => { send('log', args); originalLog(...args); };
            window.onerror = (msg) => { send('error', [msg]); };
          })();
        </script>
      `;
      let content = '';
      if (isWeb) {
        content = `${consoleScript}<script src="https://cdn.tailwindcss.com"></script>${code}`;
      } else if (isJS) {
        content = `<!DOCTYPE html><html><head>${consoleScript}</head><body><script>try { ${code} } catch (e) { console.error(e.message); }</script></body></html>`;
      }
      doc.open(); doc.write(content); doc.close();
    }, [runTrigger]); 
    return <iframe ref={iframeRef} className="w-full h-full bg-white" title={`runner-${blockId.current}`} sandbox="allow-scripts allow-modals allow-forms allow-same-origin" />;
  }, [code, runTrigger, isWeb, isJS, isPython]);

  return (
    <div className={`my-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0d1117] shadow-2xl flex flex-col transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-[60] h-[90vh]' : 'min-h-[300px]'}`}>
      <div className="flex flex-wrap items-center justify-between px-4 py-2 bg-[#161b22] border-b border-slate-800 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-slate-800/50">
            <Code size={14} className={getLangColor()} />
            <span className="text-xs font-bold text-slate-300 uppercase">{language}</span>
          </div>
          <div className="flex bg-slate-900/50 rounded-lg p-0.5 border border-slate-800">
             <button onClick={() => setActiveTab('code')} className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${activeTab === 'code' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Edit2 size={12} /> Code</button>
             {isExecutable && (
               <>
                 {isWeb && <button onClick={() => setActiveTab('preview')} className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${activeTab === 'preview' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Eye size={12} /> Preview</button>}
                 <button onClick={() => setActiveTab('console')} className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${activeTab === 'console' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Terminal size={12} /> Console</button>
               </>
             )}
          </div>
        </div>
        <div className="flex items-center gap-2">
           {isExecutable && onOpenCanvas && !isPython && (
               <button onClick={() => onOpenCanvas(code, isWeb ? 'html' : 'js')} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95"><Layout size={12} fill="currentColor" /> Canvas</button>
           )}
           {isExecutable && (
             <button onClick={handleRun} disabled={isRunning} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${isRunning ? 'bg-slate-700 text-slate-400 cursor-wait' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />} {isRunning ? 'Running...' : 'Run'}
             </button>
           )}
           <div className="w-px h-4 bg-slate-700 mx-1"></div>
           <button onClick={handleCopy} className="p-1.5 text-slate-400 hover:text-white transition-colors">{isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}</button>
           <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-slate-400 hover:text-white transition-colors hidden md:block">{isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}</button>
        </div>
      </div>
      <div className="flex-1 relative min-h-[250px] bg-[#0d1117]">
        <div className={`absolute inset-0 ${activeTab === 'code' ? 'z-10 visible' : 'z-0 invisible'}`}>
           <textarea value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-full p-4 bg-[#0d1117] text-slate-300 font-mono text-sm leading-relaxed resize-none outline-none border-none" spellCheck={false} />
        </div>
        {isWeb && <div className={`absolute inset-0 bg-white ${activeTab === 'preview' ? 'z-10 visible' : 'z-0 invisible'}`}><PreviewRunner /></div>}
        {isExecutable && (
            <div className={`absolute inset-0 bg-[#0f1117] flex flex-col ${activeTab === 'console' ? 'z-10 visible' : 'z-0 invisible'}`}>
               {!isWeb && !isPython && <div className="hidden"><PreviewRunner /></div>}
               <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-[#161b22]">
                  <span className="text-xs font-mono text-slate-500">Output Terminal</span>
                  <button onClick={() => setLogs([])} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1"><RotateCcw size={10} /> Clear</button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2">
                  {logs.length === 0 ? <div className="text-slate-600 italic opacity-50">No output. Press 'Run' to execute.</div> : logs.map((log, idx) => (
                      <div key={idx} className={`flex gap-2 border-b border-slate-800/50 pb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'warn' ? 'text-yellow-400' : 'text-slate-300'}`}>
                          <span className="opacity-50 select-none">{idx + 1}</span><span className="break-all whitespace-pre-wrap">{log.content}</span>
                      </div>
                  ))}
               </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CodeBlock;
