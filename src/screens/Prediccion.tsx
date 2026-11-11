import { ingresoDelMes } from '../lib/calc'
import { mayus, mesYAnio, nombreMes, plata } from '../lib/format'
import { useResumen, useStore } from '../store'
import { Encabezado, Vacio, ir } from '../ui'

export default function Prediccion() {
  const { datos, ajustes } = useStore()
  const r = useResumen()
  const p = r.prediccion
  const cobro = ingresoDelMes(datos.ingresos, p.mes, ajustes)
  const saldo = cobro - p.total

  return (
    <>
      <Encabezado titulo={mayus(mesYAnio(p.mes))} volver />
      <div className="total">
        <span>Gasto previsto</span>
        <strong>{plata(p.total)}</strong>
        {cobro > 0 && (
          <p>Cobrás {plata(cobro)}: {saldo >= 0 ? `te quedarían ${plata(saldo)}` : `te faltarían ${plata(-saldo)}`}</p>
        )}
      </div>

      {p.total === 0 && <Vacio>Todavía no hay gastos cargados para estimar. Cargá los de {nombreMes(r.mes)} y acá vas a ver lo previsto para {nombreMes(p.mes)}.</Vacio>}

      <section className="bloque">
        <div className="bloque-cabeza"><h2>Gastos fijos</h2><span className="bloque-total">{plata(p.totalFijos)}</span></div>
        <ul className="lista plana">
          {p.fijos.map(f => (
            <li key={f.categoria}>
              <span className="lista-nombre">{f.categoria}
                <small>{f.mesesUsados === 0 ? 'Sin datos todavía' : f.mesesUsados === 1 ? 'Igual que el último mes cargado' : `Promedio de ${f.mesesUsados} meses`}</small>
              </span>
              <span className={`lista-valor${f.mesesUsados ? '' : ' apagado'}`}>{f.mesesUsados ? plata(f.estimado) : '—'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bloque">
        <div className="bloque-cabeza"><h2>Resto de los gastos</h2><span className="bloque-total">{plata(p.variables)}</span></div>
        <p className="nota">
          {p.variablesParcial
            ? `Es lo que llevás gastado en ${nombreMes(r.mes)} fuera de los fijos. Como el mes no terminó, puede quedar corto.`
            : p.mesesVariables
              ? `Promedio de ${p.mesesVariables === 1 ? 'el último mes completo' : `los últimos ${p.mesesVariables} meses completos`}.`
              : 'Sin datos todavía.'}
        </p>
      </section>

      <p className="nota">
        {ajustes.inflacion > 0
          ? `Los montos incluyen ${String(ajustes.inflacion).replace('.', ',')}% de inflación mensual. `
          : 'Los montos no incluyen inflación. '}
        <button className="enlace" onClick={() => ir('ajustes')}>Cambiar en Ajustes</button>
      </p>
    </>
  )
}
