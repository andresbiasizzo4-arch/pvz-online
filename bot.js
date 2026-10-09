'use strict';
// IA del modo "contra el bot". Juega un bando usando las MISMAS acciones que un jugador humano
// (juego.accion), así que respeta costos, tiempos de espera, zonas permitidas y el mazo elegido.
//
// La dificultad se ajusta en NIVELES (abajo): qué tan rápido reacciona, cuántos errores comete,
// cuánto se esfuerza en la economía y qué mazo lleva. Para crear un nivel nuevo, copiá uno y
// cambiá los números.
const { GEO, PLANTAS, ZOMBIS } = require('./juego');
const { FILAS, AC, GX } = GEO;

const TIRADORAS = ['lanzaguisantes', 'hielaguisantes', 'repetidora'];
const FILAS_LISTA = [0, 1, 2, 3, 4];
const azar = a => a[Math.floor(Math.random() * a.length)];

const NIVELES = {
  facil: {
    nombre: 'Fácil', desc: 'Reacciona lento y comete errores. Ideal para aprender.',
    reaccion: 3.5,        // segundos entre una decisión y la siguiente
    acciones: 1,          // acciones por decisión
    error: 0.30,          // probabilidad de hacer una jugada al azar en vez de la buena
    recoge: 0.5,          // probabilidad de recoger cada sol/cerebro disponible
    maxRecoge: 1,         // cuántos recoge por decisión
    girasoles: 2,         // plantas: girasoles que intenta tener
    tumbas: 4,            // zombis: tumbas que intenta tener (hay 3 desde el inicio)
    umbralCereza: 4, umbralJalapeno: 4,   // plantas: zombis juntos que necesita para usar explosivos
    tiradorasPorFila: 1,  // plantas: tiradoras que pone en las filas que quiere atacar
    inteligente: false,   // false: elige filas y tipos casi al azar
    protegeDianas: false, // zombis: pone tumbas delante de las dianas
    gigante: false, oleada: 0,
    mazos: {
      plantas: ['girasol', 'lanzaguisantes', 'nuez', 'cereza', 'papamina', 'hielaguisantes'],
      zombis: ['tumba', 'normal', 'cono', 'periodico', 'balde', 'caja'],
    },
  },
  normal: {
    nombre: 'Normal', desc: 'Juega con cabeza: junta recursos y defiende bien.',
    reaccion: 1.5, acciones: 1, error: 0.12, recoge: 0.9, maxRecoge: 2,
    girasoles: 4, tumbas: 6, umbralCereza: 3, umbralJalapeno: 3, tiradorasPorFila: 2,
    inteligente: true, protegeDianas: true, gigante: false, oleada: 110,
    mazos: {
      plantas: ['girasol', 'lanzaguisantes', 'repetidora', 'nuez', 'cereza', 'jalapeno'],
      zombis: ['tumba', 'normal', 'cono', 'saltador', 'balde', 'bandera'],
    },
  },
  dificil: {
    nombre: 'Difícil', desc: 'Rápido y preciso: aprovecha cada punto débil que dejes.',
    reaccion: 0.7, acciones: 2, error: 0.02, recoge: 1, maxRecoge: 5,
    girasoles: 5, tumbas: 8, umbralCereza: 2, umbralJalapeno: 2, tiradorasPorFila: 3,
    inteligente: true, protegeDianas: true, gigante: true,
    oleada: 220,          // zombis: junta cerebros hasta este valor y los gasta todos juntos en la fila más débil
    mazos: {
      plantas: ['girasol', 'repetidora', 'hielaguisantes', 'nuezalta', 'cereza', 'jalapeno'],
      zombis: ['tumba', 'bandera', 'saltador', 'puerta', 'futbolista', 'gigante'],
    },
  },
};

class Bot {
  constructor(rol, nivel) {
    this.rol = rol;                       // 'plantas' o 'zombis'
    this.nivel = nivel;
    this.n = NIVELES[nivel];
    this.mazo = this.n.mazos[rol].slice();
    this.t = 1 + Math.random();           // segundos hasta la primera decisión
  }

