import React, { useState } from 'react';
import { IconCopy, IconCheck } from '@tabler/icons-react';

export default function CopyButton({ text, size = 13 }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="text-gray-600 hover:text-cyan-400 transition-colors" title="Copiar">
      {copied ? <IconCheck size={size} style={{ color: '#00FF94' }} /> : <IconCopy size={size} />}
    </button>
  );
}
