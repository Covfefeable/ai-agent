import { useState, useRef, useEffect } from 'react';
import { Paperclip, Loader2, File as FileIcon, User, Bot, Trash2, ArrowUp, ThumbsUp, ThumbsDown, Square, Globe, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { marked } from 'marked';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { chatApi } from '@/api/chat';

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

export function ChatPage() {
  const [searchParams] = useSearchParams();
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (urlConversationId) {
      setConversationId(urlConversationId);
      loadHistory(urlConversationId);
    } else {
      setConversationId('');
      setMessages([]);
    }
  }, [urlConversationId]);

  const loadHistory = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await chatApi.getMessages(id);
      
      const formattedMessages: Message[] = [];
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       response.data.forEach((item: any) => {
         formattedMessages.push({
           id: item.id + '_user',
           originalId: item.id,
           role: 'user',
           content: item.query,
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           files: item.message_files?.filter((f:any) => f.belongs_to === 'user').map((f:any) => ({ id: f.id, name: f.name, type: f.type }))
         });
         if (item.answer) {
           formattedMessages.push({
             id: item.id + '_assistant',
             originalId: item.id,
             role: 'assistant',
             content: item.answer,
             feedback: item.feedback,
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
             files: item.message_files?.filter((f:any) => f.belongs_to === 'assistant').map((f:any) => ({ id: f.id, name: f.name, type: f.type }))
           });
         }
       });

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined
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

    try {
      abortControllerRef.current = new AbortController();
      await fetchEventSource(chatApi.messageEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          inputs: {
            web_search: webSearch
          },
          query: userMessage.content,
          conversation_id: conversationId, 
          files: userMessage.files?.map(f => ({
            type: f.type,
            transfer_method: 'local_file',
            upload_file_id: f.id
          }))
        }),
        signal: abortControllerRef.current.signal,
        onmessage(msg) {
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
      // Refresh conversations list after generation
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refreshConversations'));
      }, 3000);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <header className="flex h-16 items-center border-b border-slate-100 px-8">
        <h2 className="text-lg font-bold text-slate-800">Super Agent 聊天</h2>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-4xl px-8 py-10 space-y-10">
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
                  "flex gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300",
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
                      <div 
                        className={cn(
                          "prose prose-sm break-words max-w-none",
                          msg.role === 'user' ? "prose-invert" : "prose-slate"
                        )}
                        dangerouslySetInnerHTML={{ __html: marked(msg.content) }}
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
      <div className="p-8 pb-12">
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
                
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
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
            AI 也可能会产生错误信息，请仔细甄别。
          </p>
        </div>
      </div>
    </div>
  );
}
