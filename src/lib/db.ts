import { createClient } from '@supabase/supabase-js'
import type { Tabla } from './types'

// Supabase muestra la URL del proyecto de varias formas (a veces con "/rest/v1/" al final).
// Nos quedamos solo con "https://xxxx.supabase.co" para que el login no falle con
// "Invalid path specified in request URL".
function soloOrigen(valor: string | undefined): string | undefined {
  try { return valor ? new URL(valor.trim()).origin : undefined } catch { return undefined }
}

const url = soloOrigen(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const supabase = url && key ? createClient(url, key) : null
/** Sin credenciales de Supabase la app guarda todo en este navegador. */
export const modoLocal = !supabase

type Fila = Record<string, unknown> & { id: string }

const clave = (t: Tabla) => `finanzas:${t}`
const leer = (t: Tabla): Fila[] => {
  try { return JSON.parse(localStorage.getItem(clave(t)) || '[]') } catch { return [] }
}
const escribir = (t: Tabla, filas: Fila[]) => localStorage.setItem(clave(t), JSON.stringify(filas))

export async function listar(t: Tabla): Promise<Fila[]> {
  if (!supabase) return leer(t)
  const todo: Fila[] = []
  const pagina = 1000
  for (let desde = 0; ; desde += pagina) {
    const { data, error } = await supabase.from(t).select('*').order('created_at').range(desde, desde + pagina - 1)
    if (error) throw new Error(error.message)
    todo.push(...(data as Fila[]))
    if (!data || data.length < pagina) break
  }
  return todo
}

export async function crear(t: Tabla, fila: Record<string, unknown>): Promise<Fila> {
  if (!supabase) {
    const nueva = { ...fila, id: crypto.randomUUID() }
    escribir(t, [...leer(t), nueva])
    return nueva
  }
  const { data, error } = await supabase.from(t).insert(fila).select().single()
  if (error) throw new Error(error.message)
  return data as Fila
}

export async function editar(t: Tabla, id: string, cambios: Record<string, unknown>): Promise<Fila> {
  if (!supabase) {
    const filas = leer(t).map(f => (f.id === id ? { ...f, ...cambios } : f))
    escribir(t, filas)
    return filas.find(f => f.id === id)!
  }
  const { data, error } = await supabase.from(t).update(cambios).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Fila
}

export async function borrar(t: Tabla, id: string): Promise<void> {
  if (!supabase) return escribir(t, leer(t).filter(f => f.id !== id))
  const { error } = await supabase.from(t).delete().eq('id', id)
  if (error) throw new Error(error.message)
}
