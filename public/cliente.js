const lienzo = document.getElementById('lienzo');
const ctx = lienzo.getContext('2d');
const COLS = 9, FILAS = 5, AC = 80, AL = 88, GX = 40, W = 800, TOTAL = 20;

/* ============================================================
   CONFIGURACIÓN DE GRÁFICOS  (editá esta sección con tus imágenes)
   ------------------------------------------------------------
   Cada sprite es una hoja HORIZONTAL: todos los cuadros del mismo
   tamaño, uno al lado del otro, en una sola imagen.
     src     ruta de la imagen (carpeta img/)
     cuadros cantidad de cuadros de la animación (1 = imagen fija)
     ancho   ancho de UN cuadro en píxeles de la imagen
     alto    alto de UN cuadro en píxeles de la imagen
     fps     cuadros por segundo
     escala  tamaño en pantalla (1 = tamaño original)
     dx, dy  ajuste fino de posición (opcional)
     emoji   respaldo si la imagen no existe, tam = tamaño del emoji
   Si una imagen falta o no carga, se usa el emoji automáticamente.
   ============================================================ */
const CONFIG = { pixelArt: false }; // true = sin suavizado (para pixel art)

const SPRITES = {
  fondo:              { src: 'img/fondo.png' }, // imagen de 800x440
  girasol:            { src: 'img/girasol.png',        cuadros: 6, ancho: 80,  alto: 80,  fps: 8,  escala: 1, emoji: '🌻', tam: 46 },
  lanzaguisantes:     { src: 'img/lanzaguisantes.png', cuadros: 6, ancho: 80,  alto: 80,  fps: 8,  escala: 1, emoji: '🌱', tam: 46 },
  nuez:               { src: 'img/nuez.png',           cuadros: 4, ancho: 80,  alto: 80,  fps: 4,  escala: 1, emoji: '🥜', tam: 46 },
  cereza:             { src: 'img/cereza.png',         cuadros: 4, ancho: 80,  alto: 80,  fps: 6,  escala: 1, emoji: '🍒', tam: 46 },
  hielaguisantes: { src: 'img/hielaguisantes.png', cuadros: 6, ancho: 80, alto: 80, fps: 8, escala: 1, emoji: '❄️', tam: 46 },
  repetidora: { src: 'img/repetidora.png', cuadros: 6, ancho: 80, alto: 80, fps: 8, escala: 1, emoji: '🌿', tam: 46 },
  nuezalta: { src: 'img/nuezalta.png', cuadros: 4, ancho: 80, alto: 80, fps: 8, escala: 1, emoji: '🥥', tam: 46 },
  jalapeno: { src: 'img/jalapeno.png', cuadros: 4, ancho: 80, alto: 80, fps: 8, escala: 1, emoji: '🌶️', tam: 46 },
  papamina: { src: 'img/papamina.png', cuadros: 4, ancho: 80, alto: 80, fps: 8, escala: 1, emoji: '🥔', tam: 46 },
  carnivora: { src: 'img/carnivora.png', cuadros: 6, ancho: 80, alto: 80, fps: 8, escala: 1, emoji: '🪴', tam: 46 },
  aplastacalabaza: { src: 'img/aplastacalabaza.png', cuadros: 4, ancho: 80, alto: 80, fps: 8, escala: 1, emoji: '🎃', tam: 46 },
  zombi_caminar:      { src: 'img/zombi_caminar.png',  cuadros: 8, ancho: 100, alto: 120, fps: 8,  escala: 1, emoji: '🧟', tam: 52 },
  zombi_comer:        { src: 'img/zombi_comer.png',    cuadros: 6, ancho: 100, alto: 120, fps: 8,  escala: 1, emoji: '🧟', tam: 52 },
  zombiCono_caminar:  { src: 'img/zombicono_caminar.png', cuadros: 8, ancho: 100, alto: 120, fps: 8, escala: 1, emoji: '🧟', tam: 52 },
  zombiCono_comer:    { src: 'img/zombicono_comer.png',   cuadros: 6, ancho: 100, alto: 120, fps: 8, escala: 1, emoji: '🧟', tam: 52 },
  guisante:           { src: 'img/guisante.png',       cuadros: 1, ancho: 20,  alto: 20,  fps: 1,  escala: 1, emoji: '🟢', tam: 18 },
  guisanteHielo: { src: 'img/guisante_hielo.png', cuadros: 1, ancho: 20, alto: 20, fps: 1, escala: 1, emoji: '🔵', tam: 18 },
  sol:                { src: 'img/sol.png',            cuadros: 8, ancho: 64,  alto: 64,  fps: 10, escala: 1, emoji: '☀️', tam: 40 },
  cortadora:          { src: 'img/cortadora.png',      cuadros: 1, ancho: 60,  alto: 50,  fps: 1,  escala: 1, emoji: '🚜', tam: 38 },
};

