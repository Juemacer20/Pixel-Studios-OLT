import React from 'react';
import { IconInbox } from '@tabler/icons-react';

export default function EmptyState({ icon: Icon = IconInbox, title = 'Sin datos', message = '' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={40} className="text-gray-700 mb-3" />
      <div className="text-sm font-medium text-gray-500">{title}</div>
      {message && <div className="text-xs text-gray-600 mt-1 max-w-xs">{message}</div>}
    </div>
  );
}