  // Se llama en cada tick del servidor.
  pensar(j, dt) {
    if (j.fin) return;
    this.t -= dt;
    if (this.t > 0) return;
    this.t = this.n.reaccion * (0.75 + Math.random() * 0.5);
    this.recolectar(j);
    for (let i = 0; i < this.n.acciones; i++) {
      const hizo = this.rol === 'plantas' ? this.jugarPlantas(j) : this.jugarZombis(j);
      if (!hizo) break;
    }
  }

  /* ---------- utilidades ---------- */
  recolectar(j) {   // soles (plantas) o cerebros (zombis)
    const lista = this.rol === 'plantas' ? j.caidos : j.cerebrosCaidos;
    let hechos = 0;
    for (const s of lista.slice()) {
      if (hechos >= this.n.maxRecoge) break;
      if (Math.random() >= this.n.recoge) continue;
      j.accion(this.rol, { t: this.rol === 'plantas' ? 'sol' : 'cerebro', id: s.id });
      hechos++;
    }
  }

  disponible(j, tipo) {   // ¿está en el mazo, alcanza el recurso y no está en espera?
    const plantas = this.rol === 'plantas';
    const def = (plantas ? PLANTAS : ZOMBIS)[tipo];
    const espera = (plantas ? j.esp.plantas : j.esp.zombis)[tipo] || 0;
    return !!def && this.mazo.includes(tipo) && (plantas ? j.soles : j.cerebros) >= def.costo && espera <= 0;
  }

  plantar(j, tipo, c, f) { const n = j.plantas.length; j.accion('plantas', { t: 'plantar', tipo, c, f }); return j.plantas.length > n; }
  ponerZombi(j, tipo, c, f) { const n = j.zombis.length; j.accion('zombis', { t: 'zombi', tipo, c, f }); return j.zombis.length > n; }
  ponerTumba(j, c, f) { const n = j.tumbas.length; j.accion('zombis', { t: 'tumba', c, f }); return j.tumbas.length > n; }
  libreEn(j, f, cols) { for (const c of cols) if (!j.ocupada(c, f)) return c; return null; }

  filaInfo(j, f) {
    const zs = j.zombis.filter(z => z.f === f);
    const ps = j.plantas.filter(p => p.f === f);
    return {
      f, zs, ps,
      tir: ps.filter(p => TIRADORAS.includes(p.tipo)),
      muros: ps.filter(p => p.tipo === 'nuez' || p.tipo === 'nuezalta'),
      masCercano: zs.length ? Math.min(...zs.map(z => z.x)) : Infinity,
      diana: j.dianas.find(d => d.f === f),
      tumbas: j.tumbas.filter(t => t.f === f),
    };
  }

  /* ---------- bando PLANTAS ---------- */
  jugarPlantas(j) {
    const n = this.n;
    if (Math.random() < n.error) return this.alAzarPlantas(j);
    const filas = FILAS_LISTA.map(f => this.filaInfo(j, f));
    const amenazadas = filas.filter(i => i.zs.length).sort((a, b) => a.masCercano - b.masCercano);

    if (this.cereza(j)) return true;
    if (this.jalapeno(j, filas)) return true;

    for (const i of amenazadas) {                         // defensa de las filas con zombis
      if (!i.tir.length) { if (this.ponerTiradora(j, i)) return true; }
      else if (!i.muros.length && this.ponerMuro(j, i)) return true;
      else if (this.disponible(j, 'papamina') && !i.ps.some(p => p.tipo === 'papamina')) {
        const c = this.libreEn(j, i.f, [4, 5, 3]);
        if (c !== null && this.plantar(j, 'papamina', c, i.f)) return true;
      }
    }

    const girasoles = j.plantas.filter(p => p.tipo === 'girasol').length;   // economía
    if (girasoles < n.girasoles && this.ponerGirasol(j, filas)) return true;

    for (const i of filas.filter(i => i.diana))           // ataque: lo que importa son las dianas
      if (i.tir.length < n.tiradorasPorFila && this.ponerTiradora(j, i)) return true;
    for (const i of filas.filter(i => i.tumbas.length))   // y las tumbas que dan cerebros
      if (i.tir.length < n.tiradorasPorFila && this.ponerTiradora(j, i)) return true;

    if (j.soles > 300)                                    // con recursos de sobra, refuerza todo
      for (const i of filas) {
        if (i.tir.length < 3 && this.ponerTiradora(j, i)) return true;
        if (!i.muros.length && this.ponerMuro(j, i)) return true;
      }
    return false;
  }

