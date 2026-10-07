const lienzo = document.getElementById('lienzo');
const ctx = lienzo.getContext('2d');
const COLS = 9, FILAS = 5, AC = 80, AL = 88, GX = 40, W = 800, TOTAL = 20;

/* ============================================================
   CONFIGURACIÓN DE GRÁFICOS  (editá esta sección con tus imágenes)
   Tamaño de cada cuadro: 64 x 64 px (32 x 32 para soles, cerebros, cortadoras y guisantes).
   Fondo y menús no cambian.
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
  girasol:            { src: 'img/girasol.png',        cuadros: 6, ancho: 64, alto: 64,  fps: 8,  escala: 1.25, emoji: '🌻', tam: 46 },
  lanzaguisantes:     { src: 'img/lanzaguisantes.png', cuadros: 6, ancho: 64, alto: 64,  fps: 8,  escala: 1.25, emoji: '🌱', tam: 46 },
  nuez:               { src: 'img/nuez.png',           cuadros: 4, ancho: 64, alto: 64,  fps: 4,  escala: 1.25, emoji: '🥜', tam: 46 },
  cereza:             { src: 'img/cereza.png',         cuadros: 4, ancho: 64, alto: 64,  fps: 6,  escala: 1.25, emoji: '🍒', tam: 46 },
  hielaguisantes: { src: 'img/hielaguisantes.png', cuadros: 6, ancho: 64, alto: 64, fps: 8, escala: 1.25, emoji: '❄️', tam: 46 },
  repetidora: { src: 'img/repetidora.png', cuadros: 6, ancho: 64, alto: 64, fps: 8, escala: 1.25, emoji: '🌿', tam: 46 },
  nuezalta: { src: 'img/nuezalta.png', cuadros: 4, ancho: 64, alto: 64, fps: 8, escala: 1.25, emoji: '🥥', tam: 46 },
  jalapeno: { src: 'img/jalapeno.png', cuadros: 4, ancho: 64, alto: 64, fps: 8, escala: 1.25, emoji: '🌶️', tam: 46 },
  papamina: { src: 'img/papamina.png', cuadros: 4, ancho: 64, alto: 64, fps: 8, escala: 1.25, emoji: '🥔', tam: 46 },
  carnivora: { src: 'img/carnivora.png', cuadros: 6, ancho: 64, alto: 64, fps: 8, escala: 1.25, emoji: '🪴', tam: 46 },
  aplastacalabaza: { src: 'img/aplastacalabaza.png', cuadros: 4, ancho: 64, alto: 64, fps: 8, escala: 1.25, emoji: '🎃', tam: 46 },
  zombi_caminar:      { src: 'img/zombi_caminar.png',  cuadros: 8, ancho: 64, alto: 64, fps: 8,  escala: 1.375, emoji: '🧟', tam: 52 },
  zombi_comer:        { src: 'img/zombi_comer.png',    cuadros: 6, ancho: 64, alto: 64, fps: 8,  escala: 1.375, emoji: '🧟', tam: 52 },
  zombiCono_caminar:  { src: 'img/zombicono_caminar.png', cuadros: 8, ancho: 64, alto: 64, fps: 8, escala: 1.375, emoji: '🧟', tam: 52 },
  zombiCono_comer:    { src: 'img/zombicono_comer.png',   cuadros: 6, ancho: 64, alto: 64, fps: 8, escala: 1.375, emoji: '🧟', tam: 52 },
  guisante:           { src: 'img/guisante.png',       cuadros: 1, ancho: 32, alto: 32,  fps: 1,  escala: 0.75, emoji: '🟢', tam: 18 },
  guisanteHielo: { src: 'img/guisante_hielo.png', cuadros: 1, ancho: 32, alto: 32, fps: 1, escala: 0.75, emoji: '🔵', tam: 18 },
  sol:                { src: 'img/sol.png',            cuadros: 8, ancho: 32, alto: 32,  fps: 10, escala: 2, emoji: '☀️', tam: 40 },
  cortadora:          { src: 'img/cortadora.png',      cuadros: 1, ancho: 32, alto: 32,  fps: 1,  escala: 1.25, emoji: '🚜', tam: 38 },
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
let mazo = [], elegidas = [];
let ws, rol = null, cfg = null, snap = null, sel = null, reloj = 0, enJuego = false, finMostrado = false;
const cartas = {};
const raton = { x: -1, y: -1 };

ctx.imageSmoothingEnabled = !CONFIG.pixelArt;
if (CONFIG.pixelArt) lienzo.style.imageRendering = 'pixelated';

// Objetos nuevos: si no existe la imagen se usan emojis
SPRITES.tumba   = { src: 'img/tumba.png',   cuadros: 1, ancho: 64, alto: 64, fps: 1, escala: 1.25, emoji: '🪦', tam: 52 };
SPRITES.diana   = { src: 'img/diana.png',   cuadros: 1, ancho: 64, alto: 64, fps: 1, escala: 1.25, emoji: '🎯', tam: 46 };
SPRITES.cerebro = { src: 'img/cerebro.png', cuadros: 1, ancho: 32, alto: 32, fps: 1, escala: 1.5, emoji: '🧠', tam: 36 };

// Sprites de zombis: img/zombi<tipo>_caminar.png y img/zombi<tipo>_comer.png (si faltan, se usa el emoji)
const BASE_ZOMBI = { normal: 'zombi', cono: 'zombiCono' };
for (const t of ['bandera', 'saltador', 'periodico', 'puerta', 'caja', 'balde', 'futbolista', 'gigante']) {
  BASE_ZOMBI[t] = 'zombi' + t[0].toUpperCase() + t.slice(1);
  for (const e of ['caminar', 'comer'])
    SPRITES[`${BASE_ZOMBI[t]}_${e}`] = { ...SPRITES['zombi_' + e], src: `img/zombi${t}_${e}.png` };
}

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
  } else if (m.t === 'seleccion') {
    cfg = m.cfg; rol = m.rol;
    $('icono').textContent = rol === 'plantas' ? '☀️' : '🧠';
    $('rolTexto').textContent = rol === 'plantas' ? 'Jugás con las plantas 🌻' : 'Jugás con los zombis 🧟';
    $('lobby').hidden = true;
    $('seleccion').hidden = false;
    armarSeleccion();
  } else if (m.t === 'rival-listo') {
    $('info').textContent = '✔ Tu rival ya eligió sus cartas.';
  } else if (m.t === 'inicio') {
    mazo = m.mazo;
    sel = null;
    $('pala').hidden = false;
    $('pala').title = rol === 'plantas' ? 'Pala (P): quitá una de tus plantas' : 'Pala (P): quitá una de tus tumbas o zombis';
    armarBarra();
    $('seleccion').hidden = true;
    enJuego = true;
  } else if (m.t === 'estado') {
    snap = m;
  } else if (m.t === 'salio') {
    mostrarFin('Tu rival abandonó antes de empezar');
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

const pool = () => (rol === 'plantas' ? cfg.plantas : cfg.zombis);
function misCartas() { return Object.fromEntries(mazo.map(k => [k, pool()[k]])); }   // solo las elegidas

/* ---------- Selección de cartas ---------- */
const MAX_CARTAS = 6;
const DEFECTO = {
  plantas: ['girasol', 'lanzaguisantes', 'nuez', 'cereza', 'jalapeno', 'papamina'],
  zombis: ['tumba', 'normal', 'cono', 'balde', 'saltador', 'caja'],
};
const cartasMenu = {};

