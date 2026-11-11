import { useState, type FormEvent } from 'react'
import { plata } from '../lib/format'
import type { Cuenta, Moneda } from '../lib/types'
import { useResumen, useStore } from '../store'
import { Campo, Encabezado, Hoja, PieFormulario, SelectorMoneda, Vacio, montoValido } from '../ui'

const TEXTOS = {
  ahorro: {
    titulo: 'Ahorro', total: 'Total ahorrado', nuevo: 'Agregar lugar', editar: 'Editar ahorro',
    ejemplo: 'ARQ, dólares en casa, plazo fijo…',
    vacio: 'Todavía no cargaste dónde tenés tus ahorros. Agregá cada lugar con su moneda: ARQ, dólares, euros o lo que uses.',
  },
  actual: {
    titulo: 'Plata actual', total: 'Disponible hoy', nuevo: 'Agregar lugar', editar: 'Editar lugar',
    ejemplo: 'Efectivo, Mercado Pago, banco…',
    vacio: 'Cargá dónde está la plata que usás día a día: efectivo, billeteras, cuenta del banco.',
  },
}

export default function Cuentas({ tipo }: { tipo: Cuenta['tipo'] }) {
  const { datos, ajustes } = useStore()
  const r = useResumen()
  const t = TEXTOS[tipo]
  const [editando, setEditando] = useState<Cuenta | 'nueva' | null>(null)
  const cuentas = datos.cuentas.filter(c => c.tipo === tipo)
  const total = tipo === 'ahorro' ? r.ahorro : r.actual
  const monedas = (['ARS', 'USD', 'EUR'] as Moneda[]).filter(m => cuentas.some(c => c.moneda === m))

  return (
    <>
      <Encabezado titulo={t.titulo} volver />
      <div className="total">
        <span>{t.total}</span>
        <strong>{plata(total)}</strong>
        {monedas.some(m => m !== 'ARS') && (
          <p>{monedas.map(m => plata(cuentas.filter(c => c.moneda === m).reduce((s, c) => s + c.monto, 0), m)).join(' + ')}</p>
        )}
      </div>

      {cuentas.length === 0 && <Vacio>{t.vacio}</Vacio>}
      <ul className="lista">
        {cuentas.map(c => {
          const pesos = r.enPesos(c.monto, c.moneda)
          return (
            <li key={c.id}>
              <button onClick={() => setEditando(c)}>
                <span className="lista-nombre">{c.nombre}
                  {total > 0 && <i className="barra"><i style={{ width: `${Math.max(2, (pesos / total) * 100)}%` }} /></i>}
                </span>
                <span className="lista-valor">{plata(c.monto, c.moneda)}
                  {c.moneda !== 'ARS' && <small>{(c.moneda === 'USD' ? ajustes.usd : ajustes.eur) > 0 ? plata(pesos) : 'sin cotización'}</small>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <button className="boton principal ancho" onClick={() => setEditando('nueva')}>{t.nuevo}</button>

      {editando && <FormCuenta tipo={tipo} cuenta={editando === 'nueva' ? null : editando} onCerrar={() => setEditando(null)} />}
    </>
  )
}

function FormCuenta({ tipo, cuenta, onCerrar }: { tipo: Cuenta['tipo']; cuenta: Cuenta | null; onCerrar: () => void }) {
  const { crear, editar, borrar } = useStore()
  const t = TEXTOS[tipo]
  const [nombre, setNombre] = useState(cuenta?.nombre ?? '')
  const [moneda, setMoneda] = useState<Moneda>(cuenta?.moneda ?? 'ARS')
  const [monto, setMonto] = useState(cuenta ? String(cuenta.monto).replace('.', ',') : '')
  const [falla, setFalla] = useState('')

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const n = montoValido(monto)
    if (!nombre.trim()) return setFalla('Ponele un nombre al lugar.')
    if (n === null) return setFalla('Escribí el monto solo con números, por ejemplo 250000.')
    const fila = { tipo, nombre: nombre.trim(), moneda, monto: n }
    if (await (cuenta ? editar('cuentas', cuenta.id, fila) : crear('cuentas', fila))) onCerrar()
  }

  return (
    <Hoja titulo={cuenta ? t.editar : t.nuevo} onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <Campo etiqueta="Dónde está"><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder={t.ejemplo} autoFocus={!cuenta} /></Campo>
        <Campo etiqueta="Moneda"><SelectorMoneda valor={moneda} onChange={setMoneda} /></Campo>
        <Campo etiqueta="Cuánto hay"><input value={monto} onChange={e => setMonto(e.target.value)} inputMode="decimal" placeholder="0" /></Campo>
        {falla && <p className="falla">{falla}</p>}
        <PieFormulario guardar="Guardar" onBorrar={cuenta ? async () => { if (await borrar('cuentas', cuenta.id)) onCerrar() } : undefined} />
      </form>
    </Hoja>
  )
}
