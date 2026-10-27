# CanillitaFinanciero

Todas las noticias del mercado mundial, contadas para que las entiendan Don Carlos y Doña Rosa.

App web mobile first (Next.js 14) con:

- 15 mercados (Estados Unidos, Canadá, México, Brasil, Argentina, Reino Unido, Europa, Suiza, India, China, Hong Kong, Japón, Corea del Sur, Taiwán y Australia) más cripto, con su índice y cómo vienen hoy.
- Explorar: las principales acciones de cada mercado, ordenadas y por páginas.
- Subas y bajas del día por mercado, y las empresas más grandes de cada bolsa.
- Buscador de cualquier acción o cripto del mundo (todo lo que cubre Yahoo Finance).
- Página de cada activo: precio en vivo, gráfico, “¿por qué se movió hoy?” explicado con IA a partir de las noticias, opinión de analistas y datos clave.
- Temas (IA, dividendos, espacio…) y joyitas de los analistas.
- Cuentas de usuario, lista de seguimiento y cartera con ganancia total y del día en dólares.
- Asesor con IA que busca debilidades en la cartera y propone rotaciones conservadora, moderada y arriesgada con fundamentos y análisis técnico.

## Qué necesitás

| Servicio | Para qué | Variables |
| --- | --- | --- |
| [Supabase](https://supabase.com) | Usuarios, base de datos (lista, posiciones, caché de explicaciones) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Yahoo Finance (vía [yahoo-finance2](https://github.com/gadicc/node-yahoo-finance2)) | Precios, índices, cripto, analistas, noticias, gráficos. Gratis y sin clave | — |
| [Claude API](https://console.anthropic.com) | Explicaciones y asesor | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_MODEL_FAST` |
| [logo.dev](https://logo.dev) | Logos de empresas | `NEXT_PUBLIC_LOGO_DEV_TOKEN` (clave pública `pk_…`) |
| [Vercel](https://vercel.com) | Publicar la app | — |

Las claves `SUPABASE_SERVICE_ROLE_KEY` y `ANTHROPIC_API_KEY` son secretas: solo van en el servidor (Vercel) y nunca con el prefijo `NEXT_PUBLIC_`. La clave privada de logo.dev (`sk_…`) no se usa.

## Puesta en marcha

1. **Supabase**
   1. Creá un proyecto.
   2. En *SQL Editor*, pegá el contenido de `supabase/schema.sql` y ejecutalo. Crea las tablas y la seguridad por fila (cada usuario ve solo lo suyo).
   3. En *Authentication → URL Configuration*, poné como *Site URL* la dirección de tu app (por ejemplo `https://canillita.vercel.app`) y agregá `https://canillita.vercel.app/auth/callback` y `http://localhost:3000/auth/callback` en *Redirect URLs*.
   4. Opcional: en *Authentication → Providers* activá Google para el botón “Seguir con Google”.
2. **Variables**: copiá `.env.example` como `.env.local` y completalo.
3. **Probá los datos**: `npm install` y después `npm run check:datos`. Verifica que Yahoo Finance responda desde tu compu.
4. **Corré la app**: `npm run dev` y abrí http://localhost:3000.

## Si la app muestra datos vacíos

Abrí `https://tu-app.vercel.app/estado`. Prueba en vivo cada fuente de datos, cada variable y cada tabla de Supabase, y te dice qué hacer con lo que falla (también en JSON en `/api/estado`). Los errores de datos aparecen en los logs de Vercel con el prefijo `[Yahoo]`.

## Publicar en Vercel

1. Subí el repo a GitHub.
2. En Vercel: *Add New → Project*, elegí el repo (detecta Next.js solo).
3. En *Environment Variables* cargá todas las de `.env.example`, con `NEXT_PUBLIC_SITE_URL` igual a la URL de Vercel.
4. *Deploy*. Después, actualizá la *Site URL* y las *Redirect URLs* de Supabase con la URL final.

## Notas

- **Datos de Yahoo Finance**: son gratis y no necesitan clave, pero no es una API oficial. La documentación de yfinance aclara que es para uso personal y de investigación, y las condiciones de Yahoo no permiten usar sus datos en un producto comercial. Yahoo puede limitar las consultas desde servidores en la nube o cambiar las respuestas sin aviso. Para un lanzamiento comercial, conviene pasar a una fuente con licencia: toda la conexión está en `lib/yahoo.ts`.
- **Cobertura**: el buscador encuentra cualquier acción del mundo. Los rankings, el valor de cada mercado y Explorar se arman con las principales empresas de cada mercado (`lib/topSymbols.ts`, unas 500 en total) y, en Estados Unidos, también con las listas del día de Yahoo de "más suben" y "más bajan".
- **Caché**: las listas de cada mercado se actualizan cada 2 minutos, los precios que ves en pantalla cada 20 segundos, las explicaciones con IA una vez por día y activo, y las fichas de empresa (analistas, ratios) cada 12 horas.
- **Asesor**: cada usuario puede consultarlo hasta 2 veces por minuto. Si la app va a recomendar movimientos a terceros, en Argentina corresponde registrarse ante la CNV como Agente Asesor Global de Inversión.
- **Logos**: se cargan desde la CDN de logo.dev; si un logo no existe, se ve un monograma con las iniciales. No se descargan ni se guardan, como pide logo.dev.
- **Dónde tocar**: la conexión con Yahoo Finance está en `lib/yahoo.ts`; las empresas de cada mercado en `lib/topSymbols.ts`; los mercados y sus bolsas en `lib/markets.ts`; los temas en `lib/themes.ts`; los textos de la IA en `app/api/explain` y `app/api/advisor`.

## Estructura

```
app/                 páginas (inicio, mercado, acción, tema, joyitas, ingresar, cartera) y API
components/          piezas de interfaz (mapa, gráfico, buscador, cartera, asesor…)
lib/                 datos (Yahoo Finance), mercados, temas, indicadores técnicos, formato, Supabase, IA
supabase/schema.sql  tablas y seguridad
scripts/check-datos.mjs prueba de la fuente de datos
```
