import { useState, useRef, useEffect } from 'react';
import { Paperclip, Loader2, File as FileIcon, User, Bot, Trash2, ArrowUp, ThumbsUp, ThumbsDown, Square, Globe, Copy, Check, Database, X, History, Plus, ChevronDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { cn } from '@/lib/utils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { chatApi, type Message as ApiMessage } from '@/api/chat';
import { knowledgeApi } from '@/api/knowledge';
import { modelsApi, type Model } from '@/api/models';
import { useClickOutside } from '@/hooks/use-click-outside';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { toast } from 'sonner';

interface Message {
  id: string;
  originalId?: string;
  role: 'user' | 'assistant';
  content: string;
  taskId?: string;
  feedback?: {
    rating: 'like' | 'dislike' | null;
  };
  files?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

interface Conversation {
  id: string;
  name: string;
  inputs: unknown;
  status: string;
  created_at: number;
}

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlConversationId = searchParams.get('conversation_id');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(urlConversationId || '');
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{id: string, name: string, type: string}>>([]);
  const [webSearch, setWebSearch] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedKbIds, setSelectedKbIds] = useState<Set<string>>(new Set());
  const [showKbSelector, setShowKbSelector] = useState(false);
  const kbSelectorRef = useClickOutside<HTMLDivElement>(() => setShowKbSelector(false));
  
  // Model related states
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const modelSelectorRef = useClickOutside<HTMLDivElement>(() => setShowModelSelector(false));
  
  // History related states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchConversations = async (loadMore = false) => {
    if (loadMore && isLoadingMore) return;
    if (loadMore) setIsLoadingMore(true);

    try {
      const currentLastId = loadMore ? lastId || undefined : undefined;
      const response = await chatApi.getConversations(currentLastId);
      setConversations(prev => loadMore ? [...prev, ...response.data] : response.data);
      setHasMore(response.has_more);
      if (response.data.length > 0) {
        setLastId(response.data[response.data.length - 1].id);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      if (loadMore) setIsLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasMore && !isLoadingMore) {
      fetchConversations(true);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Listen for custom event to refresh conversations
    const handleRefresh = () => {
      fetchConversations();
    };
    window.addEventListener('refreshConversations', handleRefresh);
    return () => {
      window.removeEventListener('refreshConversations', handleRefresh);
    };
  }, []);

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      await chatApi.deleteConversation(deleteId);
      setConversations(prev => prev.filter(c => c.id !== deleteId));
      if (conversationId === deleteId) {
        navigate('/');
        setConversationId('');
        setMessages([]);
      }
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };


  useEffect(() => {
    if (urlConversationId) {
      setConversationId(urlConversationId);
      loadHistory(urlConversationId);
    } else {
      setConversationId('');
      setMessages([]);
    }
  }, [urlConversationId]);

  useEffect(() => {
    const fetchKbs = async () => {
      try {
        const res = await knowledgeApi.getDatasets();
        setKnowledgeBases(res.data);
      } catch (error) {
        console.error('Failed to fetch knowledge bases:', error);
      }
    };
    fetchKbs();
  }, []);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await modelsApi.list('', 1, 100);
        const enabledModels = res.data.filter(m => m.enabled);
        setModels(enabledModels);
        if (enabledModels.length > 0 && !selectedModelId) {
          setSelectedModelId(enabledModels[0].modelId);
        }
      } catch (e) {
        console.error('Failed to fetch models', e);
      }
    };
    fetchModels();
  }, []);

  const loadHistory = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await chatApi.getMessages(id);
      
      const formattedMessages: Message[] = [];
       response.data.forEach((item: ApiMessage) => {
         formattedMessages.push({
           id: item.id + '_user',
           originalId: item.id,
           role: 'user',
           content: item.query,
           files: item.message_files?.filter((f) => f.belongs_to === 'user').map((f) => ({ id: f.id, name: f.name, type: f.type }))
         });
         if (item.answer) {
           formattedMessages.push({
             id: item.id + '_assistant',
             originalId: item.id,
             role: 'assistant',
             content: item.answer,
             feedback: item.feedback,
             files: item.message_files?.filter((f) => f.belongs_to === 'assistant').map((f) => ({ id: f.id, name: f.name, type: f.type }))
           });
         }
       });

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('加载历史记录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isBottom = scrollHeight - scrollTop - clientHeight <= 50;
    setShouldAutoScroll(isBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages]);

  const handleFeedback = async (messageId: string, originalId: string | undefined, rating: 'like' | 'dislike') => {
    if (!originalId) return;

    try {
      // Optimistic update
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const currentRating = msg.feedback?.rating;
          // Toggle logic: if clicking same rating, remove it (set to null)
          const newRating = currentRating === rating ? null : rating;
          return {
            ...msg,
            feedback: { ...msg.feedback, rating: newRating }
          };
        }
        return msg;
      }));

      const msg = messages.find(m => m.id === messageId);
      const currentRating = msg?.feedback?.rating;
      // If we're toggling off (clicking same button), we send null to clear it
      // But if we optimistically updated above, we need to check what the *new* state is.
      // Wait, the state update is async. Let's recalculate based on current state before update.
      const newRating = currentRating === rating ? null : rating;

      await chatApi.sendFeedback(originalId, newRating);
    } catch (error) {
      console.error('Feedback failed:', error);
      // Revert on error (could implement more robust rollback)
      loadHistory(conversationId);
    }
  };

  const handleStop = async () => {
    if (!currentTaskId) return;

    try {
      // Abort the fetch connection immediately
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      await chatApi.stopGeneration(currentTaskId);
    } catch (error) {
      console.error('Failed to stop generation:', error);
    } finally {
      setIsLoading(false);
      setCurrentTaskId(null);
    }
  };

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const getFileType = (file: File): string => {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('audio/')) return 'audio';
    if (type.startsWith('video/')) return 'video';
    
    if (type === 'application/pdf') return 'document'; // PDF
    if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown')) return 'document'; // Text/Markdown
    if (name.endsWith('.doc') || name.endsWith('.docx')) return 'document'; // Word
    if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'document'; // Excel/CSV
    if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'document'; // PowerPoint
    if (name.endsWith('.xml') || name.endsWith('.epub') || name.endsWith('.html') || name.endsWith('.htm')) return 'document'; // Others

    return 'custom'; // Fallback
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const response = await chatApi.uploadFile(file);
      
      setUploadedFiles(prev => [...prev, {
        id: response.id,
        name: file.name,
        type: getFileType(file)
      }]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && uploadedFiles.length === 0) || isLoading) return;

    setShouldAutoScroll(true);

    const queryText = inputValue;
    const currentFiles = [...uploadedFiles];

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText,
      files: currentFiles.length > 0 ? currentFiles : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setUploadedFiles([]);
    setIsLoading(true);

    const token = localStorage.getItem('token');
    let currentResponse = '';
    const assistantMessageId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: ''
    }]);

    abortControllerRef.current = new AbortController();

    try {
      await fetchEventSource('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: queryText,
          conversation_id: conversationId,
          files: currentFiles.map(f => ({
            type: 'image', // TODO: Dynamic type support if needed
            transfer_method: 'local_file',
            upload_file_id: f.id
          })),
          inputs: {
            knowledge_base_ids: Array.from(selectedKbIds),
            web_search: webSearch,
            model: selectedModelId
          }
        }),
        signal: abortControllerRef.current.signal,
        onopen: async (response) => {
          if (response.ok) {
            return;
          } else {
            throw new Error(`Failed to send message: ${response.statusText}`);
          }
        },
        onmessage: (msg) => {
          try {
            const data = JSON.parse(msg.data);
            if (data.event === 'message') {
              if (data.task_id && !currentTaskId) {
                setCurrentTaskId(data.task_id);
              }
              if (data.conversation_id && !conversationId) {
                setConversationId(data.conversation_id);
              }
              currentResponse += data.answer;
              setMessages(prev => prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: currentResponse, originalId: data.message_id || data.id, taskId: data.task_id }
                  : m
              ));
            }
          } catch (error) {
            console.error('Error processing message:', error);
          }
        },
        onerror(err) {
          throw err;
        }
      });
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        console.log('Generation stopped by user');
      } else {
        console.error('Error in fetchEventSource:', error);
        toast.error('发送消息失败，请重试');
        setMessages(prev => prev.map(m => 
          m.id === assistantMessageId 
            ? { ...m, content: m.content + '\n\n**[消息发送失败，请检查网络设置]**' }
            : m
        ));
      }
    } finally {
      setIsLoading(false);
      setCurrentTaskId(null);
      abortControllerRef.current = null;

    }
  };

  return (
    <div className="flex h-full flex-col bg-white relative">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-slate-100 pl-14 pr-4 md:px-8">
        <h2 className="text-lg font-bold text-slate-800">Super Agent 聊天</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsHistoryOpen(true);
              fetchConversations();
            }}
            className="text-slate-500 hover:text-slate-900"
            title="历史会话"
          >
            <History className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              navigate('/');
              window.location.reload();
            }}
            className="text-slate-500 hover:text-slate-900"
            title="新建对话"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10 space-y-6 md:space-y-10">
          {messages.length === 0 ? (
            <div className="flex h-[40vh] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <Bot className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">有什么可以帮你的吗？</h3>
              <p className="mt-2 text-sm text-slate-500">你可以发送消息或者上传图片开始对话</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
                  msg.role === 'user' ? "bg-slate-900 text-white" : "bg-blue-600 text-white"
                )}>
                  {msg.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                <div className={cn(
                  "flex max-w-[85%] flex-col gap-3 group/msg",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  {msg.files && msg.files.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.files.map(f => (
                        <div key={f.id} className="group relative flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-100">
                          <FileIcon className="h-4 w-4 text-slate-400" />
                          {f.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={cn(
                    "rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm",
                    msg.role === 'user' 
                      ? "bg-slate-900 text-white rounded-tr-none" 
                      : "bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none"
                  )}>
                    {msg.content ? (
                      <MarkdownRenderer
                        content={msg.content}
                        className={cn(
                          "prose prose-sm break-words max-w-none",
                          msg.role === 'user' ? "prose-invert" : "prose-slate"
                        )}
                      />
                    ) : (
                      <div className="flex items-center gap-1 h-5">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                      </div>
                    )}
                  </div>
                  {msg.role === 'assistant' && msg.originalId && (
                    <div className={cn(
                      "flex items-center gap-2 px-2 transition-opacity duration-200",
                      // Show if hovered OR if there is already a rating
                      msg.feedback?.rating ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100"
                    )}>
                      <button
                        onClick={() => handleFeedback(msg.id, msg.originalId, 'like')}
                        className={cn(
                          "flex items-center gap-1 rounded p-1 text-xs transition-colors hover:bg-slate-100",
                          msg.feedback?.rating === 'like' ? "text-green-600" : "text-slate-400"
                        )}
                        title="Like"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, msg.originalId, 'dislike')}
                        className={cn(
                          "flex items-center gap-1 rounded p-1 text-xs transition-colors hover:bg-slate-100",
                          msg.feedback?.rating === 'dislike' ? "text-red-600" : "text-slate-400"
                        )}
                        title="Dislike"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="flex items-center gap-1 rounded p-1 text-xs text-slate-400 transition-colors hover:bg-slate-100"
                        title="Copy"
                      >
                        {copiedMessageId === msg.id ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 pb-6 md:p-8 md:pb-6">
        <div className="mx-auto max-w-4xl">
          <div className="relative rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10">
            
            {/* Uploaded Files Area */}
            {uploadedFiles.length > 0 && (
               <div className="mb-4 flex flex-wrap gap-3">
                  {uploadedFiles.map(f => (
                    <div key={f.id} className="group relative flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 border border-slate-100 transition-all hover:bg-slate-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                        <FileIcon className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate" title={f.name}>{f.name}</span>
                        <span className="text-[10px] text-slate-400">File</span>
                      </div>
                      <button 
                        onClick={() => removeFile(f.id)} 
                        className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-all group-hover:flex hover:bg-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
               </div>
            )}

            {/* Text Input */}
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="发消息..."
              className="w-full resize-none border-none bg-transparent p-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 min-h-[60px] max-h-60"
              disabled={isLoading}
            />

            {/* Bottom Toolbar */}
            <div className="mt-3 flex items-center justify-between">
              {/* Left Tools */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || isLoading}
                    title="上传附件"
                  >
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 relative">
                  {/* Model Selector */}
                  <div ref={modelSelectorRef} className="relative">
                    <button
                      onClick={() => setShowModelSelector(!showModelSelector)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-all"
                      title="选择模型"
                    >
                      {(() => {
                        const current = models.find(m => m.modelId === selectedModelId);
                        return (
                          <>
                            {current?.iconUrl ? (
                              <img src={current.iconUrl} alt="" className="h-3.5 w-3.5 rounded object-cover" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                            )}
                            <span className="max-w-[100px] truncate">{current?.name || '选择模型'}</span>
                            <ChevronDown className="h-3 w-3 text-slate-400" />
                          </>
                        );
                      })()}
                    </button>

                    {showModelSelector && (
                      <div className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-lg z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="max-h-64 overflow-y-auto space-y-0.5">
                          {models.map(model => (
                            <button
                              key={model.id}
                              onClick={() => {
                                setSelectedModelId(model.modelId);
                                setShowModelSelector(false);
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                                selectedModelId === model.modelId 
                                  ? "bg-blue-50 text-blue-600" 
                                  : "text-slate-700 hover:bg-slate-50"
                              )}
                            >
                              {model.iconUrl ? (
                                <img src={model.iconUrl} alt="" className="h-4 w-4 rounded object-cover" />
                              ) : (
                                <div className="flex h-4 w-4 items-center justify-center rounded bg-slate-100">
                                  <Bot className="h-3 w-3 text-slate-500" />
                                </div>
                              )}
                              <span className="truncate flex-1">{model.name}</span>
                              {selectedModelId === model.modelId && <Check className="h-3 w-3" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setWebSearch(!webSearch)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                      webSearch 
                        ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Globe className={cn("h-3.5 w-3.5", webSearch ? "text-blue-600" : "text-slate-400")} />
                    联网搜索
                  </button>

                  <div ref={kbSelectorRef} className="relative">
                    <button
                      onClick={() => setShowKbSelector(!showKbSelector)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                        selectedKbIds.size > 0
                          ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <Database className={cn("h-3.5 w-3.5", selectedKbIds.size > 0 ? "text-blue-600" : "text-slate-400")} />
                      知识库
                      {selectedKbIds.size > 0 && (
                        <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                          {selectedKbIds.size}
                        </span>
                      )}
                    </button>

                    {showKbSelector && (
                      <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-10">
                         <div className="mb-2 flex items-center justify-between px-2 pb-2 border-b border-slate-50">
                            <span className="text-xs font-medium text-slate-500">需要引用的知识库</span>
                            <button onClick={() => setShowKbSelector(false)} className="text-slate-400 hover:text-slate-600">
                              <X className="h-3.5 w-3.5" />
                            </button>
                         </div>
                         <div className="max-h-48 overflow-y-auto space-y-1">
                           {knowledgeBases.map(kb => (
                             <div 
                               key={kb.id}
                               className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 cursor-pointer"
                               onClick={() => {
                                 const newSet = new Set(selectedKbIds);
                                 if (newSet.has(kb.id)) {
                                   newSet.delete(kb.id);
                                 } else {
                                   newSet.add(kb.id);
                                 }
                                 setSelectedKbIds(newSet);
                               }}
                             >
                               <div className={cn(
                                 "flex h-4 w-4 items-center justify-center rounded border transition-all",
                                 selectedKbIds.has(kb.id) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                               )}>
                                 {selectedKbIds.has(kb.id) && <Check className="h-3 w-3" />}
                               </div>
                               <span className="text-xs text-slate-700 truncate">{kb.name}</span>
                             </div>
                           ))}
                           {knowledgeBases.length === 0 && (
                             <div className="px-2 py-4 text-center text-xs text-slate-400">
                               暂无知识库
                             </div>
                           )}
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Send/Stop Button */}
              {isLoading ? (
                <Button 
                  onClick={handleStop}
                  className="h-9 w-9 rounded-full bg-red-600 p-0 text-white shadow-md hover:bg-red-700 hover:shadow-lg active:scale-95"
                  title="停止生成"
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSend} 
                  disabled={!inputValue.trim() && uploadedFiles.length === 0}
                  className={cn(
                    "h-9 w-9 rounded-full p-0 transition-all",
                    !inputValue.trim() && uploadedFiles.length === 0
                      ? "bg-slate-200 text-slate-400"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-95"
                  )}
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">
            AI 也可能犯错，请仔细甄别。
          </p>
        </div>
      </div>
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="删除会话"
        description="确定要删除这个会话吗？此操作无法撤销。"
        confirmText="删除"
        variant="destructive"
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        conversations={conversations}
        currentConversationId={conversationId}
        onSelect={(conv) => {
          if (conversationId !== conv.id) {
            navigate(`/?conversation_id=${conv.id}`);
            setIsHistoryOpen(false);
          }
        }}
        onDelete={(id) => setDeleteId(id)}
        onScroll={handleScroll}
        isLoadingMore={isLoadingMore}
      />
    </div>
  );
}
