import React, { useState, useRef, useEffect } from 'react';
import { useSendOLTCommand } from '../../hooks/useOLTs';
import { IconTerminal2 } from '@tabler/icons-react';

const QUICK_CMDS = ['display version', 'display cpu-usage', 'display alarm active all', 'display ont info 0/0/0 all', 'display temperature all'];

export default function OLTTerminal({ olt }) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([{ type: 'system', text: `Conectado a ${olt.name} (${olt.ip})` }]);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const endRef = useRef(null);
  const { mutate: sendCommand, isPending } = useSendOLTCommand();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const submit = () => {
    const cmd = input.trim();
    if (!cmd) return;
    setHistory(h => [...h, { type: 'input', text: cmd }]);
    setCmdHistory(h => [cmd, ...h]);
    setHistIdx(-1);
    setInput('');
    sendCommand({ id: olt.id, cmd }, {
      onSuccess: (data) => setHistory(h => [...h, { type: 'output', text: data.output || '(sin salida)' }]),
      onError: (err) => setHistory(h => [...h, { type: 'error', text: err.message }]),
    });
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') { submit(); return; }
    if (e.key === 'ArrowUp') {
      const idx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(idx);
      setInput(cmdHistory[idx] || '');
    }
    if (e.key === 'ArrowDown') {
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? '' : cmdHistory[idx] || '');
    }
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: '#080D18', border: '1px solid #1E2D45' }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: '#1E2D45', background: '#0F1825' }}>
        <IconTerminal2 size={12} style={{ color: '#00D4FF' }} />
        <span className="font-mono text-[10px] text-gray-500">olt@{olt.name.toLowerCase().replace(/\s+/g, '-')}:~$</span>
      </div>

      <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto" style={{ borderColor: '#1E2D45' }}>
        {QUICK_CMDS.map(cmd => (
          <button key={cmd} onClick={() => { setInput(cmd); }}
            className="flex-shrink-0 text-[9px] font-mono px-2 py-1 rounded transition-colors hover:text-cyan-400"
            style={{ background: '#1A2235', border: '1px solid #1E2D45', color: '#6B7280' }}>
            {cmd}
          </button>
        ))}
      </div>

      <div className="h-48 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {history.map((entry, i) => (
          <div key={i} style={{ color: entry.type === 'input' ? '#00D4FF' : entry.type === 'error' ? '#FF3B5C' : entry.type === 'system' ? '#A855F7' : '#9CA3AF' }}>
            {entry.type === 'input' && <span style={{ color: '#6B7280' }}>$ </span>}
            <span className="whitespace-pre-wrap">{entry.text}</span>
          </div>
        ))}
        {isPending && <div style={{ color: '#FF6B35' }}>Ejecutando...</div>}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: '#1E2D45' }}>
        <span className="font-mono text-[10px]" style={{ color: '#00D4FF' }}>$</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={isPending}
          placeholder="Ingrese comando..."
          className="flex-1 bg-transparent outline-none font-mono text-[11px] text-gray-200"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          autoFocus
        />
      </div>
    </div>
  );
}
