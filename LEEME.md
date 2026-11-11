# Finanzas personales

App web para uso propio: ahorro, gastos del mes, cuánto falta para cobrar,
predicción del mes que viene, plata actual, gastos grandes (viajes, compras)
y gastos chicos (cosas que te querés comprar).
Pensada para el celular; en la compu se ve igual, centrada.

Hecha con Vite + React. Los datos van a Supabase y la web se publica en Vercel.

## Probarla ya, sin configurar nada

```
npm install
npm run dev
```

Sin Supabase configurado arranca en **modo local**: guarda todo en el navegador
donde la abras. Sirve para probar, pero esos datos no se ven desde otro
dispositivo ni pasan solos a Supabase después.

## 1. Supabase (base de datos y login)

1. Creá un proyecto nuevo en supabase.com con tu cuenta personal.
2. En el editor SQL pegá todo el contenido de `supabase/schema.sql` y ejecutalo.
   Crea las tablas y hace que cada usuario vea solo sus propios datos.
3. En Authentication creá tu usuario (email y contraseña) marcándolo como
   confirmado. La app no tiene pantalla de registro: solo entra quien vos crees ahí.
   Conviene además desactivar el registro de usuarios nuevos en la configuración
   de Authentication.
4. De la configuración de API del proyecto copiá la **URL** y la **anon key**.

## 2. Conectar la app

Copiá `.env.example` como `.env.local` y completá los dos valores. Volvé a
correr `npm run dev`: ahora pide email y contraseña.

## 3. Vercel (para usarla desde el celular)

1. Subí esta carpeta a un repositorio privado de GitHub.
2. En vercel.com importá el repositorio (detecta Vite solo).
3. Cargá las dos variables de entorno: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Abrí la dirección en el celular y usá "Agregar a pantalla de inicio":
   queda con ícono y se abre a pantalla completa como una app.

La anon key puede estar en el código público: lo que protege los datos son las
reglas del `schema.sql` y tu contraseña.

## Cómo calcula

- **Cuánto falta para cobrar**: en Cobros cargás el sueldo con el día del mes
  (o un cobro único con fecha). Inicio muestra el más cercano.
- **Predicción del mes que viene**: para cada categoría marcada como fija
  promedia los últimos 3 meses en los que cargaste algo (con un solo mes, repite
  ese monto). El resto de los gastos es el promedio de los últimos 3 meses
  completos; mientras no haya ninguno, usa lo gastado en el mes en curso. Si
  cargás inflación mensual en Ajustes, se la suma.
- **Gastos grandes**: costo − la parte de tus ahorros que aceptás usar (un
  porcentaje por cada gasto) = lo que falta juntar. Eso dividido por los meses
  que quedan es lo que hay que apartar por mes, y se compara con tu margen
  (lo que cobrás por mes − el gasto previsto). Si no alcanza, te dice cuánto
  falta por mes y para qué mes llegarías.
- **Gastos chicos**: lista de cosas para comprar; dónde y precio son opcionales.
  El total suma solo las que tienen precio y no entra en la predicción ni en el
  margen por mes.
- **Cobros en dólares o euros**: se cargan en su moneda y el margen por mes los
  toma en pesos a la cotización de Ajustes.
- **Dólares y euros** se pasan a pesos con la cotización que cargues en Ajustes.
  No se actualiza sola.

Los cálculos están en `src/lib/calc.ts` y sus pruebas se corren con `npm test`.
