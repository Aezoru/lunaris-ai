import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink, Globe } from 'lucide-react';
import CodeBlock from './CodeBlock';
import { GroundingMetadata } from '../types';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  groundingMetadata?: GroundingMetadata;
  isRTL?: boolean;
  onOpenCanvas?: (code: string, lang: string) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className, groundingMetadata, isRTL, onOpenCanvas }) => {
  return (
    <div className="flex flex-col gap-2">
        <div className={`markdown-body ${className || ''} text-[15px] md:text-base leading-relaxed break-words`}>
        <ReactMarkdown
            components={{
            code({ node, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                <CodeBlock 
                    language={match[1]} 
                    value={String(children).replace(/\n$/, '')} 
                    onOpenCanvas={onOpenCanvas}
                />
                ) : (
                <code className={className} {...props}>{children}</code>
                );
            }
            }}
        >
            {content}
        </ReactMarkdown>
        </div>

        {groundingMetadata && groundingMetadata.groundingChunks && groundingMetadata.groundingChunks.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Globe size={14} />
                    <span>{isRTL ? 'المصادر' : 'Sources'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {groundingMetadata.groundingChunks.map((chunk, idx) => {
                        if (!chunk.web?.uri) return null;
                        return (
                            <a 
                                key={idx}
                                href={chunk.web.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-xs text-slate-700 dark:text-slate-300 group max-w-full"
                            >
                                <span className="truncate max-w-[150px] md:max-w-[200px]">{chunk.web.title}</span>
                                <ExternalLink size={12} className="opacity-50 group-hover:opacity-100" />
                            </a>
                        );
                    })}
                </div>
            </div>
        )}
    </div>
  );
};

export default MarkdownRenderer;
