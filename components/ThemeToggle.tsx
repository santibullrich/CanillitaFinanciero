'use client';
import { useEffect, useState } from 'react';

const KEY = 'canillita-edicion';
const MOON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>;
const PAPER = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round"><path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Z" /><path d="M17 9h3v8a2 2 0 0 1-2 2" /><path d="M7 9h7M7 12h7M7 15h4" strokeLinecap="round" /></svg>;

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => {
      const t = document.documentElement.getAttribute('data-theme');
      setDark(t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
    };
    read();
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener?.('change', read);
    return () => mq.removeEventListener?.('change', read);
  }, []);
  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch { /* sin almacenamiento */ }
    setDark(!dark);
  };
  return (
    <button className="tgl" type="button" onClick={toggle} aria-label={dark ? 'Pasar al modo papel' : 'Pasar al modo noche'}>
      {dark ? PAPER : MOON}<span className="tl">{dark ? 'Papel' : 'Modo noche'}</span>
    </button>
  );
}

/** Script que se ejecuta antes de pintar para evitar el parpadeo de tema. */
export const themeInit = `try{var t=localStorage.getItem('${KEY}');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
