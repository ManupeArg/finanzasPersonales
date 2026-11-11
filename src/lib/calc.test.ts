import { describe, expect, it } from 'vitest'
import { diasEntre, ingresoDelMes, ingresoMensual, monedasSinCotizar, planificar, predecir, proximosCobros, sumarMeses, totalCuentas } from './calc'
import { leerMonto, plata } from './format'
import type { Categoria, Gasto, Ingreso } from './types'

const g = (fecha: string, categoria: string, monto: number): Gasto => ({ id: fecha + categoria + monto, fecha, categoria, monto, descripcion: '' })
const cats: Categoria[] = [
  { id: '1', nombre: 'Alquiler', fija: true },
  { id: '2', nombre: 'Luz', fija: true },
  { id: '3', nombre: 'Salidas', fija: false },
]

describe('fechas', () => {
  it('suma meses cruzando el año', () => {
    expect(sumarMeses('2026-11', 1)).toBe('2026-12')
    expect(sumarMeses('2026-12', 1)).toBe('2027-01')
    expect(sumarMeses('2026-01', -1)).toBe('2025-12')
  })
  it('cuenta días', () => expect(diasEntre('2026-11-11', '2026-12-05')).toBe(24))
})

describe('montos', () => {
  it('lee formatos argentinos', () => {
    expect(leerMonto('1.250.000')).toBe(1250000)
    expect(leerMonto('1.250,50')).toBe(1250.5)
    expect(leerMonto('$ 45000')).toBe(45000)
    expect(leerMonto('1250.5')).toBe(1250.5)
    expect(leerMonto('')).toBe(0)
    expect(Number.isNaN(leerMonto('abc'))).toBe(true)
    expect(Number.isNaN(leerMonto('12 lucas'))).toBe(true)
    expect(Number.isNaN(leerMonto('1.2.3,4,5'))).toBe(true)
  })
  it('formatea', () => {
    expect(plata(1250000)).toBe('$\u00a01.250.000')
    expect(plata(1500.5, 'USD')).toBe('US$\u00a01.500,50')
  })
  it('convierte ahorros a pesos', () => {
    expect(totalCuentas([
      { id: 'a', tipo: 'ahorro', nombre: 'ARQ', moneda: 'USD', monto: 100 },
      { id: 'b', tipo: 'ahorro', nombre: 'Euros', moneda: 'EUR', monto: 10 },
      { id: 'c', tipo: 'actual', nombre: 'Billetera', moneda: 'ARS', monto: 999 },
    ], 'ahorro', { usd: 1000, eur: 1100 })).toBe(111000)
  })
})

describe('cobros', () => {
  const aj = { usd: 1000, eur: 1100 }
  const ingresos: Ingreso[] = [
    { id: '1', descripcion: 'Sueldo', monto: 1000, moneda: 'ARS', recurrente: true, dia: 5, fecha: null },
    { id: '2', descripcion: 'Aguinaldo', monto: 500, moneda: 'ARS', recurrente: false, dia: null, fecha: '2026-12-18' },
    { id: '3', descripcion: 'Viejo', monto: 9, moneda: 'ARS', recurrente: false, dia: null, fecha: '2026-10-01' },
  ]
  it('el día 5 ya pasó: el próximo es el 5 del mes que viene', () => {
    const c = proximosCobros(ingresos, '2026-11-11', aj)
    expect(c.map(x => x.fecha)).toEqual(['2026-12-05', '2026-12-18'])
    expect(c[0].faltan).toBe(24)
  })
  it('si cobrás hoy, faltan 0 días', () => expect(proximosCobros(ingresos, '2026-11-05', aj)[0].faltan).toBe(0))
  it('día 31 en un mes de 28', () => {
    const c = proximosCobros([{ id: 'x', descripcion: 's', monto: 1, moneda: 'ARS', recurrente: true, dia: 31, fecha: null }], '2027-02-10', aj)
    expect(c[0].fecha).toBe('2027-02-28')
  })
  it('convierte los cobros en dólares y euros', () => {
    const enUsd: Ingreso[] = [
      { id: 'a', descripcion: 'Sueldo', monto: 2000, moneda: 'USD', recurrente: true, dia: 1, fecha: null },
      { id: 'b', descripcion: 'Extra', monto: 100, moneda: 'EUR', recurrente: false, dia: null, fecha: '2026-12-10' },
      { id: 'c', descripcion: 'Viejo sin moneda', monto: 50, recurrente: true, dia: 2, fecha: null } as unknown as Ingreso,
    ]
    expect(ingresoMensual(enUsd, aj)).toBe(2_000_050)
    expect(ingresoDelMes(enUsd, '2026-12', aj)).toBe(2_110_050)
    const c = proximosCobros(enUsd, '2026-11-11', aj)[0]
    expect([c.monto, c.moneda, c.pesos]).toEqual([2000, 'USD', 2_000_000])
    expect(ingresoMensual(enUsd, { usd: 0, eur: 0 })).toBe(50)
    expect(monedasSinCotizar([], [], enUsd, { usd: 0, eur: 1100 })).toEqual(['USD'])
  })
  it('suma los cobros únicos del mes', () => {
    expect(ingresoDelMes(ingresos, '2026-12', aj)).toBe(1500)
    expect(ingresoDelMes(ingresos, '2026-11', aj)).toBe(1000)
  })
})

