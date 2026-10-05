'use strict';
// Simulación completa del juego. Corre SOLO en el servidor.
// Acá se ajusta el balance: costos, cooldowns, regeneración y duración.

const GEO = { COLS: 9, FILAS: 5, AC: 80, AL: 88, GX: 40, W: 800 };
const { COLS, FILAS, AC, AL, GX, W } = GEO;

const DURACION = 300;        // segundos que deben sobrevivir las plantas
const REGEN_CEREBROS = 7;    // cerebros por segundo del jugador zombi
const MAX_CEREBROS = 400;

const PLANTAS = {
  girasol:         { nombre: 'Girasol',    emoji: '🌻', costo: 50,  vida: 100,  espera: 5,  desc: 'Produce soles extra cada 8 segundos.' },
  lanzaguisantes:  { nombre: 'Lanzador',   emoji: '🌱', costo: 100, vida: 100,  espera: 5,  desc: 'Dispara guisantes a los zombis de su fila.' },
  hielaguisantes:  { nombre: 'Hielo',      emoji: '❄️', costo: 175, vida: 100,  espera: 5,  desc: 'Sus guisantes helados ralentizan a los zombis.' },
  repetidora:      { nombre: 'Repetidora', emoji: '🌿', costo: 200, vida: 100,  espera: 7,  desc: 'Dispara dos guisantes a la vez.' },
  nuez:            { nombre: 'Nuez',       emoji: '🥜', costo: 50,  vida: 600,  espera: 20, desc: 'Muro resistente que frena a los zombis.' },
  nuezalta:        { nombre: 'Nuez alta',  emoji: '🥥', costo: 125, vida: 1200, espera: 20, desc: 'Muro el doble de resistente.' },
  cereza:          { nombre: 'Cereza',     emoji: '🍒', costo: 150, vida: 50,   espera: 30, desc: 'Explota y destruye zombis en un área de 3x3.' },
  jalapeno:        { nombre: 'Jalapeño',   emoji: '🌶️', costo: 125, vida: 50,   espera: 30, desc: 'Incinera a todos los zombis de una fila.' },
  papamina:        { nombre: 'Papa mina',  emoji: '🥔', costo: 25,  vida: 100,  espera: 30, desc: 'Tarda 15 s en armarse; luego explota al contacto.' },
  carnivora:       { nombre: 'Carnívora',  emoji: '🪴', costo: 150, vida: 100,  espera: 7,  desc: 'Se traga un zombi entero, pero tarda 25 s en masticar.' },
  aplastacalabaza: { nombre: 'Calabaza',   emoji: '🎃', costo: 50,  vida: 100,  espera: 30, desc: 'Aplasta al primer zombi que se le acerque.' },
};

const ZOMBIS = {
  normal: { nombre: 'Zombi', emoji: '🧟', costo: 50,  vida: 100, espera: 3, vel: 15, desc: 'El zombi de siempre.' },
  cono:   { nombre: 'Cono',  emoji: '🚧', costo: 100, vida: 220, espera: 5, vel: 15, desc: 'Aguanta más golpes.' },
  balde:  { nombre: 'Balde', emoji: '🪣', costo: 150, vida: 450, espera: 8, vel: 14, desc: 'Muy resistente, pero cuesta caro.' },
};

class Juego {
  constructor() {
    this.sigId = 1;
    this.t = 0;
    this.fin = null;       // 'plantas' | 'zombis'
    this.motivo = '';
    this.soles = 150;
    this.cerebros = 150;
    this.plantas = []; this.zombis = []; this.guisantes = []; this.caidos = []; this.efectos = [];
    this.cortadoras = Array.from({ length: FILAS }, () => ({ x: GX - 50, activa: false, usada: false }));
    this.esp = { plantas: {}, zombis: {} };   // cooldowns de cada jugador
    this.sigSol = 4;
  }

  fx(x, y, txt, tam) { this.efectos.push({ x, y, txt, tam, t: 0.5 }); }
  nuevoSol(x, y, destino) { this.caidos.push({ id: this.sigId++, x, y, destino, vida: 9 }); }

