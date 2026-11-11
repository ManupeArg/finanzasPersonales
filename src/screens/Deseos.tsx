import { useState, type FormEvent } from 'react'
import { plata } from '../lib/format'
import type { Deseo } from '../lib/types'
import { useStore } from '../store'
import { Campo, Encabezado, Hoja, PieFormulario, Vacio, montoValido } from '../ui'

export default function Deseos() {
  const { datos } = useStore()
  const [editando, setEditando] = useState<Deseo | 'nuevo' | null>(null)
  const conPrecio = datos.deseos.filter(d => d.precio != null)
  const sinPrecio = datos.deseos.length - conPrecio.length

  return (
    <>
      <Encabezado titulo="Gastos chicos" volver />
      <div className="total">
        <span>Suma de lo que tiene precio</span>
        <strong>{plata(conPrecio.reduce((s, d) => s + d.precio!, 0))}</strong>
        {sinPrecio > 0 && <p>{sinPrecio === 1 ? 'Hay 1 cosa' : `Hay ${sinPrecio} cosas`} sin precio que no se {sinPrecio === 1 ? 'suma' : 'suman'}</p>}
      </div>

      {datos.deseos.length === 0 && <Vacio>Anotá las cosas que te querés comprar. Solo hace falta el nombre: dónde se compra y cuánto sale lo podés completar después.</Vacio>}
      <ul className="lista">
        {datos.deseos.map(d => (
          <li key={d.id}>
            <button onClick={() => setEditando(d)}>
              <span className="lista-nombre">{d.nombre}<small>{d.donde || 'Todavía no sé dónde'}</small></span>
              <span className={`lista-valor${d.precio == null ? ' apagado' : ''}`}>{d.precio == null ? 'Sin precio' : plata(d.precio)}</span>
            </button>
          </li>
        ))}
      </ul>
      <button className="boton principal ancho" onClick={() => setEditando('nuevo')}>Agregar gasto chico</button>
      {editando && <FormDeseo deseo={editando === 'nuevo' ? null : editando} onCerrar={() => setEditando(null)} />}
    </>
  )
}

function FormDeseo({ deseo, onCerrar }: { deseo: Deseo | null; onCerrar: () => void }) {
  const { crear, editar, borrar } = useStore()
  const [nombre, setNombre] = useState(deseo?.nombre ?? '')
  const [donde, setDonde] = useState(deseo?.donde ?? '')
  const [precio, setPrecio] = useState(deseo?.precio != null ? String(deseo.precio).replace('.', ',') : '')
  const [falla, setFalla] = useState('')

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return setFalla('Poné qué te querés comprar.')
    // Precio vacío = todavía no lo sabés. Si escribiste algo, tiene que ser un número.
    const n = precio.trim() ? montoValido(precio) : null
    if (precio.trim() && n === null) return setFalla('Escribí el precio solo con números, o dejalo vacío si no lo sabés.')
    const fila = { nombre: nombre.trim(), donde: donde.trim() || null, precio: n }
    if (await (deseo ? editar('deseos', deseo.id, fila) : crear('deseos', fila))) onCerrar()
  }

  return (
    <Hoja titulo={deseo ? 'Editar gasto chico' : 'Agregar gasto chico'} onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <Campo etiqueta="Qué querés comprar"><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej.: zapatillas, auriculares" autoFocus={!deseo} /></Campo>
        <Campo etiqueta="Dónde se compra (opcional)"><input value={donde} onChange={e => setDonde(e.target.value)} placeholder="Dejalo vacío si no sabés" /></Campo>
        <Campo etiqueta="Precio en pesos (opcional)"><input value={precio} onChange={e => setPrecio(e.target.value)} inputMode="decimal" placeholder="Dejalo vacío si no sabés" /></Campo>
        {falla && <p className="falla">{falla}</p>}
        <PieFormulario guardar="Guardar" onBorrar={deseo ? async () => { if (await borrar('deseos', deseo.id)) onCerrar() } : undefined} />
      </form>
    </Hoja>
  )
}
