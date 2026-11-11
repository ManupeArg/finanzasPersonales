import { useMemo, useState, type FormEvent } from 'react'
import { gastosDelMes, sumar, sumarMeses } from '../lib/calc'
import { fechaCorta, hoyISO, mayus, mesYAnio, nombreMes, plata } from '../lib/format'
import type { Gasto } from '../lib/types'
import { useResumen, useStore } from '../store'
import { Campo, Encabezado, Hoja, PieFormulario, Vacio, ir, montoValido } from '../ui'

export default function Gastos() {
  const { datos } = useStore()
  const r = useResumen()
  const [mes, setMes] = useState(r.mes)
  const [editando, setEditando] = useState<Gasto | 'nuevo' | null>(null)

  const delMes = useMemo(
    () => gastosDelMes(datos.gastos, mes).sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [datos.gastos, mes],
  )
  const total = sumar(delMes)
  const fijas = new Set(datos.categorias.filter(c => c.fija).map(c => c.nombre))
  const porCategoria = [...delMes.reduce((m, g) => m.set(g.categoria, (m.get(g.categoria) || 0) + g.monto), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1])
  const fijosSinCargar = mes === r.mes ? [...fijas].filter(c => !delMes.some(g => g.categoria === c)) : []
  const porDia = delMes.reduce((m, g) => m.set(g.fecha, [...(m.get(g.fecha) || []), g]), new Map<string, Gasto[]>())

  return (
    <>
      <Encabezado titulo="Gastos" volver />
      <div className="cambia-mes">
        <button onClick={() => setMes(sumarMeses(mes, -1))} aria-label="Mes anterior">‹</button>
        <span>{mayus(mesYAnio(mes))}</span>
        <button onClick={() => setMes(sumarMeses(mes, 1))} disabled={mes >= r.mes} aria-label="Mes siguiente">›</button>
      </div>
      <div className="total">
        <span>Gastado</span>
        <strong>{plata(total)}</strong>
      </div>

      {porCategoria.length > 0 && (
        <ul className="categorias">
          {porCategoria.map(([nombre, monto]) => (
            <li key={nombre}>
              <span>{nombre}{fijas.has(nombre) && <em>fijo</em>}</span>
              <span>{plata(monto)}</span>
              <i className="barra"><i style={{ width: `${(monto / total) * 100}%` }} /></i>
            </li>
          ))}
        </ul>
      )}

      {fijosSinCargar.length > 0 && delMes.length > 0 && (
        <p className="nota">Fijos que todavía no cargaste en {nombreMes(mes)}: {fijosSinCargar.join(', ')}.</p>
      )}
      {mes === r.mes && (
        <button className="enlace suelto" onClick={() => ir('prediccion')}>
          Ver lo previsto para {nombreMes(sumarMeses(mes, 1))}
        </button>
      )}

      {delMes.length === 0 && <Vacio>No hay gastos cargados en {nombreMes(mes)}. Empezá por los fijos: alquiler, expensas, luz, gas, internet, gym y súper.</Vacio>}
      {[...porDia].map(([fecha, gastos]) => (
        <section key={fecha} className="dia">
          <h3>{fechaCorta(fecha)}</h3>
          <ul className="lista">
            {gastos.map(g => (
              <li key={g.id}>
                <button onClick={() => setEditando(g)}>
                  <span className="lista-nombre">{g.descripcion || g.categoria}{g.descripcion && <small>{g.categoria}</small>}</span>
                  <span className="lista-valor">{plata(g.monto)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <button className="flotante" onClick={() => setEditando('nuevo')}>Agregar gasto</button>
      {editando && <FormGasto mes={mes} gasto={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} />}
    </>
  )
}

function FormGasto({ mes, gasto, onCerrar }: { mes: string; gasto: Gasto | null; onCerrar: () => void }) {
  const { datos, crear, editar, borrar } = useStore()
  const hoy = hoyISO()
  const [fecha, setFecha] = useState(gasto?.fecha ?? (hoy.startsWith(mes) ? hoy : `${mes}-01`))
  const [categoria, setCategoria] = useState(gasto?.categoria ?? datos.categorias[0]?.nombre ?? 'Otros')
  const [descripcion, setDescripcion] = useState(gasto?.descripcion ?? '')
  const [monto, setMonto] = useState(gasto ? String(gasto.monto).replace('.', ',') : '')
  const [falla, setFalla] = useState('')
  // Si la categoría del gasto fue borrada, la seguimos ofreciendo para no perderla al editar.
  const nombres = datos.categorias.map(c => c.nombre)
  const opciones = nombres.includes(categoria) ? nombres : [categoria, ...nombres]

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const n = montoValido(monto, false)
    if (n === null) return setFalla('Escribí cuánto gastaste, solo con números.')
    if (!fecha) return setFalla('Elegí la fecha del gasto.')
    const fila = { fecha, categoria, descripcion: descripcion.trim(), monto: n }
    if (await (gasto ? editar('gastos', gasto.id, fila) : crear('gastos', fila))) onCerrar()
  }

  return (
    <Hoja titulo={gasto ? 'Editar gasto' : 'Agregar gasto'} onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <Campo etiqueta="Cuánto"><input value={monto} onChange={e => setMonto(e.target.value)} inputMode="decimal" placeholder="0" autoFocus={!gasto} /></Campo>
        <Campo etiqueta="Categoría">
          <select value={categoria} onChange={e => setCategoria(e.target.value)}>
            {opciones.map(n => <option key={n}>{n}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Detalle (opcional)"><input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Ej.: compra grande del mes" /></Campo>
        <Campo etiqueta="Fecha"><input type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value)} /></Campo>
        {falla && <p className="falla">{falla}</p>}
        <PieFormulario guardar="Guardar" onBorrar={gasto ? async () => { if (await borrar('gastos', gasto.id)) onCerrar() } : undefined} />
      </form>
    </Hoja>
  )
}
