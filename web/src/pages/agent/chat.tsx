import { useEffect, useState, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { agentsApi } from '@/api/agents';
import { favoritesApi } from '@/api/favorites';
import { knowledgeApi, type Dataset } from '@/api/knowledge';
import { AgentForm, type FormItem, type FormValues } from '@/components/agents/agent-form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Paperclip, Loader2, User, Bot, ArrowUp, Square, Trash2, File as FileIcon, Star, History, Plus, ArrowLeft } from 'lucide-react';
import { cn, getFileType } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { toast } from 'sonner';
import { HistoryDrawer } from '@/components/history-drawer';
import { motion } from 'framer-motion';
import { SaveToKnowledgeBaseModal } from '@/components/knowledge/save-to-knowledge-base-modal';
import { MessageActionBar } from '@/components/chat/message-action-bar';

interface Conversation {
  id: string;
  name: string;
  inputs: unknown;
  status: string;
  created_at: number;
}

interface ChatMessage {
  id: string;
  originalId?: string;
  role: 'user' | 'assistant';
  content: string;
  feedback?: {
    rating: 'like' | 'dislike' | null;
  };
  files?: Array<{ id: string; name: string; type: string; url?: string }>;
}

export function AgentChatPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isFromSquare = location.pathname.startsWith('/agents-square');
  const urlConversationId = searchParams.get('conversation_id');
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formOpen, setFormOpen] = useState(true);
  const [uploadConfig, setUploadConfig] = useState<{
    enabled: boolean;
    allowedTypes: string[];
    allowedExtensions: string[];
    allowedMethods: string[];
    numberLimits: number;
    sizeLimits: { file: number; image: number; video: number; audio: number };
  }>({
    enabled: false,
    allowedTypes: [],
    allowedExtensions: [],
    allowedMethods: [],
    numberLimits: 0,
    sizeLimits: { file: 0, image: 0, video: 0, audio: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [agentTitle, setAgentTitle] = useState<string>('智能体');
  const [agentIconUrl, setAgentIconUrl] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [openingStatement, setOpeningStatement] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // History related states
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<Dataset[]>([]);
  const [saveKbOpen, setSaveKbOpen] = useState(false);
  const [saveKbText, setSaveKbText] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [inputValue]);

  const fetchConversations = async (loadMore = false) => {
    if (!id) return;
    if (loadMore && isLoadingMore) return;
    if (loadMore) setIsLoadingMore(true);

    try {
      const currentLastId = loadMore ? lastId || undefined : undefined;
      const response = await agentsApi.getConversations(id, currentLastId);
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
  }, [id]);

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

  const confirmDelete = async () => {
    if (!deleteId || !id) return;

    try {
      await agentsApi.deleteConversation(id, deleteId);
      setConversations(prev => prev.filter(c => c.id !== deleteId));
      if (conversationId === deleteId) {
        navigate(`/chat/${id}`);
        setConversationId(null);
        if (openingStatement) {
          setMessages([{ id: 'opening', role: 'assistant', content: openingStatement }]);
        } else {
          setMessages([]);
        }
      }
      setDeleteId(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFeedback = async (messageId: string, originalId: string | undefined, rating: 'like' | 'dislike') => {
    if (!id || !originalId) return;

    let prevRating: 'like' | 'dislike' | null = null;
    let nextRating: 'like' | 'dislike' | null = null;

    setMessages(prev => prev.map(msg => {
      if (msg.id !== messageId) return msg;
      prevRating = msg.feedback?.rating ?? null;
      nextRating = prevRating === rating ? null : rating;
      return { ...msg, feedback: { rating: nextRating } };
    }));

    try {
      await agentsApi.sendFeedback(id, originalId, nextRating);
    } catch {
      setMessages(prev => prev.map(msg => (
        msg.id === messageId ? { ...msg, feedback: { rating: prevRating } } : msg
      )));
      if (conversationId) {
        loadHistory(conversationId);
      }
    }
  };

  const loadHistory = async (convId: string) => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await agentsApi.getMessages(id, convId);
      
      const formattedMessages: ChatMessage[] = [];
      response.data.forEach((item) => {
        formattedMessages.push({
          id: `${item.id}_user`,
          role: 'user',
          content: item.query,
          files: (item.message_files || [])
            .filter(f => f.belongs_to === 'user')
            .map(f => ({ id: f.id, name: f.name || f.filename || 'Unknown File', type: f.type, url: f.url }))
        });
        if (item.answer) {
          formattedMessages.push({
            id: `${item.id}_assistant`,
            originalId: item.id,
            role: 'assistant',
            content: item.answer,
            feedback: { rating: item.feedback?.rating ?? null },
            files: (item.message_files || [])
              .filter(f => f.belongs_to === 'assistant')
              .map(f => ({ id: f.id, name: f.name || f.filename || 'Unknown File', type: f.type, url: f.url }))
          });
        }
      });

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlConversationId) {
      setConversationId(urlConversationId);
      loadHistory(urlConversationId);
    } else {
      setConversationId(null);
      if (openingStatement) {
        setMessages(prev => {
          if (prev.length > 0) return prev;
          return [{ id: 'opening', role: 'assistant', content: openingStatement }];
        });
      }
    }
  }, [urlConversationId, openingStatement]); // Added openingStatement dependency to ensure reset works if params load later

  useEffect(() => {
    document.title = 'Super Agent - 智能体聊天';
  }, []);

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

  useEffect(() => {
    const fetchParams = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await agentsApi.parameters(id);
        const opening = res.opening_statement || '';
        const initialGreeting = opening
          ? `${opening}`
          : '你好！很高兴见到你，有什么我可以帮你？';
        setOpeningStatement(initialGreeting);
        if (!urlConversationId) {
          setMessages([{ id: 'opening', role: 'assistant', content: initialGreeting }]);
        }
        setSuggestions(res.suggested_questions || []);
        const rawForm = Array.isArray(res.user_input_form) ? res.user_input_form : [];
        const rawFormList = rawForm as Array<Record<string, unknown>>;
        const normalized: Array<{
          type: 'text-input' | 'paragraph' | 'select' | 'number' | 'checkbox' | 'file' | 'file-list';
          variable: string;
          label: string;
          required?: boolean;
          options?: string[];
          max_length?: number;
          placeholder?: string;
          default?: string;
          allowed_file_upload_methods?: string[];
          allowed_file_types?: string[];
          allowed_file_extensions?: string[];
        }> = rawFormList.map((item) => {
          const key = Object.keys(item || {})[0];
          const cfg = (item as Record<string, unknown>)[key] as Record<string, unknown>;
          const t = typeof cfg?.['type'] === 'string' ? (cfg['type'] as string) : 'text-input';
          let typeVal: 'text-input' | 'paragraph' | 'select' | 'number' | 'checkbox' | 'file' | 'file-list';
          switch (t) {
            case 'text-input':
              typeVal = 'text-input';
              break;
            case 'paragraph':
              typeVal = 'paragraph';
              break;
            case 'select':
              typeVal = 'select';
              break;
            case 'number':
              typeVal = 'number';
              break;
            case 'checkbox':
              typeVal = 'checkbox';
              break;
            case 'file':
              typeVal = 'file';
              break;
            case 'file-list':
              typeVal = 'file-list';
              break;
            default:
              typeVal = 'text-input';
          }
          return {
            type: typeVal,
            variable: typeof cfg?.['variable'] === 'string' ? (cfg['variable'] as string) : key,
            label: typeof cfg?.['label'] === 'string' ? (cfg['label'] as string) : key,
            required: typeof cfg?.['required'] === 'boolean' ? (cfg['required'] as boolean) : false,
            options: Array.isArray(cfg?.['options']) ? (cfg['options'] as string[]) : [],
            max_length: typeof cfg?.['max_length'] === 'number' ? (cfg['max_length'] as number) : undefined,
            placeholder: typeof cfg?.['placeholder'] === 'string' ? (cfg['placeholder'] as string) : '',
            default: typeof cfg?.['default'] === 'string' ? (cfg['default'] as string) : '',
            allowed_file_upload_methods: Array.isArray(cfg?.['allowed_file_upload_methods']) ? (cfg['allowed_file_upload_methods'] as string[]) : [],
            allowed_file_types: Array.isArray(cfg?.['allowed_file_types']) ? (cfg['allowed_file_types'] as string[]) : [],
            allowed_file_extensions: Array.isArray(cfg?.['allowed_file_extensions']) ? (cfg['allowed_file_extensions'] as string[]) : [],
          };
        }).filter(i => !!i.type && !!i.variable && !!i.label);
        setFormItems(normalized);
        const initialVals: Record<string, string | number | boolean | Array<{ id: string; name: string; type: string }>> = {};
        normalized.forEach(i => {
          if (i.type === 'checkbox') {
            initialVals[i.variable] = false;
          } else if (i.type === 'number') {
            initialVals[i.variable] = 0;
          } else if (i.type === 'file' || i.type === 'file-list') {
            initialVals[i.variable] = [];
          } else {
            initialVals[i.variable] = i.default ?? '';
          }
        });
        setFormValues(initialVals);
        setFormSubmitted(normalized.length === 0);
        setFormOpen(normalized.length > 0);
        const fu = res.file_upload || {};
        const sp = res.system_parameters || {};
        const cfg = fu.fileUploadConfig || {};
        const enabled = !!fu.enabled;
        const allowedTypes: string[] = Array.isArray(fu.allowed_file_types) ? fu.allowed_file_types : [];
        const allowedExtensions: string[] = Array.isArray(fu.allowed_file_extensions) ? fu.allowed_file_extensions : [];
        const allowedMethods: string[] = Array.isArray(fu.allowed_file_upload_methods) ? fu.allowed_file_upload_methods : [];
        const numberLimits: number = typeof fu.number_limits === 'number' ? fu.number_limits : 0;
        const sizeLimits = {
          file: typeof cfg.file_size_limit === 'number' ? cfg.file_size_limit : (typeof sp.file_size_limit === 'number' ? sp.file_size_limit : 0),
          image: typeof cfg.image_file_size_limit === 'number' ? cfg.image_file_size_limit : (typeof sp.image_file_size_limit === 'number' ? sp.image_file_size_limit : 0),
          video: typeof cfg.video_file_size_limit === 'number' ? cfg.video_file_size_limit : (typeof sp.video_file_size_limit === 'number' ? sp.video_file_size_limit : 0),
          audio: typeof cfg.audio_file_size_limit === 'number' ? cfg.audio_file_size_limit : (typeof sp.audio_file_size_limit === 'number' ? sp.audio_file_size_limit : 0),
        };
        setUploadConfig({
          enabled,
          allowedTypes,
          allowedExtensions,
          allowedMethods,
          numberLimits,
          sizeLimits
        });
      } catch { void 0; } finally {
        setLoading(false);
      }
    };
    fetchParams();
  }, [id]);

  useEffect(() => {
    const fetchAgent = async () => {
      if (!id) return;
      try {
        const listRes = await agentsApi.publicList();
        const target = (listRes.data || []).find((a) => a.id === id);
        if (target) {
          setAgentTitle(target.title || '智能体');
          setAgentIconUrl(target.iconUrl || null);
        }
        const favRes = await favoritesApi.check(id);
        setIsFavorite(favRes.isFavorite);
      } catch { void 0; }
    };
    fetchAgent();
  }, [id]);

  const toggleFavorite = async () => {
    if (!id) return;
    try {
      if (isFavorite) {
        await favoritesApi.remove(id);
        setIsFavorite(false);
        toast.success('已取消收藏');
      } else {
        await favoritesApi.add(id);
        setIsFavorite(true);
        toast.success('已添加到我的智能体');
      }
      window.dispatchEvent(new Event('refreshFavorites'));
    } catch (e) {
      console.error('Toggle favorite failed', e);
    }
  };

  useEffect(() => {
    if (agentTitle) {
      document.title = `Super Agent - ${agentTitle}`;
    }
  }, [agentTitle]);
  const isFormValid = () => {
    return formItems.every(i => {
      if (!i.required) return true;
      const v = formValues[i.variable];
      if (i.type === 'checkbox') return typeof v === 'boolean';
      if (i.type === 'number') return typeof v === 'number';
      if (i.type === 'file') return Array.isArray(v) && v.length === 1;
      if (i.type === 'file-list') {
        const ok = Array.isArray(v) && v.length >= 1;
        const ml = typeof i.max_length === 'number' ? i.max_length : undefined;
        return ok && (ml ? (v as Array<unknown>).length <= ml : true);
      }
      return !!(v && String(v as string).trim());
    });
  };
  const handleFormSubmit = () => {
    if (!isFormValid()) {
      toast.error('请先填写必填表单');
      return;
    }
    setFormSubmitted(true);
    setFormOpen(false);
    toast.success('表单已提交，可以开始对话');
  };

  const handleSend = async () => {
    const formRequired = formItems.length > 0;
    if (formRequired && !isFormValid()) {
      toast.error('请先填写必填表单');
      return;
    }
    if ((!inputValue.trim() && uploadedFiles.length === 0) || !id || streaming) return;
    setShouldAutoScroll(true);
    const query = inputValue.trim();
    const currentFiles = [...uploadedFiles];
    const userMessage: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user' as const, 
      content: query,
      files: currentFiles.length > 0 ? currentFiles : undefined
    };
    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [
      ...prev,
      userMessage,
      { id: assistantId, role: 'assistant', content: '', feedback: { rating: null } }
    ]);
    setInputValue('');
    setUploadedFiles([]);
    const token = localStorage.getItem('token') || '';
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    // 处理表单输入，转换文件格式
    const processedInputs: Record<string, unknown> = {};
    Object.entries(formValues).forEach(([key, value]) => {
      const item = formItems.find(i => i.variable === key);
      if (item && item.type === 'file') {
        const files = value as Array<{ id: string; name: string; type: string }>;
        if (files.length > 0) {
          processedInputs[key] = {
            type: files[0].type,
            transfer_method: 'local_file',
            upload_file_id: files[0].id
          };
        } else {
          processedInputs[key] = null;
        }
      } else if (item && item.type === 'file-list') {
        const files = value as Array<{ id: string; name: string; type: string }>;
        processedInputs[key] = files.map(f => ({
          type: f.type,
          transfer_method: 'local_file',
          upload_file_id: f.id
        }));
      } else {
        processedInputs[key] = value;
      }
    });

    try {
      await fetchEventSource(`/api/agents/${id}/chat-messages`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          inputs: processedInputs,
          files: uploadedFiles.map(f => ({
          type: f.type,
          transfer_method: 'local_file',
          upload_file_id: f.id
        })),
        conversation_id: conversationId
      }),
      signal: controller.signal,
        onopen: async (response) => {
          if (!response.ok) {
            throw new Error(`发送失败: ${response.statusText}`);
          }
        },
        onmessage: (msg) => {
          let data;
          try {
            data = JSON.parse(msg.data);
          } catch {
            return;
          }

          if (data.event === 'message') {
            if (data.conversation_id && !conversationId) {
              setConversationId(data.conversation_id);
            }
            const answerChunk = data.answer || '';
            setMessages(prev => prev.map(m => {
              if (m.id !== assistantId) return m;
              const nextOriginalId = typeof data.message_id === 'string' ? data.message_id : m.originalId;
              return {
                ...m,
                originalId: nextOriginalId,
                feedback: m.feedback ?? { rating: null },
                content: (m.content || '') + answerChunk
              };
            }));
          } else if (data.event === 'workflow_finished') {
            if (data.data?.status === 'failed') {
              throw new Error(data.data.error || '执行失败');
            }
          } else if (data.event === 'error') {
            throw new Error(data.message || '请求错误');
          }
        },
        onerror(err) {
          throw err;
        }
      });
    } catch (err: unknown) {
      let errorMessage = '发送消息失败，请重试';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      // toast.error(errorMessage);
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: (m.content || '') + `\n\n(错误: ${errorMessage})` }
          : m
      ));
    } finally {
      setStreaming(false);
      abortRef.current = null;
      setUploadedFiles([]);
    }
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setStreaming(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (!uploadConfig.enabled) {
      toast.error('当前智能体未开启文件上传');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (!uploadConfig.allowedMethods.includes('local_file')) {
      toast.error('智能体未允许本地文件上传');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (uploadConfig.numberLimits > 0 && uploadedFiles.length >= uploadConfig.numberLimits) {
      toast.error(`最多上传${uploadConfig.numberLimits}个文件`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const type = getFileType(file);
    if (!uploadConfig.allowedTypes.includes(type)) {
      toast.error('不支持的文件类型');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const mb = 1024 * 1024;
    let limitMb = uploadConfig.sizeLimits.file;
    if (type === 'image' && uploadConfig.sizeLimits.image) limitMb = uploadConfig.sizeLimits.image;
    if (type === 'video' && uploadConfig.sizeLimits.video) limitMb = uploadConfig.sizeLimits.video;
    if (type === 'audio' && uploadConfig.sizeLimits.audio) limitMb = uploadConfig.sizeLimits.audio;
    if (limitMb > 0 && file.size > limitMb * mb) {
      toast.error(`文件大小超过限制（最大${limitMb}MB）`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const resp = await agentsApi.uploadFile(id, file);
      setUploadedFiles(prev => [...prev, { id: resp.id, name: file.name, type: getFileType(file) }]);
    } catch {
      void 0;
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
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

  const openSaveToKb = (text: string) => {
    setSaveKbText(text);
    setSaveKbOpen(true);
  };

  const closeSaveToKb = () => {
    setSaveKbOpen(false);
    setSaveKbText('');
  };
  return (
    <motion.div layoutId={`agent-card-${id}`} className="absolute inset-0 flex flex-col bg-white">
      <motion.div className="flex h-full flex-col">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 pl-14 pr-4 md:px-8">
        <div className="flex items-center gap-3">
          {isFromSquare && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/agents-square')}
              >
                <ArrowLeft className="h-5 w-5 text-slate-500" />
              </Button>
            )}
          {agentIconUrl ? (
            <img src={agentIconUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
          )}
          <h2 className="text-lg font-bold text-slate-800">{agentTitle}</h2>
        </div>
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
              navigate(`/chat/${id}`);
              if (!urlConversationId) {
                setMessages([{ id: 'opening', role: 'assistant', content: openingStatement }]);
                setConversationId(null);
                setFormSubmitted(false);
                setFormValues({});
                setFormOpen(true);
              }
            }}
            className="text-slate-500 hover:text-slate-900"
            title="新建对话"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFavorite}
            className={cn("text-slate-400 hover:text-yellow-500", isFavorite && "text-yellow-500")}
            title={isFavorite ? "取消收藏" : "添加到我的智能体"}
          >
            <Star className={cn("h-5 w-5", isFavorite && "fill-current")} />
          </Button>
        </div>
      </header>

      <div 
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10 space-y-6 md:space-y-10">
          {loading ? (
            <div className="flex h-[40vh] items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {messages.length === 0 ? (
                <div className="flex h-[40vh] flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                    <Bot className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">有什么可以帮你的吗？</h3>
                  <p className="mt-2 text-sm text-slate-500">你可以发送消息开始对话</p>
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
                    {msg.role === 'assistant' ? (
                      agentIconUrl ? (
                        <img src={agentIconUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm" />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                          <Bot className="h-5 w-5" />
                        </div>
                      )
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-transparent text-slate-900 overflow-hidden">
                        {user.avatar ? (
                          <img src={user.avatar} alt="User Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                    )}
                    <div className={cn(
                      "flex max-w-[85%] flex-col gap-3 group/msg",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  {msg.files && msg.files.length > 0 && (
                    <div className={cn("flex flex-wrap gap-2", msg.role === 'user' && "order-last")}>
                      {msg.files.map(f => (
                        <div key={f.id} className="group relative flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-100">
                          <FileIcon className="h-4 w-4 text-slate-400" />
                          {f.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={cn(
                    "rounded-2xl px-5 py-2 text-sm leading-relaxed shadow-sm",
                    msg.role === 'user' 
                          ? "bg-slate-900 text-white rounded-tr-none" 
                          : "bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none"
                      )}>
                        {msg.role === 'assistant' ? (
                          msg.content ? (
                            <MarkdownRenderer
                              content={msg.content}
                              className={cn("prose prose-sm break-words max-w-none", "prose-slate")}
                            />
                          ) : (
                            <div className="flex items-center gap-1 h-5">
                              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                              <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                            </div>
                          )
                      ) : (
                          <div className="break-words">{msg.content}</div>
                        )}
                      </div>
                      {msg.role === 'assistant' && (
                        <MessageActionBar
                          className={
                            msg.feedback?.rating
                              ? 'opacity-100'
                              : 'opacity-0 group-hover/msg:opacity-100'
                          }
                          feedbackRating={msg.feedback?.rating ?? null}
                          onLike={
                            msg.originalId
                              ? () => handleFeedback(msg.id, msg.originalId, 'like')
                              : undefined
                          }
                          onDislike={
                            msg.originalId
                              ? () => handleFeedback(msg.id, msg.originalId, 'dislike')
                              : undefined
                          }
                          onCopy={() => handleCopy(msg.content, msg.id)}
                          copied={copiedMessageId === msg.id}
                          onSaveToKb={() => openSaveToKb(msg.content)}
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>
      <div className="p-4 pb-6 md:p-8 md:pb-6">
        <div className="mx-auto max-w-4xl">
          {suggestions.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(q)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                  title={q}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <AgentForm
            agentId={id || ''}
            formItems={formItems}
            formValues={formValues}
            onValuesChange={setFormValues}
            onSubmit={handleFormSubmit}
            uploadConfig={uploadConfig}
            loading={loading}
            streaming={streaming}
            formSubmitted={formSubmitted}
            formOpen={formOpen}
            onFormOpenChange={setFormOpen}
            isFormValid={isFormValid}
          />
          {(!formItems.length || (formSubmitted && !formOpen)) && (
          <div className="relative rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10">
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
            

            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="发消息..."
              className="w-full resize-none border-none bg-transparent p-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 min-h-[20px] max-h-[72px] overflow-y-auto"
              disabled={loading || streaming}
            />

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    uploading ||
                    streaming ||
                    loading ||
                    !uploadConfig.enabled ||
                    !uploadConfig.allowedMethods.includes('local_file') ||
                    (uploadConfig.numberLimits > 0 && uploadedFiles.length >= uploadConfig.numberLimits)
                  }
                  title="上传附件"
                >
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                </Button>
              </div>

              {streaming ? (
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
                  disabled={loading || (!inputValue.trim() && uploadedFiles.length === 0)}
                  className={`h-9 w-9 rounded-full p-0 transition-all ${
                    (loading || (!inputValue.trim() && uploadedFiles.length === 0))
                      ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg active:scale-95'
                  }`}
                  title="发送"
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
      </motion.div>
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="删除会话"
        description="确定要删除这个会话吗？此操作无法撤销。"
        confirmText="删除"
        variant="destructive"
      />
      <SaveToKnowledgeBaseModal
        isOpen={saveKbOpen}
        onClose={closeSaveToKb}
        knowledgeBases={knowledgeBases}
        text={saveKbText}
        defaultDatasetId={knowledgeBases[0]?.id || ''}
      />

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        conversations={conversations}
        currentConversationId={conversationId}
        onSelect={(conv) => {
          if (conversationId !== conv.id) {
            navigate(`/chat/${id}?conversation_id=${conv.id}`);
            setIsHistoryOpen(false);
          }
        }}
        onDelete={(id) => setDeleteId(id)}
        onScroll={handleScroll}
        isLoadingMore={isLoadingMore}
      />
    </motion.div>
  );
}
