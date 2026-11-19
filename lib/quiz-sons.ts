/**
 * Efeitos sonoros do Quiz do Clay, sintetizados com a Web Audio API — nenhum
 * arquivo de áudio, nada de direitos autorais, e o som só "liga" depois do
 * primeiro gesto do usuário (toque em COMEÇAR), como exigem os celulares.
 *
 * Volume moderado (ganho mestre baixo). O estado ligado/desligado é lembrado no
 * aparelho (localStorage). Tudo é tolerante a falhas: se a Web Audio não existir
 * ou o contexto não puder ser criado, os métodos simplesmente não fazem nada.
 */

const CHAVE_SOM = "quiz_som"; // "on" | "off"

type Ctx = AudioContext;

// ---- Loop de rock de fundo (original, sintetizado) -------------------------
// Frequências (Hz) de notas graves em Mi menor — base clássica de rock.
const D2 = 73.42;
const E2 = 82.41;
const G2 = 98.0;
const A2 = 110.0;
const B2 = 123.47;
const E3 = 164.81;

// Loop de 16 colcheias (2 compassos, ~120 BPM). Progressão E–E–A–A–D–D–E–E.
// Bateria no padrão rock: bumbo nos tempos 1 e 3, caixa no contratempo (2 e 4),
// chimbal em todas as colcheias. Baixo em colcheias e guitarra em power chords.
const MUS_KICK = [0, 4, 8, 12];
const MUS_SNARE = [2, 6, 10, 14];
const MUS_BASS: (number | null)[] = [
  E2, E2, E2, G2, A2, A2, A2, G2, D2, D2, D2, E2, E2, E2, B2, A2,
];
const MUS_GUITAR: (number | null)[] = [
  E2, null, E2, null, A2, null, A2, null, D2, null, D2, null, E2, null, E2, null,
];
void E3;

export class MotorDeSom {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private _ligado = true;

  // Música de fundo (loop de rock sintetizado).
  private musicaBus: GainNode | null = null;
  private musicaTimer: number | null = null;
  private musicaOn = false;
  private musicaFade = false;
  private proximoPasso = 0;
  private passo = 0;
  private distCurve: Float32Array | null = null;
  private readonly MUS_VOL = 0.1; // volume baixo (fundo, ~25% da sensação)
  private readonly PASSO_S = 0.25; // colcheia a ~120 BPM

  constructor() {
    // Lê a preferência salva (padrão: ligado).
    try {
      this._ligado = localStorage.getItem(CHAVE_SOM) !== "off";
    } catch {
      this._ligado = true;
    }
  }

  get ligado(): boolean {
    return this._ligado;
  }

  /** Liga/desliga e lembra no aparelho. Ao ligar, retoma o contexto. */
  alternar(): boolean {
    this._ligado = !this._ligado;
    try {
      localStorage.setItem(CHAVE_SOM, this._ligado ? "on" : "off");
    } catch {
      /* sem localStorage: segue só na memória */
    }
    if (this._ligado) this.destravar();
    else this.pausarMusica(); // desligou o som: corta a música na hora
    return this._ligado;
  }

