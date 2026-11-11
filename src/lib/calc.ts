import type { Ajustes, Categoria, Cuenta, Gasto, Ingreso, Meta, Moneda } from './types'

// Todas las fechas son texto 'AAAA-MM-DD' y los meses 'AAAA-MM' (hora local, sin zonas horarias).

export const mesDe = (fecha: string) => fecha.slice(0, 7)

export function sumarMeses(ym: string, n: number): string {
  const total = Number(ym.slice(0, 4)) * 12 + (Number(ym.slice(5, 7)) - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

export const diasDelMes = (ym: string) => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate()

export function diasEntre(desde: string, hasta: string): number {
  const [a, b] = [desde, hasta].map(f => {
    const [y, m, d] = f.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  })
  return Math.round((b - a) / 86400000)
}

export function aPesos(monto: number, moneda: Moneda, aj: Pick<Ajustes, 'usd' | 'eur'>): number {
  if (moneda === 'USD') return monto * aj.usd
  if (moneda === 'EUR') return monto * aj.eur
  return monto
}

export function totalCuentas(cuentas: Cuenta[], tipo: Cuenta['tipo'], aj: Pick<Ajustes, 'usd' | 'eur'>): number {
  return cuentas.filter(c => c.tipo === tipo).reduce((s, c) => s + aPesos(c.monto, c.moneda, aj), 0)
}

/** Monedas que tenés cargadas pero sin cotización: no se pueden sumar al total. */
export function monedasSinCotizar(cuentas: Cuenta[], metas: Meta[], ingresos: Ingreso[], aj: Pick<Ajustes, 'usd' | 'eur'>): Moneda[] {
  const usadas = new Set<Moneda>([...cuentas.map(c => c.moneda), ...metas.map(m => m.moneda), ...ingresos.map(monedaDe)])
  const faltan: Moneda[] = []
  if (usadas.has('USD') && !(aj.usd > 0)) faltan.push('USD')
  if (usadas.has('EUR') && !(aj.eur > 0)) faltan.push('EUR')
  return faltan
}

export const gastosDelMes = (gastos: Gasto[], ym: string) => gastos.filter(g => mesDe(g.fecha) === ym)
export const sumar = (gastos: Gasto[]) => gastos.reduce((s, g) => s + g.monto, 0)

// ---------- Cobros ----------

/** `monto` está en la moneda del cobro; `pesos` es su equivalente con la cotización de Ajustes. */
export interface Cobro { fecha: string; monto: number; moneda: Moneda; pesos: number; descripcion: string; faltan: number }

// Los cobros cargados antes de que existiera la moneda son en pesos.
const monedaDe = (i: Ingreso): Moneda => i.moneda ?? 'ARS'
const enPesos = (i: Ingreso, aj: Pick<Ajustes, 'usd' | 'eur'>) => aPesos(i.monto, monedaDe(i), aj)

/** Próximos cobros desde hoy (inclusive), ordenados por fecha. */
export function proximosCobros(ingresos: Ingreso[], hoy: string, aj: Pick<Ajustes, 'usd' | 'eur'>): Cobro[] {
  const lista: Cobro[] = []
  for (const i of ingresos) {
    let fecha: string | null = null
    if (i.recurrente && i.dia) {
      const enMes = (ym: string) => `${ym}-${String(Math.min(i.dia!, diasDelMes(ym))).padStart(2, '0')}`
      fecha = enMes(mesDe(hoy))
      if (fecha < hoy) fecha = enMes(sumarMeses(mesDe(hoy), 1))
    } else if (!i.recurrente && i.fecha && i.fecha >= hoy) {
      fecha = i.fecha
    }
    if (fecha) lista.push({ fecha, monto: i.monto, moneda: monedaDe(i), pesos: enPesos(i, aj), descripcion: i.descripcion, faltan: diasEntre(hoy, fecha) })
  }
  return lista.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/** Lo que cobrás todos los meses, en pesos (solo cobros recurrentes). */
export const ingresoMensual = (ingresos: Ingreso[], aj: Pick<Ajustes, 'usd' | 'eur'>) =>
  ingresos.filter(i => i.recurrente).reduce((s, i) => s + enPesos(i, aj), 0)

/** Lo que vas a cobrar en un mes puntual: recurrentes + cobros únicos con fecha en ese mes. */
export const ingresoDelMes = (ingresos: Ingreso[], ym: string, aj: Pick<Ajustes, 'usd' | 'eur'>) =>
  ingresoMensual(ingresos, aj) +
  ingresos.filter(i => !i.recurrente && i.fecha && mesDe(i.fecha) === ym).reduce((s, i) => s + enPesos(i, aj), 0)

// ---------- Predicción ----------

export interface LineaPrediccion { categoria: string; estimado: number; mesesUsados: number }
export interface Prediccion {
  mes: string
  fijos: LineaPrediccion[]
  totalFijos: number
  variables: number
  mesesVariables: number
  variablesParcial: boolean
  total: number
}

/**
 * Estima los gastos del mes siguiente a `mesActual`.
 * - Fijos: por categoría, promedio de los últimos 3 meses en los que cargaste algo
 *   (contando el mes actual), ajustado por la inflación mensual de Ajustes.
 * - Variables: promedio de los últimos 3 meses completos; si todavía no hay ninguno,
 *   lo que llevás gastado este mes (queda marcado como parcial).
 */
export function predecir(gastos: Gasto[], categorias: Categoria[], inflacion: number, mesActual: string): Prediccion {
  const factor = 1 + (inflacion || 0) / 100
  const fijas = new Set(categorias.filter(c => c.fija).map(c => c.nombre))
  const hasta = gastos.filter(g => mesDe(g.fecha) <= mesActual)

  const fijos: LineaPrediccion[] = categorias.filter(c => c.fija).map(c => {
    const porMes = new Map<string, number>()
    for (const g of hasta) if (g.categoria === c.nombre) porMes.set(mesDe(g.fecha), (porMes.get(mesDe(g.fecha)) || 0) + g.monto)
    const ultimos = [...porMes.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3)
    const promedio = ultimos.length ? ultimos.reduce((s, [, v]) => s + v, 0) / ultimos.length : 0
    return { categoria: c.nombre, estimado: Math.round(promedio * factor), mesesUsados: ultimos.length }
  })

  const varPorMes = new Map<string, number>()
  for (const g of hasta) if (!fijas.has(g.categoria)) varPorMes.set(mesDe(g.fecha), (varPorMes.get(mesDe(g.fecha)) || 0) + g.monto)
  // Un mes anterior "cuenta" si tuvo algún gasto cargado, aunque no haya sido variable.
  const mesesConDatos = [...new Set(hasta.map(g => mesDe(g.fecha)))].filter(m => m < mesActual).sort().reverse().slice(0, 3)
  let variables = 0
  let variablesParcial = false
  if (mesesConDatos.length) {
    variables = mesesConDatos.reduce((s, m) => s + (varPorMes.get(m) || 0), 0) / mesesConDatos.length
  } else {
    variables = varPorMes.get(mesActual) || 0
    variablesParcial = variables > 0
  }
  variables = Math.round(variables * factor)

  const totalFijos = fijos.reduce((s, f) => s + f.estimado, 0)
  return {
    mes: sumarMeses(mesActual, 1),
    fijos, totalFijos, variables,
    mesesVariables: mesesConDatos.length,
    variablesParcial,
    total: totalFijos + variables,
  }
}

// ---------- Gastos grandes ----------

export interface PlanMeta {
  costoPesos: number
  /** Parte de tus ahorros que aceptás usar para esto. */
  deAhorros: number
  /** Lo que queda por juntar mes a mes. */
  falta: number
  meses: number
  porMes: number
  /** Lo que te sobra por mes: cobro mensual − gasto mensual previsto. */
  capacidad: number
  estado: 'cubierto' | 'llega' | 'no-llega' | 'vencido'
  /** Si no llegás: en cuántos meses sí llegarías ahorrando toda tu capacidad. */
  mesesReales: number | null
  /** Si no llegás: cuánto te falta por mes. */
  diferenciaPorMes: number
}

export function planificar(
  meta: Pick<Meta, 'costo' | 'moneda' | 'fecha' | 'pct_ahorros'>,
  ahorroTotal: number, cobroMensual: number, gastoMensual: number,
  aj: Pick<Ajustes, 'usd' | 'eur'>, hoy: string,
): PlanMeta {
  const costoPesos = aPesos(meta.costo, meta.moneda, aj)
  const deAhorros = Math.min(costoPesos, Math.max(0, ahorroTotal) * Math.min(100, Math.max(0, meta.pct_ahorros)) / 100)
  const falta = Math.max(0, costoPesos - deAhorros)
  const capacidad = cobroMensual - gastoMensual
  const [y1, m1] = hoy.split('-').map(Number)
  const [y2, m2] = meta.fecha.split('-').map(Number)
  const vencido = meta.fecha < hoy
  const meses = vencido ? 0 : Math.max(1, (y2 - y1) * 12 + (m2 - m1))
  const porMes = meses ? falta / meses : falta

  let estado: PlanMeta['estado']
  if (vencido) estado = 'vencido'
  else if (falta === 0) estado = 'cubierto'
  else estado = porMes <= capacidad ? 'llega' : 'no-llega'

  return {
    costoPesos, deAhorros, falta, meses, porMes, capacidad, estado,
    mesesReales: estado === 'no-llega' && capacidad > 0 ? Math.ceil(falta / capacidad) : null,
    diferenciaPorMes: estado === 'no-llega' ? porMes - capacidad : 0,
  }
}
