import React from 'react';
export default function TaskQueue({ tasks = [] }) {
  return (
    <div className="text-xs">
      {tasks.length === 0 ? <div className="text-gray-600 text-center py-4">Sin tareas pendientes</div> :
        tasks.map(t => <div key={t.id} className="flex items-center gap-2 py-2 border-b border-[#1E2D45]">
          <span className="font-mono text-gray-400">{t.type}</span>
          <span className="text-gray-600 text-[10px]">{t.status}</span>
        </div>)}
    </div>
  );
}
