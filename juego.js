'use strict';
// Simulación completa del juego. Corre SOLO en el servidor.
// Acá se ajusta el balance: costos, cooldowns, regeneración y duración.

const GEO = { COLS: 9, FILAS: 5, AC: 80, AL: 88, GX: 40, W: 800, TUMBA_COL: 5, PLANTA_COL_MAX: 5,   // las plantas llegan hasta PLANTA_COL_MAX (la columna 5 la comparten con las tumbas)
              ZOMBI_COL_MIN: 6, ZOMBI_COL_MAX: 8 };   // columnas (0 = junto a la casa) donde se pueden poner zombis; TUMBA_COL: primera columna para tumbas
const { COLS, FILAS, AC, AL, GX, W } = GEO;

const MAX_CEREBROS = 400;
const VALOR_CEREBRO = 25;    // cerebros que da cada cerebro recogido
const TUMBA_VIDA = 250;
const TUMBA_PRODUCE = 14;    // segundos entre cerebros de cada tumba
const DIANA_VIDA = 300;
const NUM_DIANAS = 3;        // las plantas ganan al destruirlas todas
const MAX_CARTAS = 6;        // cartas que cada jugador lleva a la partida

const PLANTAS = {
  girasol:         { nombre: 'Girasol',    emoji: '🌻', costo: 50,  vida: 100,  espera: 5,  desc: 'Produce soles extra cada 8 segundos.' },
  lanzaguisantes:  { nombre: 'Lanzador',   emoji: '🌱', costo: 100, vida: 100,  espera: 5,  desc: 'Dispara guisantes a los zombis de su fila.' },
  hielaguisantes:  { nombre: 'Hielo',      emoji: '❄️', costo: 175, vida: 100,  espera: 5,  desc: 'Sus guisantes helados ralentizan a los zombis.' },
  repetidora:      { nombre: 'Repetidora', emoji: '🌿', costo: 200, vida: 100,  espera: 7,  desc: 'Dispara dos guisantes a la vez.' },
  nuez:            { nombre: 'Nuez',       emoji: '🥜', costo: 50,  vida: 600,  espera: 20, desc: 'Muro resistente que frena a los zombis.' },
  nuezalta:        { nombre: 'Nuez alta',  emoji: '🥥', costo: 125, vida: 1200, espera: 20, desc: 'Muro el doble de resistente.' },
  cereza:          { nombre: 'Cereza',     emoji: '🍒', costo: 150, vida: 50,   espera: 30, desc: 'Explota y destruye zombis y tumbas en un área de 3x3 (no daña dianas).' },
  jalapeno:        { nombre: 'Jalapeño',   emoji: '🌶️', costo: 125, vida: 50,   espera: 30, desc: 'Incinera zombis y tumbas de una fila (no daña dianas).' },
  papamina:        { nombre: 'Papa mina',  emoji: '🥔', costo: 25,  vida: 100,  espera: 30, desc: 'Tarda 15 s en armarse; luego explota al contacto.' },
  carnivora:       { nombre: 'Carnívora',  emoji: '🪴', costo: 150, vida: 100,  espera: 7,  desc: 'Se traga un zombi entero, pero tarda 25 s en masticar.' },
  aplastacalabaza: { nombre: 'Calabaza',   emoji: '🎃', costo: 50,  vida: 100,  espera: 30, desc: 'Aplasta al primer zombi que se le acerque.' },
};

const ZOMBIS = {
  tumba: { nombre: 'Tumba', emoji: '🪦', costo: 50, vida: 0, espera: 8, vel: 0, tumba: true, desc: 'Produce cerebros con el tiempo. Se pone en las 4 columnas de la derecha. Las plantas pueden destruirla.' },
  normal: { nombre: 'Zombi', emoji: '🧟', costo: 50, vida: 150, espera: 3, vel: 15, desc: 'El zombi de siempre.' },
  bandera: { nombre: 'Bandera', emoji: '🚩', costo: 75, vida: 150, espera: 4, vel: 23, desc: 'Más rápido que el zombi normal.' },
  saltador: { nombre: 'Pértiga', emoji: '🏃', costo: 100, vida: 180, espera: 6, vel: 38, salta: true, desc: 'Corre y salta sobre la primera planta que encuentra.' },
  cono: { nombre: 'Cono', emoji: '🚧', costo: 100, vida: 220, espera: 5, vel: 15, desc: 'Aguanta más golpes.' },
  periodico: { nombre: 'Periódico', emoji: '📰', costo: 100, vida: 190, espera: 6, vel: 15, desc: 'Se enfurece y acelera al perder el periódico.' },
  puerta: { nombre: 'Puerta', emoji: '🚪', costo: 125, vida: 320, espera: 7, vel: 15, desc: 'Su puerta resiste los guisantes (las explosiones sí lo dañan).' },
  caja: { nombre: 'Caja', emoji: '🎁', costo: 150, vida: 130, espera: 10, vel: 15, caja: true, desc: 'Explota a los pocos segundos y destruye plantas cercanas.' },
  balde: { nombre: 'Balde', emoji: '🪣', costo: 150, vida: 500, espera: 8, vel: 14, desc: 'Muy resistente, pero cuesta caro.' },
  futbolista: { nombre: 'Fútbol', emoji: '🏈', costo: 200, vida: 600, espera: 12, vel: 40, desc: 'Muy rápido y muy resistente.' },
  gigante: { nombre: 'Gigante', emoji: '🦍', costo: 350, vida: 1500, espera: 25, vel: 10, dano: 150, desc: 'Aplasta plantas casi al instante.' },
};

