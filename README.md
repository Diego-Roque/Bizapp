# BizBar

App del bar de la oficina. Next.js 16 + React 19 + Tailwind v4 + Prisma 7 sobre Supabase (Postgres).

- **Kiosco (`/`)**: para el iPad del mostrador. Sin login: cada persona escribe su compañía y su nombre, elige bebida y pide. Máximo 2 bebidas por persona al día (se cuenta por compañía + nombre, sin importar mayúsculas ni acentos). La pantalla se limpia sola después de cada pedido y tras 60 s de inactividad. Abajo aparecen los pedidos "Listos para recoger".
- **Barra (`/admin`)**: para el celular del barman, con login. Cola de pedidos en vivo (Nuevos → Preparando → Listos → Entregado).
- **Menú (`/admin/menu`)**: agregar, editar, marcar agotada o eliminar bebidas, con foto guardada en Supabase Storage. Cada bebida puede tener sus ingredientes y cantidades, y puedes crear ingredientes nuevos desde ahí.
- **Ingredientes (`/admin/inventario`)**: el inventario es de ingredientes, con stock, mínimo, costo, en qué bebidas se usa cada uno y para cuántas alcanza. Entradas, mermas y ajustes. Al entregar una bebida se descuenta su receta automáticamente.
- **Reporte (`/admin/reporte`)**: mes a mes: entregas por día, por compañía, por bebida y conciliación de ingredientes (inicial, entradas, consumo, merma, ajuste, final). Exporta CSV e imprime.
- **Personas (`/admin/usuarios`)**: quién pidió en el mes, agrupado por compañía, y las cuentas del personal de barra.

## Puesta en marcha con Supabase

1. Copia `.env.example` a `.env` (ya existe uno con `SESSION_SECRET` generado).
2. En Supabase: **Project Settings → Database → Connection string**:
   - `DATABASE_URL`: *Transaction pooler* (puerto **6543**), agrega `?pgbouncer=true`.
   - `DIRECT_URL`: *Session pooler* o conexión directa (puerto **5432**). Lo usan las migraciones.
3. Recomendado: descarga el certificado en **Database → SSL Configuration** y pon su ruta en `DATABASE_CA_CERT` para TLS verificado.
4. Define `ADMIN_EMAIL` y `ADMIN_PASSWORD` para la primera cuenta de barra.
5. Para las fotos de las bebidas, copia la llave **service_role** (Project Settings → API Keys) en `SUPABASE_SERVICE_ROLE_KEY`. La app crea sola el bucket público `drinks` la primera vez que subes una foto.
6. Crea las tablas (con RLS activado) y carga el admin + un menú de ejemplo:

```bash
npm install
npm run db:deploy   # aplica prisma/migrations en Supabase
npm run db:seed     # crea el admin y bebidas e ingredientes de ejemplo (solo si el menú está vacío)
npm run dev
```

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build && npm start` | Producción |
| `npm run db:migrate` | Crea una migración nueva tras cambiar `prisma/schema.prisma` (usa `DIRECT_URL`) |
| `npm run db:deploy` | Aplica migraciones pendientes |
| `npm run db:seed` | Admin inicial + datos de ejemplo |
| `npm run db:studio` | Explorador de la base |

## Variables

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | Conexiones de Supabase (ver arriba) |
| `DATABASE_CA_CERT` | Ruta o PEM del certificado CA de Supabase (opcional, recomendado) |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave secreta para subir fotos a Supabase Storage (solo servidor) |
| `SUPABASE_URL` | Opcional: se deduce de `DATABASE_URL` |
| `SESSION_SECRET` | Firma de la sesión del barman (`openssl rand -base64 32`) |
| `APP_TIMEZONE` | Zona horaria que define "el día" del límite (default `America/Mexico_City`) |
| `DAILY_DRINK_LIMIT` | Bebidas por persona por día (default `2`) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Primera cuenta de barra (seed) |

## iPad en modo kiosco

Abre la URL en Safari, **Compartir → Agregar a pantalla de inicio**, y activa **Ajustes → Accesibilidad → Acceso guiado** para que no se pueda salir de la app.