function armarSeleccion() {
  const defs = pool();
  elegidas = DEFECTO[rol].filter(k => defs[k]);
  $('rejilla').innerHTML = '';
  Object.entries(defs).forEach(([k, d]) => {
    const b = crearCarta(k, d);
    const info = () => { $('info').textContent = `${d.nombre}: ${d.desc}`; };
    b.onmouseenter = info;
    b.onclick = () => {
      const i = elegidas.indexOf(k);
      if (i >= 0) elegidas.splice(i, 1);
      else if (elegidas.length < MAX_CARTAS) elegidas.push(k);
      info();
      marcarSeleccion();
    };
    $('rejilla').appendChild(b);
    cartasMenu[k] = b;
  });
  marcarSeleccion();
}

function marcarSeleccion() {
  for (const [k, b] of Object.entries(cartasMenu)) {
    const sel = elegidas.includes(k);
    b.classList.toggle('elegida', sel);
    b.classList.toggle('bloqueada', !sel && elegidas.length >= MAX_CARTAS);
  }
  $('contador').textContent = `${elegidas.length}/${MAX_CARTAS}`;
  $('listo').disabled = elegidas.length === 0;
}

$('listo').onclick = () => {
  enviar({ t: 'listo', cartas: elegidas });
  $('listo').disabled = true;
  $('listo').textContent = 'Esperando al rival…';
  document.querySelectorAll('#rejilla .carta').forEach(b => { b.style.pointerEvents = 'none'; });
};

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
    if (sel === 'pala') { enviar({ t: 'pala', c, f }); sel = null; return; }
    if (sel && c >= 0 && c <= cfg.geo.PLANTA_COL_MAX) { enviar({ t: 'plantar', tipo: sel, c, f }); sel = null; }
  } else {
    const cb = snap.cerebrosCaidos.find(s => Math.hypot(s.x - x, s.y - y) < 32);
    if (cb) { enviar({ t: 'cerebro', id: cb.id }); return; }
    if (sel === 'pala') { enviar({ t: 'pala', c, f, x }); sel = null; return; }
    if (!sel) return;
    if (cfg.zombis[sel].tumba) {                      // las tumbas se colocan en una casilla
      if (c >= 0 && c < COLS) { enviar({ t: 'tumba', c, f }); sel = null; }
    } else {
      if (c >= cfg.geo.ZOMBI_COL_MIN && c <= cfg.geo.ZOMBI_COL_MAX) enviar({ t: 'zombi', tipo: sel, c, f });   // sigue seleccionado para poner varios
    }
  }
});

