import React from 'react';
import { useForm } from 'react-hook-form';
export default function ChannelForm({ channel, onSubmit }) {
  const { register, handleSubmit } = useForm();
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3 text-xs">
      <div><label className="text-[10px] text-gray-600">Destino ({channel})</label><input {...register('destination')} className="input-base mt-1" /></div>
      <button type="submit" className="btn-primary w-fit">Guardar</button>
    </form>
  );
}
