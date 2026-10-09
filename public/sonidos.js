/* ============================================================
   SONIDOS  (editá esta sección para incluir o reemplazar los tuyos)
   ------------------------------------------------------------
   Cada sonido tiene el nombre del EVENTO que lo dispara. Para
   reemplazar uno, pisá el archivo de la carpeta audio/ con el tuyo
   (mismo nombre), o cambiá la ruta en "src". Formatos: wav, mp3, ogg.

     src       ruta del archivo, o una LISTA de archivos: se elige uno al azar
               cada vez (sirve para dar variedad).
     volumen   0 a 1 (relativo al volumen general).
     espera    milisegundos mínimos entre dos reproducciones del mismo sonido
               (evita que suene todo junto cuando pasa muchas veces seguidas).
     variacion cuánto varía el tono al azar (0.1 = ±10 %). Opcional.

   Sonido distinto según el tipo: agregá una entrada con el nombre
   "<evento>_<tipo>", por ejemplo "zombi_gigante" o "plantar_nuez".
   Si existe, se usa en lugar del genérico. Ver audio/LEEME.txt.

   Si un archivo falta o no carga, ese sonido simplemente no suena.
   ============================================================ */
const VOLUMEN_GENERAL = 0.8;   // 0 a 1

const SONIDOS = {
  // --- Acciones de los jugadores ---
  plantar:      { src: 'audio/plantar.wav',      volumen: 0.7 },
  pala:         { src: 'audio/pala.wav',         volumen: 0.7 },
  sol:          { src: 'audio/sol.wav',          volumen: 0.7,  variacion: 0.05 },
  cerebro:      { src: 'audio/cerebro.wav',      volumen: 0.7,  variacion: 0.05 },
  tumba:        { src: 'audio/tumba.wav',        volumen: 0.8 },
  zombi:        { src: 'audio/zombi.wav',        volumen: 0.6,  variacion: 0.12, espera: 150 },
  horda:        { src: 'audio/horda.wav',        volumen: 0.8 },

  // --- Combate ---
  disparo:      { src: 'audio/disparo.wav',      volumen: 0.25, variacion: 0.1,  espera: 120 },
  golpe:        { src: 'audio/golpe.wav',        volumen: 0.3,  variacion: 0.15, espera: 80 },
  explosion:    { src: 'audio/explosion.wav',    volumen: 0.9,  espera: 100 },
  fuego:        { src: 'audio/fuego.wav',        volumen: 0.7 },
  aplastar:     { src: 'audio/aplastar.wav',     volumen: 0.8 },
  tragar:       { src: 'audio/tragar.wav',       volumen: 0.8 },
  comer:        { src: 'audio/comer.wav',        volumen: 0.35, variacion: 0.1,  espera: 250 },
  zombi_muere:  { src: 'audio/zombi_muere.wav',  volumen: 0.5,  variacion: 0.1,  espera: 120 },
  planta_muere: { src: 'audio/planta_muere.wav', volumen: 0.6,  espera: 150 },
  tumba_rota:   { src: 'audio/tumba_rota.wav',   volumen: 0.7,  espera: 200 },
  diana_rota:   { src: 'audio/diana_rota.wav',   volumen: 0.9 },
  cortadora:    { src: 'audio/cortadora.wav',    volumen: 0.8 },

  // --- Interfaz y fin de partida ---
  seleccionar:  { src: 'audio/seleccionar.wav',  volumen: 0.5,  espera: 40 },
  victoria:     { src: 'audio/victoria.wav',     volumen: 0.9 },
  derrota:      { src: 'audio/derrota.wav',      volumen: 0.9 },

  // --- Ejemplos de sonido por tipo (quitá las barras para activarlos) ---
  // zombi_gigante: { src: 'audio/zombi_gigante.wav', volumen: 1 },
  // plantar_nuez:  { src: 'audio/plantar_nuez.wav',  volumen: 0.7 },
};

