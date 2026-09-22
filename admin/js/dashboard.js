document.addEventListener('DOMContentLoaded', async () => {
  const auth = await requireAdminSession();
  if (!auth) return;

  const [totalRes, pendientesRes, leadsRes] = await Promise.all([
    supabaseClient.from('associates').select('*', { count: 'exact', head: true }),
    supabaseClient.from('associates').select('*', { count: 'exact', head: true }).eq('status', 'PENDIENTE'),
    supabaseClient.from('leads').select('*', { count: 'exact', head: true }),
  ]);

  document.getElementById('stat-total').textContent = totalRes.count ?? 0;
  document.getElementById('stat-pendientes').textContent = pendientesRes.count ?? 0;
  document.getElementById('stat-leads').textContent = leadsRes.count ?? 0;

  const { data: recientes, error } = await supabaseClient
    .from('associates')
    .select('id, name, status, created_at')
    .order('created_at', { ascending: false })
    .limit(6);

  const tbody = document.getElementById('recientes-body');

  if (error || !recientes || recientes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3">Todavía no hay asociados registrados.</td></tr>`;
    return;
  }

  tbody.innerHTML = recientes
    .map(
      (a) => `
    <tr>
      <td>${a.name}</td>
      <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
      <td>${new Date(a.created_at).toLocaleDateString('es-MX')}</td>
    </tr>`
    )
    .join('');
});
