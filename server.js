'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const { Juego, PLANTAS, ZOMBIS, GEO, MAX_CARTAS } = require('./juego');

const PUERTO = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const TICKS = 30; // simulaciones (y envíos de estado) por segundo

/* ---------- Servidor de archivos estáticos ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif',
};

const servidor = http.createServer((req, res) => {
  let ruta = decodeURIComponent(req.url.split('?')[0]);
  if (ruta === '/') ruta = '/index.html';
  const archivo = path.normalize(path.join(PUBLIC, ruta));
  if (!archivo.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(archivo, (err, datos) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(archivo)] || 'application/octet-stream' });
    res.end(datos);
  });
});

/* ---------- Salas y WebSocket ---------- */
const wss = new WebSocketServer({ server: servidor });
const salas = new Map();

const enviar = (ws, m) => { if (ws && ws.readyState === 1) ws.send(typeof m === 'string' ? m : JSON.stringify(m)); };

function codigoNuevo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let c;
  do { c = Array.from({ length: 4 }, () => letras[Math.floor(Math.random() * letras.length)]).join(''); }
  while (salas.has(c));
  return c;
}

// Fase 1: cada jugador elige sus cartas. Fase 2: empieza la partida.
function empezarSeleccion(sala) {
  sala.mazos = { plantas: null, zombis: null };
  for (const rol of ['plantas', 'zombis'])
    enviar(sala.jugadores[rol], { t: 'seleccion', rol, max: MAX_CARTAS, cfg: { plantas: PLANTAS, zombis: ZOMBIS, geo: GEO } });
}

function iniciar(sala) {
  sala.juego = new Juego(sala.mazos);
  for (const rol of ['plantas', 'zombis'])
    enviar(sala.jugadores[rol], { t: 'inicio', rol, mazo: sala.mazos[rol] });
}

wss.on('connection', ws => {
  ws.on('message', datos => {
    let m;
    try { m = JSON.parse(datos); } catch { return; }
    if (!m || typeof m !== 'object') return;

    if (m.t === 'crear' && !ws.sala) {
      const rol = m.rol === 'zombis' ? 'zombis' : 'plantas';
      const codigo = codigoNuevo();
      const sala = { codigo, jugadores: { plantas: null, zombis: null }, juego: null };
      sala.jugadores[rol] = ws;
      salas.set(codigo, sala);
      ws.sala = sala; ws.rol = rol;
      enviar(ws, { t: 'sala', codigo, rol });

    } else if (m.t === 'unirse' && !ws.sala) {
      const sala = salas.get(String(m.codigo || '').toUpperCase());
      if (!sala) return enviar(ws, { t: 'error', msg: 'No existe una sala con ese código.' });
      if (sala.juego || (sala.jugadores.plantas && sala.jugadores.zombis))
        return enviar(ws, { t: 'error', msg: 'La sala ya está llena.' });
      const rol = sala.jugadores.plantas ? 'zombis' : 'plantas';
      sala.jugadores[rol] = ws;
      ws.sala = sala; ws.rol = rol;
      empezarSeleccion(sala);

    } else if (m.t === 'listo' && ws.sala && ws.sala.mazos && !ws.sala.juego) {
      const sala = ws.sala, pool = ws.rol === 'plantas' ? PLANTAS : ZOMBIS;
      if (sala.mazos[ws.rol] || !Array.isArray(m.cartas)) return;
      const cartas = [...new Set(m.cartas)].filter(k => Object.hasOwn(pool, k)).slice(0, MAX_CARTAS);
      if (!cartas.length) return;
      sala.mazos[ws.rol] = cartas;
      enviar(sala.jugadores[ws.rol === 'plantas' ? 'zombis' : 'plantas'], { t: 'rival-listo' });
      if (sala.mazos.plantas && sala.mazos.zombis) iniciar(sala);

    } else if (ws.sala && ws.sala.juego) {
      ws.sala.juego.accion(ws.rol, m);   // el juego valida todo
    }
  });

  ws.on('close', () => {
    const sala = ws.sala;
    if (!sala) return;
    if (!sala.juego) {                                        // se fue antes de empezar (o ya terminó)
      enviar(sala.jugadores[ws.rol === 'plantas' ? 'zombis' : 'plantas'], { t: 'salio' });
      salas.delete(sala.codigo);
      return;
    }
    if (!sala.juego.fin) {                                    // abandonó en plena partida
      sala.juego.fin = ws.rol === 'plantas' ? 'zombis' : 'plantas';
      sala.juego.motivo = 'El rival se desconectó';
    }
  });
});

/* ---------- Bucle del juego: una simulación por sala ---------- */
setInterval(() => {
  for (const sala of salas.values()) {
    if (!sala.juego) continue;
    sala.juego.actualizar(1 / TICKS);
    const estado = JSON.stringify(sala.juego.snapshot());
    enviar(sala.jugadores.plantas, estado);
    enviar(sala.jugadores.zombis, estado);
    if (sala.juego.fin) {                    // se envió el estado final: cerrar la sala
      sala.juego = null;
      setTimeout(() => salas.delete(sala.codigo), 5000);
    }
  }
}, 1000 / TICKS);

servidor.listen(PUERTO, () => console.log(`Servidor listo en http://localhost:${PUERTO}`));
