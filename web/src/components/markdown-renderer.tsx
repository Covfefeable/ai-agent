import { useEffect, useRef, useState, useMemo } from 'react';
import { marked } from 'marked';
import { PhotoSlider } from 'react-photo-view';
import { ZoomIn, ZoomOut, RotateCw, X, Brain, ChevronDown, ChevronRight, Globe } from 'lucide-react';
import 'react-photo-view/dist/react-photo-view.css';
import { cn } from '@/lib/utils';

interface EchoProps {
  content: string;
  field?: string;
  hidden?: boolean;
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const EchoBlock = ({ content, field }: { content: string, field?: string, value?: string }) => {
  if (field === 'web_searching') {
    return (
      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-0 rounded-lg my-2 w-fit animate-pulse">
         <Globe className="h-4 w-4 animate-spin-slow" />
         <span className="text-sm font-medium">{content}</span>
      </div>
    );
  }
  return (
     <div className="text-slate-500 text-sm italic my-2">
        {content}
     </div>
  );
};

const ThinkBlock = ({ content }: { content: string }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div className="my-4 rounded-xl border border-blue-100 bg-blue-50/50 overflow-hidden">
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center gap-2 bg-blue-50/80 px-4 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
      >
        <Brain className="h-4 w-4" />
        <span>思考过程</span>
        {isCollapsed ? (
          <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
        ) : (
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        )}
      </button>
      
      {!isCollapsed && (
        <div className="border-t border-blue-100/50 px-4 py-3 text-slate-600 bg-white/50">
          <div 
            className="prose prose-slate max-w-none prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:text-slate-900 text-sm [&_p]:my-1"
            dangerouslySetInnerHTML={{ __html: marked(content || '') as string }}
          />
        </div>
      )}
    </div>
  );
};

const ImagePreview = ({ 
  visible, 
  src, 
  onClose 
}: { 
  visible: boolean; 
  src: string | null; 
  onClose: () => void;
}) => {
  return (
    <PhotoSlider
      images={src ? [{ src, key: src }] : []}
      visible={visible}
      onClose={onClose}
      index={0}
      bannerVisible={false}
      maskOpacity={0.9}
      overlayRender={({ onClose, onScale, scale, onRotate, rotate }) => (
        <>
          {/* Close Button - Top Right */}
          <div className="absolute top-5 right-5 z-50">
            <button 
              onClick={onClose} 
              className="p-2 text-white/90 hover:bg-white/20 rounded-full transition-colors"
              title="关闭"
            >
              <X className="h-8 w-8" />
            </button>
          </div>

          {/* Toolbar - Bottom Center */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-4 text-white/90 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-lg">
              <button 
                onClick={() => onScale(scale + 0.5)} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="放大"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button 
                onClick={() => onScale(scale - 0.5)} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="缩小"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <div className="w-px h-4 bg-white/20 mx-1" />
              <button 
                onClick={() => onRotate(rotate + 90)} 
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="旋转"
              >
                <RotateCw className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>
      )}
    />
  );
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 1. Pre-process content to handle echo tags
  const processedContent = useMemo(() => {
    // Match <::echo ... /> tags
    const echoTagRegex = /<::echo\s+([^>]*?)\s*\/>/g;
    
    return content.replace(echoTagRegex, (match, attrs, offset, fullString) => {
      // Check if this tag is at the end of the visible content (ignoring whitespace)
      const remaining = fullString.slice(offset + match.length);
      const isHidden = remaining.trim().length > 0;

      // Extract attributes
      const contentMatch = attrs.match(/content="([^"]*)"/);
      const fieldMatch = attrs.match(/field="([^"]*)"/);

      const props = {
        content: contentMatch ? contentMatch[1] : '',
        field: fieldMatch ? fieldMatch[1] : undefined,
        hidden: isHidden,
      };

      // Replace with a unique marker containing the JSON data
      return `__ECHO_JSON__${JSON.stringify(props)}__ECHO_JSON__`;
    });
  }, [content]);

  // 2. Parse content to separate <think> blocks and echo markers
  const parts = useMemo<Array<{ type: 'text' | 'think' | 'echo', content: string, props?: EchoProps }>>(() => {
    const result: Array<{ type: 'text' | 'think' | 'echo', content: string, props?: EchoProps }> = [];
    const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
    let lastIndex = 0;
    let match;

    // Helper to process text parts for echo markers
    const processTextPart = (text: string) => {
      const parts: Array<{ type: 'text' | 'echo', content: string, props?: EchoProps }> = [];
      const echoMarkerRegex = /__ECHO_JSON__(.*?)__ECHO_JSON__/g;
      let lastTextIndex = 0;
      let echoMatch;

      while ((echoMatch = echoMarkerRegex.exec(text)) !== null) {
        if (echoMatch.index > lastTextIndex) {
          parts.push({
            type: 'text',
            content: text.slice(lastTextIndex, echoMatch.index)
          });
        }
        
        try {
          const props = JSON.parse(echoMatch[1]);
          parts.push({
            type: 'echo',
            content: props.content,
            props
          });
        } catch (e) {
          // Fallback if JSON parse fails
          console.error('Failed to parse echo props', e);
        }
        
        lastTextIndex = echoMarkerRegex.lastIndex;
      }

      if (lastTextIndex < text.length) {
        parts.push({
          type: 'text',
          content: text.slice(lastTextIndex)
        });
      }
      return parts;
    };

    while ((match = thinkRegex.exec(processedContent)) !== null) {
      if (match.index > lastIndex) {
        const textContent = processedContent.slice(lastIndex, match.index);
        result.push(...processTextPart(textContent));
      }
      result.push({ 
        type: 'think', 
        content: match[1] 
      });
      lastIndex = thinkRegex.lastIndex;
    }

    if (lastIndex < processedContent.length) {
      const textContent = processedContent.slice(lastIndex);
      result.push(...processTextPart(textContent));
    }

    if (result.length === 0) {
      return [{ type: 'text', content: processedContent }];
    }

    return result;
  }, [processedContent]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        e.preventDefault();
        setPreviewImage(img.src);
      }
    };

    container.addEventListener('click', handleImageClick);
    return () => container.removeEventListener('click', handleImageClick);
  }, []);

  // Optimization: If there is only one part and it is text, render as before to maintain exact DOM structure and styles
  if (parts.length === 1 && parts[0].type === 'text') {
    return (
      <>
        <div
          ref={containerRef}
          className={cn("[&_img]:cursor-zoom-in", className)}
          dangerouslySetInnerHTML={{ __html: marked(parts[0].content || '') as string }}
        />
        <ImagePreview
          visible={!!previewImage}
          src={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      </>
    );
  }

  return (
    <>
      <div ref={containerRef} className={cn("[&_img]:cursor-zoom-in", className)}>
        {parts.map((part, index) => {
          if (part.type === 'think') {
            return <ThinkBlock key={index} content={part.content} />;
          }
          if (part.type === 'echo') {
            if (part.props?.hidden) return null;
            return <EchoBlock key={index} content={part.content} field={part.props?.field} />;
          }
          return (
            <div 
              key={index}
              dangerouslySetInnerHTML={{ __html: marked(part.content || '') as string }}
            />
          );
        })}
      </div>

      <ImagePreview
        visible={!!previewImage}
        src={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </>
  );
}