  /**
   * Cria/retoma o AudioContext. DEVE ser chamado dentro de um gesto do usuário
   * (toque em COMEÇAR) para os celulares liberarem o áudio.
   */
  destravar(): void {
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.22; // volume mestre moderado
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      /* áudio indisponível */
    }
  }

  private pronto(): boolean {
    return this._ligado && this.ctx !== null && this.master !== null;
  }

  // ---- blocos de síntese -------------------------------------------------

  /** Um tom simples com envelope de ataque/queda. */
  private tom(
    freq: number,
    inicio: number,
    dur: number,
    tipo: OscillatorType,
    pico = 0.6,
    destino?: AudioNode,
    freqFim?: number,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, inicio);
    if (freqFim !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqFim), inicio + dur);
    }
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(pico, inicio + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    osc.connect(g);
    g.connect(destino ?? this.master!);
    osc.start(inicio);
    osc.stop(inicio + dur + 0.02);
  }

  /** Rajada de ruído (para palmas e buzzer), filtrada e com envelope. */
  private ruido(
    inicio: number,
    dur: number,
    pico: number,
    filtroHz: number,
    tipoFiltro: BiquadFilterType = "bandpass",
  ): void {
    const ctx = this.ctx!;
    const n = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) dados[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filtro = ctx.createBiquadFilter();
    filtro.type = tipoFiltro;
    filtro.frequency.value = filtroHz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, inicio);
    g.gain.exponentialRampToValueAtTime(pico, inicio + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
    src.connect(filtro);
    filtro.connect(g);
    g.connect(this.master!);
    src.start(inicio);
    src.stop(inicio + dur + 0.02);
  }

  /** Palmas: várias rajadas curtas de ruído em sequência. */
  private palmas(inicio: number, dur: number, pico = 0.5): void {
    const ctx = this.ctx!;
    const n = Math.max(6, Math.floor(dur / 0.06));
    for (let i = 0; i < n; i++) {
      const t = inicio + (i / n) * dur + Math.random() * 0.02;
      this.ruido(t, 0.05, pico * (0.5 + Math.random() * 0.5), 1600 + Math.random() * 1200);
    }
    // base contínua suave das palmas
    this.ruido(inicio, dur, pico * 0.25, 2200, "bandpass");
    void ctx;
  }

  // ---- música de fundo (loop de rock) ------------------------------------

  private garantirMusicaBus(): void {
    if (this.musicaBus || !this.ctx) return;
    const g = this.ctx.createGain();
    g.gain.value = this.MUS_VOL;
    g.connect(this.ctx.destination); // barramento próprio, abaixo dos efeitos
    this.musicaBus = g;
  }

  /** Curva de distorção suave para a guitarra (soft clip). */
  private curvaDist(): Float32Array {
    if (this.distCurve) return this.distCurve;
    const n = 1024;
    const c = new Float32Array(n);
    const k = 8;
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    this.distCurve = c;
    return c;
  }

  /** Bumbo: seno grave com queda rápida de tom. */
  private kick(t: number): void {
    const ctx = this.ctx!, bus = this.musicaBus!;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.2);
  }

  /** Caixa: ruído filtrado curto. */
  private snare(t: number): void {
    const ctx = this.ctx!, bus = this.musicaBus!;
    const n = Math.floor(ctx.sampleRate * 0.16);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    src.connect(bp); bp.connect(g); g.connect(bus); src.start(t); src.stop(t + 0.17);
  }

  /** Chimbal: ruído agudo bem curto (acentua os tempos). */
  private hihat(t: number, forte: boolean): void {
    const ctx = this.ctx!, bus = this.musicaBus!;
    const n = Math.floor(ctx.sampleRate * 0.03);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(forte ? 0.16 : 0.09, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    src.connect(hp); hp.connect(g); g.connect(bus); src.start(t); src.stop(t + 0.04);
  }

  /** Baixo: dente-de-serra filtrado (grave encorpado). */
  private baixo(freq: number, t: number, dur: number): void {
    const ctx = this.ctx!, bus = this.musicaBus!;
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(freq, t);
    lp.type = "lowpass"; lp.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    g.gain.setValueAtTime(0.5, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }

  /** Guitarra: power chord (tônica + quinta) com leve distorção. */
  private guitarra(freq: number, t: number, dur: number): void {
    const ctx = this.ctx!, bus = this.musicaBus!;
    const ws = ctx.createWaveShaper(); ws.curve = this.curvaDist();
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [freq, freq * 1.5].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = f;
      o.connect(ws); o.start(t); o.stop(t + dur + 0.02);
    });
    ws.connect(lp); lp.connect(g); g.connect(bus);
  }

  /** Agenda um passo (colcheia) do loop. */
  private agendarPasso(s: number, t: number): void {
    this.hihat(t, s % 2 === 0);
    if (MUS_KICK.includes(s)) this.kick(t);
    if (MUS_SNARE.includes(s)) this.snare(t);
    const b = MUS_BASS[s];
    if (b) this.baixo(b, t, this.PASSO_S * 0.9);
    const gt = MUS_GUITAR[s];
    if (gt) this.guitarra(gt, t, this.PASSO_S * 1.9);
  }

  /** Agendador com lookahead: mantém o loop sempre à frente do relógio. */
  private tocarMusica(): void {
    try {
      if (!this.ctx || !this.musicaBus || !this.musicaOn) return;
      while (this.proximoPasso < this.ctx.currentTime + 0.2) {
        this.agendarPasso(this.passo % 16, this.proximoPasso);
        this.proximoPasso += this.PASSO_S;
        this.passo++;
      }
    } catch {
      /* áudio indisponível: ignora */
    }
  }

  /** Começa (ou retoma) a música de fundo em volume baixo. */
  iniciarMusica(): void {
    if (!this._ligado) return;
    this.destravar();
    if (!this.ctx) return;
    this.garantirMusicaBus();
    if (this.musicaOn || !this.musicaBus) return;
    this.musicaOn = true;
    this.musicaFade = false;
    const t = this.ctx.currentTime;
    this.musicaBus.gain.cancelScheduledValues(t);
    this.musicaBus.gain.setValueAtTime(this.MUS_VOL, t);
    this.proximoPasso = t + 0.12;
    this.musicaTimer = window.setInterval(() => this.tocarMusica(), 60);
  }

  /** Pausa a música (ex.: pessoa saiu da tela). */
  pausarMusica(): void {
    this.musicaOn = false;
    if (this.musicaTimer !== null) {
      clearInterval(this.musicaTimer);
      this.musicaTimer = null;
    }
  }

  /** Abaixa e para a música devagar (telas finais). */
  pararMusicaFade(): void {
    this.musicaFade = true;
    if (this.ctx && this.musicaBus) {
      const t = this.ctx.currentTime;
      const g = this.musicaBus.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(Math.max(0.0001, g.value), t);
      g.linearRampToValueAtTime(0.0001, t + 1.6);
    }
    window.setTimeout(() => this.pausarMusica(), 1700);
  }

  /** Abaixa a música por um instante (quando entra um efeito) e volta. */
  private duckMusica(): void {
    if (!this.ctx || !this.musicaBus || this.musicaFade || !this.musicaOn) return;
    const t = this.ctx.currentTime;
    const g = this.musicaBus.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(0.0001, g.value), t);
    g.linearRampToValueAtTime(this.MUS_VOL * 0.35, t + 0.04);
    g.linearRampToValueAtTime(this.MUS_VOL, t + 0.55);
  }

  // ---- efeitos do jogo ---------------------------------------------------

  /** Tique-taque dos últimos segundos (um a cada segundo). */
  tique(): void {
    if (!this.pronto()) return;
    this.duckMusica();
    const t = this.ctx!.currentTime;
    this.tom(1050, t, 0.05, "square", 0.35);
  }

  /** Acertou: "ding" alegre + palminha curta de palmas. */
  acerto(): void {
    if (!this.pronto()) return;
    this.duckMusica();
    const t = this.ctx!.currentTime;
    this.tom(880, t, 0.12, "sine", 0.5);
    this.tom(1320, t + 0.08, 0.22, "sine", 0.5);
    this.palmas(t + 0.12, 0.9, 0.35);
  }

  /** Errou / acabou o tempo: buzzer suave e curto. */
  erro(): void {
    if (!this.pronto()) return;
    this.duckMusica();
    const t = this.ctx!.currentTime;
    this.tom(180, t, 0.28, "sawtooth", 0.4, undefined, 110);
    this.tom(90, t, 0.3, "square", 0.25);
  }

  /** 10/10: fanfarra (arpejo ascendente) + palmas maiores. */
  vitoria(): void {
    if (!this.pronto()) return;
    const t = this.ctx!.currentTime;
    const notas = [523.25, 659.25, 783.99, 1046.5];
    notas.forEach((f, i) => this.tom(f, t + i * 0.12, 0.22, "sawtooth", 0.4));
    this.tom(1046.5, t + notas.length * 0.12, 0.5, "sawtooth", 0.42);
    this.palmas(t + 0.2, 1.7, 0.5);
  }

  /** Não ganhou: "wah-wah" curto e bem-humorado (glissando descendente). */
  derrota(): void {
    if (!this.pronto()) return;
    const t = this.ctx!.currentTime;
    this.tom(392, t, 0.3, "sawtooth", 0.4, undefined, 330);
    this.tom(330, t + 0.26, 0.34, "sawtooth", 0.4, undefined, 262);
    this.tom(262, t + 0.56, 0.5, "sawtooth", 0.42, undefined, 196);
  }
}

/** Cria o motor de som (só no navegador). */
export function criarMotorDeSom(): MotorDeSom | null {
  if (typeof window === "undefined") return null;
  try {
    return new MotorDeSom();
  } catch {
    return null;
  }
}
