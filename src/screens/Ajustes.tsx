import { useState, type FormEvent } from 'react'
import { modoLocal, supabase } from '../lib/db'
import { leerMonto } from '../lib/format'
import { useStore } from '../store'
import { Campo, Encabezado } from '../ui'

const txt = (n: number) => (n ? String(n).replace('.', ',') : '')

export default function Ajustes() {
  const { datos, ajustes, editar, crear, borrar } = useStore()
  const [usd, setUsd] = useState(txt(ajustes.usd))
  const [eur, setEur] = useState(txt(ajustes.eur))
  const [inflacion, setInflacion] = useState(txt(ajustes.inflacion))
  const [pct, setPct] = useState(ajustes.pct_ahorros)
  const [aviso, setAviso] = useState('')
  const [nueva, setNueva] = useState('')

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const valores = { usd: leerMonto(usd), eur: leerMonto(eur), inflacion: leerMonto(inflacion) }
    if (Object.values(valores).some(v => Number.isNaN(v) || v < 0)) return setAviso('Revisá los números: solo dígitos y coma para decimales.')
    if (await editar('ajustes', ajustes.id, { ...valores, pct_ahorros: pct })) setAviso('Guardado.')
  }

  async function agregarCategoria(e: FormEvent) {
    e.preventDefault()
    const nombre = nueva.trim()
    if (!nombre || datos.categorias.some(c => c.nombre.toLowerCase() === nombre.toLowerCase())) return
    if (await crear('categorias', { nombre, fija: false })) setNueva('')
  }

  return (
    <>
      <Encabezado titulo="Ajustes" volver />
      <form className="bloque" onSubmit={guardar}>
        <div className="bloque-cabeza"><h2>Cotizaciones e inflación</h2></div>
        <div className="dos">
          <Campo etiqueta="1 dólar en pesos"><input value={usd} onChange={e => setUsd(e.target.value)} inputMode="decimal" placeholder="0" /></Campo>
          <Campo etiqueta="1 euro en pesos"><input value={eur} onChange={e => setEur(e.target.value)} inputMode="decimal" placeholder="0" /></Campo>
        </div>
        <Campo etiqueta="Inflación mensual estimada (%)" ayuda="Se suma a la predicción del mes que viene. Dejalo vacío para no ajustar.">
          <input value={inflacion} onChange={e => setInflacion(e.target.value)} inputMode="decimal" placeholder="0" />
        </Campo>
        <Campo etiqueta={`Para gastos grandes, usar hasta el ${pct}% de mis ahorros`} ayuda="Es el valor con el que arranca cada gasto grande nuevo; después lo podés cambiar en cada uno.">
          <input type="range" min={0} max={100} step={5} value={pct} onChange={e => setPct(Number(e.target.value))} />
        </Campo>
        {aviso && <p className={aviso === 'Guardado.' ? 'ok' : 'falla'}>{aviso}</p>}
        <button className="boton principal" type="submit">Guardar ajustes</button>
      </form>

      <section className="bloque">
        <div className="bloque-cabeza"><h2>Categorías de gasto</h2></div>
        <p className="nota">Las marcadas como fijas son las que se usan para predecir el mes que viene.</p>
        <ul className="lista plana">
          {datos.categorias.map(c => (
            <li key={c.id}>
              <span className="lista-nombre">{c.nombre}</span>
              <span className="fila-acciones">
                <label className="tilde"><input type="checkbox" checked={c.fija} onChange={e => editar('categorias', c.id, { fija: e.target.checked })} /> Fija</label>
                <button className="quitar" onClick={() => borrar('categorias', c.id)} aria-label={`Quitar ${c.nombre}`}>×</button>
              </span>
            </li>
          ))}
        </ul>
        <form className="agregar-linea" onSubmit={agregarCategoria}>
          <input value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Nueva categoría" aria-label="Nueva categoría" />
          <button className="boton suave" type="submit">Agregar</button>
        </form>
      </section>

      <section className="bloque">
        <div className="bloque-cabeza"><h2>Datos</h2></div>
        {modoLocal
          ? <p className="nota">Modo local: los datos se guardan solo en este navegador. Para verlos también desde el celular, conectá Supabase siguiendo el LEEME.</p>
          : <button className="boton suave" onClick={() => supabase!.auth.signOut()}>Cerrar sesión</button>}
      </section>
    </>
  )
}
