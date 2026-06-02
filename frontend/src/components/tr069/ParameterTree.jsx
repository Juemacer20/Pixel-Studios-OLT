import React from 'react';
export default function ParameterTree({ parameters = {} }) {
  return (
    <pre className="font-mono text-[10px] text-gray-400 overflow-auto max-h-80 p-3 rounded" style={{ background: '#080D18', border: '1px solid #1E2D45' }}>
      {JSON.stringify(parameters, null, 2)}
    </pre>
  );
}