/* ---------- Carga de imágenes ---------- */
function cargarTodo() {
  const faltan = [];
  const promesas = Object.entries(SPRITES).map(([nombre, s]) => new Promise(res => {
    s.listo = false;
    s.img = new Image();
    s.img.onload = () => { s.listo = true; res(); };
    s.img.onerror = () => { faltan.push(s.src); res(); };
    s.img.src = s.src;
  }));
  return Promise.all(promesas).then(() => {
    if (faltan.length) console.info('Sin imagen (se usa emoji):', faltan.join(', '));
  });
}

// Dibuja un sprite centrado en (x, y). Si no hay imagen, dibuja el emoji.
function dibujarSprite(nombre, x, y, fase = 0, alfa = 1, mult = 1) {
  const s = SPRITES[nombre];
  ctx.globalAlpha = alfa;
  if (s.listo && s.ancho) {
    const c = s.cuadros > 1 ? Math.floor((reloj + fase) * s.fps) % s.cuadros : 0;
    const w = s.ancho * (s.escala || 1) * mult, h = s.alto * (s.escala || 1) * mult;
    ctx.drawImage(s.img, c * s.ancho, 0, s.ancho, s.alto,
      x - w / 2 + (s.dx || 0), y - h / 2 + (s.dy || 0), w, h);
  } else if (s.emoji) {
    ctx.font = `${s.tam * mult}px serif`;
    ctx.fillText(s.emoji, x, y);
  }
  ctx.globalAlpha = 1;
}

function emoji(txt, x, y, tam) {
  ctx.font = `${tam}px serif`;
  ctx.fillText(txt, x, y);
}

/* ============================================================
   CLIENTE ONLINE
   Solo dibuja el estado que manda el servidor y envía acciones.
   Toda la lógica del juego vive en el servidor (juego.js).
   ============================================================ */
const $ = id => document.getElementById(id);
const barra = $('cartas');
let ws, rol = null, cfg = null, snap = null, sel = null, reloj = 0, enJuego = false, finMostrado = false;
const cartas = {};
const raton = { x: -1, y: -1 };

ctx.imageSmoothingEnabled = !CONFIG.pixelArt;
if (CONFIG.pixelArt) lienzo.style.imageRendering = 'pixelated';

// El zombi con balde reutiliza los sprites del cono hasta que agregues los tuyos
for (const e of ['caminar', 'comer'])
  SPRITES['zombiBalde_' + e] = { ...SPRITES['zombiCono_' + e], src: `img/zombibalde_${e}.png` };

/* ---------- Conexión ---------- */
function conectar(alAbrir) {
  if (ws && ws.readyState <= 1) return;
  $('estado').textContent = 'Conectando…';
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = alAbrir;
  ws.onmessage = e => recibir(JSON.parse(e.data));
  ws.onerror = () => { $('estado').textContent = 'No se pudo conectar con el servidor.'; };
  ws.onclose = () => { if (enJuego && !(snap && snap.fin)) mostrarFin('Se perdió la conexión con el servidor'); };
}
const enviar = m => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };

$('crearP').onclick = () => conectar(() => enviar({ t: 'crear', rol: 'plantas' }));
$('crearZ').onclick = () => conectar(() => enviar({ t: 'crear', rol: 'zombis' }));
$('unirse').onclick = () => conectar(() => enviar({ t: 'unirse', codigo: $('codigo').value.trim().toUpperCase() }));
$('volver').onclick = () => location.reload();