class Juego {
  constructor(mazos) {
    this.mazos = mazos;   // { plantas: [...], zombis: [...] } cartas elegidas por cada bando
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
    // Economía zombi: cerebros que caen del cielo y que producen las tumbas (se recogen con clic)
    this.cerebrosCaidos = []; this.sigCerebro = 5;
    // Dianas del bando zombi, cada una tapada por una tumba inicial
    this.tumbas = []; this.dianas = []; this.dianasTotal = NUM_DIANAS;
    const filas = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5).slice(0, NUM_DIANAS);
    for (const f of filas) {
      const c = COLS - 1 - Math.floor(Math.random() * 2);   // columna 7 u 8
      this.dianas.push({ id: this.sigId++, c, f, vida: DIANA_VIDA, max: DIANA_VIDA });
      this.tumbas.push({ id: this.sigId++, c, f, vida: TUMBA_VIDA, max: TUMBA_VIDA, t: 0 });
    }
  }

  ocupada(c, f) {
    return this.plantas.some(p => p.c === c && p.f === f) || this.tumbas.some(t => t.c === c && t.f === f)
        || this.dianas.some(d => d.c === c && d.f === f);
  }
  hayObjetivo(p) {   // ¿hay una tumba o diana a la derecha de la planta, en su fila?
    return this.tumbas.some(t => t.f === p.f && t.c > p.c) || this.dianas.some(d => d.f === p.f && d.c > p.c);
  }
  // Daño en área a las tumbas. Las dianas NO reciben daño de explosiones: solo de guisantes.
  danarTumbas(pred, dano) {
    for (const t of this.tumbas) if (pred(t)) t.vida -= dano;
    this.tumbas = this.tumbas.filter(t => t.vida > 0);
  }
  nuevoCerebro(x, y, destino) { this.cerebrosCaidos.push({ id: this.sigId++, x, y, destino, vida: 9 }); }

  fx(x, y, txt, tam) { this.efectos.push({ x, y, txt, tam, t: 0.5 }); }
  nuevoSol(x, y, destino) { this.caidos.push({ id: this.sigId++, x, y, destino, vida: 9 }); }

  // Cada acción que llega de un cliente se VALIDA acá. Nunca se confía en el cliente.
  accion(rol, m) {
    if (this.fin || !m) return;
    if (m.t === 'pala') {   // quita lo propio: plantas (bando plantas) o zombis y tumbas (bando zombi)
      const c = m.c, f = m.f;
      if (!Number.isInteger(c) || !Number.isInteger(f)) return;
      const cx = GX + c * AC + AC / 2, cy = f * AL + AL / 2;
      if (rol === 'zombis') {   // primero el zombi de esa casilla (el más cercano al clic); si no hay, la tumba
        const x = Number.isFinite(m.x) ? m.x : cx;
        const z = this.zombis.filter(z => z.f === f && Math.floor((z.x - GX) / AC) === c)
                             .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
        if (z) { this.zombis.splice(this.zombis.indexOf(z), 1); this.fx(z.x, cy, '💨', 60); return; }
      }
      const lista = rol === 'plantas' ? this.plantas : this.tumbas;
      const i = lista.findIndex(o => o.c === c && o.f === f);
      if (i >= 0) { lista.splice(i, 1); this.fx(cx, cy, '💨', 60); }
      return;
    }
    if (rol === 'plantas') {
      if (m.t === 'plantar') {
        const def = PLANTAS[m.tipo], c = m.c, f = m.f;
        if (!def || !this.mazos.plantas.includes(m.tipo) || !Number.isInteger(c) || !Number.isInteger(f)) return;
        if (c < 0 || c > GEO.PLANTA_COL_MAX || f < 0 || f >= FILAS) return;
        if (this.ocupada(c, f)) return;
        if (this.soles < def.costo || (this.esp.plantas[m.tipo] || 0) > 0) return;
        this.soles -= def.costo;
        this.esp.plantas[m.tipo] = def.espera;
        this.plantas.push({ id: this.sigId++, tipo: m.tipo, c, f, vida: def.vida, t: 0 });
      } else if (m.t === 'sol') {
        const i = this.caidos.findIndex(s => s.id === m.id);
        if (i >= 0) { this.soles += 25; this.caidos.splice(i, 1); }
      }
    } else if (rol === 'zombis' && m.t === 'cerebro') {
      const i = this.cerebrosCaidos.findIndex(s => s.id === m.id);
      if (i >= 0) { this.cerebros = Math.min(MAX_CEREBROS, this.cerebros + VALOR_CEREBRO); this.cerebrosCaidos.splice(i, 1); }
    } else if (rol === 'zombis' && m.t === 'tumba') {
      const def = ZOMBIS.tumba, c = m.c, f = m.f;
      if (!this.mazos.zombis.includes('tumba') || !Number.isInteger(c) || !Number.isInteger(f)) return;
      if (c < GEO.TUMBA_COL || c >= COLS || f < 0 || f >= FILAS || this.ocupada(c, f)) return;
      if (this.cerebros < def.costo || (this.esp.zombis.tumba || 0) > 0) return;
      this.cerebros -= def.costo;
      this.esp.zombis.tumba = def.espera;
      this.tumbas.push({ id: this.sigId++, c, f, vida: TUMBA_VIDA, max: TUMBA_VIDA, t: 0 });
    } else if (rol === 'zombis' && m.t === 'zombi') {
      const def = ZOMBIS[m.tipo], c = m.c, f = m.f;
      if (!def || def.tumba || !this.mazos.zombis.includes(m.tipo)
          || !Number.isInteger(c) || !Number.isInteger(f) || c < GEO.ZOMBI_COL_MIN || c > GEO.ZOMBI_COL_MAX || f < 0 || f >= FILAS) return;
      if (this.cerebros < def.costo || (this.esp.zombis[m.tipo] || 0) > 0) return;
      this.cerebros -= def.costo;
      this.esp.zombis[m.tipo] = def.espera;
      this.zombis.push({ id: this.sigId++, tipo: m.tipo, f, x: GX + c * AC + AC / 2, hp: def.vida, max: def.vida,
                         vel: def.vel + Math.random() * 3, comiendo: false, lento: 0,
                         salta: !!def.salta, caja: def.caja ? 6 + Math.random() * 10 : 0 });
    }
  }

  actualizar(dt) {
    if (this.fin) return;
    this.t += dt;
    for (const r of ['plantas', 'zombis'])
      for (const k in this.esp[r]) this.esp[r][k] = Math.max(0, this.esp[r][k] - dt);

    this.sigSol -= dt;
    if (this.sigSol <= 0) {
      this.sigSol = 8;
      this.nuevoSol(GX + 20 + Math.random() * (COLS * AC - 60), -30, 60 + Math.random() * (FILAS * AL - 120));
    }
    for (const s of this.caidos) { if (s.y < s.destino) s.y += 45 * dt; else s.vida -= dt; }
    this.caidos = this.caidos.filter(s => s.vida > 0);

    this.sigCerebro -= dt;
    if (this.sigCerebro <= 0) {
      this.sigCerebro = 9;
      this.nuevoCerebro(GX + 20 + Math.random() * (COLS * AC - 60), -30, 60 + Math.random() * (FILAS * AL - 120));
    }
    for (const s of this.cerebrosCaidos) { if (s.y < s.destino) s.y += 45 * dt; else s.vida -= dt; }
    this.cerebrosCaidos = this.cerebrosCaidos.filter(s => s.vida > 0);
    for (const t of this.tumbas) {
      t.t += dt;
      if (t.t >= TUMBA_PRODUCE) {
        t.t = 0;
        const tx = GX + t.c * AC + AC / 2, ty = t.f * AL + AL / 2;
        this.nuevoCerebro(tx + 10, ty - 25, ty + 10);
      }
    }

    for (const p of this.plantas) {
      p.t += dt;
      const px = GX + p.c * AC + AC / 2, py = p.f * AL + AL / 2;
      switch (p.tipo) {
        case 'girasol':
          if (p.t >= 8) { p.t = 0; this.nuevoSol(px + 10, py - 25, py + 10); }
          break;
        case 'lanzaguisantes': case 'hielaguisantes': case 'repetidora': {
          const hay = this.zombis.some(z => z.f === p.f && z.x > px - 20) || this.hayObjetivo(p);
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
            this.danarTumbas(o => Math.abs(o.f - p.f) <= 1 && Math.abs(GX + o.c * AC + AC / 2 - px) <= AC * 1.5, 1000);
          }
          break;
        case 'jalapeno':
          if (p.t >= 0.8) {
            p.vida = 0;
            for (let c = 0; c < COLS; c++) this.fx(GX + c * AC + AC / 2, py, '🔥', 70);
            for (const z of this.zombis) if (z.f === p.f) z.hp -= 1000;
            this.danarTumbas(o => o.f === p.f, 1000);
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
          if (z) { z.hp -= 800; p.mast = 25; }
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

    const cx = o => GX + o.c * AC + AC / 2;
    for (const g of this.guisantes) {
      g.x += 320 * dt;
      const z = this.zombis.find(z => z.f === g.f && Math.abs(z.x - g.x) < 22);
      if (z) { z.hp -= (z.tipo === 'puerta' && z.hp > 100) ? 8 : 20; if (g.hielo) z.lento = 5; g.x = 9999; continue; }
      const t = this.tumbas.find(t => t.f === g.f && Math.abs(cx(t) - g.x) < 22);
      if (t) { t.vida -= 20; g.x = 9999; continue; }
      const d = this.dianas.find(d => d.f === g.f && Math.abs(cx(d) - g.x) < 22
        && !this.tumbas.some(t => t.c === d.c && t.f === d.f));   // la diana tapada no se puede golpear
      if (d) { d.vida -= 20; g.x = 9999; }
    }
    this.tumbas = this.tumbas.filter(t => t.vida > 0);
    this.dianas = this.dianas.filter(d => d.vida > 0);
    this.guisantes = this.guisantes.filter(g => g.x < W);

    for (const z of this.zombis) {
      const def = ZOMBIS[z.tipo];
      const col = Math.floor((z.x - GX) / AC);
      let planta = this.plantas.find(p => p.f === z.f && p.c === col);
      if (planta && z.salta) { z.salta = false; z.vel = 15; z.x -= AC * 1.1; planta = null; }   // salta la primera planta
      if (z.tipo === 'periodico' && z.hp <= 100 && !z.enojado) { z.enojado = true; z.vel *= 2.2; }
      if (z.tipo === 'caja' && (z.caja -= dt) <= 0) {                                          // caja sorpresa
        this.fx(z.x, z.f * AL + AL / 2, '💥', 140);
        for (const p of this.plantas)
          if (Math.abs(p.f - z.f) <= 1 && Math.abs(GX + p.c * AC + AC / 2 - z.x) <= AC * 1.5) p.vida = 0;
        z.hp = 0;
        continue;
      }
      z.comiendo = !!planta;
      if (z.lento > 0) z.lento -= dt;
      if (planta) planta.vida -= (def.dano || 25) * dt;
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

    if (!this.fin && this.dianas.length === 0) { this.fin = 'plantas'; this.motivo = `Destruyeron las ${NUM_DIANAS} dianas`; }
  }

  // Estado que se envía a los dos jugadores (solo lo necesario para dibujar).
  snapshot() {
    const r = Math.round;
    return {
      t: 'estado', fin: this.fin, motivo: this.motivo,
      soles: Math.floor(this.soles), cerebros: Math.floor(this.cerebros),
      dianasTotal: this.dianasTotal,
      esp: this.esp,
      plantas: this.plantas.map(p => ({ id: p.id, tipo: p.tipo, c: p.c, f: p.f,
        v: +(p.vida / PLANTAS[p.tipo].vida).toFixed(2), armada: !!p.armada, t: +p.t.toFixed(1) })),
      zombis: this.zombis.map(z => ({ id: z.id, tipo: z.tipo, f: z.f, x: r(z.x), hp: r(z.hp), max: z.max,
        comiendo: z.comiendo, lento: z.lento > 0, enojado: !!z.enojado })),
      guisantes: this.guisantes.map(g => ({ x: r(g.x), y: r(g.y), f: g.f, hielo: !!g.hielo })),
      caidos: this.caidos.map(s => ({ id: s.id, x: r(s.x), y: r(s.y), vida: +s.vida.toFixed(1) })),
      cerebrosCaidos: this.cerebrosCaidos.map(s => ({ id: s.id, x: r(s.x), y: r(s.y), vida: +s.vida.toFixed(1) })),
      tumbas: this.tumbas.map(t => ({ id: t.id, c: t.c, f: t.f, v: +(t.vida / t.max).toFixed(2) })),
      dianas: this.dianas.map(d => ({ id: d.id, c: d.c, f: d.f, v: +(d.vida / d.max).toFixed(2) })),
      cortadoras: this.cortadoras.map(c => ({ x: r(c.x), activa: c.activa, usada: c.usada })),
      efectos: this.efectos.map(f => ({ x: r(f.x), y: r(f.y), txt: f.txt, tam: f.tam, t: +f.t.toFixed(2) })),
    };
  }
}

module.exports = { Juego, PLANTAS, ZOMBIS, GEO, MAX_CARTAS };