  ponerTiradora(j, i) {
    const pref = this.n.inteligente ? ['repetidora', 'hielaguisantes', 'lanzaguisantes'] : ['lanzaguisantes', 'hielaguisantes', 'repetidora'];
    const tipo = pref.find(t => this.disponible(j, t));
    if (!tipo) return false;
    const c = this.libreEn(j, i.f, [1, 2, 0, 3, 4, 5]);
    return c !== null && this.plantar(j, tipo, c, i.f);
  }

  ponerMuro(j, i) {   // contra el zombi con pértiga prefiere la nuez alta, que no puede saltar
    const tipos = i.zs.some(z => z.tipo === 'saltador') ? ['nuezalta', 'nuez'] : ['nuez', 'nuezalta'];
    const tipo = tipos.find(t => this.disponible(j, t));
    if (!tipo) return false;
    const desde = i.tir.length ? Math.max(...i.tir.map(p => p.c)) + 1 : 1;
    const cols = [];
    for (let c = desde; c <= GEO.PLANTA_COL_MAX; c++) cols.push(c);
    const c = this.libreEn(j, i.f, cols);
    return c !== null && this.plantar(j, tipo, c, i.f);
  }

  ponerGirasol(j, filas) {
    if (!this.disponible(j, 'girasol')) return false;
    const orden = filas.slice().sort((a, b) => a.zs.length - b.zs.length || a.ps.length - b.ps.length);
    for (const i of orden) {
      const c = this.libreEn(j, i.f, [0, 1, 2]);
      if (c !== null) return this.plantar(j, 'girasol', c, i.f);
    }
    return false;
  }

  cereza(j) {   // la casilla donde la explosión alcanza a más zombis
    if (!this.disponible(j, 'cereza') || j.zombis.length < this.n.umbralCereza) return false;
    let mejor = null, mejorN = 0;
    for (const f of FILAS_LISTA)
      for (let c = 0; c <= GEO.PLANTA_COL_MAX; c++) {
        if (j.ocupada(c, f)) continue;
        const cx = GX + c * AC + AC / 2;
        const cuantos = j.zombis.filter(z => Math.abs(z.f - f) <= 1 && Math.abs(z.x - cx) <= AC * 1.3).length;
        if (cuantos > mejorN) { mejorN = cuantos; mejor = [c, f]; }
      }
    return mejorN >= this.n.umbralCereza && this.plantar(j, 'cereza', mejor[0], mejor[1]);
  }

  jalapeno(j, filas) {   // la fila con más zombis
    if (!this.disponible(j, 'jalapeno')) return false;
    const mejor = filas.slice().sort((a, b) => b.zs.length - a.zs.length)[0];
    if (!mejor || mejor.zs.length < this.n.umbralJalapeno) return false;
    const c = this.libreEn(j, mejor.f, [0, 1, 2, 3, 4, 5]);
    return c !== null && this.plantar(j, 'jalapeno', c, mejor.f);
  }

  alAzarPlantas(j) {   // un error: planta algo cualquiera en un lugar cualquiera
    const tipos = this.mazo.filter(t => this.disponible(j, t));
    if (!tipos.length) return false;
    const f = azar(FILAS_LISTA);
    const c = this.libreEn(j, f, [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5));
    return c !== null && this.plantar(j, azar(tipos), c, f);
  }

  /* ---------- bando ZOMBIS ---------- */
  jugarZombis(j) {
    const n = this.n;
    if (Math.random() < n.error) return this.alAzarZombis(j);
    const filas = FILAS_LISTA.map(f => this.filaInfo(j, f));
    const temprano = j.t < 45;

    if (j.tumbas.length < n.tumbas && this.disponible(j, 'tumba') && (temprano || Math.random() < 0.5))
      if (this.pensarTumba(j, filas)) return true;           // economía y escudos para las dianas
    if (temprano && j.tumbas.length < n.tumbas) return false;   // al principio ahorra para las tumbas
    return this.atacar(j, filas);
  }