document.addEventListener('keydown', ev => {
  if (!cfg) return;
  const k = Object.keys(misCartas())[Number(ev.key) - 1];
  if (k) sel = sel === k ? null : k;
  if (ev.key === 'p' || ev.key === 'P') sel = sel === 'pala' ? null : 'pala';
  if (ev.key === 'Escape') sel = null;
});

/* ---------- Pantalla completa ---------- */
const juegoEl = document.querySelector('.juego');
const enPantallaCompleta = () => document.fullscreenElement || document.webkitFullscreenElement;
const sincronizarPantalla = () =>
  juegoEl.classList.toggle('completa', !!enPantallaCompleta() || juegoEl.classList.contains('pseudo'));
const pseudoPantalla = () => { juegoEl.classList.add('pseudo'); sincronizarPantalla(); };   // para navegadores sin la API (iPhone)

function alternarPantalla() {
  if (enPantallaCompleta()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  if (juegoEl.classList.contains('pseudo')) { juegoEl.classList.remove('pseudo'); sincronizarPantalla(); return; }
  const pedir = juegoEl.requestFullscreen || juegoEl.webkitRequestFullscreen;
  if (!pedir) return pseudoPantalla();
  const r = pedir.call(juegoEl);
  if (r && r.catch) r.catch(pseudoPantalla);
}

$('pantalla').onclick = alternarPantalla;
$('pala').onclick = () => { sel = sel === 'pala' ? null : 'pala'; };
document.addEventListener('fullscreenchange', sincronizarPantalla);
document.addEventListener('webkitfullscreenchange', sincronizarPantalla);
document.addEventListener('keydown', ev => {
  if (ev.target.tagName === 'INPUT') return;                       // no molestar al escribir el código
  if (ev.key === 'f' || ev.key === 'F') alternarPantalla();
  if (ev.key === 'Escape' && juegoEl.classList.contains('pseudo')) alternarPantalla();
});

/* ---------- Dibujo ---------- */

function barraVida(x, y, v, color) {
  ctx.fillStyle = '#300';
  ctx.fillRect(x - 22, y + 36, 44, 4);
  ctx.fillStyle = color;
  ctx.fillRect(x - 22, y + 36, 44 * v, 4);
}

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
        ctx.fillStyle = (f + c) % 2 ? '#587f31' : '#628838';
        ctx.fillRect(GX + c * AC, f * AL, AC, AL);
      }
    ctx.fillStyle = '#38522a';
    ctx.fillRect(0, 0, GX, lienzo.height);
  }

  const colZ = cfg.geo.PLANTA_COL_MAX + 1;               // desde acá es territorio zombi: las plantas no pueden ir
  const zx = GX + colZ * AC;
  ctx.fillStyle = 'rgba(60, 20, 30, .18)';
  ctx.fillRect(zx, 0, (COLS - colZ) * AC, FILAS * AL);
  ctx.strokeStyle = 'rgba(210, 178, 101, .55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath(); ctx.moveTo(zx, 0); ctx.lineTo(zx, FILAS * AL); ctx.stroke();
  ctx.setLineDash([]);

  e.cortadoras.forEach((c, f) => { if (!c.usada || c.activa) dibujarSprite('cortadora', c.x, f * AL + AL / 2); });

  if (sel === 'pala' && !e.fin) {             // resalta la casilla y si hay algo propio que quitar
    const f = Math.floor(raton.y / AL), c = Math.floor((raton.x - GX) / AC);
    if (c >= 0 && c < COLS && f >= 0 && f < FILAS) {
      const propio = rol === 'plantas'
        ? e.plantas.some(o => o.c === c && o.f === f)
        : e.tumbas.some(o => o.c === c && o.f === f) || e.zombis.some(z => z.f === f && Math.floor((z.x - GX) / AC) === c);
      ctx.fillStyle = propio ? 'rgba(168, 50, 45, .38)' : 'rgba(0, 0, 0, .12)';
      ctx.fillRect(GX + c * AC, f * AL, AC, AL);
      ctx.lineWidth = 3;
      ctx.strokeStyle = propio ? '#d2b265' : 'rgba(255, 255, 255, .25)';
      ctx.strokeRect(GX + c * AC + 2, f * AL + 2, AC - 4, AL - 4);
    }
  } else if (sel && !e.fin) {
    const f = Math.floor(raton.y / AL), c = Math.floor((raton.x - GX) / AC);
    if (rol === 'plantas') {
      if (c >= 0 && c <= cfg.geo.PLANTA_COL_MAX && f >= 0 && f < FILAS && !e.plantas.some(p => p.c === c && p.f === f))
        dibujarSprite(sel, GX + c * AC + AC / 2, f * AL + AL / 2, 0, 0.45);
    } else if (cfg.zombis[sel].tumba) {
      const libre = !e.plantas.some(p => p.c === c && p.f === f) && !e.tumbas.some(t => t.c === c && t.f === f)
                 && !e.dianas.some(d => d.c === c && d.f === f);
      if (c >= cfg.geo.TUMBA_COL && c < COLS && f >= 0 && f < FILAS && libre)
        dibujarSprite('tumba', GX + c * AC + AC / 2, f * AL + AL / 2, 0, 0.45);
    } else {
      const g = cfg.geo;
      ctx.fillStyle = 'rgba(168, 50, 45, .16)';              // las únicas columnas donde se pueden poner zombis
      ctx.fillRect(GX + g.ZOMBI_COL_MIN * AC, 0, (g.ZOMBI_COL_MAX - g.ZOMBI_COL_MIN + 1) * AC, FILAS * AL);
      if (c >= g.ZOMBI_COL_MIN && c <= g.ZOMBI_COL_MAX && f >= 0 && f < FILAS) {
        ctx.fillStyle = 'rgba(168, 50, 45, .30)';
        ctx.fillRect(GX + c * AC, f * AL, AC, AL);
        dibujarSprite(BASE_ZOMBI[sel] + '_caminar', GX + c * AC + AC / 2, f * AL + AL / 2, 0, 0.55);
      }
    }
  }

  const centro = o => [GX + o.c * AC + AC / 2, o.f * AL + AL / 2];
  for (const d of e.dianas) {
    const [x, y] = centro(d), tapada = e.tumbas.some(t => t.c === d.c && t.f === d.f);
    dibujarSprite('diana', x, y, 0, tapada ? 0.35 : 1);   // se ve tenue debajo de la tumba
    if (!tapada) barraVida(x, y, d.v, '#fdd835');
  }
  for (const t of e.tumbas) {
    const [x, y] = centro(t);
    dibujarSprite('tumba', x, y, t.id * 0.5);
    barraVida(x, y, t.v, '#b0bec5');
  }

  for (const p of e.plantas) {
    const mult = p.tipo === 'cereza' && p.t > 0.5 ? 1.3 : (p.tipo === 'papamina' && !p.armada ? 0.6 : 1);
    dibujarSprite(p.tipo, GX + p.c * AC + AC / 2, p.f * AL + AL / 2, p.id * 0.37, 0.4 + 0.6 * p.v, mult);
  }

  for (const z of e.zombis) {
    const y = z.f * AL + AL / 2, base = BASE_ZOMBI[z.tipo];
    const estado = base + (z.comiendo ? '_comer' : '_caminar');
    const nombre = SPRITES[estado].listo ? estado : base + '_caminar';
    dibujarSprite(nombre, z.x, y, z.id * 0.37, 1, z.tipo === 'gigante' ? 1.5 : 1);
    if (z.tipo !== 'normal' && !SPRITES[nombre].listo) emoji(z.enojado ? '😡' : cfg.zombis[z.tipo].emoji, z.x, y - 30, 26);
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

  for (const s of e.cerebrosCaidos) {
    ctx.shadowColor = '#a5d6a7';
    ctx.shadowBlur = 14;
    dibujarSprite('cerebro', s.x, s.y, s.id * 0.3, s.vida < 2 ? 0.5 : 1);
    ctx.shadowBlur = 0;
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
  $('pala').classList.toggle('elegida', sel === 'pala');
  lienzo.style.cursor = sel === 'pala' ? 'crosshair' : 'pointer';
  const e = snap, recurso = rol === 'plantas' ? e.soles : e.cerebros;
  $('recurso').textContent = recurso;
  $('tiempo').textContent = `${e.dianas.length}/${e.dianasTotal}`;
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
