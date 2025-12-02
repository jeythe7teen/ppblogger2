import React from 'react';

interface FormattedContentProps {
  content: string;
  className?: string;
}

export const FormattedContent: React.FC<FormattedContentProps> = ({ content, className = '' }) => {
  const parseContent = (text: string): (string | React.ReactNode)[] => {
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let elementKey = 0;

    const patterns = [
      {
        regex: /\*\*(.+?)\*\*/g,
        render: (match: string) => (
          <strong key={elementKey++} className="font-bold">
            {match.slice(2, -2)}
          </strong>
        )
      },
      {
        regex: /\*(.+?)\*/g,
        render: (match: string) => (
          <em key={elementKey++} className="italic">
            {match.slice(1, -1)}
          </em>
        )
      },
      {
        regex: /<u>(.+?)<\/u>/g,
        render: (match: string) => (
          <u key={elementKey++} className="underline">
            {match.slice(3, -4)}
          </u>
        )
      },
      {
        regex: /~~(.+?)~~/g,
        render: (match: string) => (
          <s key={elementKey++} className="line-through">
            {match.slice(2, -2)}
          </s>
        )
      },
      {
        regex: /## (.+?)(?=\n|$)/g,
        render: (match: string) => (
          <h3 key={elementKey++} className="text-xl font-bold mt-4 mb-2 text-white">
            {match.slice(3)}
          </h3>
        )
      },
      {
        regex: /> (.+?)(?=\n|$)/g,
        render: (match: string) => (
          <blockquote key={elementKey++} className="border-l-4 border-primary pl-4 py-2 my-2 text-gray-400 italic">
            {match.slice(2)}
          </blockquote>
        )
      }
    ];

    let tempText = text;

    patterns.forEach(({ regex, render }) => {
      let match;
      const tempParts: (string | React.ReactNode)[] = [];
      lastIndex = 0;

      while ((match = regex.exec(tempText)) !== null) {
        if (match.index > lastIndex) {
          tempParts.push(tempText.slice(lastIndex, match.index));
        }
        tempParts.push(render(match[0]));
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < tempText.length) {
        tempParts.push(tempText.slice(lastIndex));
      }

      tempText = '';
      tempParts.forEach(part => {
        if (typeof part === 'string') {
          tempText += part;
        } else {
          parts.push(tempText);
          parts.push(part);
          tempText = '';
        }
      });
    });

    if (tempText) {
      parts.push(tempText);
    }

    return parts.length > 0 ? parts : [text];
  };

  const renderLines = () => {
    return content.split('\n').map((line, idx) => {
      line = line.trim();

      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-xl font-bold mt-4 mb-2 text-white">
            {line.slice(3)}
          </h3>
        );
      }

      if (line.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-primary pl-4 py-2 my-2 text-gray-400 italic">
            {parseFormattedLine(line.slice(2))}
          </blockquote>
        );
      }

      if (line.match(/^• /)) {
        return (
          <li key={idx} className="ml-4">
            {parseFormattedLine(line.slice(2))}
          </li>
        );
      }

      if (line.match(/^\d+\. /)) {
        return (
          <li key={idx} className="ml-4" style={{ listStyleType: 'decimal' }}>
            {parseFormattedLine(line.slice(line.indexOf('.') + 2))}
          </li>
        );
      }

      if (line.length === 0) {
        return <br key={idx} />;
      }

      return (
        <p key={idx} className="mb-2">
          {parseFormattedLine(line)}
        </p>
      );
    });
  };

  const parseFormattedLine = (line: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let keyCounter = 0;

    const boldRegex = /\*\*(.+?)\*\*/g;
    const italicRegex = /\*(.+?)\*/g;
    const underlineRegex = /<u>(.+?)<\/u>/g;
    const strikeRegex = /~~(.+?)~~/g;

    let match;
    const matches: Array<{ start: number; end: number; type: string; text: string }> = [];

    while ((match = boldRegex.exec(line)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length, type: 'bold', text: match[1] });
    }

    while ((match = italicRegex.exec(line)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length, type: 'italic', text: match[1] });
    }

    while ((match = underlineRegex.exec(line)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length, type: 'underline', text: match[1] });
    }

    while ((match = strikeRegex.exec(line)) !== null) {
      matches.push({ start: match.index, end: match.index + match[0].length, type: 'strike', text: match[1] });
    }

    matches.sort((a, b) => a.start - b.start);

    matches.forEach(m => {
      if (m.start > lastIndex) {
        elements.push(line.slice(lastIndex, m.start));
      }

      switch (m.type) {
        case 'bold':
          elements.push(
            <strong key={keyCounter++} className="font-bold">
              {m.text}
            </strong>
          );
          break;
        case 'italic':
          elements.push(
            <em key={keyCounter++} className="italic">
              {m.text}
            </em>
          );
          break;
        case 'underline':
          elements.push(
            <u key={keyCounter++} className="underline">
              {m.text}
            </u>
          );
          break;
        case 'strike':
          elements.push(
            <s key={keyCounter++} className="line-through">
              {m.text}
            </s>
          );
          break;
      }

      lastIndex = m.end;
    });

    if (lastIndex < line.length) {
      elements.push(line.slice(lastIndex));
    }

    return elements;
  };

  return (
    <div className={`text-base sm:text-lg text-gray-300 leading-relaxed font-serif whitespace-pre-wrap ${className}`}>
      {renderLines()}
    </div>
  );
};
