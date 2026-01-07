import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getFileType = (file: File): string => {
  const type = file.type;
  const name = file.name.toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (type.startsWith('video/')) return 'video';
  if (type === 'application/pdf') return 'document';
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown')) return 'document';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'document';
  if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'document';
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'document';
  if (name.endsWith('.xml') || name.endsWith('.epub') || name.endsWith('.html') || name.endsWith('.htm')) return 'document';
  return 'custom';
};
