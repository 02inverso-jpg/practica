document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  document.getElementById('q').value = params.get('q') || '';
  document.getElementById('ciudad').value = params.get('ciudad') || '';

  await cargarCategorias();

  document.getElementById('filtros-form').addEventListener('submit', (e) => {
    e.preventDefault();
    buscar();
  });
  document.querySelectorAll('#filtros-form input[type="checkbox"]').forEach((el) => {
    el.addEventListener('change', buscar);
  });

  await buscar();
});

async function cargarCategorias() {
  const { data, error } = await supabaseClient
    .from('categories')
    .select('id, name, icon')
    .order('name');

  const contenedor = document.getElementById('categorias-filtro');
  if (error || !data) return;

  contenedor.innerHTML = data
    .map(
      (c) => `
      <label class="checkbox-row">
        <input type="checkbox" name="categoria" value="${c.id}">
        ${c.icon ? c.icon + ' ' : ''}${c.name}
      </label>`
    )
    .join('');
}

async function buscar() {
  const texto = document.getElementById('q').value.trim();
  const ciudad = document.getElementById('ciudad').value.trim();
  const soloVerificados = document.getElementById('verificados').checked;
  const presencial = document.getElementById('presencial').checked;
  const online = document.getElementById('online').checked;
  const categorias = Array.from(document.querySelectorAll('input[name="categoria"]:checked')).map(
    (el) => el.value
  );

  let query = supabaseClient
    .from('associates')
    .select('id, slug, name, photo_url, city, state, verified, categories(name, icon)')
    .eq('status', 'PUBLICADO');

  if (texto) query = query.or(`name.ilike.%${texto}%,business_name.ilike.%${texto}%`);
  if (ciudad) query = query.ilike('city', `%${ciudad}%`);
  if (soloVerificados) query = query.eq('verified', true);
  if (categorias.length > 0) query = query.in('category_id', categorias);

  const modalidades = [];
  if (presencial) modalidades.push('presencial', 'ambas');
  if (online) modalidades.push('online', 'ambas');
  if (modalidades.length > 0) query = query.in('modality', modalidades);

  const { data, error } = await query.order('verified', { ascending: false }).order('name');

  renderResultados(data, error);
}

function renderResultados(data, error) {
  const grid = document.getElementById('results-grid');
  const contador = document.getElementById('results-count');

  if (error) {
    grid.innerHTML = `<div class="empty-state">No se pudieron cargar los resultados. Intenta de nuevo en un momento.</div>`;
    contador.textContent = '';
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `<div class="empty-state">No encontramos asociados con esos filtros. Prueba con otra especialidad o ciudad.</div>`;
    contador.textContent = '0 resultados';
    return;
  }

  contador.textContent = `${data.length} resultado${data.length === 1 ? '' : 's'}`;

  grid.innerHTML = data
    .map(
      (a) => `
    <a class="associate-card" href="perfil.html?slug=${encodeURIComponent(a.slug)}">
      <div class="photo" style="${a.photo_url ? `background-image:url('${a.photo_url}')` : ''}">
        ${a.photo_url ? '' : (a.categories?.icon || '🩺')}
      </div>
      <h3>${a.name} ${a.verified ? '<span class="verified-mark">✓ Verificado</span>' : ''}</h3>
      <div class="category">${a.categories?.name || 'Sin categoría'}</div>
      <div class="location">📍 ${[a.city, a.state].filter(Boolean).join(', ') || 'Ubicación no especificada'}</div>
    </a>`
    )
    .join('');
}
