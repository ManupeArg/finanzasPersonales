export type Moneda = 'ARS' | 'USD' | 'EUR'

export interface Cuenta { id: string; tipo: 'ahorro' | 'actual'; nombre: string; moneda: Moneda; monto: number }
export interface Gasto { id: string; fecha: string; descripcion: string; categoria: string; monto: number }
export interface Categoria { id: string; nombre: string; fija: boolean }
export interface Ingreso { id: string; descripcion: string; monto: number; moneda: Moneda; recurrente: boolean; dia: number | null; fecha: string | null }
export interface Meta { id: string; nombre: string; costo: number; moneda: Moneda; fecha: string; pct_ahorros: number }
/** Cosas que te querés comprar. Dónde y precio pueden no saberse todavía. */
export interface Deseo { id: string; nombre: string; donde: string | null; precio: number | null }
export interface Ajustes { id: string; usd: number; eur: number; inflacion: number; pct_ahorros: number }

export interface Datos {
  cuentas: Cuenta[]
  gastos: Gasto[]
  categorias: Categoria[]
  ingresos: Ingreso[]
  metas: Meta[]
  deseos: Deseo[]
  ajustes: Ajustes[]
}
export type Tabla = keyof Datos

export const CATEGORIAS_INICIALES: Omit<Categoria, 'id'>[] = [
  { nombre: 'Súper', fija: true },
  { nombre: 'Alquiler', fija: true },
  { nombre: 'Expensas', fija: true },
  { nombre: 'Luz', fija: true },
  { nombre: 'Gas', fija: true },
  { nombre: 'Internet', fija: true },
  { nombre: 'Gym', fija: true },
  { nombre: 'Comida afuera', fija: false },
  { nombre: 'Transporte', fija: false },
  { nombre: 'Salidas', fija: false },
  { nombre: 'Otros', fija: false },
]

export const AJUSTES_INICIALES: Omit<Ajustes, 'id'> = { usd: 0, eur: 0, inflacion: 0, pct_ahorros: 30 }
