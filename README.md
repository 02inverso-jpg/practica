# PULSO Directory — Pack v1

Directorio de asociados para PULSO, con la misma lógica funcional que
Doctoralia (directorio público + perfiles + panel admin + base de datos).
Este es el primer pack: arquitectura, base de datos completa, directorio
público funcionando y un admin básico para dar de alta y aprobar asociados.

## Qué incluye este pack

- **Base de datos completa** (`database/schema.sql`): todas las tablas del
  plan original (asociados, categorías, servicios, horarios, galería, redes,
  leads), con roles, estados, seguridad (RLS) y el ID público tipo
  `PULSO-00001` generándose solo.
- **Directorio público**: inicio con buscador, página de directorio con
  filtros (especialidad, ciudad, modalidad, verificados) y perfil público de
  cada asociado, con conteo de vistas y de clics en WhatsApp.
- **Login** con Supabase Auth, que manda a cada quien a su panel según su rol.
- **Admin básico**: dashboard con estadísticas y tabla de asociados con
  aprobar / publicar / suspender / rechazar / eliminar / editar.

## Qué NO incluye todavía (siguientes packs, como en el plan original)

- Panel del asociado completo (editar sus propios servicios, horarios,
  galería, ver sus estadísticas) — Fase 4.
- Gestión de categorías/servicios/usuarios desde el admin (por ahora las
  categorías ya vienen precargadas por SQL) — parte de Fase 3.
- Conexión de leads a GHL — Fase 5. La tabla `leads` ya está lista para
  esto: cuando lo armemos, reusamos el patrón de función serverless +
  API directa que ya tienes funcionando en el Quiz Funnel.
- Estadísticas más completas y pulido general (SEO, URLs limpias tipo
  `pulso.mx/directorio/clinica-dental-sonrisa`, backups) — Fases 6 y 7.

## Stack usado (y por qué)

- **Frontend**: HTML/CSS/JS sin frameworks ni paso de build, igual que el
  Quiz Funnel — se sube tal cual a Vercel.
- **Base de datos + autenticación + seguridad**: **Supabase** (Postgres).
  La razón: te da usuarios, roles, login y seguridad por fila (RLS) sin
  tener que programar nada de eso a mano, y tiene capa gratuita generosa.
  Es una decisión mía, no algo que ya hubieras definido — si prefieres
  otra base de datos lo cambiamos, el esquema SQL es Postgres estándar y
  se puede mover.
- **"Backend"**: Supabase actúa como tu API. Cuando necesitemos lógica a
  la medida (como GHL en la Fase 5), usamos funciones serverless de
  Vercel, igual que ya haces.

## Configuración (una sola vez)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor**, pega todo `database/schema.sql` y ejecútalo.
3. Ve a **Project Settings → API** y copia tu `Project URL` y tu
   `anon public key`.
4. Pégalos en `js/supabase-client.js`, en `SUPABASE_URL` y
   `SUPABASE_ANON_KEY`.
5. Crea tu propio usuario: entra a `login.html` en local (o sube el
   proyecto) e intenta iniciar sesión — como no existe usuario aún, ve
   mejor a **Authentication → Users** en Supabase y crea uno con tu
   correo y contraseña.
6. Vuelve al **SQL Editor** y sube tu rol a ADMIN una sola vez:
   ```sql
   update profiles set role = 'ADMIN' where email = 'tu-correo@ejemplo.com';
   ```
7. Ya puedes entrar por `login.html` y llegarás al dashboard.

## Desplegar en Vercel

No necesita configuración de build: es un sitio estático. Sube la carpeta
a un repo de GitHub y conéctalo en Vercel (o arrástrala directo a
vercel.com/new), sin tocar ningún ajuste.

## Estructura

```
PULSO-DIRECTORY/
├── database/schema.sql     ← corre esto primero en Supabase
├── index.html               ← inicio + buscador
├── directorio.html          ← directorio con filtros
├── perfil.html               ← perfil público de un asociado
├── login.html
├── css/styles.css            ← sistema de diseño del sitio público
├── js/                        ← supabase-client, directorio, perfil, auth
├── asociado/index.html       ← placeholder del panel (Fase 4)
└── admin/
    ├── dashboard.html
    ├── asociados.html
    ├── asociado-form.html
    ├── css/admin.css
    └── js/                    ← admin-guard, dashboard, asociados, asociado-form
```

## Nota de seguridad

Los redireccionamientos en `admin-guard.js` (mandar a alguien sin sesión a
`login.html`) son solo comodidad de interfaz. La seguridad de verdad está
en las políticas RLS de `schema.sql`: la base de datos rechaza cualquier
lectura o escritura para la que el rol de quien pregunta no esté
autorizado, sin importar qué pase en el navegador.

La `anon key` de Supabase está pensada para ser pública — no la escondas,
pero tampoco pongas nunca la `service_role key` en ningún archivo de este
proyecto: esa sí salta toda la seguridad.
