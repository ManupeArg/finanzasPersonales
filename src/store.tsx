import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as db from './lib/db'
import { aPesos, gastosDelMes, ingresoMensual, mesDe, monedasSinCotizar, predecir, proximosCobros, sumar, totalCuentas } from './lib/calc'
import { hoyISO } from './lib/format'
import { AJUSTES_INICIALES, CATEGORIAS_INICIALES, type Ajustes, type Datos, type Tabla } from './lib/types'

const TABLAS: Tabla[] = ['cuentas', 'gastos', 'categorias', 'ingresos', 'metas', 'deseos', 'ajustes']
const NUMERICOS = ['monto', 'costo', 'usd', 'eur', 'inflacion', 'pct_ahorros', 'dia', 'precio']
const VACIO: Datos = { cuentas: [], gastos: [], categorias: [], ingresos: [], metas: [], deseos: [], ajustes: [] }

// Postgres puede devolver numeric como texto: lo normalizamos a número.
function normalizar<T>(fila: T): T {
  const f = { ...fila } as Record<string, unknown>
  for (const k of NUMERICOS) if (f[k] != null) f[k] = Number(f[k])
  return f as T
}

interface Store {
  datos: Datos
  ajustes: Ajustes
  cargando: boolean
  error: string | null
  cerrarError: () => void
  crear: <T extends Tabla>(t: T, fila: Omit<Datos[T][number], 'id'>) => Promise<boolean>
  editar: <T extends Tabla>(t: T, id: string, cambios: Partial<Datos[T][number]>) => Promise<boolean>
  borrar: (t: Tabla, id: string) => Promise<boolean>
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Datos>(VACIO)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const iniciado = useRef(false)

  useEffect(() => {
    if (iniciado.current) return
    iniciado.current = true
    ;(async () => {
      try {
        const listas = await Promise.all(TABLAS.map(t => db.listar(t)))
        const d = Object.fromEntries(TABLAS.map((t, i) => [t, listas[i].map(normalizar)])) as unknown as Datos
        // Primera vez: categorías de arranque y fila de ajustes.
        if (!d.categorias.length) {
          for (const c of CATEGORIAS_INICIALES) d.categorias.push((await db.crear('categorias', c)) as never)
        }
        if (!d.ajustes.length) d.ajustes.push(normalizar(await db.crear('ajustes', AJUSTES_INICIALES)) as never)
        setDatos(d)
      } catch (e) {
        setError(`No se pudieron cargar los datos: ${(e as Error).message}`)
      } finally {
        setCargando(false)
      }
    })()
  }, [])

  const intentar = useCallback(async (accion: () => Promise<void>) => {
    try { await accion(); return true } catch (e) {
      setError(`No se guardó el cambio: ${(e as Error).message}`)
      return false
    }
  }, [])

  const store = useMemo<Store>(() => ({
    datos,
    ajustes: datos.ajustes[0] ?? { id: '', ...AJUSTES_INICIALES },
    cargando,
    error,
    cerrarError: () => setError(null),
    crear: (t, fila) => intentar(async () => {
      const nueva = normalizar(await db.crear(t, fila as Record<string, unknown>))
      setDatos(d => ({ ...d, [t]: [...d[t], nueva] }))
    }),
    editar: (t, id, cambios) => intentar(async () => {
      const act = normalizar(await db.editar(t, id, cambios as Record<string, unknown>))
      setDatos(d => ({ ...d, [t]: (d[t] as { id: string }[]).map(f => (f.id === id ? act : f)) }))
    }),
    borrar: (t, id) => intentar(async () => {
      await db.borrar(t, id)
      setDatos(d => ({ ...d, [t]: (d[t] as { id: string }[]).filter(f => f.id !== id) }))
    }),
  }), [datos, cargando, error, intentar])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('Falta StoreProvider')
  return s
}

/** Los números que se repiten en varias pantallas, calculados una sola vez. */
export function useResumen() {
  const { datos, ajustes } = useStore()
  return useMemo(() => {
    const hoy = hoyISO()
    const mes = mesDe(hoy)
    const prediccion = predecir(datos.gastos, datos.categorias, ajustes.inflacion, mes)
    return {
      hoy, mes, prediccion,
      ahorro: totalCuentas(datos.cuentas, 'ahorro', ajustes),
      actual: totalCuentas(datos.cuentas, 'actual', ajustes),
      gastado: sumar(gastosDelMes(datos.gastos, mes)),
      cobros: proximosCobros(datos.ingresos, hoy),
      cobroMensual: ingresoMensual(datos.ingresos),
      sinCotizar: monedasSinCotizar(datos.cuentas, datos.metas, ajustes),
      enPesos: (monto: number, moneda: Parameters<typeof aPesos>[1]) => aPesos(monto, moneda, ajustes),
    }
  }, [datos, ajustes])
}