  // Cada acción que llega de un cliente se VALIDA acá. Nunca se confía en el cliente.
  accion(rol, m) {
    if (this.fin || !m) return;
    if (rol === 'plantas') {
      if (m.t === 'plantar') {
        const def = PLANTAS[m.tipo], c = m.c, f = m.f;
        if (!def || !Number.isInteger(c) || !Number.isInteger(f)) return;
        if (c < 0 || c >= COLS || f < 0 || f >= FILAS) return;
        if (this.plantas.some(p => p.c === c && p.f === f)) return;
        if (this.soles < def.costo || (this.esp.plantas[m.tipo] || 0) > 0) return;
        this.soles -= def.costo;
        this.esp.plantas[m.tipo] = def.espera;
        this.plantas.push({ id: this.sigId++, tipo: m.tipo, c, f, vida: def.vida, t: 0 });
      } else if (m.t === 'sol') {
        const i = this.caidos.findIndex(s => s.id === m.id);
        if (i >= 0) { this.soles += 25; this.caidos.splice(i, 1); }
      }
    } else if (rol === 'zombis' && m.t === 'zombi') {
      const def = ZOMBIS[m.tipo], f = m.f;
      if (!def || !Number.isInteger(f) || f < 0 || f >= FILAS) return;
      if (this.cerebros < def.costo || (this.esp.zombis[m.tipo] || 0) > 0) return;
      this.cerebros -= def.costo;
      this.esp.zombis[m.tipo] = def.espera;
      this.zombis.push({ id: this.sigId++, tipo: m.tipo, f, x: W + 20, hp: def.vida, max: def.vida,
                         vel: def.vel + Math.random() * 3, comiendo: false, lento: 0 });
    }
  }

