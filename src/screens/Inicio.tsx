import { diasDelMes, mesDe, planificar, proximosCobros, sumarMeses } from '../lib/calc'
import { fechaCorta, mayus, nombreMes, plata } from '../lib/format'
import { useResumen, useStore } from '../store'
import { ir, type Pantalla } from '../ui'

export default function Inicio() {
  const { datos, ajustes } = useStore()
  const r = useResumen()
  const dia = Number(r.hoy.slice(8))
  const dias = diasDelMes(r.mes)
  const proximo = r.cobros[0]
  // Días de cobro de este mes, incluidos los que ya pasaron, para marcarlos en la línea.
  const cobrosDelMes = [...new Set(proximosCobros(datos.ingresos, `${r.mes}-01`).filter(c => mesDe(c.fecha) === r.mes).map(c => Number(c.fecha.slice(8))))]

  const metas = datos.metas
    .filter(m => m.fecha >= r.hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(m => ({ m, p: planificar(m, r.ahorro, r.cobroMensual, r.prediccion.total, ajustes, r.hoy) }))

  const conPrecio = datos.deseos.filter(d => d.precio != null)
  const sinPrecio = datos.deseos.length - conPrecio.length

  const filas: { a: Pantalla; nombre: string; valor: number; nota?: string }[] = [
    { a: 'ahorro', nombre: 'Ahorro', valor: r.ahorro, nota: `${datos.cuentas.filter(c => c.tipo === 'ahorro').length || 'Sin'} lugares` },
    { a: 'gastos', nombre: `Gastado en ${nombreMes(r.mes)}`, valor: r.gastado, nota: r.cobroMensual ? `${Math.round((r.gastado / r.cobroMensual) * 100)}% de lo que cobrás` : undefined },
    { a: 'plata', nombre: 'Plata actual', valor: r.actual },
    { a: 'prediccion', nombre: `Previsto para ${nombreMes(sumarMeses(r.mes, 1))}`, valor: r.prediccion.total, nota: r.prediccion.total ? `${plata(r.prediccion.totalFijos)} en fijos` : 'Cargá gastos para estimar' },
    {
      a: 'chicos', nombre: 'Gastos chicos', valor: conPrecio.reduce((s, d) => s + d.precio!, 0),
      nota: datos.deseos.length
        ? `${datos.deseos.length} ${datos.deseos.length === 1 ? 'cosa' : 'cosas'}${sinPrecio ? `, ${sinPrecio} sin precio` : ''}`
        : 'Cosas que te querés comprar',
    },
  ]

  return (
    <>
      <header className="inicio-cabeza">
        <div>
          <h1>{mayus(nombreMes(r.mes))}</h1>
          <p>Hoy es {fechaCorta(r.hoy)}</p>
        </div>
        <button className="icono" onClick={() => ir('ajustes')} aria-label="Ajustes">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
        </button>
      </header>

      <button className="cobro" onClick={() => ir('cobros')}>
        {proximo ? (
          <p className="cobro-texto">
            {proximo.faltan === 0 ? 'Hoy cobrás ' : <>Faltan <strong>{proximo.faltan} {proximo.faltan === 1 ? 'día' : 'días'}</strong> para cobrar </>}
            <strong>{plata(proximo.monto)}</strong>
            <span>{proximo.descripcion}, {fechaCorta(proximo.fecha)}</span>
          </p>
        ) : (
          <p className="cobro-texto">Agregá qué día cobrás y cuánto<span>Así sabés cuánto falta y cuánto podés ahorrar por mes</span></p>
        )}
        <div className="linea-mes" aria-hidden="true">
          <div className="linea-pasado" style={{ width: `${((dia - 0.5) / dias) * 100}%` }} />
          {cobrosDelMes.map(d => <i key={d} className={`marca-cobro${d < dia ? ' pasada' : ''}`} style={{ left: `${((d - 0.5) / dias) * 100}%` }} />)}
          <i className="marca-hoy" style={{ left: `${((dia - 0.5) / dias) * 100}%` }} />
        </div>
        <div className="linea-pie" aria-hidden="true"><span>1</span><span>día {dia} de {dias}</span><span>{dias}</span></div>
      </button>

      {r.sinCotizar.length > 0 && (
        <button className="aviso" onClick={() => ir('ajustes')}>
          Falta la cotización de {r.sinCotizar.map(m => (m === 'USD' ? 'el dólar' : 'el euro')).join(' y ')}: esos montos no se están sumando. Cargala en Ajustes.
        </button>
      )}

      <ul className="resumen">
        {filas.map(f => (
          <li key={f.a}>
            <button onClick={() => ir(f.a)}>
              <span className="resumen-nombre">{f.nombre}{f.nota && <small>{f.nota}</small>}</span>
              <span className="resumen-valor">{plata(f.valor)}</span>
            </button>
          </li>
        ))}
      </ul>

      <section className="bloque">
        <div className="bloque-cabeza">
          <h2>Gastos grandes</h2>
          <button className="enlace" onClick={() => ir('metas')}>{metas.length ? 'Ver todos' : 'Agregar'}</button>
        </div>
        {metas.length === 0 && <p className="vacio">Un viaje o una compra grande: te digo cuánto apartar por mes para llegar.</p>}
        {metas.slice(0, 2).map(({ m, p }) => (
          <button key={m.id} className="meta-mini" onClick={() => ir('metas')}>
            <span><strong>{m.nombre}</strong><small>{fechaCorta(m.fecha)} de {m.fecha.slice(0, 4)}</small></span>
            <span className={`estado ${p.estado}`}>
              {p.estado === 'cubierto' ? 'Cubierto' : <>{plata(Math.ceil(p.porMes))} por mes</>}
            </span>
          </button>
        ))}
      </section>
    </>
  )
}
