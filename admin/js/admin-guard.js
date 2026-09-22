/**
 * Protector de rutas para el panel admin.
 *
 * IMPORTANTE: esto es solo una comodidad de interfaz (evita que alguien sin
 * sesión válida vea la pantalla del admin). NO es la seguridad real del
 * sistema. La seguridad real vive en las políticas de Row Level Security
 * (RLS) definidas en database/schema.sql: aunque alguien se saltara este
 * archivo por completo, la base de datos seguiría rechazando cualquier
 * lectura o escritura para la que su rol no esté autorizado.
 */
async function requireAdminSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = '../login.html';
    return null;
  }

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (error || !profile || !['ADMIN', 'EDITOR'].includes(profile.role)) {
    window.location.href = '../login.html';
    return null;
  }

  const salir = document.getElementById('admin-signout');
  if (salir) {
    salir.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = '../login.html';
    });
  }

  return { session, role: profile.role };
}
