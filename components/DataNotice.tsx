import Link from 'next/link';

/** Aviso cuando el proveedor de precios no responde, en vez de mostrar todo en 0%. */
export default function DataNotice() {
  return (
    <div className="wrap" style={{ paddingTop: 16 }}>
      <div className="flash" role="status">
        No estamos recibiendo precios del proveedor en este momento, por eso algunos números pueden aparecer vacíos.{' '}
        <Link className="pl-link" href="/estado">Ver qué está fallando</Link>
      </div>
    </div>
  );
}
