import React from 'react';

interface ContractRendererProps {
  content: string;
  data: Record<string, string>;
  className?: string;
  fontSize?: number;
  onChange?: (key: string, value: string) => void;
}

export const ContractRenderer: React.FC<ContractRendererProps> = ({ content, data, className = '', fontSize = 12, onChange }) => {
  if (!content) return null;

  const baseSize = fontSize;

  // Process placeholders inside text securely
  const processText = (text: string, keyBase: number) => {
    // Regex for placeholders matching {{VARIABLE}}
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, idx) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const key = part.slice(2, -2).trim();
        const val = data[key] || '';
        
        return (
          <span
            key={`${keyBase}-${idx}`}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const newVal = e.currentTarget.textContent || '';
              if (onChange) {
                onChange(key, newVal === `{{${key}}}` ? '' : newVal);
              }
            }}
            className={`inline px-1 rounded transition-all outline-none focus:bg-blue-50 focus:ring-1 focus:ring-[#004777]/30 cursor-text ${
              val
                ? 'font-bold underline decoration-[#004777]/30 text-[#004777]'
                : 'text-[#966b1d] font-mono font-semibold bg-[#F0D18A]/20 border-b border-dashed border-[#966b1d]'
            }`}
          >
            {val || `{{${key}}}`}
          </span>
        );
      }
      return <span key={`${keyBase}-${idx}`}>{part}</span>;
    });
  };

  // Normalize line endings, then split into blocks by one or more blank lines
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawBlocks = normalized.split(/\n{2,}/);

  const parsedElements = rawBlocks.map((rawBlock, bIdx) => {
    const block = rawBlock.trim();
    if (!block) return null;

    // Colapsa múltiplos espaços horizontais e tabs para texto corrido limpo
    const cleanBlock = block.replace(/[ \t]+/g, ' ');

    // Split by single newlines and join to form continuous paragraph flow (rebuild word wrap)
    const lines = cleanBlock.split('\n').map(l => l.trim()).filter(Boolean);
    const joinedText = lines.join(' ');

    // 1. MAIN TITLE (e.g. CONTRATO DE LOCAÇÃO)
    const isMainTitle =
      lines.length <= 2 &&
      joinedText === joinedText.toUpperCase() &&
      joinedText.length < 80 &&
      !joinedText.match(/^\d/) &&
      !joinedText.includes(':') &&
      !joinedText.includes('_');

    if (isMainTitle) {
      return (
        <h1
          key={bIdx}
          className="text-center font-bold uppercase tracking-wider mb-6 mt-0 break-inside-avoid"
          style={{
            textAlign: 'center',
            fontWeight: 700,
            fontSize: `${baseSize + 2}pt`,
            marginBottom: '24pt',
            marginTop: '0',
            letterSpacing: '0.5px',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          {processText(joinedText, bIdx)}
        </h1>
      );
    }

    // 2. SIGNATURE BLOCKS (centered, no indentation, break avoided)
    if (joinedText.includes('_____') || (bIdx > rawBlocks.length - 15 && /^[A-ZÁÂÀÃÉÊÍÓÔÕÚÜÇ][a-záâàãéêíóôõúüç]+ Solteira/.test(joinedText))) {
      return (
        <div
          key={bIdx}
          className="text-center my-6 break-inside-avoid"
          style={{
            textAlign: 'center',
            margin: '18pt 0 6pt',
            fontSize: `${baseSize - 1}pt`,
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          {lines.map((line, lIdx) => (
            <div key={lIdx} style={{ marginTop: lIdx === 0 ? 0 : '4pt' }}>
              {processText(line, bIdx * 1000 + lIdx)}
            </div>
          ))}
        </div>
      );
    }

    // 3. DATE/CITY LINES (e.g., Ilha Solteira-SP, 25 de maio de 2026)
    if (/Ilha Solteira/i.test(joinedText) && joinedText.length < 60) {
      return (
        <p
          key={bIdx}
          className="text-center my-6"
          style={{
            textAlign: 'center',
            marginBottom: '18pt',
            marginTop: '24pt',
            fontSize: `${baseSize}pt`,
          }}
        >
          {processText(joinedText, bIdx)}
        </p>
      );
    }

    // 4. PARAGRAPH with uppercase labels (e.g. LOCADORA:, LOCATÁRIO:, OBJETO DE LOCAÇÃO:)
    const labelMatch = joinedText.match(/^([A-ZÁÂÀÃÉÊÍÓÔÕÚÜÇ][A-Za-záâàãéêíóôõúüç\s\d\.\º]*?):\s+(.+)$/s);
    const numberHeadingMatch = joinedText.match(/^(\d[\d\.]*\s+[A-ZÁÂÀÃÉÊÍÓÔÕÚÜÇ][A-Za-záâàãéêíóôõúüç\s]+:?)\s+(.+)$/s);
    const subItemMatch = joinedText.match(/^([A-Fa-f]\)|[A-Fa-f]\)|\d+\.\d+\.?)\s+(.+)$/s);

    const isListOrLabel = labelMatch || numberHeadingMatch || subItemMatch;

    // Standard word document body text style
    const pStyle: React.CSSProperties = {
      textAlign: 'justify',
      textJustify: 'inter-word',
      marginBottom: '12pt',
      fontSize: `${baseSize}pt`,
      lineHeight: 1.5,
      textIndent: isListOrLabel ? '0' : '2.5em', // 2.5em first-line indent for body paragraphs
      paddingLeft: subItemMatch ? '1.5em' : '0',
    };

    if (labelMatch && !subItemMatch && joinedText.indexOf(':') < 80) {
      const [, label, rest] = labelMatch;
      return (
        <p key={bIdx} style={pStyle}>
          <strong style={{ fontWeight: 700 }}>{label}:</strong>{' '}
          {processText(rest, bIdx)}
        </p>
      );
    }

    if (numberHeadingMatch) {
      const [, heading, rest] = numberHeadingMatch;
      return (
        <p key={bIdx} style={pStyle}>
          <strong style={{ fontWeight: 700 }}>{heading}</strong>{' '}
          {processText(rest, bIdx)}
        </p>
      );
    }

    // 5. STANDARD PARAGRAPH
    return (
      <p key={bIdx} style={pStyle}>
        {processText(joinedText, bIdx)}
      </p>
    );
  });

  return (
    <div
      className={`contract-renderer-container prose max-w-none ${className}`}
      style={{
        fontFamily: "'Times New Roman', Times, Baskerville, Georgia, serif",
        color: '#000000',
        fontSize: `${baseSize}pt`,
        lineHeight: 1.5,
      }}
    >
      {parsedElements}
    </div>
  );
};
