import { Check, Copy, Database, ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SimpleTooltip } from '@/components/ui/tooltip';

type FeedbackRating = 'like' | 'dislike' | null;

interface MessageActionBarProps {
  className?: string;
  feedbackRating?: FeedbackRating;
  onLike?: () => void;
  onDislike?: () => void;
  onCopy?: () => void;
  copied?: boolean;
  onSaveToKb?: () => void;
}

export function MessageActionBar({
  className,
  feedbackRating = null,
  onLike,
  onDislike,
  onCopy,
  copied = false,
  onSaveToKb
}: MessageActionBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 transition-opacity duration-200',
        className
      )}
    >
      {onLike && (
        <SimpleTooltip
          content={feedbackRating === 'like' ? '取消点赞' : '点赞'}
          trigger={
            <button
              type="button"
              onClick={onLike}
              aria-label={feedbackRating === 'like' ? '取消点赞' : '点赞'}
              className={cn(
                'flex items-center gap-1 rounded p-1 text-xs transition-colors hover:bg-slate-100',
                feedbackRating === 'like' ? 'text-green-600' : 'text-slate-400'
              )}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
          }
        />
      )}

      {onDislike && (
        <SimpleTooltip
          content={feedbackRating === 'dislike' ? '取消点踩' : '点踩'}
          trigger={
            <button
              type="button"
              onClick={onDislike}
              aria-label={feedbackRating === 'dislike' ? '取消点踩' : '点踩'}
              className={cn(
                'flex items-center gap-1 rounded p-1 text-xs transition-colors hover:bg-slate-100',
                feedbackRating === 'dislike' ? 'text-red-600' : 'text-slate-400'
              )}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          }
        />
      )}

      {onCopy && (
        <SimpleTooltip
          content={copied ? '已复制' : '复制'}
          trigger={
            <button
              type="button"
              onClick={onCopy}
              aria-label={copied ? '已复制' : '复制'}
              className="flex items-center gap-1 rounded p-1 text-xs text-slate-400 transition-colors hover:bg-slate-100"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          }
        />
      )}

      {onSaveToKb && (
        <SimpleTooltip
          content="保存到知识库"
          trigger={
            <button
              type="button"
              onClick={onSaveToKb}
              aria-label="保存到知识库"
              className="flex items-center gap-1 rounded p-1 text-xs text-slate-400 transition-colors hover:bg-slate-100"
            >
              <Database className="h-3.5 w-3.5" />
            </button>
          }
        />
      )}
    </div>
  );
}
