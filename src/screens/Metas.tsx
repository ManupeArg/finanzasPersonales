import { useState, type FormEvent } from 'react'
import { planificar, sumarMeses, type PlanMeta } from '../lib/calc'
import { fechaCorta, hoyISO, mesYAnio, plata } from '../lib/format'
import type { Meta, Moneda } from '../lib/types'
import { useResumen, useStore } from '../store'
import { Campo, Encabezado, Hoja, PieFormulario, SelectorMoneda, Vacio, ir, montoValido } from '../ui'

function veredicto(p: PlanMeta, mesActual: string): string {
  switch (p.estado) {
    case 'vencido': return 'La fecha ya pasó. Cambiala para volver a calcular.'
    case 'cubierto': return 'Ya te alcanza con la parte de tus ahorros que elegiste usar.'
    case 'llega': return `Llegás: te sobran ${plata(Math.floor(p.capacidad - p.porMes))} por mes después de apartar esto.`
    case 'no-llega':
      if (p.capacidad <= 0) return 'Hoy no te queda margen por mes: gastás lo mismo o más de lo que cobrás. Revisá cobros y gastos.'
      return `No llegás para esa fecha: te faltan ${plata(Math.ceil(p.diferenciaPorMes))} por mes. Guardando todo tu margen llegarías en ${mesYAnio(sumarMeses(mesActual, p.mesesReales!))}.`
  }
}

export default function Metas() {
  const { datos, ajustes } = useStore()
  const r = useResumen()
  const [editando, setEditando] = useState<Meta | 'nueva' | null>(null)
  const metas = [...datos.metas].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const margen = r.cobroMensual - r.prediccion.total

  return (
    <>
      <Encabezado titulo="Gastos grandes" volver />
      <div className="total">
        <span>Margen por mes</span>
        <strong>{plata(margen)}</strong>
        <p>Cobrás {plata(r.cobroMensual)} y gastás unos {plata(r.prediccion.total)}</p>
      </div>
      {(r.cobroMensual === 0 || r.prediccion.total === 0) && (
        <p className="nota">
          Para que la cuenta sea real falta cargar {r.cobroMensual === 0 && <button className="enlace" onClick={() => ir('cobros')}>cuánto cobrás</button>}
          {r.cobroMensual === 0 && r.prediccion.total === 0 && ' y '}
          {r.prediccion.total === 0 && <button className="enlace" onClick={() => ir('gastos')}>tus gastos del mes</button>}.
        </p>
      )}

      {metas.length === 0 && <Vacio>Agregá un viaje o una compra grande con su costo aproximado y la fecha. Te calculo cuánto apartar por mes sin vaciar tus ahorros.</Vacio>}
      {metas.map(m => {
        const p = planificar(m, r.ahorro, r.cobroMensual, r.prediccion.total, ajustes, r.hoy)
        return (
          <button key={m.id} className="meta" onClick={() => setEditando(m)}>
            <div className="meta-cabeza">
              <strong>{m.nombre}</strong>
              <span>{plata(m.costo, m.moneda)}{m.moneda !== 'ARS' && <small>{plata(p.costoPesos)}</small>}</span>
            </div>
            <p className="meta-fecha">{fechaCorta(m.fecha)} de {m.fecha.slice(0, 4)}{p.meses > 0 && `, en ${p.meses} ${p.meses === 1 ? 'mes' : 'meses'}`}</p>
            {p.estado !== 'vencido' && (
              <>
                <div className="meta-barra" aria-hidden="true">
                  <i className="de-ahorros" style={{ width: `${p.costoPesos ? (p.deAhorros / p.costoPesos) * 100 : 0}%` }} />
                </div>
                <dl className="meta-cuenta">
                  <div><dt>De tus ahorros ({m.pct_ahorros}%)</dt><dd>{plata(Math.floor(p.deAhorros))}</dd></div>
                  <div><dt>Falta juntar</dt><dd>{plata(Math.ceil(p.falta))}</dd></div>
                  <div className="destacado"><dt>Apartar por mes</dt><dd>{plata(Math.ceil(p.porMes))}</dd></div>
                </dl>
              </>
            )}
            <p className={`veredicto ${p.estado}`}>{veredicto(p, r.mes)}</p>
          </button>
        )
      })}
      {metas.length > 1 && <p className="nota">Cada gasto se calcula por separado: si querés hacer varios, sumá lo que hay que apartar por mes y repartí el porcentaje de ahorros entre ellos.</p>}
      <button className="boton principal ancho" onClick={() => setEditando('nueva')}>Agregar gasto grande</button>
      {editando && <FormMeta meta={editando === 'nueva' ? null : editando} onCerrar={() => setEditando(null)} />}
    </>
  )
}

function FormMeta({ meta, onCerrar }: { meta: Meta | null; onCerrar: () => void }) {
  const { ajustes, crear, editar, borrar } = useStore()
  const r = useResumen()
  const hoy = hoyISO()
  const [nombre, setNombre] = useState(meta?.nombre ?? '')
  const [moneda, setMoneda] = useState<Moneda>(meta?.moneda ?? 'ARS')
  const [costo, setCosto] = useState(meta ? String(meta.costo).replace('.', ',') : '')
  const [fecha, setFecha] = useState(meta?.fecha ?? '')
  const [pct, setPct] = useState(meta?.pct_ahorros ?? ajustes.pct_ahorros)
  const [falla, setFalla] = useState('')

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const n = montoValido(costo, false)
    if (!nombre.trim()) return setFalla('Ponele un nombre: el viaje o lo que querés comprar.')
    if (n === null) return setFalla('Escribí el costo aproximado, solo con números.')
    if (!fecha) return setFalla('Elegí para cuándo lo querés.')
    const fila = { nombre: nombre.trim(), costo: n, moneda, fecha, pct_ahorros: pct }
    if (await (meta ? editar('metas', meta.id, fila) : crear('metas', fila))) onCerrar()
  }

  return (
    <Hoja titulo={meta ? 'Editar gasto grande' : 'Agregar gasto grande'} onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <Campo etiqueta="Qué es"><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej.: viaje a Brasil, notebook" autoFocus={!meta} /></Campo>
        <Campo etiqueta="Moneda del costo"><SelectorMoneda valor={moneda} onChange={setMoneda} /></Campo>
        <Campo etiqueta="Costo aproximado"><input value={costo} onChange={e => setCosto(e.target.value)} inputMode="decimal" placeholder="0" /></Campo>
        <Campo etiqueta="Para cuándo"><input type="date" value={fecha} min={hoy} onChange={e => setFecha(e.target.value)} /></Campo>
        <Campo etiqueta={`Usar hasta el ${pct}% de mis ahorros`} ayuda={`Hoy serían ${plata(Math.floor((r.ahorro * pct) / 100))} de ${plata(r.ahorro)}. El resto no se toca.`}>
          <input type="range" min={0} max={100} step={5} value={pct} onChange={e => setPct(Number(e.target.value))} />
        </Campo>
        {falla && <p className="falla">{falla}</p>}
        <PieFormulario guardar="Guardar" onBorrar={meta ? async () => { if (await borrar('metas', meta.id)) onCerrar() } : undefined} />
      </form>
    </Hoja>
  )
}
