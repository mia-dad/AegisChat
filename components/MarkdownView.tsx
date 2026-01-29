import React, { useMemo } from 'react';
// fix: 使用 CDN 直接引入，解决本地未安装 node_modules 依赖导致的 "Failed to resolve import" 错误
// 如果您后续运行了 npm install marked dompurify，可以改回 'marked' 和 'dompurify'
// @ts-ignore
import { marked } from 'https://esm.sh/marked@15.0.0';
// @ts-ignore
import DOMPurify from 'https://esm.sh/dompurify@3.2.3';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = '' }) => {
  const html = useMemo(() => {
    if (!content) return '';
    try {
        // Configure marked to handle line breaks as <br>
        // marked v15+ 需要显式 async: false 以确保同步返回字符串
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