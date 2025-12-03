import React, { useState, useRef } from 'react';
import { Bold, Italic, Underline, Strikethrough, Heading2, Quote, List, ListOrdered, SmilePlus } from 'lucide-react';
import { Button } from './UI';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  rows?: number;
  label?: string;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  maxLength = 2500,
  rows = 15,
  label,
  placeholder = 'Write your chapter content here...'
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const commonEmojis = ['😊', '😂', '😍', '🎉', '🔥', '✨', '💫', '⭐', '👍', '💯', '😢', '😡', '🤔', '💔', '🌙', '☀️', '💪', '🎭', '📖', '✍️', '❤️', '💜', '💚', '💙', '🖤', '🤍'];

  const getSelectionBounds = () => {
    if (!textareaRef.current) return null;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    return { start, end };
  };

  const insertFormatting = (before: string, after: string = '') => {
    if (!textareaRef.current) return;

    const bounds = getSelectionBounds();
    if (!bounds) return;

    const { start, end } = bounds;
    const selectedText = value.substring(start, end) || 'text';
    const newValue = value.substring(0, start) + before + selectedText + after + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + before.length + selectedText.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    if (!textareaRef.current) return;

    const bounds = getSelectionBounds();
    if (!bounds) return;

    const { end } = bounds;
    const newValue = value.substring(0, end) + emoji + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(end + emoji.length, end + emoji.length);
      }
    }, 0);

    setShowEmojiPicker(false);
  };

  const handleBold = () => insertFormatting('**', '**');
  const handleItalic = () => insertFormatting('*', '*');
  const handleUnderline = () => insertFormatting('<u>', '</u>');
  const handleStrike = () => insertFormatting('~~', '~~');
  const handleHeading = () => insertFormatting('## ', '');
  const handleQuote = () => insertFormatting('\n> ', '');
  const handleList = () => insertFormatting('\n• ', '');
  const handleOrderedList = () => insertFormatting('\n1. ', '');

  const wordCount = value.trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>}

      <div className="bg-slate-800 rounded-lg border border-slate-600 overflow-hidden">
        <div className="bg-slate-900 p-2 sm:p-3 border-b border-slate-600 flex flex-wrap gap-1 justify-start sm:justify-start">
          <button
            type="button"
            onClick={handleBold}
            className="p-1.5 sm:p-2 rounded hover:bg-slate-700 text-gray-300 hover:text-white transition-colors flex-shrink-0"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleItalic}
            className="p-1.5 sm:p-2 rounded hover:bg-slate-700 text-gray-300 hover:text-white transition-colors flex-shrink-0"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleUnderline}
            className="p-1.5 sm:p-2 rounded hover:bg-slate-700 text-gray-300 hover:text-white transition-colors flex-shrink-0"
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleStrike}
            className="p-1.5 sm:p-2 rounded hover:bg-slate-700 text-gray-300 hover:text-white transition-colors flex-shrink-0"
            title="Strike"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="w-px bg-slate-700 hidden sm:block"></div>

          <button
            type="button"
            onClick={handleHeading}
            className="p-1.5 sm:p-2 rounded hover:bg-slate-700 text-gray-300 hover:text-white transition-colors flex-shrink-0"
            title="Heading"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleQuote}
            className="p-1.5 sm:p-2 rounded hover:bg-slate-700 text-gray-300 hover:text-white transition-colors flex-shrink-0"
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleList}
            className="p-1.5 sm:p-2 rounded hover:bg-slate-700 text-gray-300 hover:text-white transition-colors flex-shrink-0"
            title="List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOrderedList}
            className="p-1.5 sm:p-2 rounded hover:bg-slate-700 text-gray-300 hover:text-white transition-colors flex-shrink-0"
            title="Ordered"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-px bg-slate-700 hidden sm:block"></div>

          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 sm:p-2 rounded hover:bg-slate-700 text-gray-300 hover:text-white transition-colors"
              title="Emoji"
            >
              <SmilePlus className="w-4 h-4" />
            </button>

            {showEmojiPicker && (
              <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg p-2 grid grid-cols-6 sm:grid-cols-7 gap-1 z-10 shadow-lg max-h-48 overflow-y-auto">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="p-1 sm:p-2 text-base sm:text-lg hover:bg-slate-700 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-4 py-3 bg-slate-800 text-white focus:outline-none resize-none font-serif text-base leading-relaxed"
        />

        <div className="bg-slate-900 px-3 sm:px-4 py-2 border-t border-slate-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-gray-400">
          <div className="space-x-2 sm:space-x-4">
            <span>W: {wordCount}</span>
            <span>C: {value.length}</span>
          </div>
          <div className={`font-medium ${value.length > maxLength * 0.9 ? 'text-amber-400' : 'text-gray-400'}`}>
            {value.length} / {maxLength}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Supports: **bold**, *italic*, &lt;u&gt;underline&lt;/u&gt;, ~~strikethrough~~, ## headings, &gt; quotes, • lists, and emojis
      </p>
    </div>
  );
};
