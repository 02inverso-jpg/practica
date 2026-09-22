document.addEventListener('DOMContentLoaded', async () => {
  const auth = await requireAdminSession();
  if (!auth) return;

  await cargarAsociados();
  document.getElementById('buscar-input').addEventListener('input', debounce(cargarAsociados, 300));
});

function debounce(fn, wait) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn(...args), wait);
  };
}

async function cargarAsociados() {
  const texto = document.getElementById('buscar-input').value.trim();
  const tbody = document.getElementById('asociados-body');

  let query = supabaseClient
    .from('associates')
    .select('id, public_code, name, city, status, categories(name)')
    .order('created_at', { ascending: false });

  if (texto) query = query.ilike('name', `%${texto}%`);

  const { data, error } = await query;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6">No se pudo cargar la lista.</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No hay asociados que coincidan con la búsqueda.</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map(
      (a) => `
    <tr>
      <td><span class="code">${a.public_code ?? '—'}</span></td>
      <td>${a.name}</td>
      <td>${a.categories?.name ?? '—'}</td>
      <td>${a.city ?? '—'}</td>
      <td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td>
      <td class="acciones">${accionesPorEstado(a)}</td>
    </tr>`
    )
    .join('');

  tbody.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleAccion(btn.dataset.action, btn.dataset.id));
  });
}

function accionesPorEstado(a) {
  const botones = [`<a href="asociado-form.html?id=${a.id}" class="link-accion">Editar</a>`];

  if (a.status === 'PENDIENTE') {
    botones.push(`<button data-action="aprobar" data-id="${a.id}" class="link-accion">Aprobar</button>`);
    botones.push(`<button data-action="rechazar" data-id="${a.id}" class="link-accion link-danger">Rechazar</button>`);
  }
  if (a.status === 'APROBADO') {
    botones.push(`<button data-action="publicar" data-id="${a.id}" class="link-accion">Publicar</button>`);
  }
  if (a.status === 'PUBLICADO') {
    botones.push(`<button data-action="suspender" data-id="${a.id}" class="link-accion link-danger">Suspender</button>`);
  }
  if (a.status === 'SUSPENDIDO') {
    botones.push(`<button data-action="publicar" data-id="${a.id}" class="link-accion">Reactivar</button>`);
  }
  botones.push(`<button data-action="eliminar" data-id="${a.id}" class="link-accion link-danger">Eliminar</button>`);

  return botones.join(' ');
}

async function handleAccion(accion, id) {
  const cambiosPorAccion = {
    aprobar: { status: 'APROBADO' },
    publicar: { status: 'PUBLICADO' },
    suspender: { status: 'SUSPENDIDO' },
    rechazar: { status: 'RECHAZADO' },
  };

  if (accion === 'eliminar') {
    if (!confirm('¿Eliminar este asociado? Esta acción no se puede deshacer.')) return;
    await supabaseClient.from('associates').delete().eq('id', id);
  } else {
    await supabaseClient.from('associates').update(cambiosPorAccion[accion]).eq('id', id);
  }

  await cargarAsociados();
}
