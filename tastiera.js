/* Guida rapida della Yamaha P-225: quale pulsante tenere premuto e quale tasto premere.
   Dati presi dal Manuale di istruzioni e dalla "Guida rapida all'utilizzo" Yamaha (2023).
   Nomi dei tasti come sulla tastiera: A-1 è il più basso, C3 il Do centrale, C7 il più alto. */

const TASTI_EN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const TASTI_IT = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];

/** "F#2" -> posizione in semitoni (C-1 = 0): A-1 = 9, C3 = 48, C7 = 96 */
function posTasto(nome) {
  const m = /^([A-G]#?)(-?\d)$/.exec(nome);
  return (Number(m[2]) + 1) * 12 + TASTI_EN.indexOf(m[1]);
}
const nomeDaPos = p => TASTI_EN[p % 12] + (Math.floor(p / 12) - 1);
/** Nome da mostrare: italiano o internazionale, come gli accordi (pulsante Do / C). */
function nomeTasto(nome) {
  const p = posTasto(nome);
  return stato.int ? nome : TASTI_IT[p % 12] + (Math.floor(p / 12) - 1);
}

// le cifre del tempo: tenendo [METRONOME] o [RHYTHM], da C1 (1) ad A1 (0)
const CIFRE_TEMPO = { 1: "C1", 2: "C#1", 3: "D1", 4: "D#1", 5: "E1", 6: "F1", 7: "F#1", 8: "G1", 9: "G#1", 0: "A1" };
const tastiTempo = bpm => String(bpm).split("").map(c => CIFRE_TEMPO[c]);
// beat del metronomo: battiti per misura -> tasto (tenendo [METRONOME])
const TASTI_BEAT = { 0: "F2", 2: "F#2", 3: "G2", 4: "G#2", 5: "A2", 6: "A#2" };

const RITMI_P225 = [
  ["8Beat", "F2"], ["16Beat", "F#2"], ["Shuffle1", "G2"], ["Shuffle2", "G#2"], ["Shuffle3", "A2"],
  ["Gospel", "A#2"], ["8BeatBallad", "B2"], ["6-8SlowRock", "C3"], ["FastJazz", "C#3"], ["SlowJazz", "D3"],
  ["Swing", "D#3"], ["JazzWaltz", "E3"], ["Samba", "F3"], ["BossaNova", "F#3"], ["Rumba", "G3"],
  ["Salsa", "G#3"], ["KidsPop", "A3"], ["6-8March", "A#3"], ["ChristmasSwing", "B3"], ["Christmas3-4", "C4"],
];

const VOCI_P225 = [
  ["PIANO", "Grand Piano · Live Grand · Ballad Grand · Bright Grand"],
  ["E.PIANO", "Stage E.Piano · DX E.Piano · Vintage E.Piano · Synth Piano"],
  ["ORGAN", "Jazz Organ · Rock Organ · Organ Principal · Organ Tutti"],
  ["CLV./VIB.", "E.Clavichord · Vibraphone · Harpsichord 8' · Harpsi. 8'+4'"],
  ["STRINGS", "Strings · Slow Strings · Choir · Synth Pad"],
  ["+BASS", "Acoustic Bass · Electric Bass · Bass & Cymbal · Fretless Bass"],
];

const SONG_P225 = ["Canon D dur", "Air On the G String", "Jesus, Joy of Man's Desiring", "Twinkle, Twinkle, Little Star",
  "Sonata op.31-2 \"Tempest\" 3° mov.", "Ode to Joy", "Wiegenlied op.98-2", "Grande Valse Brillante", "Polonaise op.53",
  "La Campanella", "Salut d'amour", "From the New World", "Sicilienne", "Clair de lune", "Jupiter (The Planets)",
  "Menuett (Eine kleine Nachtmusik)", "Menuett G dur", "Marcia alla Turca", "Piano Concerto No.1, 2° mov.",
  "The Nutcracker Medley", "Prelude (Clavicembalo ben temperato I)", "Menuett G dur BWV Anh.114", "Sonata K.545, 1° mov.",
  "Turkish March", "Sonata \"Pathétique\", 2° mov.", "Für Elise", "Sonata \"Al chiaro di luna\", 1° mov.",
  "Impromptu op.90-2", "Frühlingslied", "Fantaisie-Impromptu", "Etude op.10-3", "Etude \"Revolutionary\"",
  "Valse \"Petit chien\"", "Nocturne op.9-2", "Nocturne KK4a-16 (postumo)", "Träumerei", "Barcarolle",
  "La prière d'une Vierge", "Liebesträume No.3", "Blumenlied", "Humoresque", "Arietta", "Tango (España)",
  "The Entertainer", "Maple Leaf Rag", "La Fille aux Cheveux de Lin", "Arabesque No.1", "Cakewalk", "Je te veux",
  "Gymnopédies No.1"];

// ogni voce: [cosa fa, pulsanti da tenere premuti, tasti da premere (in ordine), nota]
const MR = ["METRONOME", "RHYTHM"];
const GUIDA_P225 = [
  { titolo: "Metronomo", voci: [
    ["Avvia o ferma", [], [], "premi [METRONOME]; mentre suona, [−] e [+] cambiano il tempo (insieme: 120)"],
    ["Tempo a cifre (es. 80)", ["METRONOME"], ["G1", "A1"], "una cifra per tasto: C1 = 1 … G#1 = 9, A1 = 0"],
    ["Tempo −10 / +10", ["METRONOME"], ["C2", "D2"], "C#2 riporta a 120"],
    ["Battiti per misura", ["METRONOME"], ["F2", "F#2", "G2", "G#2", "A2", "A#2"], "F2 nessun accento · F#2 2 · G2 3 · G#2 4 · A2 5 · A#2 6"],
    ["Volume −1 / +1", ["METRONOME"], ["A4", "B4"], "A#4 volume predefinito"],
    ["Ascolta il tempo (in inglese)", ["METRONOME"], ["A-1"], "il tasto più basso"],
  ] },
  { titolo: "Ritmi (batteria e basso)", ritmi: true, voci: [
    ["Avvia o ferma", [], [], "premi [RHYTHM]; il basso segue gli accordi della mano sinistra"],
    ["Tempo a cifre", ["RHYTHM"], ["G1", "A1"], "come il metronomo: C1 = 1 … A1 = 0"],
    ["Basso Off / On", ["RHYTHM"], ["F0", "F#0"], ""],
    ["Intro Off / On", ["RHYTHM"], ["G0", "G#0"], ""],
    ["Coda Off / On", ["RHYTHM"], ["A0", "A#0"], ""],
    ["Volume −1 / +1", ["RHYTHM"], ["A4", "B4"], "A#4 volume predefinito"],
  ] },
  { titolo: "Voci", voci: [
    ...VOCI_P225.map(([p, v]) => [`[${p}]`, [], [], `premi più volte per cambiare: ${v}`]),
    ["Due voci insieme (Dual)", [], [], "premi insieme due pulsanti voce di gruppi diversi, es. [PIANO] + [STRINGS]; un pulsante voce qualsiasi per uscire"],
    ["Basso a sinistra (Split)", [], ["F#2"], "premi [+BASS]: fino a F#2 suona il basso; un pulsante voce per uscire"],
    ["Due musicisti (Duo)", [], ["E3"], "tieni [PIANO] e premi insieme [−] e [+]: tastiera divisa in due a E3"],
  ] },
  { titolo: "Suono e tastiera", voci: [
    ["Trasposizione −6 … +6", MR, ["F#2", "C3", "F#3"], "C3 tonalità originale; ogni tasto un semitono (D3 = +2)"],
    ["Riverbero", ["PIANO"], ["C2", "C#2", "D2", "D#2", "E2"], "C2 recital · C#2 concerto · D2 camera · D#2 club · E2 off"],
    ["Sensibilità al tocco", ["PIANO"], ["C6", "C#6", "D6", "D#6"], "C6 morbida · C#6 media · D6 dura · D#6 fissa"],
    ["Sound Boost (più presenza)", MR, ["C#5", "D5", "D#5"], "C#5 off · D5 altoparlanti · D#5 uscita"],
    ["Accordatura 440 / 442 Hz", MR, ["C1", "C#1"], "per altri valori: tieni i due pulsanti e premi [−] [+]"],
  ] },
  { titolo: "Collegamenti e sistema", voci: [
    ["Bluetooth: abbina il telefono", MR, [], "tieni i due pulsanti per 3 secondi, poi sul telefono scegli la P-225"],
    ["Bluetooth Off / On", MR, ["F1", "F#1"], ""],
    ["Altoparlanti Off / On / Auto", MR, ["F5", "F#5", "G5"], "Auto: si spengono con le cuffie"],
    ["AUX OUT variabile / fissa", MR, ["A5", "A#5"], "fissa: il cursore [VOLUME] regola solo gli altoparlanti"],
    ["Spegnimento automatico: no / sì", MR, ["A0", "A#0"], "A0 lo disattiva"],
    ["Suoni di conferma Off / On", MR, ["A-1", "A#-1"], ""],
    ["Ripristino di fabbrica", [], ["C7"], "a strumento spento tieni il tasto più alto (C7) e accendi"],
  ] },
];

/** Disegno di un tratto di tastiera con i tasti da premere evidenziati. */
function disegnoTastiera(tasti) {
  const pos = tasti.map(posTasto);
  const bianco = p => !TASTI_EN[p % 12].includes("#");
  // almeno due ottave, dal Do sotto il primo tasto al Si sopra l'ultimo
  let da = Math.max(9, Math.min(...pos) - (Math.min(...pos) % 12));
  let a = Math.min(96, Math.max(...pos) + 11 - (Math.max(...pos) % 12));
  if (a - da < 23) a = Math.min(96, da + 23);
  if (a - da < 23) da = Math.max(9, a - 23);
  const bianchi = [];
  for (let p = da; p <= a; p++) if (bianco(p)) bianchi.push(p);
  // T: spazio sopra per i nomi dei tasti neri (quelli bianchi stanno sotto)
  const L = 20, H = 64, Lb = 12, Hb = 40, T = 12;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${bianchi.length * L + 1} ${T + H + 16}`);
  svg.setAttribute("class", "disegno-tastiera");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Tasti da premere: " + tasti.map(nomeTasto).join(", "));
  const rett = (x, y, w, h, cls) => {
    const r = document.createElementNS(ns, "rect");
    Object.entries({ x, y, width: w, height: h, rx: 2, class: cls }).forEach(([k, v]) => r.setAttribute(k, v));
    svg.append(r);
  };
  const scritta = (x, y, t, cls) => {
    const e = document.createElementNS(ns, "text");
    Object.entries({ x, y, class: cls, "text-anchor": "middle" }).forEach(([k, v]) => e.setAttribute(k, v));
    e.textContent = t;
    svg.append(e);
  };
  bianchi.forEach((p, i) => {
    rett(i * L + .5, T + .5, L, H, "tasto-bianco" + (pos.includes(p) ? " premi" : ""));
    if (pos.includes(p) || p % 12 === 0) scritta(i * L + L / 2 + .5, T + H + 13, nomeTasto(nomeDaPos(p)), pos.includes(p) ? "nome premi" : "nome");
  });
  for (let p = da; p <= a; p++) {
    if (bianco(p)) continue;
    const i = bianchi.indexOf(p - 1);
    if (i < 0) continue;
    rett((i + 1) * L - Lb / 2 + .5, T + .5, Lb, Hb, "tasto-nero" + (pos.includes(p) ? " premi" : ""));
    if (pos.includes(p)) scritta((i + 1) * L + .5, T - 3, nomeTasto(nomeDaPos(p)), "nome premi");
  }
  return svg;
}

const pulsanti = tieni => tieni.map(p => `[${p}]`).join(" + ");

/** Una riga della guida: si tocca per vedere i tasti sulla tastiera. */
function rigaGuida(nome, tieni, tasti, nota) {
  const riga = el("div", "riga-guida");
  const testa = el("button", "riga-guida-testa");
  testa.type = "button";
  testa.append(el("span", "riga-guida-nome", nome));
  const comando = tieni.length ? `${pulsanti(tieni)} ${tasti.length ? "+ " + tasti.map(nomeTasto).join(" · ") : ""}`
    : tasti.length ? tasti.map(nomeTasto).join(" · ") : "";
  if (comando) testa.append(el("span", "riga-guida-tasti", comando.trim()));
  riga.append(testa);
  if (nota) riga.append(el("small", "riga-guida-nota", nota));
  if (tasti.length) {
    testa.onclick = () => {
      const aperto = riga.querySelector(".disegno-tastiera");
      if (aperto) { aperto.remove(); return; }
      riga.append(disegnoTastiera(tasti));
    };
  } else testa.disabled = true;
  return riga;
}

/** Le impostazioni utili per il canto aperto: tempo, battiti, trasposizione. */
function guidaPerIlCanto(canto) {
  const box = el("section", "guida-canto");
  box.append(el("h4", null, "Per questo canto"));
  const { bpm, metro } = tempoMetronomo(canto);
  if (bpm) {
    box.append(rigaGuida(`Tempo ♩ = ${bpm}`, ["METRONOME"], tastiTempo(bpm),
      "per il ritmo di batteria tieni [RHYTHM] invece di [METRONOME]"));
  }
  const battiti = metro ? Number(metro.split("/")[0]) : 0;
  if (TASTI_BEAT[battiti]) box.append(rigaGuida(`Battiti: ${metro}`, ["METRONOME"], [TASTI_BEAT[battiti]], ""));
  const n = trasposizioneDi(canto);
  if (n) {
    // la tastiera può trasporre al posto dell'app: si leggono gli accordi originali
    const tasto = nomeDaPos(posTasto("C3") + n);
    box.append(rigaGuida(`Trasposizione ${n > 0 ? "+" : ""}${n}`, MR, [tasto],
      `per suonare gli accordi originali (${nomeTonalita(canto, 0)}) e sentire ${nomeTonalita(canto, n)}; ` +
      `in quel caso nell'app torna alla tonalità originale (↺). ${nomeTasto("C3")} riporta la tastiera a 0.`));
  }
  if (box.children.length === 1) box.append(el("p", "riga-guida-nota", "Questo canto non ha ancora il ritmo: impostalo con ♩."));
  return box;
}

