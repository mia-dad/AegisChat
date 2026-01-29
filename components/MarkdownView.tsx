import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = '' }) => {
  const html = useMemo(() => {
    if (!content) return '';
    try {
        // Configure marked to handle line breaks as <br>
        // @ts-ignore
        const raw = marked.parse(content, { async: false, breaks: true });
        return DOMPurify.sanitize(raw as string);
    } catch (e) {
        console.error("Markdown parsing failed", e);
        // Fallback to simple text rendering if parsing fails
        return content;
    }
  }, [content]);

  return (
    <div 
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownView;