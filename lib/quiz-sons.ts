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

export class MotorDeSom {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private _ligado = true;

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

  // ---- efeitos do jogo ---------------------------------------------------

  /** Tique-taque dos últimos segundos (um a cada segundo). */
  tique(): void {
    if (!this.pronto()) return;
    const t = this.ctx!.currentTime;
    this.tom(1050, t, 0.05, "square", 0.35);
  }

  /** Acertou: "ding" alegre + palminha curta de palmas. */
  acerto(): void {
    if (!this.pronto()) return;
    const t = this.ctx!.currentTime;
    this.tom(880, t, 0.12, "sine", 0.5);
    this.tom(1320, t + 0.08, 0.22, "sine", 0.5);
    this.palmas(t + 0.12, 0.9, 0.35);
  }

  /** Errou / acabou o tempo: buzzer suave e curto. */
  erro(): void {
    if (!this.pronto()) return;
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