function recibir(m) {
  if (m.t === 'sala') {
    rol = m.rol;
    $('estado').textContent = `Sala ${m.codigo}: esperando al rival. Pasale este código.`;
  } else if (m.t === 'inicio') {
    cfg = m.cfg; rol = m.rol;
    $('icono').textContent = rol === 'plantas' ? '☀️' : '🧠';
    $('rolTexto').textContent = rol === 'plantas' ? 'Jugás con las plantas 🌻' : 'Jugás con los zombis 🧟';
    armarBarra();
    $('lobby').hidden = true;
    enJuego = true;
  } else if (m.t === 'estado') {
    snap = m;
  } else if (m.t === 'error') {
    $('estado').textContent = m.msg;
    if (ws) ws.close();
  }
}

/* ---------- Cartas ---------- */
function crearCarta(k, d) {
  const b = document.createElement('button');
  b.className = 'carta';
  b.title = `${d.nombre}: ${d.desc}`;
  const icono = document.createElement('img');
  icono.className = 'em';
  icono.alt = d.nombre;
  icono.onerror = () => {
    const sp = document.createElement('span');
    sp.className = 'em';
    sp.textContent = d.emoji;
    icono.replaceWith(sp);
  };
  icono.src = `img/icono_${k}.png`;
  b.append(icono);
  b.insertAdjacentHTML('beforeend', `<b>${d.nombre}</b><small>${rol === 'plantas' ? '☀️' : '🧠'} ${d.costo}</small><i class="enfria"></i>`);
  return b;
}

function misCartas() { return rol === 'plantas' ? cfg.plantas : cfg.zombis; }

function armarBarra() {
  barra.innerHTML = '';
  Object.entries(misCartas()).forEach(([k, d], i) => {
    const b = crearCarta(k, d);
    b.title = `${d.nombre} (${i + 1}): ${d.desc}`;
    b.onclick = () => { sel = sel === k ? null : k; };
    barra.appendChild(b);
    cartas[k] = b;
  });
}

/* ---------- Entrada ---------- */
function posicion(ev) {
  const r = lienzo.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * lienzo.height / r.height };
}

lienzo.addEventListener('mousemove', ev => Object.assign(raton, posicion(ev)));

lienzo.addEventListener('click', ev => {
  if (!enJuego || !snap || snap.fin) return;
  const { x, y } = posicion(ev);
  const f = Math.floor(y / AL), c = Math.floor((x - GX) / AC);
  if (f < 0 || f >= FILAS) return;

  if (rol === 'plantas') {
    const sol = snap.caidos.find(s => Math.hypot(s.x - x, s.y - y) < 32);
    if (sol) { enviar({ t: 'sol', id: sol.id }); return; }
    if (sel && c >= 0 && c < COLS) { enviar({ t: 'plantar', tipo: sel, c, f }); sel = null; }
  } else if (sel) {
    enviar({ t: 'zombi', tipo: sel, f });   // el zombi queda seleccionado para invocar varios
  }
});

document.addEventListener('keydown', ev => {
  if (!cfg) return;
  const k = Object.keys(misCartas())[Number(ev.key) - 1];
  if (k) sel = sel === k ? null : k;
  if (ev.key === 'Escape') sel = null;
});

/* ---------- Dibujo ---------- */
const BASE_ZOMBI = { normal: 'zombi', cono: 'zombiCono', balde: 'zombiBalde' };
const EXTRA_EMOJI = { cono: '🚧', balde: '🪣' };