  actualizar(dt) {
    if (this.fin) return;
    this.t += dt;
    this.cerebros = Math.min(MAX_CEREBROS, this.cerebros + REGEN_CEREBROS * dt);
    for (const r of ['plantas', 'zombis'])
      for (const k in this.esp[r]) this.esp[r][k] = Math.max(0, this.esp[r][k] - dt);

    this.sigSol -= dt;
    if (this.sigSol <= 0) {
      this.sigSol = 8;
      this.nuevoSol(GX + 20 + Math.random() * (COLS * AC - 60), -30, 60 + Math.random() * (FILAS * AL - 120));
    }
    for (const s of this.caidos) { if (s.y < s.destino) s.y += 45 * dt; else s.vida -= dt; }
    this.caidos = this.caidos.filter(s => s.vida > 0);

    for (const p of this.plantas) {
      p.t += dt;
      const px = GX + p.c * AC + AC / 2, py = p.f * AL + AL / 2;
      switch (p.tipo) {
        case 'girasol':
          if (p.t >= 8) { p.t = 0; this.nuevoSol(px + 10, py - 25, py + 10); }
          break;
        case 'lanzaguisantes': case 'hielaguisantes': case 'repetidora': {
          const hay = this.zombis.some(z => z.f === p.f && z.x > px - 20);
          if (hay && p.t >= 1.4) {
            p.t = 0;
            const n = p.tipo === 'repetidora' ? 2 : 1;
            for (let i = 0; i < n; i++)
              this.guisantes.push({ x: px + 25 - i * 28, y: py - 8, f: p.f, hielo: p.tipo === 'hielaguisantes' });
          }
          break;
        }
        case 'cereza':
          if (p.t >= 1) {
            p.vida = 0; this.fx(px, py, '💥', 150);
            for (const z of this.zombis) if (Math.abs(z.f - p.f) <= 1 && Math.abs(z.x - px) <= AC * 1.5) z.hp -= 1000;
          }
          break;
        case 'jalapeno':
          if (p.t >= 0.8) {
            p.vida = 0;
            for (let c = 0; c < COLS; c++) this.fx(GX + c * AC + AC / 2, py, '🔥', 70);
            for (const z of this.zombis) if (z.f === p.f) z.hp -= 1000;
          }
          break;
        case 'papamina':
          p.armada = p.t >= 15;
          if (p.armada && this.zombis.some(z => z.f === p.f && Math.abs(z.x - px) < AC * 0.6)) {
            p.vida = 0; this.fx(px, py, '💥', 90);
            for (const z of this.zombis) if (z.f === p.f && Math.abs(z.x - px) < AC * 0.9) z.hp -= 1000;
          }
          break;
        case 'carnivora': {
          if (p.mast > 0) { p.mast -= dt; break; }
          const z = this.zombis.find(z => z.f === p.f && z.x > px - 30 && z.x < px + AC * 1.5);
          if (z) { z.hp = 0; p.mast = 25; }
          break;
        }
        case 'aplastacalabaza': {
          const z0 = this.zombis.find(z => z.f === p.f && z.x > px - 30 && z.x < px + AC * 1.2);
          if (z0) {
            p.vida = 0; this.fx(z0.x, py, '💢', 80);
            for (const z of this.zombis) if (z.f === p.f && Math.abs(z.x - z0.x) < 50) z.hp -= 1000;
          }
          break;
        }
      }
    }
    this.efectos.forEach(f => f.t -= dt);
    this.efectos = this.efectos.filter(f => f.t > 0);

    for (const g of this.guisantes) {
      g.x += 320 * dt;
      const z = this.zombis.find(z => z.f === g.f && Math.abs(z.x - g.x) < 22);
      if (z) { z.hp -= 20; if (g.hielo) z.lento = 5; g.x = 9999; }
    }
    this.guisantes = this.guisantes.filter(g => g.x < W);

    for (const z of this.zombis) {
      const col = Math.floor((z.x - GX) / AC);
      const planta = this.plantas.find(p => p.f === z.f && p.c === col);
      z.comiendo = !!planta;
      if (z.lento > 0) z.lento -= dt;
      if (planta) planta.vida -= 25 * dt;
      else z.x -= z.vel * (z.lento > 0 ? 0.5 : 1) * dt;
      if (z.x < GX - 5) {
        const c = this.cortadoras[z.f];
        if (!c.usada) c.activa = c.usada = true;
        else { this.fin = 'zombis'; this.motivo = 'Un zombi llegó a la casa'; }
      }
    }

    this.cortadoras.forEach((c, f) => {
      if (!c.activa) return;
      c.x += 420 * dt;
      for (const z of this.zombis) if (z.f === f && Math.abs(z.x - c.x) < 40) z.hp = 0;
      if (c.x > W + 40) c.activa = false;
    });

    this.plantas = this.plantas.filter(p => p.vida > 0);
    this.zombis = this.zombis.filter(z => z.hp > 0);

    if (!this.fin && this.t >= DURACION) { this.fin = 'plantas'; this.motivo = 'Las plantas resistieron'; }
  }

  // Estado que se envía a los dos jugadores (solo lo necesario para dibujar).
  snapshot() {
    const r = Math.round;
    return {
      t: 'estado', fin: this.fin, motivo: this.motivo,
      soles: Math.floor(this.soles), cerebros: Math.floor(this.cerebros),
      restante: Math.max(0, Math.ceil(DURACION - this.t)),
      esp: this.esp,
      plantas: this.plantas.map(p => ({ id: p.id, tipo: p.tipo, c: p.c, f: p.f,
        v: +(p.vida / PLANTAS[p.tipo].vida).toFixed(2), armada: !!p.armada, t: +p.t.toFixed(1) })),
      zombis: this.zombis.map(z => ({ id: z.id, tipo: z.tipo, f: z.f, x: r(z.x), hp: r(z.hp), max: z.max,
        comiendo: z.comiendo, lento: z.lento > 0 })),
      guisantes: this.guisantes.map(g => ({ x: r(g.x), y: r(g.y), f: g.f, hielo: !!g.hielo })),
      caidos: this.caidos.map(s => ({ id: s.id, x: r(s.x), y: r(s.y), vida: +s.vida.toFixed(1) })),
      cortadoras: this.cortadoras.map(c => ({ x: r(c.x), activa: c.activa, usada: c.usada })),
      efectos: this.efectos.map(f => ({ x: r(f.x), y: r(f.y), txt: f.txt, tam: f.tam, t: +f.t.toFixed(2) })),
    };
  }
}

module.exports = { Juego, PLANTAS, ZOMBIS, GEO, DURACION };
