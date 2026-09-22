document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const mensaje = document.getElementById('login-mensaje');
  const boton = document.getElementById('login-boton');

  mensaje.classList.add('hidden');
  boton.disabled = true;
  boton.textContent = 'Entrando…';

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    mensaje.textContent = 'Correo o contraseña incorrectos.';
    mensaje.classList.remove('hidden');
    mensaje.classList.add('error');
    boton.disabled = false;
    boton.textContent = 'Iniciar sesión';
    return;
  }

  const { data: perfil } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (perfil && (perfil.role === 'ADMIN' || perfil.role === 'EDITOR')) {
    window.location.href = 'admin/dashboard.html';
  } else {
    window.location.href = 'asociado/index.html';
  }
});