describe('predicción', () => {
  it('con un solo mes cargado repite los fijos de ese mes', () => {
    const p = predecir([g('2026-11-03', 'Alquiler', 400000), g('2026-11-08', 'Luz', 30000), g('2026-11-09', 'Salidas', 50000)], cats, 0, '2026-11')
    expect(p.mes).toBe('2026-12')
    expect(p.totalFijos).toBe(430000)
    expect(p.variables).toBe(50000)
    expect(p.variablesParcial).toBe(true)
    expect(p.total).toBe(480000)
  })
  it('promedia hasta 3 meses y aplica inflación', () => {
    const gastos = [
      g('2026-07-01', 'Luz', 999999), // queda afuera: más de 3 meses con datos
      g('2026-08-01', 'Luz', 10000), g('2026-09-01', 'Luz', 20000), g('2026-10-01', 'Luz', 30000),
      g('2026-09-10', 'Salidas', 40000), g('2026-10-10', 'Salidas', 80000), g('2026-11-02', 'Salidas', 5),
    ]
    const p = predecir(gastos, cats, 10, '2026-11')
    expect(p.fijos.find(f => f.categoria === 'Luz')!.estimado).toBe(22000)
    expect(p.fijos.find(f => f.categoria === 'Alquiler')!.mesesUsados).toBe(0)
    // variables: meses completos con datos = oct, sep, ago → (80000 + 40000 + 0) / 3 × 1,1
    expect(p.variables).toBe(44000)
    expect(p.variablesParcial).toBe(false)
  })
  it('ignora gastos de meses futuros', () => {
    expect(predecir([g('2027-01-01', 'Luz', 5)], cats, 0, '2026-11').total).toBe(0)
  })
})

describe('gastos grandes', () => {
  const aj = { usd: 1000, eur: 1100 }
  it('llega: usa parte de los ahorros y reparte el resto', () => {
    const p = planificar({ costo: 2000, moneda: 'USD', fecha: '2027-03-15', pct_ahorros: 30 }, 1_000_000, 900_000, 500_000, aj, '2026-11-11')
    expect(p.costoPesos).toBe(2_000_000)
    expect(p.deAhorros).toBe(300_000)
    expect(p.meses).toBe(4)
    expect(p.porMes).toBe(425_000)
    expect(p.capacidad).toBe(400_000)
    expect(p.estado).toBe('no-llega')
    expect(p.mesesReales).toBe(5)
    expect(p.diferenciaPorMes).toBe(25_000)
  })
  it('llega cuando lo mensual alcanza', () => {
    const p = planificar({ costo: 1_000_000, moneda: 'ARS', fecha: '2027-11-01', pct_ahorros: 0 }, 5_000_000, 900_000, 500_000, aj, '2026-11-11')
    expect(p.estado).toBe('llega')
    expect(p.meses).toBe(12)
  })
  it('cubierto con ahorros, vencido y sin capacidad', () => {
    expect(planificar({ costo: 100, moneda: 'ARS', fecha: '2026-12-01', pct_ahorros: 50 }, 1000, 0, 0, aj, '2026-11-11').estado).toBe('cubierto')
    expect(planificar({ costo: 100, moneda: 'ARS', fecha: '2026-10-01', pct_ahorros: 50 }, 0, 0, 0, aj, '2026-11-11').estado).toBe('vencido')
    const p = planificar({ costo: 100, moneda: 'ARS', fecha: '2026-12-01', pct_ahorros: 0 }, 0, 100, 200, aj, '2026-11-11')
    expect(p.estado).toBe('no-llega')
    expect(p.mesesReales).toBeNull()
  })
})
