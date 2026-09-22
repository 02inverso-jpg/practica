document.addEventListener('DOMContentLoaded', async () => {
  const auth = await requireAdminSession();
  if (!auth) return;

  await cargarCategorias();

  const id = new URLSearchParams(window.location.search).get('id');
  if (id) {
    document.getElementById('form-titulo').textContent = 'Editar asociado';
    await cargarAsociado(id);
  }

  document.getElementById('form-asociado').addEventListener('submit', (e) => guardar(e, id));
});

async function cargarCategorias() {
  const { data } = await supabaseClient.from('categories').select('id, name').order('name');
  const select = document.getElementById('category_id');
  (data || []).forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

async function cargarAsociado(id) {
  const { data, error } = await supabaseClient.from('associates').select('*').eq('id', id).single();

  if (error || !data) {
    alert('No se encontró ese asociado.');
    window.location.href = 'asociados.html';
    return;
  }

  const form = document.getElementById('form-asociado');
  Object.keys(data).forEach((campo) => {
    if (form.elements[campo] && data[campo] !== null && data[campo] !== undefined) {
      form.elements[campo].value = data[campo];
    }
  });
  form.elements['verified'].checked = !!data.verified;
}

function slugify(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function guardar(e, id) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const mensaje = document.getElementById('form-mensaje');
  mensaje.classList.add('hidden');

  const payload = {
    name: fd.get('name'),
    business_name: fd.get('business_name') || null,
    description: fd.get('description') || null,
    phone: fd.get('phone') || null,
    whatsapp: fd.get('whatsapp') || null,
    email: fd.get('email') || null,
    website: fd.get('website') || null,
    address: fd.get('address') || null,
    city: fd.get('city') || null,
    state: fd.get('state') || null,
    postal_code: fd.get('postal_code') || null,
    modality: fd.get('modality'),
    category_id: fd.get('category_id') || null,
    verified: fd.get('verified') === 'on',
  };

  if (!id) {
    payload.slug = slugify(fd.get('name'));
    payload.status = 'PENDIENTE';
  }

  const query = id
    ? supabaseClient.from('associates').update(payload).eq('id', id)
    : supabaseClient.from('associates').insert(payload);

  const { error } = await query;

  if (error) {
    mensaje.textContent = 'No se pudo guardar: ' + error.message;
    mensaje.classList.remove('hidden');
    mensaje.classList.add('error');
    return;
  }

  window.location.href = 'asociados.html';
}
