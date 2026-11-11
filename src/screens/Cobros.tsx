import { useState, type FormEvent } from 'react'
import { fechaCorta, hoyISO, plata } from '../lib/format'
import type { Ingreso, Moneda } from '../lib/types'
import { useResumen, useStore } from '../store'
import { Campo, Encabezado, Hoja, PieFormulario, SelectorMoneda, Vacio, montoValido } from '../ui'

export default function Cobros() {
  const { datos } = useStore()
  const r = useResumen()
  const [editando, setEditando] = useState<Ingreso | 'nuevo' | null>(null)
  const proximo = r.cobros[0]
  const lista = [...datos.ingresos].sort((a, b) => Number(b.recurrente) - Number(a.recurrente) || (a.dia ?? 0) - (b.dia ?? 0) || (a.fecha ?? '').localeCompare(b.fecha ?? ''))

  return (
    <>
      <Encabezado titulo="Cobros" volver />
      <div className="total">
        <span>Cobrás por mes, en pesos</span>
        <strong>{plata(r.cobroMensual)}</strong>
        {proximo && <p>{proximo.faltan === 0 ? 'Hoy cobrás' : `En ${proximo.faltan} ${proximo.faltan === 1 ? 'día' : 'días'} cobrás`} {plata(proximo.monto, proximo.moneda)} ({proximo.descripcion})</p>}
      </div>
      {lista.length === 0 && <Vacio>Agregá tu sueldo con el día en que lo cobrás. Si tenés un cobro único, como el aguinaldo, cargalo con su fecha.</Vacio>}
      <ul className="lista">
        {lista.map(i => (
          <li key={i.id}>
            <button onClick={() => setEditando(i)}>
              <span className="lista-nombre">{i.descripcion}
                <small>{i.recurrente ? `Todos los meses, el día ${i.dia}` : i.fecha ? `Una vez, el ${fechaCorta(i.fecha)} de ${i.fecha.slice(0, 4)}${i.fecha < r.hoy ? ' (ya pasó)' : ''}` : ''}</small>
              </span>
              <span className="lista-valor">{plata(i.monto, i.moneda ?? 'ARS')}
                {(i.moneda ?? 'ARS') !== 'ARS' && <small>{r.enPesos(i.monto, i.moneda) > 0 ? plata(r.enPesos(i.monto, i.moneda)) : 'sin cotización'}</small>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button className="boton principal ancho" onClick={() => setEditando('nuevo')}>Agregar cobro</button>
      {editando && <FormCobro ingreso={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} />}
    </>
  )
}

function FormCobro({ ingreso, onCerrar }: { ingreso: Ingreso | null; onCerrar: () => void }) {
  const { crear, editar, borrar } = useStore()
  const [descripcion, setDescripcion] = useState(ingreso?.descripcion ?? 'Sueldo')
  const [monto, setMonto] = useState(ingreso ? String(ingreso.monto).replace('.', ',') : '')
  const [moneda, setMoneda] = useState<Moneda>(ingreso?.moneda ?? 'ARS')
  const [recurrente, setRecurrente] = useState(ingreso?.recurrente ?? true)
  const [dia, setDia] = useState(String(ingreso?.dia ?? ''))
  const [fecha, setFecha] = useState(ingreso?.fecha ?? hoyISO())
  const [falla, setFalla] = useState('')

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const n = montoValido(monto, false)
    const d = Number(dia)
    if (!descripcion.trim()) return setFalla('Ponele un nombre al cobro.')
    if (n === null) return setFalla('Escribí cuánto vas a cobrar, solo con números.')
    if (recurrente && !(Number.isInteger(d) && d >= 1 && d <= 31)) return setFalla('El día de cobro tiene que ser un número del 1 al 31.')
    if (!recurrente && !fecha) return setFalla('Elegí la fecha del cobro.')
    const fila = { descripcion: descripcion.trim(), monto: n, moneda, recurrente, dia: recurrente ? d : null, fecha: recurrente ? null : fecha }
    if (await (ingreso ? editar('ingresos', ingreso.id, fila) : crear('ingresos', fila))) onCerrar()
  }

  return (
    <Hoja titulo={ingreso ? 'Editar cobro' : 'Agregar cobro'} onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <Campo etiqueta="Qué cobrás"><input value={descripcion} onChange={e => setDescripcion(e.target.value)} /></Campo>
        <Campo etiqueta="En qué moneda cobrás"><SelectorMoneda valor={moneda} onChange={setMoneda} /></Campo>
        <Campo etiqueta="Cuánto"><input value={monto} onChange={e => setMonto(e.target.value)} inputMode="decimal" placeholder="0" autoFocus={!ingreso} /></Campo>
        <Campo etiqueta="Cuándo">
          <div className="segmentos" role="radiogroup" aria-label="Frecuencia">
            <button type="button" role="radio" aria-checked={recurrente} className={recurrente ? 'activo' : ''} onClick={() => setRecurrente(true)}>Todos los meses</button>
            <button type="button" role="radio" aria-checked={!recurrente} className={!recurrente ? 'activo' : ''} onClick={() => setRecurrente(false)}>Una sola vez</button>
          </div>
        </Campo>
        {recurrente
          ? <Campo etiqueta="Día del mes" ayuda="Si el mes no tiene ese día, se toma el último."><input value={dia} onChange={e => setDia(e.target.value)} inputMode="numeric" placeholder="Ej.: 5" /></Campo>
          : <Campo etiqueta="Fecha"><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} /></Campo>}
        {falla && <p className="falla">{falla}</p>}
        <PieFormulario guardar="Guardar" onBorrar={ingreso ? async () => { if (await borrar('ingresos', ingreso.id)) onCerrar() } : undefined} />
      </form>
    </Hoja>
  )
}
