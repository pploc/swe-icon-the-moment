import type MarkdownIt from 'markdown-it'

export declare function escapeHtml(text: string): string
export declare function mermaidFence(code: string): string
export declare const markdownOptions: MarkdownIt.Options
export declare function applyMarkdownPlugins(md: MarkdownIt): MarkdownIt
