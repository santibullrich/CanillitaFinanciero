/** Máscara de tierra del mapa de puntos: 141 columnas × 64 filas, de 130°O a 152°E y de 72°N a 56°S, cada celda de 2°. */
export const MAP = { cols: 141, rows: 64, lon0: -130, lat0: 72, step: 2,
  mask: 'A//x+Af//AAAAAAAB///////z//z8B//AAAB/AA////////////P4P/AAAA///////////////4/A/APgAPH//////////////gADwAAAHz//////////////AAAOAAAB+f/////////////AP4AAAAAPx/////////8H//8B/gAAABgsf/////////A////P+AAAAMEH/////////wH///9/4AAAG7//////////+Af/////gAAAG///////////4A/////+AAAA////////////QH////+YAAAD///////////yA////+AAAAAf3+j///////8AH////AAAAA/jfgf//////+DA////wAAAAHwk7////////ggH///8AAAAA+AW///////8MEAf///AAAAAHhkD///////hjAB///4AAAAAP8AB//////+J4AH//+AAAAAD/gAP//////wQAAf//gAAAAA//3////////AAAA/4MAAAAAP///f3/////4AAAL8AgAAAAD///9/P////+AAAAPgAAAAAA////v4B////oAAAA8AgAAAAH///+/8H///4AAAAHhDAAAAB////7/gP4/wAAAAAeIDAAAAH////f8B+D8AAAAAA/AAAAAA////5+AHgfwIAAAAA+AAAAAH////vAA4A+BAAAAAAwAAAAA////+AADAHwAAAAAACHwAAAH////5AAYAuAAAAAAAN/wAAAf////4ACAEgCAAAAAAP/AAAB/////AAEAgAwAAAAAB//AAADj///wAAADAgAAAAAAf/4AAAAD//8AAAA4cAAAAAAD//gAAAAf//AAAACHsAAAAAAf/+AAAAH//wAAAAY9AAAAAAD//+AAAAf/8AAAABDILgAAAA///+AAAB//gAAAAEBAeAAAAD///wAAAP/8AAAAAcAB8AAAAP//+AAAB//gAAAAAAAAwAAAB///gAAAH/8AAAAAAAAAAAAAH//4AAAA//hAAAAAADiAAAAA///AAAAP/8IAAAAAB8YAAAAB//4AAAB//HAAAAAA/zAAAAAH//AAAAP/w4AAAAAH/4AAAAA//4AAAA/+GAAAAAH//gAAAAH/8AAAAH/wwAAAAB//+AAAAB/+AAAAAf8EAAAAAP//4AAAAP/wAAAAD/AAAAAAB///AAAAB/8AAAAAf4AAAAAAP//4AAAAP/gAAAAB+AAAAAAB///AAAAB/4AAAAAPgAAAAAAPh/4AAAAP4AAAAAAAAAAAAAAAD+AAAAD/AAAAAAAAAAAAAAAAHwAAAAfgAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAABgAAAAfAAAAAAAAAAAAAAAAAEAAAADwAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAAAAAAAAAAAAHgAAAAAAAAAAAAAAAAAAAAAAYAAAAAAAAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' };
export const lonLatToCell = ([lon, lat]: [number, number]) => [(lon - MAP.lon0) / MAP.step, (MAP.lat0 - lat) / MAP.step] as const;
export function landDots() {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bits = '';
  for (const ch of MAP.mask) bits += A.indexOf(ch).toString(2).padStart(6, '0');
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < MAP.cols * MAP.rows; i++) if (bits[i] === '1') out.push({ x: (i % MAP.cols) + 0.5, y: Math.floor(i / MAP.cols) + 0.5 });
  return out;
}
