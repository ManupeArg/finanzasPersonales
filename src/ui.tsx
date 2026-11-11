import { useEffect, useState, type ReactNode } from 'react'
import { leerMonto } from './lib/format'
import type { Moneda } from './lib/types'

export type Pantalla = 'inicio' | 'gastos' | 'ahorro' | 'plata' | 'metas' | 'chicos' | 'prediccion' | 'cobros' | 'ajustes'
export const ir = (p: Pantalla) => { window.location.hash = p === 'inicio' ? '' : p }

export function Encabezado({ titulo, volver, children }: { titulo: string; volver?: boolean; children?: ReactNode }) {
  return (
    <header className="encabezado">
      {volver && <button className="volver" onClick={() => ir('inicio')} aria-label="Volver al inicio">‹</button>}
      <h1>{titulo}</h1>
      <div className="encabezado-acciones">{children}</div>
    </header>
  )
}

export function Hoja({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])
  return (
    <div className="hoja-fondo" onMouseDown={e => e.target === e.currentTarget && onCerrar()}>
      <div className="hoja" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="hoja-cabeza">
          <h2>{titulo}</h2>
          <button className="cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Campo({ etiqueta, ayuda, children }: { etiqueta: string; ayuda?: string; children: ReactNode }) {
  return (
    <label className="campo">
      <span>{etiqueta}</span>
      {children}
      {ayuda && <small>{ayuda}</small>}
    </label>
  )
}

export function SelectorMoneda({ valor, onChange }: { valor: Moneda; onChange: (m: Moneda) => void }) {
  const opciones: [Moneda, string][] = [['ARS', 'Pesos'], ['USD', 'Dólares'], ['EUR', 'Euros']]
  return (
    <div className="segmentos" role="radiogroup" aria-label="Moneda">
      {opciones.map(([m, nombre]) => (
        <button type="button" key={m} role="radio" aria-checked={valor === m} className={valor === m ? 'activo' : ''} onClick={() => onChange(m)}>
          {nombre}
        </button>
      ))}
    </div>
  )
}

/** Botones de pie de formulario: guardar y, si se está editando, borrar en dos pasos. */
export function PieFormulario({ guardar, onBorrar, ocupado }: { guardar: string; onBorrar?: () => void; ocupado?: boolean }) {
  const [confirmar, setConfirmar] = useState(false)
  return (
    <div className="pie-form">
      {onBorrar && (confirmar
        ? <button type="button" className="boton peligro" onClick={onBorrar}>Sí, borrar</button>
        : <button type="button" className="boton suave" onClick={() => setConfirmar(true)}>Borrar</button>)}
      <button type="submit" className="boton principal" disabled={ocupado}>{guardar}</button>
    </div>
  )
}

/** Devuelve el número o null si el texto no es un monto válido mayor o igual a cero. */
export function montoValido(texto: string, permitirCero = true): number | null {
  if (!texto.trim()) return null
  const n = leerMonto(texto)
  if (Number.isNaN(n) || n < 0 || (!permitirCero && n === 0)) return null
  return n
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="vacio">{children}</p>
}