function dibujar() {
  const e = snap;
  ctx.clearRect(0, 0, W, lienzo.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (SPRITES.fondo.listo) {
    ctx.drawImage(SPRITES.fondo.img, 0, 0, W, lienzo.height);
  } else {
    for (let f = 0; f < FILAS; f++)
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (f + c) % 2 ? '#6fa83a' : '#7bb446';
        ctx.fillRect(GX + c * AC, f * AL, AC, AL);
      }
    ctx.fillStyle = '#4e7a2a';
    ctx.fillRect(0, 0, GX, lienzo.height);
  }

  e.cortadoras.forEach((c, f) => { if (!c.usada || c.activa) dibujarSprite('cortadora', c.x, f * AL + AL / 2); });

  if (sel && !e.fin) {
    const f = Math.floor(raton.y / AL), c = Math.floor((raton.x - GX) / AC);
    if (rol === 'plantas') {
      if (c >= 0 && c < COLS && f >= 0 && f < FILAS && !e.plantas.some(p => p.c === c && p.f === f))
        dibujarSprite(sel, GX + c * AC + AC / 2, f * AL + AL / 2, 0, 0.45);
    } else if (f >= 0 && f < FILAS) {
      ctx.fillStyle = 'rgba(229, 57, 53, .25)';   // fila donde caerá el zombi
      ctx.fillRect(GX, f * AL, COLS * AC, AL);
    }
  }

  for (const p of e.plantas) {
    const mult = p.tipo === 'cereza' && p.t > 0.5 ? 1.3 : (p.tipo === 'papamina' && !p.armada ? 0.6 : 1);
    dibujarSprite(p.tipo, GX + p.c * AC + AC / 2, p.f * AL + AL / 2, p.id * 0.37, 0.4 + 0.6 * p.v, mult);
  }

  for (const z of e.zombis) {
    const y = z.f * AL + AL / 2, base = BASE_ZOMBI[z.tipo];
    const estado = base + (z.comiendo ? '_comer' : '_caminar');
    const nombre = SPRITES[estado].listo ? estado : base + '_caminar';
    dibujarSprite(nombre, z.x, y, z.id * 0.37);
    if (EXTRA_EMOJI[z.tipo] && !SPRITES[nombre].listo) emoji(EXTRA_EMOJI[z.tipo], z.x, y - 30, 26);
    if (z.lento) emoji('🧊', z.x + 20, y + 20, 16);
    ctx.fillStyle = '#300';
    ctx.fillRect(z.x - 18, y + 36, 36, 4);
    ctx.fillStyle = '#e53935';
    ctx.fillRect(z.x - 18, y + 36, 36 * (z.hp / z.max), 4);
  }

  for (const g of e.guisantes) {
    const sp = g.hielo ? 'guisanteHielo' : 'guisante';
    if (SPRITES[sp].listo) dibujarSprite(sp, g.x, g.y);
    else {
      ctx.fillStyle = g.hielo ? '#4fc3f7' : '#1b5e20';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const f of e.efectos) {
    ctx.globalAlpha = Math.min(1, f.t * 2);
    emoji(f.txt, f.x, f.y, f.tam);
    ctx.globalAlpha = 1;
  }

  for (const s of e.caidos) {
    ctx.shadowColor = '#fff176';
    ctx.shadowBlur = 14;
    dibujarSprite('sol', s.x, s.y, s.id * 0.3, s.vida < 2 ? 0.5 : 1);
    ctx.shadowBlur = 0;
  }
}

/* ---------- Interfaz ---------- */
function mostrarFin(texto) {
  if (finMostrado) return;
  finMostrado = true;
  $('finTitulo').textContent = texto;
  $('fin').hidden = false;
}

function interfaz() {
  const e = snap, recurso = rol === 'plantas' ? e.soles : e.cerebros;
  $('recurso').textContent = recurso;
  const min = Math.floor(e.restante / 60), seg = String(e.restante % 60).padStart(2, '0');
  $('tiempo').textContent = `${min}:${seg}`;
  const esp = e.esp[rol] || {};
  for (const [k, d] of Object.entries(misCartas())) {
    const b = cartas[k], espera = esp[k] || 0;
    b.classList.toggle('elegida', sel === k);
    b.classList.toggle('bloqueada', espera > 0 || recurso < d.costo);
    b.querySelector('.enfria').style.height = `${(espera / d.espera) * 100}%`;
  }
  if (e.fin) {
    const gane = e.fin === rol;
    mostrarFin(`${gane ? '¡Ganaste! 🏆' : 'Perdiste 💀'}${e.motivo ? ' · ' + e.motivo : ''}`);
  }
}

function bucle(ts) {
  reloj = ts / 1000;
  if (enJuego && snap) { dibujar(); interfaz(); }
  requestAnimationFrame(bucle);
}

cargarTodo().then(() => requestAnimationFrame(bucle));
