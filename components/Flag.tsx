import { FLAGSVG } from '@/lib/flagsvg';
import { marketById } from '@/lib/markets';

export default function Flag({ id, size }: { id: string; size?: 'lg' }) {
  const svg = FLAGSVG[id];
  if (!svg) return null;
  return (
    <svg className={`flag${size ? ' ' + size : ''}`} viewBox="0 0 20 14" role="img" aria-label={`Bandera de ${marketById(id)?.name ?? id}`}
      dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
