/* eslint-disable */
// Banderas dibujadas en SVG (20×14). Nunca emojis: se ven distinto en cada teléfono.
export const FLAGSVG: Record<string, string> = {
 us:'<rect width="20" height="14" fill="#fff"/><g fill="#B22234"><rect width="20" height="2"/><rect y="4" width="20" height="2"/><rect y="8" width="20" height="2"/><rect y="12" width="20" height="2"/></g><rect width="9" height="8" fill="#3C3B6E"/><g fill="#fff"><circle cx="2.2" cy="2" r=".55"/><circle cx="4.5" cy="2" r=".55"/><circle cx="6.8" cy="2" r=".55"/><circle cx="3.3" cy="4" r=".55"/><circle cx="5.6" cy="4" r=".55"/><circle cx="2.2" cy="6" r=".55"/><circle cx="4.5" cy="6" r=".55"/><circle cx="6.8" cy="6" r=".55"/></g>',
 eu:'<rect width="20" height="14" fill="#003399"/><g fill="#FFCC00">'+Array.from({length:12},(_,i)=>`<circle cx="${(10+4*Math.cos(i*Math.PI/6)).toFixed(2)}" cy="${(7+4*Math.sin(i*Math.PI/6)).toFixed(2)}" r=".7"/>`).join('')+'</g>',
 jp:'<rect width="20" height="14" fill="#fff"/><circle cx="10" cy="7" r="4.1" fill="#BC002D"/>',
 hk:'<rect width="20" height="14" fill="#DE2910"/><g fill="#fff">'+Array.from({length:5},(_,i)=>`<ellipse cx="${(10+2.3*Math.cos(i*1.2566-1.5708)).toFixed(2)}" cy="${(7+2.3*Math.sin(i*1.2566-1.5708)).toFixed(2)}" rx="1.3" ry="2" transform="rotate(${i*72} ${(10+2.3*Math.cos(i*1.2566-1.5708)).toFixed(2)} ${(7+2.3*Math.sin(i*1.2566-1.5708)).toFixed(2)})"/>`).join('')+'</g><circle cx="10" cy="7" r=".7" fill="#DE2910"/>',
 br:'<rect width="20" height="14" fill="#009C3B"/><path d="M2.2 7 10 1.7 17.8 7 10 12.3Z" fill="#FFDF00"/><circle cx="10" cy="7" r="3.2" fill="#002776"/>',
 cr:'<rect width="20" height="14" fill="#111111"/><circle cx="10" cy="7" r="4.6" fill="#F6B40E"/><path d="M8.7 4.4h2.1c1 0 1.6.5 1.6 1.2 0 .5-.3.9-.8 1 .7.1 1.1.6 1.1 1.3 0 .9-.7 1.5-1.8 1.5H8.7Z M9.7 5.3v1.4h1c.5 0 .8-.3.8-.7s-.3-.7-.8-.7Z M9.7 7.5v1.6h1.1c.6 0 .9-.3.9-.8s-.3-.8-.9-.8Z" fill="#111111" fill-rule="evenodd"/>',
 ar:'<rect width="20" height="14" fill="#74ACDF"/><rect y="4.67" width="20" height="4.67" fill="#fff"/><circle cx="10" cy="7" r="1.4" fill="#F6B40E"/>'
};