  pensarTumba(j, filas) {
    if (this.n.protegeDianas)   // una tumba delante de una diana destapada frena los guisantes antes de que la alcancen
      for (const i of filas)
        if (i.diana && !i.tumbas.some(t => t.c === i.diana.c)) {
          const cols = [];
          for (let c = i.diana.c - 1; c >= GEO.TUMBA_COL; c--) cols.push(c);
          const c = this.libreEn(j, i.f, cols);
          if (c !== null && this.ponerTumba(j, c, i.f)) return true;
        }
    const orden = this.n.inteligente ? filas.slice().sort((a, b) => a.tir.length - b.tir.length) : [azar(filas)];
    for (const i of orden) {   // la fila con menos tiradoras, bien atrás
      const c = this.libreEn(j, i.f, [8, 7, 6, 5]);
      if (c !== null) return this.ponerTumba(j, c, i.f);
    }
    return false;
  }

  defensa(i) {   // qué tan difícil es la fila para los zombis
    return i.tir.reduce((s, p) => s + (p.tipo === 'repetidora' ? 5 : 3), 0) + i.muros.length * 2 + i.ps.length * 0.3 - i.zs.length * 2;
  }

  atacar(j, filas) {
    const n = this.n;
    if (n.oleada) {   // ataca en oleadas: ahorra y luego lanza todo junto, para que las tiradoras no los frenen de a uno
      if (!this.enOleada && j.cerebros >= n.oleada) this.enOleada = true;
      if (this.enOleada && j.cerebros < 60) this.enOleada = false;
      if (!this.enOleada) return false;
    }
    const disp = Object.keys(ZOMBIS).filter(k => k !== 'tumba' && this.disponible(j, k));
    if (!disp.length) return false;
    const orden = filas.slice().sort((a, b) => this.defensa(a) - this.defensa(b));
    const objetivo = n.inteligente ? (Math.random() < (n.prefiereDebil ?? 0.75) ? orden[0] : orden[1]) : azar(filas);
    const tipo = n.inteligente ? this.elegirZombi(j, objetivo, disp) : azar(disp);
    const alAzar = !n.inteligente || n.colAleatoria;   // en columnas al azar la explosión de una cereza no los alcanza a todos juntos
    const c = alAzar ? GEO.ZOMBI_COL_MIN + Math.floor(Math.random() * (GEO.ZOMBI_COL_MAX - GEO.ZOMBI_COL_MIN + 1)) : GEO.ZOMBI_COL_MIN;
    return this.ponerZombi(j, tipo, c, objetivo.f);
  }

  elegirZombi(j, obj, disp) {
    const tiene = t => disp.includes(t);
    if (this.n.gigante && tiene('gigante')) return 'gigante';
    if (tiene('bandera') && j.cerebros >= 200 && Math.random() < 0.7) return 'bandera';     // la horda cubre todas las filas
    const muroAlto = obj.muros.some(p => p.tipo === 'nuezalta');
    if (tiene('saltador') && obj.muros.length && !muroAlto) return 'saltador';              // salta la nuez normal, no la alta
    const tanques = ['futbolista', 'puerta', 'balde'].filter(tiene);
    if (obj.tir.length >= 2 && tanques.length) return tanques[0];                            // contra muchas tiradoras, un tanque
    if (tiene('caja') && obj.ps.length >= 3) return 'caja';                                  // contra plantas amontonadas
    return ['cono', 'periodico', 'normal', 'puerta', 'balde', 'saltador', 'bandera', 'caja', 'futbolista'].find(tiene) || disp[0];
  }

  alAzarZombis(j) {
    const tipos = this.mazo.filter(t => t !== 'tumba' && this.disponible(j, t));
    if (!tipos.length) return false;
    const c = GEO.ZOMBI_COL_MIN + Math.floor(Math.random() * (GEO.ZOMBI_COL_MAX - GEO.ZOMBI_COL_MIN + 1));
    return this.ponerZombi(j, azar(tipos), c, azar(FILAS_LISTA));
  }
}

module.exports = { Bot, NIVELES };