function apriGuidaTastiera() {
  const d = $("finestra");
  const box = el("div", "guida-tastiera");
  const testa = el("div", "guida-testa");
  testa.append(el("h3", null, "🎹 Yamaha P-225"));
  const chiudi = el("button", null, "Chiudi");
  chiudi.type = "button";
  chiudi.onclick = () => d.close();
  testa.append(chiudi);
  box.append(testa);
  box.append(el("p", "finestra-testo",
    "Tieni premuto il pulsante e premi il tasto. Tocca una riga per vederla sulla tastiera. " +
    `${nomeTasto("C3")} è il Do centrale.`));
  if (stato.corrente) box.append(guidaPerIlCanto(stato.corrente));
  for (const sezione of GUIDA_P225) {
    const det = el("details", "guida-sezione");
    det.append(el("summary", null, sezione.titolo));
    for (const v of sezione.voci) det.append(rigaGuida(...v));
    if (sezione.ritmi) {
      det.append(el("p", "riga-guida-nota", "Scegli il ritmo: tieni [RHYTHM] e premi"));
      for (const [nome, tasto] of RITMI_P225) det.append(rigaGuida(nome, ["RHYTHM"], [tasto], ""));
    }
    box.append(det);
  }
  const song = el("details", "guida-sezione");
  song.append(el("summary", null, "Le 50 song preset"));
  song.append(el("p", "riga-guida-nota", "Tieni [DEMO/SONG] e premi il tasto; [▶/■] ferma. " +
    "Durante l'ascolto tieni [▶/■] e premi [L] o [R] per togliere una mano."));
  SONG_P225.forEach((t, i) => song.append(rigaGuida(`${i + 1}. ${t}`, ["DEMO/SONG"], [nomeDaPos(posTasto("C2") + i)], "")));
  box.append(song);
  box.append(el("p", "riga-guida-nota", "Dal Manuale di istruzioni e dalla Guida rapida all'utilizzo Yamaha P-225/P-223."));
  d.oncancel = null;
  d.onclose = null;
  d.replaceChildren(box);
  d.classList.add("larga");
  d.addEventListener("close", () => d.classList.remove("larga"), { once: true });
  d.showModal();
  chiudi.focus();
}

/** Riga per la finestra del ritmo: come impostare lo stesso tempo sulla tastiera. */
const testoTempoTastiera = bpm => `Sulla Yamaha: tieni [METRONOME] e premi ${tastiTempo(bpm).map(nomeTasto).join(" · ")}`;

$("guida-tastiera").onclick = apriGuidaTastiera;
