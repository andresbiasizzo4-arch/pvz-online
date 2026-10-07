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

const TIPOS = {
  girasol: { nombre: 'Girasol', emoji: '🌻', icono: 'img/icono_girasol.png', costo: 50, vida: 100, espera: 5, desc: 'Produce soles extra cada 8 segundos.' },
  lanzaguisantes: { nombre: 'Lanzador', emoji: '🌱', icono: 'img/icono_lanzaguisantes.png', costo: 100, vida: 100, espera: 5, desc: 'Dispara guisantes a los zombis de su fila.' },
  hielaguisantes: { nombre: 'Hielo', emoji: '❄️', icono: 'img/icono_hielaguisantes.png', costo: 175, vida: 100, espera: 5, desc: 'Sus guisantes helados ralentizan a los zombis.' },
  repetidora: { nombre: 'Repetidora', emoji: '🌿', icono: 'img/icono_repetidora.png', costo: 200, vida: 100, espera: 7, desc: 'Dispara dos guisantes a la vez.' },
  nuez: { nombre: 'Nuez', emoji: '🥜', icono: 'img/icono_nuez.png', costo: 50, vida: 600, espera: 20, desc: 'Muro resistente que frena a los zombis.' },
  nuezalta: { nombre: 'Nuez alta', emoji: '🥥', icono: 'img/icono_nuezalta.png', costo: 125, vida: 1200, espera: 20, desc: 'Muro el doble de resistente.' },
  cereza: { nombre: 'Cereza', emoji: '🍒', icono: 'img/icono_cereza.png', costo: 150, vida: 50, espera: 30, desc: 'Explota y destruye zombis en un área de 3x3.' },
  jalapeno: { nombre: 'Jalapeño', emoji: '🌶️', icono: 'img/icono_jalapeno.png', costo: 125, vida: 50, espera: 30, desc: 'Incinera a todos los zombis de una fila.' },
  papamina: { nombre: 'Papa mina', emoji: '🥔', icono: 'img/icono_papamina.png', costo: 25, vida: 100, espera: 30, desc: 'Tarda 15 s en armarse; luego explota al contacto.' },
  carnivora: { nombre: 'Carnívora', emoji: '🪴', icono: 'img/icono_carnivora.png', costo: 150, vida: 100, espera: 7, desc: 'Se traga un zombi entero, pero tarda 25 s en masticar.' },
  aplastacalabaza: { nombre: 'Calabaza', emoji: '🎃', icono: 'img/icono_aplastacalabaza.png', costo: 50, vida: 100, espera: 30, desc: 'Aplasta al primer zombi que se le acerque.' },
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

/* ---------- Estado e interfaz ---------- */
const elSoles = document.getElementById('soles');
const elProgreso = document.getElementById('progreso');
const elFin = document.getElementById('fin');
const elFinTitulo = document.getElementById('finTitulo');
const barra = document.getElementById('cartas');

let est, ultimo = 0, reloj = 0;
const raton = { x: -1, y: -1 };

ctx.imageSmoothingEnabled = !CONFIG.pixelArt;
if (CONFIG.pixelArt) lienzo.style.imageRendering = 'pixelated';

// ---- Selección de plantas ----
const MAX_CARTAS = 6;
let elegidas = ['girasol', 'lanzaguisantes', 'nuez'];
let enMenu = true;
const elMenu = document.getElementById('menu');
const elRejilla = document.getElementById('rejilla');
const elInfo = document.getElementById('info');
const elJugar = document.getElementById('jugar');

function crearCarta(k) {
  const t = TIPOS[k];
  const b = document.createElement('button');
  b.className = 'carta';
  b.title = t.nombre;
  const icono = document.createElement('img');
  icono.className = 'em';
  icono.alt = t.nombre;
  icono.onerror = () => {
    const sp = document.createElement('span');
    sp.className = 'em';
    sp.textContent = t.emoji;
    icono.replaceWith(sp);
  };
  icono.src = t.icono;
  b.append(icono);
  b.insertAdjacentHTML('beforeend', `<b>${t.nombre}</b><small>☀️ ${t.costo}</small><i class="enfria"></i>`);
  return b;
}

function armarBarra() {
  barra.innerHTML = '';
  elegidas.forEach((k, i) => {
    const b = crearCarta(k);
    b.title = `${TIPOS[k].nombre} (${i + 1})`;
    b.onclick = () => elegir(k);
    barra.appendChild(b);
    TIPOS[k].btn = b;
  });
}

function armarMenu() {
  elRejilla.innerHTML = '';
  Object.entries(TIPOS).forEach(([k, t]) => {
    const b = crearCarta(k);
    const info = () => { elInfo.textContent = `${t.nombre}: ${t.desc}`; };
    b.onmouseenter = info;
    b.onclick = () => {
      const i = elegidas.indexOf(k);
      if (i >= 0) elegidas.splice(i, 1);
      else if (elegidas.length < MAX_CARTAS) elegidas.push(k);
      info();
      refrescarMenu();
    };
    elRejilla.appendChild(b);
    t.btnMenu = b;
  });
  refrescarMenu();
}

function refrescarMenu() {
  for (const [k, t] of Object.entries(TIPOS)) {
    const sel = elegidas.includes(k);
    t.btnMenu.classList.toggle('elegida', sel);
    t.btnMenu.classList.toggle('bloqueada', !sel && elegidas.length >= MAX_CARTAS);
  }
  document.getElementById('contador').textContent = `${elegidas.length}/${MAX_CARTAS}`;
  elJugar.disabled = elegidas.length === 0;
}

function abrirMenu() {
  enMenu = true;
  elFin.hidden = true;
  elMenu.hidden = false;
  refrescarMenu();
}

elJugar.onclick = () => {
  armarBarra();
  reiniciar();
  enMenu = false;
  elMenu.hidden = true;
};

function elegir(k) {
  if (est.fin || enMenu) return;
  est.sel = est.sel === k ? null : k;
}

function reiniciar() {
  est = {
    soles: 150, plantas: [], zombis: [], guisantes: [], caidos: [], efectos: [],
    cortadoras: Array.from({ length: FILAS }, () => ({ x: GX / 2, activa: false, usada: false })),
    sel: null, espera: {}, sigSol: 6, sigZombi: 12, generados: 0, fin: null,
  };
  elFin.hidden = true;
}

function nuevoSol(x, y, destino) {
  est.caidos.push({ x, y, destino, vida: 9, fase: Math.random() * 3 });
}

function generarZombi() {
  const g = est.generados++;
  const cono = g >= 4 && Math.random() < 0.35;
  est.zombis.push({
    x: W + 20, f: Math.floor(Math.random() * FILAS),
    hp: cono ? 220 : 100, max: cono ? 220 : 100, cono,
    vel: 13 + Math.random() * 5, comiendo: false, fase: Math.random() * 3,
  });
}

/* ---------- Lógica ---------- */
function fx(x, y, txt, tam) { est.efectos.push({ x, y, txt, tam, t: 0.5 }); }

function actualizar(dt) {
  const e = est;
  for (const k in e.espera) e.espera[k] = Math.max(0, e.espera[k] - dt);

  e.sigSol -= dt;
  if (e.sigSol <= 0) {
    e.sigSol = 8;
    nuevoSol(GX + 20 + Math.random() * (COLS * AC - 60), -30, 60 + Math.random() * (FILAS * AL - 120));
  }
  e.sigZombi -= dt;
  if (e.generados < TOTAL && e.sigZombi <= 0) {
    generarZombi();
    e.sigZombi = Math.max(3, 9 - e.generados * 0.3);
  }

  for (const s of e.caidos) {
    if (s.y < s.destino) s.y += 45 * dt; else s.vida -= dt;
  }
  e.caidos = e.caidos.filter(s => s.vida > 0);

  for (const p of e.plantas) {
    p.t += dt;
    const px = GX + p.c * AC + AC / 2, py = p.f * AL + AL / 2;
    switch (p.tipo) {
      case 'girasol':
        if (p.t >= 8) { p.t = 0; nuevoSol(px + 10, py - 25, py + 10); }
        break;
      case 'lanzaguisantes': case 'hielaguisantes': case 'repetidora': {
        const hay = e.zombis.some(z => z.f === p.f && z.x > px - 20);
        if (hay && p.t >= 1.4) {
          p.t = 0;
          const n = p.tipo === 'repetidora' ? 2 : 1;
          for (let i = 0; i < n; i++)
            e.guisantes.push({ x: px + 25 - i * 28, y: py - 8, f: p.f, hielo: p.tipo === 'hielaguisantes' });
        }
        break;
      }
      case 'cereza':
        if (p.t >= 1) {
          p.vida = 0; fx(px, py, '💥', 150);
          for (const z of e.zombis) if (Math.abs(z.f - p.f) <= 1 && Math.abs(z.x - px) <= AC * 1.5) z.hp -= 1000;
        }
        break;
      case 'jalapeno':
        if (p.t >= 0.8) {
          p.vida = 0;
          for (let c = 0; c < COLS; c++) fx(GX + c * AC + AC / 2, py, '🔥', 70);
          for (const z of e.zombis) if (z.f === p.f) z.hp -= 1000;
        }
        break;
      case 'papamina':
        p.armada = p.t >= 15;
        if (p.armada && e.zombis.some(z => z.f === p.f && Math.abs(z.x - px) < AC * 0.6)) {
          p.vida = 0; fx(px, py, '💥', 90);
          for (const z of e.zombis) if (z.f === p.f && Math.abs(z.x - px) < AC * 0.9) z.hp -= 1000;
        }
        break;
      case 'carnivora': {
        if (p.mast > 0) { p.mast -= dt; break; }
        const z = e.zombis.find(z => z.f === p.f && z.x > px - 30 && z.x < px + AC * 1.5);
        if (z) { z.hp = 0; p.mast = 25; }
        break;
      }
      case 'aplastacalabaza': {
        const z0 = e.zombis.find(z => z.f === p.f && z.x > px - 30 && z.x < px + AC * 1.2);
        if (z0) {
          p.vida = 0; fx(z0.x, py, '💢', 80);
          for (const z of e.zombis) if (z.f === p.f && Math.abs(z.x - z0.x) < 50) z.hp -= 1000;
        }
        break;
      }
    }
  }
  e.efectos.forEach(f => f.t -= dt);
  e.efectos = e.efectos.filter(f => f.t > 0);

  for (const g of e.guisantes) {
    g.x += 320 * dt;
    const z = e.zombis.find(z => z.f === g.f && Math.abs(z.x - g.x) < 22);
    if (z) { z.hp -= 20; if (g.hielo) z.lento = 5; g.x = 9999; }
  }
  e.guisantes = e.guisantes.filter(g => g.x < W);

  for (const z of e.zombis) {
    const col = Math.floor((z.x - GX) / AC);
    const planta = e.plantas.find(p => p.f === z.f && p.c === col);
    z.comiendo = !!planta;
    if (z.lento > 0) z.lento -= dt;
    if (planta) planta.vida -= 25 * dt;
    else z.x -= z.vel * (z.lento > 0 ? 0.5 : 1) * dt;
    if (z.x < GX - 5) {
      const c = e.cortadoras[z.f];
      if (!c.usada) c.activa = c.usada = true;
      else e.fin = 'perdiste';
    }
  }

  e.cortadoras.forEach((c, f) => {
    if (!c.activa) return;
    c.x += 420 * dt;
    for (const z of e.zombis) if (z.f === f && Math.abs(z.x - c.x) < 40) z.hp = 0;
    if (c.x > W + 40) c.activa = false;
  });

  e.plantas = e.plantas.filter(p => p.vida > 0);
  e.zombis = e.zombis.filter(z => z.hp > 0);

  if (!e.fin && e.generados >= TOTAL && e.zombis.length === 0) e.fin = 'ganaste';
}

/* ---------- Dibujo ---------- */
function spriteZombi(z) {
  const base = z.cono ? 'zombiCono' : 'zombi';
  const estado = base + (z.comiendo ? '_comer' : '_caminar');
  return SPRITES[estado].listo ? estado : base + '_caminar';
}

function dibujar() {
  const e = est;
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

  e.cortadoras.forEach((c, f) => {
    if (!c.usada || c.activa) dibujarSprite('cortadora', c.x, f * AL + AL / 2);
  });

  if (e.sel) {
    const c = Math.floor((raton.x - GX) / AC), f = Math.floor(raton.y / AL);
    if (c >= 0 && c < COLS && f >= 0 && f < FILAS && !e.plantas.some(p => p.c === c && p.f === f))
      dibujarSprite(e.sel, GX + c * AC + AC / 2, f * AL + AL / 2, 0, 0.45);
  }

  for (const p of e.plantas) {
    const t = TIPOS[p.tipo];
    const mult = p.tipo === 'cereza' && p.t > 0.5 ? 1.3 : (p.tipo === 'papamina' && !p.armada ? 0.6 : 1);
    dibujarSprite(p.tipo, GX + p.c * AC + AC / 2, p.f * AL + AL / 2, p.fase,
      0.4 + 0.6 * (p.vida / t.vida), mult);
  }

  for (const z of e.zombis) {
    const y = z.f * AL + AL / 2;
    const nombre = spriteZombi(z);
    dibujarSprite(nombre, z.x, y, z.fase);
    if (z.lento > 0) emoji('🧊', z.x + 20, y + 20, 16);
    if (z.cono && !SPRITES[nombre].listo) emoji('🚧', z.x, y - 30, 26); // solo en modo emoji
    ctx.fillStyle = '#300';
    ctx.fillRect(z.x - 18, y + 36, 36, 4);
    ctx.fillStyle = '#e53935';
    ctx.fillRect(z.x - 18, y + 36, 36 * (z.hp / z.max), 4);
  }

  for (const g of e.guisantes) {
    const sp = g.hielo ? 'guisanteHielo' : 'guisante';
    if (SPRITES[sp].listo) {
      dibujarSprite(sp, g.x, g.y);
    } else {
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
    dibujarSprite('sol', s.x, s.y, s.fase, s.vida < 2 ? 0.5 : 1);
    ctx.shadowBlur = 0;
  }
}

function interfaz() {
  elSoles.textContent = est.soles;
  elProgreso.textContent = `${Math.min(est.generados, TOTAL)}/${TOTAL}`;
  for (const k of elegidas) {
    const t = TIPOS[k];
    if (!t.btn) continue;
    const espera = est.espera[k] || 0;
    t.btn.classList.toggle('elegida', est.sel === k);
    t.btn.classList.toggle('bloqueada', espera > 0 || est.soles < t.costo);
    t.btn.querySelector('.enfria').style.height = `${(espera / t.espera) * 100}%`;
  }
  if (est.fin && elFin.hidden) {
    elFinTitulo.textContent = est.fin === 'ganaste' ? '¡Ganaste! 🌻' : 'Los zombis comieron tu cerebro 🧠';
    elFin.hidden = false;
  }
}

function bucle(ts) {
  reloj = ts / 1000;
  const dt = Math.min(0.05, (ts - ultimo) / 1000);
  ultimo = ts;
  if (!est.fin && !enMenu) actualizar(dt);
  dibujar();
  if (!enMenu) interfaz();
  requestAnimationFrame(bucle);
}

/* ---------- Entrada ---------- */
function posicion(ev) {
  const r = lienzo.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * W / r.width, y: (ev.clientY - r.top) * lienzo.height / r.height };
}

lienzo.addEventListener('mousemove', ev => Object.assign(raton, posicion(ev)));

lienzo.addEventListener('click', ev => {
  if (est.fin || enMenu) return;
  const { x, y } = posicion(ev);

  const sol = est.caidos.find(s => Math.hypot(s.x - x, s.y - y) < 32);
  if (sol) {
    est.soles += 25;
    est.caidos.splice(est.caidos.indexOf(sol), 1);
    return;
  }

  const c = Math.floor((x - GX) / AC), f = Math.floor(y / AL);
  if (!est.sel || c < 0 || c >= COLS || f < 0 || f >= FILAS) return;
  const t = TIPOS[est.sel];
  if (est.plantas.some(p => p.c === c && p.f === f)) return;
  if (est.soles < t.costo || (est.espera[est.sel] || 0) > 0) return;

  est.soles -= t.costo;
  est.espera[est.sel] = t.espera;
  est.plantas.push({ tipo: est.sel, c, f, vida: t.vida, t: 0, fase: Math.random() * 3 });
  est.sel = null;
});

document.addEventListener('keydown', ev => {
  const k = elegidas[Number(ev.key) - 1];
  if (k && est) elegir(k);
  if (ev.key === 'Escape' && est) est.sel = null;
});

document.getElementById('reiniciar').onclick = reiniciar;
document.getElementById('cambiar').onclick = abrirMenu;

cargarTodo().then(() => {
  armarMenu();
  armarBarra();
  reiniciar();
  abrirMenu();
  requestAnimationFrame(bucle);
});
