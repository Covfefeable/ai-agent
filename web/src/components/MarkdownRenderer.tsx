import { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import { PhotoSlider } from 'react-photo-view';
import { ZoomIn, ZoomOut, RotateCw, X } from 'lucide-react';
import 'react-photo-view/dist/react-photo-view.css';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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

  return (
    <>
      <div
        ref={containerRef}
        className={cn("[&_img]:cursor-zoom-in", className)}
        dangerouslySetInnerHTML={{ __html: marked(content || '') as string }}
      />

      <PhotoSlider
        images={previewImage ? [{ src: previewImage, key: previewImage }] : []}
        visible={!!previewImage}
        onClose={() => setPreviewImage(null)}
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
    </>
  );
}
