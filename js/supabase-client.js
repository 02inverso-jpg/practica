/**
 * Cliente compartido de Supabase para todo el sitio.
 *
 * La "anon key" está pensada para ser pública: viaja en el navegador de
 * cualquier visitante. La seguridad real no depende de ocultarla, sino de
 * las políticas de Row Level Security (RLS) que están en database/schema.sql.
 *
 * La "service_role key" es otra cosa muy distinta y NUNCA debe ponerse aquí
 * ni en ningún archivo que se sirva al navegador: esa key salta todas las
 * políticas RLS. Si en el futuro la necesitas (por ejemplo, para una función
 * serverless que hable con GHL), vive solo en variables de entorno del
 * servidor, nunca en /js ni en /admin/js.
 *
 * Reemplaza los dos valores de abajo con los de tu proyecto:
 * Supabase → Project Settings → API.
 */

const SUPABASE_URL = 'https://llcejomieclkzfzzukoo.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_WwseBVj5KtL6bvbj_D2CqA_l2rc8yJ_';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
