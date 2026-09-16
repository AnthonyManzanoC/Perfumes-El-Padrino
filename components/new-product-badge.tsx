'use client';

import { useEffect, useState } from 'react';

export function NewProductBadge({ until }: { until?: string | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(timer);
      const remaining = until ? Date.parse(until) - Date.now() : 0;
      setVisible(remaining > 0);
      // Browsers limit timers to a signed 32-bit integer (about 25 days).
      if (remaining > 0)
        timer = setTimeout(update, Math.min(remaining, 2147483647));
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [until]);

  if (!visible) return null;
  return (
    <span className="rounded-full bg-[#d8b969] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#171611] shadow-sm">
      Nuevo
    </span>
  );
}
