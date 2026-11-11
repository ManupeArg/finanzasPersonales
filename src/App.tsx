import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/db'
import { StoreProvider, useStore } from './store'
import { ir, type Pantalla } from './ui'
import Inicio from './screens/Inicio'
import Cuentas from './screens/Cuentas'
import Gastos from './screens/Gastos'
import Prediccion from './screens/Prediccion'
import Cobros from './screens/Cobros'
import Metas from './screens/Metas'
import Deseos from './screens/Deseos'
import Ajustes from './screens/Ajustes'

const PANTALLAS: Pantalla[] = ['inicio', 'gastos', 'ahorro', 'plata', 'metas', 'chicos', 'prediccion', 'cobros', 'ajustes']
const leerHash = (): Pantalla => {
  const h = window.location.hash.slice(1) as Pantalla
  return PANTALLAS.includes(h) ? h : 'inicio'
}

const NAV: { a: Pantalla; nombre: string; icono: string }[] = [
  { a: 'inicio', nombre: 'Inicio', icono: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z' },
  { a: 'gastos', nombre: 'Gastos', icono: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6' },
  { a: 'ahorro', nombre: 'Ahorro', icono: 'M4 20V10M10 20V4M16 20v-7M21 20H3' },
  { a: 'plata', nombre: 'Plata', icono: 'M3 7h18v11H3zM3 11h18M16 15h2' },
  { a: 'metas', nombre: 'Grandes', icono: 'M5 21V4M5 5h12l-2 4 2 4H5' },
  { a: 'chicos', nombre: 'Chicos', icono: 'M6 8h12l-1 12H7zM9 8V7a3 3 0 0 1 6 0v1' },
]

function Interior() {
  const { cargando, error, cerrarError } = useStore()
  const [pantalla, setPantalla] = useState<Pantalla>(leerHash)
  useEffect(() => {
    const alCambiar = () => { setPantalla(leerHash()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])

  return (
    <div className="app">
      <main>
        {cargando ? <p className="vacio">Cargando tus datos…</p> : (
          <>
            {pantalla === 'inicio' && <Inicio />}
            {pantalla === 'gastos' && <Gastos />}
            {pantalla === 'ahorro' && <Cuentas key="ahorro" tipo="ahorro" />}
            {pantalla === 'plata' && <Cuentas key="actual" tipo="actual" />}
            {pantalla === 'metas' && <Metas />}
            {pantalla === 'chicos' && <Deseos />}
            {pantalla === 'prediccion' && <Prediccion />}
            {pantalla === 'cobros' && <Cobros />}
            {pantalla === 'ajustes' && <Ajustes />}
          </>
        )}
      </main>
      {error && <div className="error" role="alert"><span>{error}</span><button onClick={cerrarError} aria-label="Cerrar aviso">×</button></div>}
      <nav className="nav" aria-label="Secciones">
        {NAV.map(n => (
          <button key={n.a} className={pantalla === n.a ? 'activo' : ''} aria-current={pantalla === n.a ? 'page' : undefined} onClick={() => ir(n.a)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={n.icono} /></svg>
            {n.nombre}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Ingreso() {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [falla, setFalla] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    const { error } = await supabase!.auth.signInWithPassword({ email, password: clave })
    setOcupado(false)
    if (error) setFalla(error.message === 'Invalid login credentials' ? 'El email o la contraseña no coinciden.' : `No se pudo entrar: ${error.message}`)
  }

  return (
    <div className="app">
      <main className="ingreso">
        <h1>Finanzas</h1>
        <p>Entrá con el usuario que creaste en Supabase.</p>
        <form onSubmit={entrar}>
          <label className="campo"><span>Email</span><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label className="campo"><span>Contraseña</span><input type="password" autoComplete="current-password" value={clave} onChange={e => setClave(e.target.value)} required /></label>
          {falla && <p className="falla">{falla}</p>}
          <button className="boton principal ancho" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
        </form>
      </main>
    </div>
  )
}

export default function App() {
  const [sesion, setSesion] = useState<Session | null | undefined>(supabase ? undefined : null)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSesion(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (supabase && sesion === undefined) return <div className="app"><main><p className="vacio">Cargando…</p></main></div>
  if (supabase && !sesion) return <Ingreso />
  // La key hace que al cambiar de usuario se vuelvan a cargar los datos.
  return <StoreProvider key={sesion?.user.id ?? 'local'}><Interior /></StoreProvider>
}
