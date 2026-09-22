const DIAS = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
};

document.addEventListener('DOMContentLoaded', async () => {
  const slug = new URLSearchParams(window.location.search).get('slug');
  if (!slug) {
    mostrarNoEncontrado();
    return;
  }

  const { data: asociado, error } = await supabaseClient
    .from('associates')
    .select('*, categories(name, icon)')
    .eq('slug', slug)
    .eq('status', 'PUBLICADO')
    .single();

  if (error || !asociado) {
    mostrarNoEncontrado();
    return;
  }

  renderAsociado(asociado);
  supabaseClient.rpc('increment_profile_view', { p_associate_id: asociado.id });

  const [{ data: servicios }, { data: horarios }, { data: galeria }] = await Promise.all([
    supabaseClient.from('services').select('*').eq('associate_id', asociado.id),
    supabaseClient.from('schedules').select('*').eq('associate_id', asociado.id),
    supabaseClient.from('gallery').select('*').eq('associate_id', asociado.id).order('sort_order'),
  ]);

  renderServicios(servicios);
  renderHorarios(horarios);
  renderGaleria(galeria);

  document.getElementById('btn-whatsapp').addEventListener('click', () => {
    supabaseClient.rpc('register_whatsapp_click', { p_associate_id: asociado.id });
  });
});

function mostrarNoEncontrado() {
  document.getElementById('perfil-contenido').innerHTML =
    '<div class="empty-state">No encontramos este perfil. Puede que ya no esté disponible.</div>';
}

function renderAsociado(a) {
  document.title = `${a.name} · PULSO`;
  document.getElementById('perfil-foto').style.backgroundImage = a.photo_url ? `url('${a.photo_url}')` : '';
  document.getElementById('perfil-foto').textContent = a.photo_url ? '' : (a.categories?.icon || '🩺');
  document.getElementById('perfil-nombre').textContent = a.name;
  document.getElementById('perfil-verificado').classList.toggle('hidden', !a.verified);
  document.getElementById('perfil-categoria').textContent = a.categories?.name || 'Sin categoría';
  document.getElementById('perfil-ubicacion').textContent =
    '📍 ' + ([a.address, a.city, a.state].filter(Boolean).join(', ') || 'Ubicación no especificada');
  document.getElementById('perfil-descripcion').textContent =
    a.description || 'Este profesional todavía no agregó una descripción.';

  const btnWhatsapp = document.getElementById('btn-whatsapp');
  if (a.whatsapp) {
    btnWhatsapp.href = `https://wa.me/${a.whatsapp.replace(/\D/g, '')}`;
  } else {
    btnWhatsapp.classList.add('hidden');
  }

  const btnWeb = document.getElementById('btn-website');
  if (a.website) {
    btnWeb.href = a.website;
  } else {
    btnWeb.classList.add('hidden');
  }
}

function renderServicios(servicios) {
  const seccion = document.getElementById('seccion-servicios');
  if (!servicios || servicios.length === 0) {
    seccion.classList.add('hidden');
    return;
  }
  document.getElementById('lista-servicios').innerHTML = servicios
    .map((s) => `<li>${s.name}${s.price ? ` — $${s.price}` : ''}</li>`)
    .join('');
}

function renderHorarios(horarios) {
  const seccion = document.getElementById('seccion-horarios');
  if (!horarios || horarios.length === 0) {
    seccion.classList.add('hidden');
    return;
  }
  const orden = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const ordenados = [...horarios].sort((a, b) => orden.indexOf(a.day) - orden.indexOf(b.day));

  document.getElementById('lista-horarios').innerHTML = ordenados
    .map(
      (h) => `<li><span>${DIAS[h.day]}</span><span>${
        h.closed ? 'Cerrado' : `${h.opening?.slice(0, 5) || '—'} – ${h.closing?.slice(0, 5) || '—'}`
      }</span></li>`
    )
    .join('');
}

function renderGaleria(galeria) {
  const seccion = document.getElementById('seccion-galeria');
  if (!galeria || galeria.length === 0) {
    seccion.classList.add('hidden');
    return;
  }
  document.getElementById('grid-galeria').innerHTML = galeria
    .map((g) => `<img src="${g.image_url}" alt="Foto de ${document.getElementById('perfil-nombre').textContent}">`)
    .join('');
}
