import React, { useState, useEffect } from 'react';
import { X, Search, Book, Plus, Trash2, Send, LayoutGrid, Star, Code2 } from 'lucide-react';
import { PromptItem, Language } from '../types';
import { savePrompt, getPrompts, deletePrompt } from '../utils/db';

interface PromptLibraryModalProps { isOpen: boolean; onClose: () => void; onSelectPrompt: (text: string) => void; language: Language; }

const SYSTEM_PROMPTS: PromptItem[] = [
    { id: 'sys_1', title: 'Python Data Analyst', tags: ['Code', 'Data'], isSystem: true, description: 'Generates python code.', content: 'Act as an expert Data Analyst. Write Python code using pandas and matplotlib.' },
    { id: 'sys_2', title: 'React Expert', tags: ['Code', 'Web'], isSystem: true, description: 'Generates React components.', content: 'Create a modern React component using Tailwind CSS.' },
    { id: 'sys_3', title: 'Creative Writer', tags: ['Writing'], isSystem: true, description: 'Writes engaging stories.', content: 'You are a creative writing assistant.' }
];

const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({ isOpen, onClose, onSelectPrompt, language }) => {
    const [activeTab, setActiveTab] = useState<'system' | 'user'>('system');
    const [search, setSearch] = useState('');
    const [userPrompts, setUserPrompts] = useState<PromptItem[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTitle, setNewTitle] = useState(''); const [newContent, setNewContent] = useState('');

    useEffect(() => { if (isOpen) loadUserPrompts(); }, [isOpen]);
    const loadUserPrompts = async () => { const prompts = await getPrompts(); setUserPrompts(prompts.reverse()); }
    const handleSave = async () => { if (!newTitle || !newContent) return; await savePrompt({ id: Date.now().toString(), title: newTitle, description: '', content: newContent, tags: ['User'], isSystem: false }); await loadUserPrompts(); setShowAddForm(false); }
    const handleDelete = async (id: string) => { if (confirm('Sure?')) { await deletePrompt(id); await loadUserPrompts(); } }

    if (!isOpen) return null;
    const displayPrompts = activeTab === 'system' ? SYSTEM_PROMPTS : userPrompts;
    const filtered = displayPrompts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-4xl h-[80vh] bg-white dark:bg-[#0f1117] rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Library</h2>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 justify-between bg-white dark:bg-[#0f1117]">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button onClick={() => setActiveTab('system')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'system' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>System</button>
                        <button onClick={() => setActiveTab('user')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'user' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'}`}>My Prompts</button>
                    </div>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-4 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" />
                        {activeTab === 'user' && <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center gap-2"><Plus size={16} /> Add</button>}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 dark:bg-black/20">
                    {showAddForm ? (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                            <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                            <textarea className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl h-40" placeholder="Content" value={newContent} onChange={e => setNewContent(e.target.value)} />
                            <div className="flex justify-end gap-3"><button onClick={() => setShowAddForm(false)}>Cancel</button><button onClick={handleSave} className="bg-brand-600 text-white px-4 py-2 rounded-lg">Save</button></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map(p => (
                                <div key={p.id} className="bg-white dark:bg-[#151a25] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-brand-500 transition-colors cursor-pointer group" onClick={() => { onSelectPrompt(p.content); onClose(); }}>
                                    <div className="flex justify-between mb-2"><h3 className="font-bold">{p.title}</h3>{!p.isSystem && <button onClick={(e) => {e.stopPropagation(); handleDelete(p.id)}}><Trash2 size={14} /></button>}</div>
                                    <p className="text-xs text-slate-500 line-clamp-2">{p.description || p.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PromptLibraryModal;