// Música de fondo en bucle (opcional). Poné tu archivo en audio/ con este nombre.
const MUSICA = { src: 'audio/musica.mp3', volumen: 0.25 };

/* ============================================================
   MOTOR DE SONIDO  (no hace falta tocar nada de acá para abajo)
   ============================================================ */
const Sonido = (() => {
  let ctx = null, maestro = null, silenciado = false;
  const buffers = {}, ultimo = {};
  let musicaBuf = null, musicaSrc = null;

  try { silenciado = localStorage.getItem('pvz-silencio') === '1'; } catch { /* sin almacenamiento */ }

  function contexto() {
    if (ctx) return ctx;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    ctx = new Audio();
    maestro = ctx.createGain();
    maestro.gain.value = silenciado ? 0 : VOLUMEN_GENERAL;
    maestro.connect(ctx.destination);
    return ctx;
  }

  // Los navegadores bloquean el audio hasta el primer clic o tecla.
  const desbloquear = () => { if (ctx && ctx.state === 'suspended') ctx.resume(); };
  ['pointerdown', 'keydown'].forEach(e => document.addEventListener(e, desbloquear, { passive: true }));

  async function cargarArchivo(url) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      return await ctx.decodeAudioData(await r.arrayBuffer());
    } catch { return null; }
  }

  async function cargar() {
    if (!contexto()) return;
    const faltan = [];
    await Promise.all(Object.entries(SONIDOS).map(async ([nombre, d]) => {
      const lista = [].concat(d.src);
      const cargados = await Promise.all(lista.map(cargarArchivo));
      buffers[nombre] = cargados.filter(Boolean);
      lista.forEach((s, i) => { if (!cargados[i]) faltan.push(s); });
    }));
    if (faltan.length) console.info('Sin sonido (se omite):', faltan.join(', '));
  }

  function reproducir(nombre, tipo) {
    if (silenciado || !ctx) return;
    const clave = tipo && SONIDOS[`${nombre}_${tipo}`] ? `${nombre}_${tipo}` : nombre;
    const d = SONIDOS[clave], lista = buffers[clave];
    if (!d || !lista || !lista.length) return;
    const ahora = performance.now();
    if (ultimo[clave] && ahora - ultimo[clave] < (d.espera || 0)) return;
    ultimo[clave] = ahora;
    const fuente = ctx.createBufferSource();
    fuente.buffer = lista[Math.floor(Math.random() * lista.length)];
    if (d.variacion) fuente.playbackRate.value = 1 + (Math.random() * 2 - 1) * d.variacion;
    const ganancia = ctx.createGain();
    ganancia.gain.value = d.volumen ?? 1;
    fuente.connect(ganancia).connect(maestro);
    fuente.start();
  }

  async function musica(encender) {
    if (!ctx) return;
    if (!encender) {
      if (musicaSrc) { try { musicaSrc.stop(); } catch { /* ya detenida */ } musicaSrc = null; }
      return;
    }
    if (musicaSrc || !MUSICA || !MUSICA.src) return;
    if (musicaBuf === null) musicaBuf = (await cargarArchivo(MUSICA.src)) || false;
    if (!musicaBuf || musicaSrc) return;
    musicaSrc = ctx.createBufferSource();
    musicaSrc.buffer = musicaBuf;
    musicaSrc.loop = true;
    const ganancia = ctx.createGain();
    ganancia.gain.value = MUSICA.volumen ?? 0.3;
    musicaSrc.connect(ganancia).connect(maestro);
    musicaSrc.start();
  }

  function alternar() {   // silenciar / activar todo (música incluida). Devuelve true si queda en silencio.
    silenciado = !silenciado;
    if (maestro) maestro.gain.value = silenciado ? 0 : VOLUMEN_GENERAL;
    try { localStorage.setItem('pvz-silencio', silenciado ? '1' : '0'); } catch { /* sin almacenamiento */ }
    return silenciado;
  }

  return { cargar, reproducir, musica, alternar, silenciado: () => silenciado, cargados: () => Object.keys(buffers).filter(k => buffers[k].length) };
})();
