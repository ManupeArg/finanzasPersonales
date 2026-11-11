import type { Moneda } from './types'

const simbolo: Record<Moneda, string> = { ARS: '$', USD: 'US$', EUR: '€' }

export function plata(n: number, moneda: Moneda = 'ARS'): string {
  const decimales = moneda === 'ARS' || Number.isInteger(n) ? 0 : 2
  const txt = Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
  // Espacio duro: el símbolo nunca queda separado del número al cortar la línea.
  return `${n < 0 ? '−' : ''}${simbolo[moneda]}\u00a0${txt}`
}

/** Acepta "1.250.000", "1250000", "1.250,50" y "1250.5". Vacío es 0; texto que no es número, NaN. */
export function leerMonto(texto: string): number {
  // Letras u otros símbolos: no es un monto (antes "abc" se leía como 0).
  if (/[^\d.,\s$-]/.test(texto)) return NaN
  let s = texto.replace(/[\s$]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const hoyISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const nombreMes = (ym: string) => MESES[Number(ym.slice(5, 7)) - 1]
export const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function fechaCorta(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} de ${MESES[m - 1]}`
}

export function mesYAnio(ym: string): string {
  return `${nombreMes(ym)} de ${ym.slice(0, 4)}`
}
