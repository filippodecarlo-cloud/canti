"use strict";

/* ===== Note e accordi ================================================== */

const SEMITONI = { Do: 0, Re: 2, Mi: 4, Fa: 5, Sol: 7, La: 9, Si: 11 };
const DIESIS = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
const BEMOLLI = ["Do", "Reb", "Re", "Mib", "Mi", "Fa", "Solb", "Sol", "Lab", "La", "Sib", "Si"];
const LETTERE = { Do: "C", Re: "D", Mi: "E", Fa: "F", Sol: "G", La: "A", Si: "B" };
// tonalità che si scrivono con i bemolli (maggiori e minori)
const BEMOLLE_MAGGIORE = new Set([5, 10, 3, 8, 1, 6]);   // Fa Sib Mib Lab Reb Solb
const BEMOLLE_MINORE = new Set([2, 7, 0, 5, 10, 3]);     // Re- Sol- Do- Fa- Sib- Mib-

const NOTA = "(Do|Re|Mi|Fa|Sol|La|Si)([#b]?)";
const RE_ACCORDO = new RegExp(`^(\\(?)${NOTA}(.*?)(?:/${NOTA}(-?))?(\\)?)$`);

const maiuscola = s => s[0].toUpperCase() + s.slice(1).toLowerCase();

function semitono(nome, alterazione) {
  return (SEMITONI[nome] + (alterazione === "#" ? 1 : alterazione === "b" ? -1 : 0) + 12) % 12;
}

function nomeNota(s, bemolli) {
  return (bemolli ? BEMOLLI : DIESIS)[((s % 12) + 12) % 12];
}

function internazionale(nota) {
  const m = /^(Do|Re|Mi|Fa|Sol|La|Si)(.*)$/.exec(nota);
  return m ? LETTERE[m[1]] + m[2] : nota;
}

/** "Re-", "Mi maggiore", "la minore" -> { s: semitono, minore } */
function leggiTonalita(testo) {
  const m = /^\s*(do|re|mi|fa|sol|la|si)([#b]?)\s*(-|m(?!a)|minore)?/i.exec(testo || "");
  if (!m) return null;
  return { s: semitono(maiuscola(m[1]), m[2]), minore: !!m[3] };
}

function usaBemolli(tonalita, n) {
  if (!tonalita) return false;
  const s = (tonalita.s + n + 12) % 12;
  return (tonalita.minore ? BEMOLLE_MINORE : BEMOLLE_MAGGIORE).has(s);
}

/** Traspone un accordo italiano ("Sib7+", "La/Do#", "(Re-)") di n semitoni. */
function trasponiAccordo(accordo, n, bemolli, notazioneInt) {
  const m = RE_ACCORDO.exec(accordo);
  if (!m) return accordo;
  const [, apri, rad, alt, resto, bRad, bAlt, bMin = "", chiudi] = m;
  let radice = n ? nomeNota(semitono(rad, alt) + n, bemolli) : rad + alt;
  let basso = bRad ? (n ? nomeNota(semitono(bRad, bAlt) + n, bemolli) : bRad + bAlt) : "";
  let suffisso = resto;
  if (notazioneInt) {
    radice = internazionale(radice);
    basso = internazionale(basso);
    suffisso = suffisso.replace(/^-/, "m").replace(/7\+/, "maj7");
  }
  return apri + radice + suffisso + (basso ? "/" + basso + (notazioneInt && bMin ? "m" : bMin) : "") + chiudi;
}

/** Traspone le note scritte in minuscolo: "si-mi-fa#-sol#". */
function trasponiNoteTesto(testo, n, bemolli) {
  if (!n) return testo;
  return testo.replace(/(do|re|mi|fa|sol|la|si)([#b]?)/g, (_, nome, alt) =>
    nomeNota(semitono(maiuscola(nome), alt) + n, bemolli).toLowerCase());
}

/** "Re maggiore" trasposto di n -> "Mi maggiore" */
function trasponiNomeTonalita(testo, n) {
  if (!n || !testo) return testo;
  const bemolli = usaBemolli(leggiTonalita(testo), n);
  return testo.replace(/^\s*(do|re|mi|fa|sol|la|si)([#b]?)/i, (_, nome, alt) =>
    nomeNota(semitono(maiuscola(nome), alt) + n, bemolli));
}

/** Legge "4/4", "80", "3/4 72" -> { metro, bpm } */
function leggiTempo(testo, dest) {
  for (const parte of (testo || "").split(/[\s,;]+/)) {
    if (/^\d+\/\d+$/.test(parte)) dest.metro = parte;
    else if (/^\d+$/.test(parte)) dest.bpm = parte;
  }
  return dest;
}

/* ===== Tempo e ritmo ===================================================== */

// Tempo = misura (4/4, 3/4…), ritmo = battiti al minuto (♩ = 80). Nel blocco melodia sono le
// righe "tempo: 4/4" e "ritmo: 80"; nell'intestazione del canto {tempo: 4/4} e {ritmo: 80}.
// Si leggono anche le forme vecchie: "tempo: 4/4 80", {time: 4/4}.
const MISURE = ["", "2/4", "3/4", "4/4", "2/2", "3/8", "6/8", "9/8", "12/8"];

function leggiTempoMelodia(blocco) {
  const t = { metro: "", bpm: "" };
  for (const m of blocco.matchAll(/^\s*(?:tempo|metro|ritmo|velocit\S*)\s*:(.*)$/gim)) leggiTempo(m[1], t);
  return t;
}

function scriviTempoMelodia(blocco, { metro, bpm }) {
  const righe = blocco.split("\n").filter(r => !/^\s*(?:metro|velocit\S*)\s*:/i.test(r));
  for (const [chiave, valore] of [["tempo", metro], ["ritmo", bpm]]) {
    const riga = `${chiave}: ${valore || ""}`.trimEnd();
    const i = righe.findIndex(r => new RegExp(`^\\s*${chiave}\\s*:`, "i").test(r));
    if (i >= 0) { righe[i] = riga; continue; }
    const dopo = righe.findIndex(r => /^\s*(tonalit|tempo)\S*\s*:/i.test(r));
    righe.splice(dopo >= 0 ? dopo + 1 : /^\{/.test(righe[0]) ? 1 : 0, 0, riga);
  }
  return righe.join("\n");
}

function leggiTempoCanto(testo) {
  const t = { metro: "", bpm: "" };
  for (const m of testo.matchAll(/^\{(?:time|tempo|ritmo):(.*)\}$/gim)) leggiTempo(m[1], t);
  return t;
}

function scriviTempoCanto(testo, { metro, bpm }) {
  testo = testo.replace(/^\{time:.*\}\n?/gim, "");
  for (const [chiave, valore] of [["tempo", metro], ["ritmo", bpm]]) {
    const riga = `{${chiave}:${valore ? " " + valore : ""}}`;
    const re = new RegExp(`^\\{${chiave}:.*\\}$`, "im");
    testo = re.test(testo) ? testo.replace(re, riga)
      : testo.replace(/^(\{(?:key|title):.*\})$/im, `$1\n${riga}`);
  }
  return testo;
}

/** Menu della misura e casella dei battiti; cambia() riceve { metro, bpm }. */
function controlliTempo(cambia) {
  const box = el("div", "editor-tempo");
  const metro = el("select");
  for (const v of MISURE) {
    const o = el("option", null, v || "libero");
    o.value = v;
    metro.append(o);
  }
  const bpm = el("input");
  Object.assign(bpm, { type: "number", min: 30, max: 240, step: 1, placeholder: "—" });
  const etMetro = el("label", null, "Tempo ");
  const etBpm = el("label", null, "Ritmo ♩ = ");
  etMetro.append(metro);
  etBpm.append(bpm);
  box.append(etMetro, etBpm);
  const leggi = () => cambia({ metro: metro.value, bpm: bpm.value });
  metro.onchange = leggi;
  bpm.onchange = leggi;
  const imposta = t => {
    if (t.metro && ![...metro.options].some(o => o.value === t.metro)) {
      const o = el("option", null, t.metro);
      o.value = t.metro;
      metro.append(o);
    }
    metro.value = t.metro;
    if (document.activeElement !== bpm) bpm.value = t.bpm;
  };
  return { box, imposta };
}

/* ===== Melodia -> notazione ABC (per il pentagramma) ==================== */

// alterazioni in chiave per ogni tonalità maggiore (semitono della tonica)
const ARMATURE = {
  0: {}, 7: { F: "#" }, 2: { F: "#", C: "#" }, 9: { F: "#", C: "#", G: "#" },
  4: { F: "#", C: "#", G: "#", D: "#" }, 11: { F: "#", C: "#", G: "#", D: "#", A: "#" },
  6: { F: "#", C: "#", G: "#", D: "#", A: "#", E: "#" },
  5: { B: "b" }, 10: { B: "b", E: "b" }, 3: { B: "b", E: "b", A: "b" },
  8: { B: "b", E: "b", A: "b", D: "b" }, 1: { B: "b", E: "b", A: "b", D: "b", G: "b" },
};
// valore della figura (1 semibreve, 2 minima, 4 semiminima, 8 croma, 16 semicroma) in sedicesimi
const DURATE = { 1: 16, 2: 8, 4: 4, 8: 2, 16: 1 };
// l'ottava (' sopra, , sotto) si può scrivere prima o dopo la durata: "sib,2" o "sib2,"
const RE_NOTA_MEL = /^(do|re|mi|fa|sol|la|si|p)([#b]?)(['’,]*)(\d*)(\.?)(['’,]*)$/i;
const RE_BARRA = /^(\|\||\|\]|\|:|:\||\|)$/;
const BPM_PREDEFINITO = 90;

/** Blocco {start_of_melodia}: righe "chiave: valore". */
function leggiMelodia(righe) {
  const mel = { tonalita: "", metro: "", bpm: "", righe: [], errori: [] };
  for (const r of righe) {
    if (!r.trim() || /^\s*\{/.test(r)) continue;
    const m = /^\s*([^:]+?)\s*:\s*(.*)$/.exec(r);
    const chiave = m ? normalizza(m[1]).trim() : "";
    const valore = m ? m[2].trim() : "";
    if (chiave === "tonalita") mel.tonalita = valore;
    else if (["tempo", "metro", "ritmo", "velocita"].includes(chiave)) leggiTempo(valore, mel);
    else if (chiave === "note") mel.righe.push({ note: valore, testo: "" });
    else if (chiave === "testo") { if (mel.righe.length) mel.righe[mel.righe.length - 1].testo = valore; }
    else mel.errori.push(`riga non riconosciuta: "${r.trim()}"`);
  }
  return mel;
}

/** Formato rapido "la-re-re--mi": i trattini dopo la nota ne indicano la durata. */
function noteDaTrattini(testo) {
  const figure = { 0: "4", 1: "4", 2: "2", 3: "2.", 4: "1" };
  return testo.trim().split(/\s+/).map(frase => {
    const note = [];
    const re = /(do|re|mi|fa|sol|la|si)([#b]?)(-*)/gi;
    let m;
    while ((m = re.exec(frase))) note.push(m[1].toLowerCase() + m[2] + figure[Math.min(m[3].length, 4)]);
    return note.join(" ");
  }).join(" | ");
}

function abcDaMelodia(mel) {
  const errori = [...mel.errori];
  const ton = leggiTonalita(mel.tonalita);
  const mTon = /^\s*(do|re|mi|fa|sol|la|si)([#b]?)/i.exec(mel.tonalita || "");
  if (!ton || !mTon) return { abc: null, errori: [...errori, 'manca la tonalità (es. "tonalità: Re maggiore")'] };
  const armatura = ARMATURE[ton.minore ? (ton.s + 3) % 12 : ton.s] || {};
  const chiave = LETTERE[maiuscola(mTon[1])] + mTon[2] + (ton.minore ? "m" : "");

  let figura = 4;   // le note senza numero tengono la durata della precedente
  const righe = mel.righe.map(r => ({
    testo: r.testo,
    simboli: r.note.split(/\s+/).filter(Boolean).map(tok => {
      if (RE_BARRA.test(tok)) return { barra: tok };
      const m = RE_NOTA_MEL.exec(tok);
      if (!m || (m[4] && !DURATE[m[4]])) { errori.push(`non capisco "${tok}"`); return null; }
      if (m[4]) figura = +m[4];
      const durata = DURATE[figura] * (m[5] ? 1.5 : 1);
      if (!Number.isInteger(durata)) { errori.push(`non capisco "${tok}"`); return null; }
      const pausa = m[1].toLowerCase() === "p";
      const salti = [...m[3] + m[6]].reduce((a, c) => a + (c === "," ? -1 : 1), 0);
      return { pausa, nome: pausa ? null : maiuscola(m[1]), alt: m[2], salti, durata };
    }).filter(Boolean),
  }));
  const note = righe.flatMap(r => r.simboli).filter(s => s.nome);
  if (!note.length) return { abc: null, errori: errori.length ? errori : ["nessuna nota"] };

  // ottava: ogni nota va il più vicino possibile alla precedente; ' e , la spostano
  let prec = null;
  for (const n of note) {
    let p = 60 + semitono(n.nome, n.alt);
    if (prec !== null) {
      while (p - prec > 6) p -= 12;
      while (prec - p > 6) p += 12;
    }
    n.midi = prec = p + 12 * n.salti;
  }
  // centro la melodia sul pentagramma (si centrale = 71)
  const media = note.reduce((a, n) => a + n.midi, 0) / note.length;
  const sposta = Math.round((71 - media) / 12) * 12;

  let alterate = {};  // in ABC un'alterazione vale fino alla fine della battuta
  const scrivi = s => {
    if (s.barra) { alterate = {}; return s.barra; }
    const dur = s.durata === 1 ? "" : String(s.durata);
    if (s.pausa) return "z" + dur;
    const lettera = LETTERE[s.nome];
    const naturale = s.midi + sposta - (s.alt === "#" ? 1 : s.alt === "b" ? -1 : 0);
    const ottava = Math.floor(naturale / 12) - 1;
    const nome = ottava >= 5 ? lettera.toLowerCase() + "'".repeat(ottava - 5) : lettera + ",".repeat(Math.max(0, 4 - ottava));
    const attesa = alterate[nome] ?? (armatura[lettera] || "");
    let segno = "";
    if (s.alt !== attesa) {
      segno = s.alt === "#" ? "^" : s.alt === "b" ? "_" : "=";
      alterate[nome] = s.alt;
    }
    return segno + nome + dur;
  };
  const corpo = righe.filter(r => r.simboli.length).map((r, i, tutte) => {
    let linea = r.simboli.map(scrivi).join(" ");
    if (i === tutte.length - 1 && !r.simboli[r.simboli.length - 1].barra) linea += " |]";
    return linea + (r.testo ? "\nw: " + r.testo : "");
  }).join("\n");
  const tempo = mel.bpm ? `Q:1/4=${mel.bpm}\n` : "";
  return { abc: `X:1\nM:${mel.metro || "none"}\nL:1/16\n${tempo}K:${chiave}\n${corpo}`, errori };
}

/** Testo di un blocco melodia (in uno dei tre formati) -> ABC pronto da disegnare. */
function abcDaSorgente(sorgente, canto) {
  const abc = /\{\s*(?:start_of_abc|soa)\s*\}([\s\S]*?)(?:\{\s*(?:end_of_abc|eoa)\s*\}|$)/i.exec(sorgente);
  if (abc) return { abc: abc[1].trim(), errori: [], tonalita: "", haTempo: /^Q:/m.test(abc[1]) };

  let mel, noteTesto = "";
  const rapida = /\{\s*melodia_note\s*:\s*([^}]*)\}/i.exec(sorgente);
  if (rapida) {
    const [ton, note = ""] = rapida[1].split("|").map(s => s.trim());
    mel = { tonalita: ton, metro: "", bpm: "", righe: [{ note: noteDaTrattini(note), testo: "" }], errori: [] };
    noteTesto = note;
  } else {
    mel = leggiMelodia(sorgente.split(/\r?\n/));
  }
  // se il blocco non lo dice, valgono tonalità e tempo del canto
  if (!mel.tonalita && canto) mel.tonalita = tonalitaEstesa(canto.meta.key);
  if (!mel.metro && canto) mel.metro = canto.meta.metro;
  if (!mel.bpm && canto) mel.bpm = canto.meta.bpm;
  return { ...abcDaMelodia(mel), tonalita: mel.tonalita, noteTesto, haTempo: !!mel.bpm };
}

/** "Re" -> "Re maggiore", "Re-" -> "Re minore" */
function tonalitaEstesa(key) {
  const m = /^\s*(Do|Re|Mi|Fa|Sol|La|Si)([#b]?)(\S*)/i.exec(key || "");
  if (!m) return "";
  return maiuscola(m[1]) + m[2] + (/^(-|m(?!a))/.test(m[3]) ? " minore" : " maggiore");
}

/** Il formato rapido, riscritto nel formato completo (per l'editor). */
function bloccoDaTrattini(sorgente) {
  const m = /\{\s*melodia_note\s*:\s*([^}]*)\}/i.exec(sorgente);
  const [ton, note = ""] = m[1].split("|").map(s => s.trim());
  return `{start_of_melodia}\ntonalità: ${ton}\ntempo: 4/4\nritmo:\nnote: ${noteDaTrattini(note)}\ntesto:\n{end_of_melodia}`;
}

/* ===== Lettura del formato ChordPro ===================================== */

function leggiChordPro(testo, file) {
  const meta = { title: file, subtitle: "", artist: "", youtube: "", key: "", metro: "", bpm: "", tags: [] };
  const blocchi = [];
  let sezione = null;   // verso / ritornello / ponte aperto con start_of_...
  let libero = null;    // righe fuori dalle sezioni, separate da righe vuote
  let raccolta = null;  // blocco melodia o ABC in lettura, fino alla direttiva di chiusura

  const chiudiLibero = () => { libero = null; };
  const aggiungiRiga = riga => {
    if (sezione) { sezione.righe.push(riga); return; }
    if (!libero) { libero = { tipo: "libero", righe: [] }; blocchi.push(libero); }
    libero.righe.push(riga);
  };

  for (const grezza of testo.split(/\r?\n/)) {
    const riga = grezza.trimEnd();
    if (raccolta) {
      raccolta.righe.push(riga);
      if (raccolta.fine.test(riga)) { blocchi.push({ tipo: "melodia", sorgente: raccolta.righe.join("\n") }); raccolta = null; }
      continue;
    }
    const d = /^\{\s*([\w_]+)\s*(?::\s*(.*?))?\s*\}$/.exec(riga);
    if (d) {
      const nome = d[1].toLowerCase(), valore = d[2] || "";
      chiudiLibero();
      switch (nome) {
        case "title": case "t": meta.title = valore; break;
        case "subtitle": case "st": meta.subtitle = valore; break;
        case "artist": case "composer": case "autore": meta.artist = valore; break;
        case "youtube": case "link": meta.youtube = valore; break;
        case "key": meta.key = valore; break;
        case "time": case "tempo": case "ritmo": leggiTempo(valore, meta); break;
        case "tags": meta.tags = valore.split(",").map(s => s.trim()).filter(Boolean); break;
        case "start_of_chorus": case "soc": sezione = { tipo: "ritornello", righe: [] }; blocchi.push(sezione); break;
        case "start_of_verse": case "sov": sezione = { tipo: "verso", righe: [] }; blocchi.push(sezione); break;
        case "start_of_bridge": case "sob": sezione = { tipo: "ponte", righe: [] }; blocchi.push(sezione); break;
        case "end_of_chorus": case "eoc": case "end_of_verse": case "eov": case "end_of_bridge": case "eob": sezione = null; break;
        case "chorus": blocchi.push({ tipo: "rif-ritornello" }); break;
        case "intro": blocchi.push({ tipo: "sequenza", etichetta: "Intro", accordi: valore.split(/\s+/) }); break;
        case "musica": blocchi.push({ tipo: "sequenza", etichetta: "Strumentale", accordi: valore.split(/\s+/) }); break;
        case "finale": blocchi.push({ tipo: "sequenza", etichetta: "Finale", accordi: valore.split(/\s+/) }); break;
        case "ponte": blocchi.push({ tipo: "sequenza", etichetta: "Ponte", accordi: valore.split(/\s+/) }); break;
        case "sequenza": blocchi.push({ tipo: "sequenza", etichetta: "", accordi: valore.split(/\s+/) }); break;
        case "comment": case "c": case "ci":
          if (sezione) sezione.righe.push({ commento: valore });
          else blocchi.push({ tipo: "commento", testo: valore });
          break;
        case "melodia_note": blocchi.push({ tipo: "melodia", sorgente: riga }); break;
        case "start_of_melodia": raccolta = { righe: [riga], fine: /^\{\s*end_of_melodia\s*\}$/i }; break;
        case "start_of_abc": case "soa": raccolta = { righe: [riga], fine: /^\{\s*(end_of_abc|eoa)\s*\}$/i }; break;
      }
      continue;
    }
    if (!riga.trim()) { if (!sezione) chiudiLibero(); continue; }
    aggiungiRiga(riga);
  }

  if (!meta.key) {
    const primo = /\[([^\]]+)\]/.exec(testo);
    if (primo) meta.key = primo[1].replace(/[()]/g, "");
  }
  const parole = testo.split(/\r?\n/)
    .filter(r => !r.startsWith("{") && !raccoltaRiga(r))
    .map(r => r.replace(/\[[^\]]*\]/g, ""))
    .join("\n");
  return {
    id: file, meta, blocchi,
    righeTesto: parole.split("\n").filter(r => r.trim()),
    ricerca: normalizza([meta.title, meta.subtitle, meta.artist, parole].join(" ")),
    titoloNorm: normalizza([meta.title, meta.subtitle, meta.artist].join(" ")),
  };
}

// righe interne ai blocchi melodia/ABC: non sono testo da cercare
function raccoltaRiga(r) {
  return /^\s*(tonalit|tempo|metro|ritmo|velocit|note|testo)\S*\s*:/i.test(r) || /^[A-Za-z]:/.test(r);
}

function normalizza(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’'`]/g, " ");
}

/* ===== Stato ============================================================ */

// i canti come testo ChordPro ({ file, testo }): in locale arrivano da canti.js, online dal file cifrato
let TESTI = [];
let CANTI = [];
function impostaCanti(testi) {
  TESTI = testi;
  CANTI = testi.map(c => leggiChordPro(c.testo, c.file))
    .sort((a, b) => a.meta.title.localeCompare(b.meta.title, "it"));
}

const salvato = (() => { try { return JSON.parse(localStorage.getItem("canti-prefs")) || {}; } catch { return {}; } })();
const stato = {
  trasp: salvato.trasp || {},
  vel: salvato.vel || {},       // velocità di scorrimento per canto
  tag: salvato.tag || {},       // tag modificati nell'app (sostituiscono quelli del file)
  filtri: salvato.filtri || [], // tag selezionati nell'elenco
  dim: salvato.dim || 19,
  accordi: salvato.accordi !== false,
  int: !!salvato.int,
  tema: salvato.tema || "",
  corrente: null,
};
function salva() {
  try {
    const { corrente, ...daSalvare } = stato;
    localStorage.setItem("canti-prefs", JSON.stringify(daSalvare));
  } catch { /* archiviazione non disponibile: pazienza */ }
}

const $ = id => document.getElementById(id);
const el = (tag, cls, testo) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (testo != null) e.textContent = testo;
  return e;
};

/* ===== Tag ============================================================== */

// online i tag sono solo quelli salvati nel canto; nella copia sul PC valgono anche quelli del browser
const tagDi = c => (!sito.attivo && stato.tag[c.id]) || c.meta.tags;
const stessiTag = (a, b) => a.length === b.length && a.every(t => b.includes(t));

/** Solo nella copia sul PC: online i tag si cambiano dentro ✎ Modifica. */
function impostaTag(canto, tags) {
  const puliti = [...new Set(tags.map(t => t.trim()).filter(Boolean))];
  if (stessiTag(puliti, canto.meta.tags)) delete stato.tag[canto.id];
  else stato.tag[canto.id] = puliti;
  salva();
  disegnaTag();
  aggiornaElenco();
}

// I tag sono divisi in categorie. Nei filtri, dentro una categoria basta uno dei tag scelti
// (Comunione o Adorazione eucaristica); tra categorie diverse servono tutti (Gesù e Meditativo).
const GRUPPI_TAG = [
  ["A chi è rivolto", ["Padre", "Gesù", "Spirito Santo", "Trinità", "Maria"]],
  ["Temi", ["Lode", "Adorazione", "Ringraziamento", "Amore di Dio", "Fiducia", "Speranza", "Gioia", "Pace",
    "Perdono", "Misericordia", "Guarigione", "Croce", "Risurrezione", "Offerta", "Chiamata", "Missione",
    "Servizio", "Unità", "Parola", "Creazione", "Ricerca di Dio"]],
  ["Sacramenti", ["Eucaristia", "Riconciliazione", "Battesimo", "Cresima", "Matrimonio"]],
  ["Momenti del ritiro", ["Inizio", "Invocazione allo Spirito", "Adorazione eucaristica", "Meditazione",
    "Celebrazione penitenziale", "Preghiera di guarigione", "Mandato"]],
  ["Messa", ["Ingresso", "Atto penitenziale", "Gloria", "Alleluia", "Offertorio", "Santo", "Agnello di Dio",
    "Comunione", "Dopo la comunione", "Finale"]],
  ["Tempo liturgico", ["Avvento", "Natale", "Quaresima", "Pasqua", "Pentecoste"]],
  ["Carattere", ["Festoso", "Meditativo", "Breve"]],
  ["Lingua", ["Latino", "Spagnolo"]],
];
const GRUPPO_DI = new Map(GRUPPI_TAG.flatMap(([g, tags]) => tags.map(t => [t, g])));
const ORDINE_TAG = new Map(GRUPPI_TAG.flatMap(([, tags]) => tags).map((t, i) => [t, i]));
const gruppoDi = t => GRUPPO_DI.get(t) || "Altri";
const ordinaTag = tags => [...tags].sort((a, b) =>
  (ORDINE_TAG.get(a) ?? 999) - (ORDINE_TAG.get(b) ?? 999) || a.localeCompare(b, "it"));

// Ogni tag ha il suo colore pastello: ogni categoria ha una famiglia di colori
// (azzurri, verdi, gialli…) e i tag della categoria ne sono sfumature diverse.
const TINTE_GRUPPI = [210, 120, 45, 275, 335, 20, 175, 85];  // nell'ordine di GRUPPI_TAG
function tintaTag(t) {
  const g = GRUPPI_TAG.findIndex(([nome]) => nome === gruppoDi(t));
  if (g < 0) {  // "Altri": tinta ricavata dal nome, così resta sempre la stessa
    let h = 0;
    for (const c of t) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
  }
  const tags = GRUPPI_TAG[g][1];
  const ampiezza = Math.min(70, tags.length * 12);  // più tag, più sfumature
  const pos = tags.length > 1 ? tags.indexOf(t) / (tags.length - 1) - 0.5 : 0;
  return Math.round((TINTE_GRUPPI[g] + pos * ampiezza + 360) % 360);
}
function coloraTag(elemento, t) {
  elemento.classList.add("colorato");
  elemento.style.setProperty("--tinta", tintaTag(t));
  return elemento;
}

function tuttiTag() {
  const conta = new Map();
  for (const c of CANTI) for (const t of tagDi(c)) conta.set(t, (conta.get(t) || 0) + 1);
  return ordinaTag(conta.keys()).map(t => [t, conta.get(t)]);
}

/** Il canto rispetta i filtri scelti? (esclusi, se indicata, quelli di una categoria) */
function passaFiltri(canto, salvoGruppo) {
  const tags = tagDi(canto);
  const perGruppo = new Map();
  for (const f of stato.filtri) {
    const g = gruppoDi(f);
    if (g === salvoGruppo) continue;
    perGruppo.set(g, [...(perGruppo.get(g) || []), f]);
  }
  return [...perGruppo.values()].every(scelti => scelti.some(f => tags.includes(f)));
}

/** I tag del canto aperto. Nella copia sul PC si tolgono con × e si aggiungono con "+ tag";
    online si vedono soltanto (si cambiano dentro ✎ Modifica). */
function disegnaTag() {
  const canto = stato.corrente;
  const box = $("tag-canto");
  box.replaceChildren();
  if (!canto) return;
  const modificabili = !sito.attivo;
  for (const t of ordinaTag(tagDi(canto))) {
    const chip = coloraTag(el("span", "chip", t), t);
    chip.title = gruppoDi(t);
    if (modificabili) {
      const togli = el("button", "chip-x", "×");
      togli.title = `Togli il tag "${t}"`;
      togli.onclick = () => impostaTag(canto, tagDi(canto).filter(x => x !== t));
      chip.append(togli);
    }
    box.append(chip);
  }
  if (!modificabili) return;
  const piu = el("button", "chip chip-nuovo", "+ tag");
  piu.onclick = () => {
    const input = el("input", "chip-input");
    input.setAttribute("list", "elenco-tag");
    input.placeholder = "nuovo tag";
    const lista = el("datalist");
    lista.id = "elenco-tag";
    for (const [t] of tuttiTag()) { const o = el("option"); o.value = t; lista.append(o); }
    let fatto = false;
    const conferma = () => {
      if (fatto) return;
      fatto = true;
      if (input.value.trim()) impostaTag(canto, [...tagDi(canto), input.value]);
      else disegnaTag();
    };
    input.onkeydown = e => {
      if (e.key === "Enter") conferma();
      if (e.key === "Escape") { fatto = true; disegnaTag(); }
    };
    input.onblur = conferma;
    piu.replaceWith(input, lista);
    input.focus();
  };
  box.append(piu);
}

/** Scarica tag.json con i tag cambiati nell'app (da copiare nella cartella dei canti). */
function esportaTag() {
  const blob = new Blob([JSON.stringify(stato.tag, null, 1)], { type: "application/json" });
  const a = el("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tag.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ===== Elenco, ricerca e filtri ========================================= */

function aggiornaElenco() {
  const q = normalizza($("cerca").value.trim());
  const termini = q.split(/\s+/).filter(Boolean);
  const tags = tuttiTag();
  stato.filtri = stato.filtri.filter(f => tags.some(([t]) => t === f));
  const cercati = CANTI.filter(c => {
    const testo = c.ricerca + " " + normalizza(tagDi(c).join(" "));
    return termini.every(t => testo.includes(t));
  });

  // filtri divisi per categoria; accanto a ogni tag, quanti canti si otterrebbero scegliendolo
  const filtri = $("filtri");
  filtri.replaceChildren();
  const gruppi = new Map();
  for (const [t] of tags) gruppi.set(gruppoDi(t), [...(gruppi.get(gruppoDi(t)) || []), t]);
  for (const [gruppo, suoi] of gruppi) {
    const box = el("div", "gruppo-filtri");
    box.append(el("div", "gruppo-nome", gruppo));
    const possibili = cercati.filter(c => passaFiltri(c, gruppo));
    for (const t of suoi) {
      const quanti = possibili.filter(c => tagDi(c).includes(t)).length;
      const scelto = stato.filtri.includes(t);
      const b = coloraTag(el("button", "chip filtro" + (quanti || scelto ? "" : " vuoto"), t), t);
      b.append(el("small", null, " " + quanti));
      b.setAttribute("aria-pressed", scelto);
      b.onclick = () => {
        stato.filtri = scelto ? stato.filtri.filter(f => f !== t) : [...stato.filtri, t];
        salva();
        aggiornaElenco();
      };
      box.append(b);
    }
    filtri.append(box);
  }
  const attivi = ordinaTag(stato.filtri);
  // i filtri scelti restano visibili, con i loro colori, anche a pannello chiuso
  $("filtri-attivi").replaceChildren(...attivi.map(t => coloraTag(el("span", "chip mini", t), t)));
  $("azzera-filtri").hidden = !attivi.length;
  $("esporta-tag").hidden = sito.attivo || !Object.keys(stato.tag).length;

  const lista = $("risultati");
  lista.replaceChildren();
  const trovati = cercati
    .filter(c => passaFiltri(c))
    .map(c => ({ c, nelTitolo: termini.every(t => c.titoloNorm.includes(t)) }))
    .sort((a, b) => (b.nelTitolo - a.nelTitolo));

  for (const { c, nelTitolo } of trovati) {
    const li = el("li");
    const a = el("a");
    a.href = "#/" + c.id;
    if (stato.corrente && stato.corrente.id === c.id) a.setAttribute("aria-current", "page");
    a.append(evidenzia(c.meta.title, termini, "r-titolo"));
    const riga = termini.length && !nelTitolo && c.righeTesto.find(r => termini.some(t => normalizza(r).includes(t)));
    const dettaglio = riga || [c.meta.artist, c.meta.subtitle].filter(Boolean).join(" · ");
    if (dettaglio) a.append(evidenzia(dettaglio, termini, "r-dettaglio"));
    // i tag che corrispondono alla ricerca: si vede perché il canto è stato trovato
    const tagCorrispondenti = termini.length ? ordinaTag(tagDi(c)).filter(t => termini.some(x => normalizza(t).includes(x))) : [];
    if (tagCorrispondenti.length) {
      const box = el("span", "r-tag");
      for (const t of tagCorrispondenti) box.append(coloraTag(el("span", "chip mini", t), t));
      a.append(box);
    }
    li.append(a);
    lista.append(li);
  }

  // tag che corrispondono a quello che si sta scrivendo: un tocco e diventano un filtro
  const suggeriti = $("tag-suggeriti");
  suggeriti.replaceChildren();
  const simili = termini.length
    ? tags.map(([t]) => t).filter(t => !stato.filtri.includes(t) && termini.every(x => normalizza(t).includes(x)))
    : [];
  if (simili.length) {
    suggeriti.append(el("span", "suggeriti-nome", "Filtra per tag:"));
    for (const t of simili) {
      const b = coloraTag(el("button", "chip filtro", t), t);
      b.title = `Mostra solo i canti con il tag ${t}`;
      b.onclick = () => {
        stato.filtri = [...stato.filtri, t];
        $("cerca").value = "";
        salva();
        aggiornaElenco();
      };
      suggeriti.append(b);
    }
  }
  const filtrato = termini.length || stato.filtri.length;
  $("conteggio").textContent = filtrato
    ? `${trovati.length} ${trovati.length === 1 ? "canto trovato" : "canti trovati"}`
    : `${CANTI.length} canti`;
}

/** Evidenzia i termini cercati (ignorando accenti e maiuscole). */
function evidenzia(testo, termini, cls) {
  const span = el("span", cls);
  const norm = normalizza(testo);
  const segni = new Array(testo.length).fill(false);
  for (const t of termini) {
    let i = norm.indexOf(t);
    while (i >= 0) { for (let k = i; k < i + t.length; k++) segni[k] = true; i = norm.indexOf(t, i + 1); }
  }
  let i = 0;
  while (i < testo.length) {
    let j = i;
    while (j < testo.length && segni[j] === segni[i]) j++;
    const pezzo = testo.slice(i, j);
    span.append(segni[i] ? el("mark", null, pezzo) : document.createTextNode(pezzo));
    i = j;
  }
  return span;
}

/* ===== Foglio del canto ================================================= */

function mostraCanto(canto) {
  fermaScorrimento();
  stato.corrente = canto;
  document.body.classList.toggle("con-canto", !!canto);
  $("vuoto").hidden = !!canto;
  $("foglio").hidden = !canto;
  chiudiModificaCanto();
  aggiornaElenco();
  aggiornaNavigazione();
  if (!canto) { document.title = "Chi canta prega due volte"; return; }
  intestazione(canto);
  disegnaTag();
  disegna();
  aggiornaScorrimento();
  window.scrollTo(0, 0);
}

function intestazione(canto) {
  const m = canto.meta;
  $("titolo").textContent = m.title;
  $("sottotitolo").textContent = m.subtitle;
  $("autore").textContent = m.artist;
  $("tempo-canto").textContent = [m.metro, m.bpm && `♩ = ${m.bpm}`].filter(Boolean).join(" · ");
  const yt = $("youtube");
  yt.hidden = !m.youtube;
  if (m.youtube) yt.href = /^https?:\/\//.test(m.youtube) ? m.youtube : "https://www.youtube.com/watch?v=" + m.youtube;
  document.title = m.title + " · Chi canta prega due volte";
}

function disegna() {
  const canto = stato.corrente;
  if (!canto) return;
  const n = stato.trasp[canto.id] || 0;
  const ton = leggiTonalita(canto.meta.key);
  const bemolli = usaBemolli(ton, n);
  const acc = a => trasponiAccordo(a, n, bemolli, stato.int);

  // indicatore di tonalità
  const tonEl = $("tonalita");
  tonEl.replaceChildren();
  if (canto.meta.key) {
    const nuova = acc(canto.meta.key.replace(/\s*(maggiore|minore)/i, m => (/minore/i.test(m) ? "-" : "")));
    tonEl.append(el("b", null, nuova));
    if (n) tonEl.append(document.createTextNode(` (${n > 0 ? "+" : ""}${n})`));
  } else {
    tonEl.textContent = n ? `${n > 0 ? "+" : ""}${n}` : "originale";
  }

  const corpo = $("corpo");
  corpo.replaceChildren();
  corpo.classList.toggle("nascondi-accordi", !stato.accordi);
  document.documentElement.style.setProperty("--dim", stato.dim + "px");

  const ritornello = canto.blocchi.find(b => b.tipo === "ritornello");
  for (const b of canto.blocchi) {
    if (b.tipo === "verso" || b.tipo === "libero") corpo.append(disegnaSezione(b, acc));
    else if (b.tipo === "ritornello") corpo.append(disegnaSezione(b, acc, "Rit.", "ritornello"));
    else if (b.tipo === "ponte") corpo.append(disegnaSezione(b, acc, null, "ponte"));
    else if (b.tipo === "rif-ritornello") {
      const det = el("details", "rit-rif");
      det.append(el("summary", null, "Rit."));
      if (ritornello) det.append(disegnaSezione(ritornello, acc, null, "ritornello"));
      corpo.append(det);
    } else if (b.tipo === "sequenza") {
      const p = el("p", "sequenza");
      if (b.etichetta) p.append(el("span", null, b.etichetta + ":  "));
      for (const a of b.accordi) p.append(el("span", "acc", acc(a)));
      corpo.append(p);
    } else if (b.tipo === "commento") {
      corpo.append(el("p", "commento", b.testo));
    } else if (b.tipo === "melodia") {
      corpo.append(disegnaMelodia(b.sorgente, canto, n, bemolli));
    }
  }

  // online si modifica solo con ✎ Modifica: niente pulsanti di modifica nel foglio
  if (!sito.attivo && !canto.blocchi.some(b => b.tipo === "melodia")) {
    const nuova = el("button", "aggiungi-melodia", "✎ Scrivi la melodia");
    nuova.onclick = () => {
      const modello = `{start_of_melodia}\ntonalità: ${tonalitaEstesa(canto.meta.key) || "Do maggiore"}\n` +
        `tempo: ${canto.meta.metro || "4/4"}\nritmo: ${canto.meta.bpm || ""}\nnote: \ntesto: \n{end_of_melodia}`;
      nuova.replaceWith(disegnaMelodia(modello, canto, 0, false, true));
    };
    corpo.append(nuova);
  }

  // se un accordo è più largo della sua sillaba, la parola si allarga:
  // un trattino ricuce la parola ("can - te - rò")
  for (const p of corpo.querySelectorAll(".pezzo:not(:last-child)")) {
    const t = p.lastChild;
    if (t.textContent && p.offsetWidth > t.offsetWidth + 3) p.classList.add("trattino");
  }
}

function disegnaSezione(b, acc, etichetta, cls) {
  const div = el("section", "blocco" + (cls ? " " + cls : ""));
  if (etichetta) div.append(el("div", "etichetta", etichetta));
  for (const r of b.righe) {
    if (r.commento) div.append(el("p", "commento", r.commento));
    else div.append(disegnaRiga(r, acc));
  }
  return div;
}

/** Divide la riga in parole; ogni parola in pezzi con l'accordo sopra. */
function disegnaRiga(riga, acc) {
  const div = el("div", "riga");
  if (!riga.includes("[")) {
    div.classList.add("senza-accordi");
    div.textContent = riga;
    return div;
  }
  const coppie = [];
  const re = /\[([^\]]*)\]/g;
  let ultimo = 0, accordo = null, m;
  while ((m = re.exec(riga))) {
    coppie.push([accordo, riga.slice(ultimo, m.index)]);
    accordo = m[1];
    ultimo = re.lastIndex;
  }
  coppie.push([accordo, riga.slice(ultimo)]);

  const parole = [];
  let corrente = [];
  for (const [a, testo] of coppie) {
    const parti = testo.split(/(\s+)/);
    let primo = true;
    for (const parte of parti) {
      if (/^\s+$/.test(parte)) {
        if (primo && a) { corrente.push([a, ""]); primo = false; }
        if (corrente.length) parole.push(corrente);
        corrente = [];
        continue;
      }
      if (!parte && !(primo && a)) continue;
      corrente.push([primo ? a : null, parte]);
      primo = false;
    }
    if (primo && a) corrente.push([a, ""]);
  }
  if (corrente.length) parole.push(corrente);

  const soloAccordi = parole.every(p => p.every(([, t]) => !t.trim()));
  if (soloAccordi) div.classList.add("solo-accordi");
  for (const parola of parole) {
    const w = el("span", "parola");
    for (const [a, t] of parola) {
      const p = el("span", "pezzo");
      p.append(el("span", "acc", a ? acc(a) : ""));
      p.append(el("span", "testo", t));
      w.append(p);
    }
    div.append(w);
  }
  return div;
}

/* ===== Melodia: pentagramma, ascolto, editor ============================ */

let synthAttivo = null;

function fermaAudio() {
  if (synthAttivo) { synthAttivo.synth.stop(); synthAttivo.fine(); synthAttivo = null; }
}

function disegnaMelodia(sorgente, canto, n, bemolli, apriEditor = false) {
  const box = el("section", "melodia");
  const testa = el("div", "melodia-testa");
  const etichetta = el("span", "melodia-titolo");
  const pent = el("div", "pentagramma");
  const noteP = el("p", "melodia-note");
  const avvisi = el("p", "melodia-errori");
  testa.append(etichetta);
  box.append(testa, pent, noteP, avvisi);

  let visual = null, risultato = null, traspAttuale = n;
  const rendi = (testo, trasp) => {
    risultato = abcDaSorgente(testo, canto);
    traspAttuale = trasp;
    const r = risultato;
    const ton = trasponiNomeTonalita(r.tonalita, trasp);
    etichetta.textContent = "Melodia" + (ton ? " · " + ton : "") + (trasp ? ` (${trasp > 0 ? "+" : ""}${trasp})` : "");
    noteP.textContent = r.noteTesto && !editor.isConnected
      ? trasponiNoteTesto(r.noteTesto, trasp, bemolli).replace(/-+/g, m => " " + "–".repeat(m.length) + " ")
      : "";
    avvisi.textContent = r.errori.length ? "Da correggere: " + r.errori.join(" · ") : "";
    pent.replaceChildren();
    visual = null;
    if (!window.ABCJS) { pent.append(el("p", "commento", "Pentagramma non disponibile senza connessione.")); return; }
    if (r.abc) {
      [visual] = ABCJS.renderAbc(pent, r.abc, {
        responsive: "resize", visualTranspose: trasp, paddingtop: 0, paddingbottom: 0,
        paddingleft: 0, foregroundColor: "currentColor", staffwidth: 560,
      });
    }
  };

  // --- ascolto
  if (window.ABCJS && ABCJS.synth && ABCJS.synth.supportsAudio()) {
    const play = el("button", null, "▶ Ascolta");
    play.onclick = async () => {
      if (synthAttivo && synthAttivo.pulsante === play) { fermaAudio(); return; }
      fermaAudio();
      if (!visual) return;
      play.disabled = true;
      try {
        const synth = new ABCJS.synth.CreateSynth();
        // visualTranspose sposta solo il disegno: l'audio va trasposto a parte
        const opzioni = { program: 0, midiTranspose: traspAttuale };
        if (!risultato.haTempo) opzioni.qpm = BPM_PREDEFINITO;
        await synth.init({ visualObj: visual, options: opzioni });
        const pronto = await synth.prime();
        synth.start();
        play.textContent = "■ Ferma";
        const timer = setTimeout(fermaAudio, ((pronto && pronto.duration) || 30) * 1000 + 300);
        synthAttivo = { synth, pulsante: play, fine: () => { clearTimeout(timer); play.textContent = "▶ Ascolta"; } };
      } catch (e) {
        play.textContent = "Audio non disponibile";
      } finally {
        play.disabled = false;
      }
    };
    testa.append(play);
  }

  // --- editor: anteprima dal vivo, poi si copia il testo nel file
  const editor = el("div", "editor");
  const area = el("textarea");
  area.spellcheck = false;
  area.value = /melodia_note/i.test(sorgente) ? bloccoDaTrattini(sorgente) : sorgente;
  area.rows = Math.min(14, Math.max(6, area.value.split("\n").length + 1));
  const aiuto = el("div", "editor-aiuto");
  aiuto.innerHTML =
    "<b>Note</b>: do re mi fa sol la si, con # o b · <b>durata</b> dopo la nota: " +
    "1 semibreve, 2 minima, 4 semiminima, 8 croma, 16 semicroma, con il punto per la nota puntata (<code>sol4.</code>) · " +
    "senza numero vale la durata precedente · <b>pausa</b>: <code>p4</code>, <code>p2</code>… · " +
    "<b>ottava</b>: <code>'</code> sopra, <code>,</code> sotto (<code>sib,2</code>) · <b>battuta</b>: <code>|</code> · " +
    "<b>tempo</b>: <code>tempo: 3/4</code> (la misura) · <b>ritmo</b>: <code>ritmo: 72</code> (battiti al minuto) · <b>testo</b>: sillabe divise da <code>-</code>, " +
    "una riga <code>testo:</code> sotto ogni riga <code>note:</code>.";
  // tempo (misura) e ritmo (battiti al minuto) dai menu: riscrivono le righe del blocco
  const controlli = controlliTempo(t => {
    area.value = scriviTempoMelodia(area.value, t);
    rendi(area.value, 0);
  });
  const tempoBox = controlli.box;
  tempoBox.hidden = /start_of_abc|soa/i.test(sorgente);
  const leggiTempoArea = () => controlli.imposta(leggiTempoMelodia(area.value));

  const comandi = el("div", "editor-comandi");
  const copia = el("button", null, "Copia per il file");
  const chiudi = el("button", null, "Chiudi");
  comandi.append(copia, chiudi);
  const nota = "Questa è la copia sul PC: da qui non si salva su GitHub. Per salvare online premi «Copia per il file», " +
    `apri il canzoniere dal sito (${SITO_ONLINE}), cerca il canto e incolla la melodia con ✎ Modifica. ` +
    `In alternativa incollala nel file canti/${canto.id}.cho e lancia pubblica.py.`;
  editor.append(tempoBox, area, aiuto, comandi, el("p", "editor-nota", nota));

  // online la melodia si cambia, come tutto il resto, solo con ✎ Modifica del canto
  if (sito.attivo) {
    rendi(sorgente, n);
    return box;
  }

  const modifica = el("button", null, "✎ Modifica");
  testa.append(modifica);
  const apri = () => {
    fermaAudio();
    box.append(editor);
    modifica.hidden = true;
    leggiTempoArea();
    rendi(area.value, 0);
    area.focus();
  };
  modifica.onclick = apri;
  area.oninput = () => { leggiTempoArea(); rendi(area.value, 0); };
  chiudi.onclick = () => { editor.remove(); modifica.hidden = false; rendi(sorgente, n); };
  copia.onclick = async () => {
    try { await navigator.clipboard.writeText(area.value); copia.textContent = "Copiato ✓"; }
    catch { area.select(); copia.textContent = "Selezionato: premi Ctrl+C"; }
    setTimeout(() => { copia.textContent = "Copia per il file"; }, 2500);
  };

  rendi(sorgente, n);
  if (apriEditor) apri();
  return box;
}

/* ===== Scorrimento automatico =========================================== */

const scorri = { attivo: false, ultimo: 0, resto: 0, veglia: null };
const velocita = () => (stato.corrente && stato.vel[stato.corrente.id]) || 5;

function aggiornaScorrimento() {
  const via = $("scorri-via");
  via.textContent = scorri.attivo ? "❚❚" : "▶";
  via.title = scorri.attivo ? "Ferma lo scorrimento (barra spaziatrice)" : "Scorrimento automatico (barra spaziatrice)";
  $("scorri-vel").textContent = velocita();
  $("scorri").classList.toggle("attivo", scorri.attivo);
}

function avviaScorrimento() {
  const fondo = document.documentElement.scrollHeight - window.innerHeight;
  if (window.scrollY >= fondo - 2) window.scrollTo(0, 0);
  Object.assign(scorri, { attivo: true, ultimo: 0, resto: 0 });
  // tiene acceso lo schermo del telefono mentre scorre
  if (navigator.wakeLock) navigator.wakeLock.request("screen").then(v => { scorri.veglia = v; }).catch(() => {});
  requestAnimationFrame(passoScorrimento);
  aggiornaScorrimento();
}

function fermaScorrimento() {
  scorri.attivo = false;
  if (scorri.veglia) { scorri.veglia.release().catch(() => {}); scorri.veglia = null; }
  if ($("scorri-via")) aggiornaScorrimento();
}

function passoScorrimento(t) {
  if (!scorri.attivo) return;
  if (scorri.ultimo) {
    // pixel al secondo: proporzionali alla velocità e alla dimensione del testo
    scorri.resto += (t - scorri.ultimo) / 1000 * velocita() * 3 * (stato.dim / 19);
    const px = Math.floor(scorri.resto);
    if (px > 0) { window.scrollBy(0, px); scorri.resto -= px; }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1) { fermaScorrimento(); return; }
  }
  scorri.ultimo = t;
  requestAnimationFrame(passoScorrimento);
}

function cambiaVelocita(delta) {
  const c = stato.corrente;
  if (!c) return;
  const v = Math.min(20, Math.max(1, velocita() + delta));
  if (v === 5) delete stato.vel[c.id]; else stato.vel[c.id] = v;
  salva();
  aggiornaScorrimento();
}

/* ===== Online: canti cifrati e modifiche ================================ */

// Online i canti stanno in dati/canti.bin, cifrati (vedi strumenti/pubblica.py): la chiave di
// lettura arriva dal link (#k=...) e resta salvata nel dispositivo. Per modificare serve la
// password, che sblocca il token GitHub conservato (cifrato) in dati/editor.bin.
const sito = { attivo: false, meta: null, chiave: null, token: null };
const SITO_ONLINE = "https://filippodecarlo-cloud.github.io/canti/";
const ITER_EDITOR = 600000;
const codifica = s => new TextEncoder().encode(s);
const decodifica = b => new TextDecoder().decode(b);

async function chiaveDa(password, sale, iterazioni, usi) {
  const base = await crypto.subtle.importKey("raw", codifica(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: sale, iterations: iterazioni, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, usi);
}

function decifra(chiave, dati, etichetta) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: dati.slice(0, 12), additionalData: codifica(etichetta) },
    chiave, dati.slice(12));
}

async function cifra(chiave, dati, etichetta) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrato = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: codifica(etichetta) }, chiave, dati);
  const out = new Uint8Array(12 + cifrato.byteLength);
  out.set(iv);
  out.set(new Uint8Array(cifrato), 12);
  return out;
}

async function gzip(byte, comprimi) {
  const flusso = new Blob([byte]).stream()
    .pipeThrough(comprimi ? new CompressionStream("gzip") : new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(flusso).arrayBuffer());
}

const daBase64 = s => Uint8Array.from(atob(s.replace(/\s/g, "")), c => c.charCodeAt(0));
function aBase64(byte) {
  let s = "";
  for (let i = 0; i < byte.length; i += 0x8000) s += String.fromCharCode(...byte.subarray(i, i + 0x8000));
  return btoa(s);
}

/** La chiave da un link ("…/canti/abcd-efgh", "…#k=abcd-efgh") o incollata da sola. */
function chiaveDalLink(testo) {
  testo = String(testo || "").trim();
  const m = testo.match(/[#&?]k=([A-Za-z0-9-]+)/) || testo.match(/\.github\.io\/[^/]+\/([A-Za-z0-9-]+)\/?(?:[?#].*)?$/);
  if (m) return m[1].toLowerCase();
  return /^[A-Za-z0-9]{4}(-[A-Za-z0-9]{4})+$/.test(testo) ? testo.toLowerCase() : null;
}

async function apriCifrato(byte) {
  const chiaro = await decifra(sito.chiave, byte, "canti");  // con la chiave sbagliata dà errore
  return JSON.parse(decodifica(await gzip(new Uint8Array(chiaro), false))).canti;
}

async function caricaOnline(chiaveTesto) {
  const meta = await fetch("dati/meta.json", { cache: "no-cache" });
  if (!meta.ok) throw new Error("rete");
  sito.meta = await meta.json();
  sito.chiave = await chiaveDa(chiaveTesto, daBase64(sito.meta.salt), sito.meta.iter, ["encrypt", "decrypt"]);
  const res = await fetch("dati/canti.bin", { cache: "no-cache" });
  if (!res.ok) throw new Error("rete");
  impostaCanti(await apriCifrato(await res.arrayBuffer()));
}

function mostraBlocco(messaggio) {
  $("blocco").hidden = false;
  $("blocco-msg").textContent = messaggio;
  $("blocco-input").focus();
}

async function sblocca(chiave) {
  try {
    await caricaOnline(chiave);
    await caricaScalette();
  } catch (e) {
    mostraBlocco(e.name === "OperationError"
      ? "Chiave non valida: controlla il link che hai ricevuto."
      : "Non riesco a scaricare i canti: controlla la connessione.");
    return false;
  }
  try { localStorage.setItem("canti-chiave", chiave); } catch { /* resterà da reinserire */ }
  $("blocco").hidden = true;
  return true;
}

/** Testo ChordPro di un canto. */
const testoDi = id => (TESTI.find(t => t.file === id) || {}).testo || "";

/* --- finestre e avvisi --- */

function finestra({ titolo, testo = "", campi = [], ok = "OK", errore = "" }) {
  return new Promise(risolvi => {
    const d = $("finestra");
    const form = el("form");
    form.method = "dialog";
    form.append(el("h3", null, titolo));
    if (testo) { const p = el("div", "finestra-testo"); p.innerHTML = testo; form.append(p); }
    if (errore) form.append(el("p", "finestra-errore", errore));
    const valori = {};
    for (const c of campi) {
      const etichetta = el("label", null, c.etichetta);
      const input = el("input");
      Object.assign(input, { type: c.tipo || "text", autocomplete: "off", spellcheck: false, autocapitalize: "off" });
      valori[c.nome] = input;
      etichetta.append(input);
      form.append(etichetta);
    }
    const pulsanti = el("div", "editor-comandi");
    const si = el("button", "primario", ok);
    si.value = "ok";
    const no = el("button", null, "Annulla");
    no.type = "button";
    no.onclick = () => d.close("annulla");
    pulsanti.append(si, no);
    form.append(pulsanti);
    d.replaceChildren(form);
    d.returnValue = "";
    d.onclose = () => risolvi(d.returnValue === "ok"
      ? Object.fromEntries(Object.entries(valori).map(([k, i]) => [k, i.value.trim()])) : null);
    d.showModal();
    (Object.values(valori)[0] || si).focus();
  });
}

let timerAvviso = null;
function avviso(testo) {
  const a = $("avviso");
  a.textContent = testo;
  a.hidden = false;
  clearTimeout(timerAvviso);
  timerAvviso = setTimeout(() => { a.hidden = true; }, 4000);
}

/* --- password e salvataggio su GitHub --- */

async function github(percorso, opzioni = {}) {
  const res = await fetch(`https://api.github.com/repos/${sito.meta.repo}/${percorso}`, {
    ...opzioni,
    cache: "no-store",
    headers: { Authorization: `Bearer ${sito.token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub ha risposto ${res.status}`);
  return res.json();
}

/** Sblocca le modifiche: chiede la password (la prima volta fa configurare il token). */
async function sbloccaModifiche() {
  if (sito.token) return true;
  const res = await fetch("dati/editor.bin", { cache: "no-cache" }).catch(() => null);
  if (!res) { avviso("Serve la connessione per modificare."); return false; }
  if (res.status === 404) return configuraModifiche();
  const dati = new Uint8Array(await res.arrayBuffer());
  let errore = "";
  for (;;) {
    const v = await finestra({
      titolo: "Modifica dei canti", testo: "Inserisci la password per modificare i canti.",
      campi: [{ nome: "password", tipo: "password", etichetta: "Password" }], ok: "Sblocca", errore,
    });
    if (!v) return false;
    try {
      const k = await chiaveDa(v.password.toLowerCase(), dati.slice(0, 16), ITER_EDITOR, ["decrypt"]);
      sito.token = decodifica(await decifra(k, dati.slice(16), "editor"));
      document.body.classList.add("modifiche-sbloccate");
      return true;
    } catch {
      errore = "Password sbagliata.";
    }
  }
}

/** Prima volta: il token GitHub viene salvato nel repository, cifrato con la password. */
async function configuraModifiche() {
  let errore = "";
  for (;;) {
    const v = await finestra({
      titolo: "Prima configurazione delle modifiche",
      testo: "Per salvare i canti serve un <b>token GitHub</b> che possa scrivere solo nel repository " +
        `<b>${sito.meta.repo}</b>:<ol><li>apri <a href="https://github.com/settings/personal-access-tokens/new" ` +
        'target="_blank" rel="noopener">github.com → nuovo token</a>;</li>' +
        `<li>in <i>Repository access</i> scegli <i>Only select repositories</i> → <b>${sito.meta.repo.split("/")[1]}</b>;</li>` +
        "<li>in <i>Permissions → Repository permissions</i> metti <b>Contents: Read and write</b>;</li>" +
        "<li>genera il token e incollalo qui sotto.</li></ol>Poi scegli la password per le modifiche: " +
        "da questo momento basterà quella, su qualsiasi dispositivo.",
      campi: [
        { nome: "token", tipo: "password", etichetta: "Token GitHub" },
        { nome: "password", tipo: "password", etichetta: "Password per le modifiche" },
        { nome: "conferma", tipo: "password", etichetta: "Ripeti la password" },
      ],
      ok: "Salva", errore,
    });
    if (!v) return false;
    if (!v.token || !v.password) { errore = "Servono il token e la password."; continue; }
    if (v.password !== v.conferma) { errore = "Le due password non coincidono."; continue; }
    sito.token = v.token;
    try {
      const sale = crypto.getRandomValues(new Uint8Array(16));
      const k = await chiaveDa(v.password.toLowerCase(), sale, ITER_EDITOR, ["encrypt"]);
      const cifrato = await cifra(k, codifica(v.token), "editor");
      const dati = new Uint8Array(16 + cifrato.length);
      dati.set(sale);
      dati.set(cifrato, 16);
      await github("contents/dati/editor.bin", {
        method: "PUT",
        body: JSON.stringify({ message: "Configura le modifiche dall'app", content: aBase64(dati) }),
      });
      document.body.classList.add("modifiche-sbloccate");
      avviso("Modifiche configurate ✓");
      return true;
    } catch (e) {
      sito.token = null;
      errore = `Il token non funziona (${e.message}): controlla che possa scrivere in ${sito.meta.repo}.`;
    }
  }
}

/**
 * Salva un canto (testo null = elimina). Parte sempre dall'ultima versione presente su GitHub,
 * così non si perdono modifiche fatte nel frattempo da un altro dispositivo.
 */
async function salvaCanto(id, testo, messaggio) {
  if (!(await sbloccaModifiche())) return false;
  avviso("Salvataggio…");
  try {
    const attuale = await github("contents/dati/canti.bin");
    const elenco = await apriCifrato(daBase64(attuale.content));
    const i = elenco.findIndex(c => c.file === id);
    if (testo === null) { if (i >= 0) elenco.splice(i, 1); }
    else if (i >= 0) elenco[i].testo = testo;
    else elenco.push({ file: id, testo });
    elenco.sort((a, b) => (a.file < b.file ? -1 : 1));
    const byte = await cifra(sito.chiave, await gzip(codifica(JSON.stringify({ canti: elenco })), true), "canti");
    await github("contents/dati/canti.bin", {
      method: "PUT",
      body: JSON.stringify({ message: messaggio, content: aBase64(byte), sha: attuale.sha }),
    });
    impostaCanti(elenco);
    avviso("Salvato ✓ (sugli altri dispositivi arriva entro un paio di minuti)");
    return true;
  } catch (e) {
    avviso(`Non salvato: ${e.message}`);
    return false;
  }
}

function riapri(id) {
  const canto = CANTI.find(c => c.id === id);
  if (location.hash === "#/" + id) mostraCanto(canto || null);
  else location.hash = canto ? "#/" + id : "";
}

function nomeFile(titolo) {
  const base = titolo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "canto";
  let nome = base, k = 2;
  while (TESTI.some(t => t.file === nome)) nome = `${base}-${k++}`;
  return nome;
}

const MODELLO = `{title: Nuovo canto}
{key: Re}
{artist:}
{youtube:}
{tempo:}
{ritmo:}
{tags:}

{intro: Re La Si- Sol}

{start_of_verse}
[Re]Prima strofa, con l'ac[La]cordo prima della sil[Si-]laba
{end_of_verse}

{start_of_chorus}
[Sol]Ritor[La]nello
{end_of_chorus}
`;

/* --- editor del canto: testo ChordPro a sinistra/sopra, anteprima nel foglio --- */

let inModifica = null;  // { id, originale }

async function modificaCanto(canto) {
  if (!(await sbloccaModifiche())) return;
  inModifica = { id: canto ? canto.id : null, originale: canto };
  if (!canto) {
    stato.corrente = null;
    document.body.classList.add("con-canto");
    $("vuoto").hidden = true;
    $("foglio").hidden = false;
  }
  fermaScorrimento();
  const area = $("pm-testo");
  area.value = canto ? testoDi(canto.id) : MODELLO;
  $("pm-elimina").hidden = !canto;
  $("pannello-modifica").hidden = false;
  document.body.classList.add("in-modifica");
  anteprima();
  // il cursore parte dalle note della melodia (o dall'inizio), non dalla fine del testo
  const inizio = Math.max(0, area.value.search(/^note:/m));
  area.setSelectionRange(inizio, inizio);
  area.scrollTop = 0;
  area.focus();
  window.scrollTo(0, 0);
}

function anteprima() {
  const canto = leggiChordPro($("pm-testo").value, inModifica.id || "nuovo");
  stato.corrente = canto;
  intestazione(canto);
  disegnaTag();
  disegna();
  disegnaTagEditor();
  // la melodia sta subito sopra il testo: si scrive e si ascolta senza scorrere la pagina
  const melodie = $("pm-melodia");
  melodie.replaceChildren(...canto.blocchi.filter(b => b.tipo === "melodia")
    .map(b => disegnaMelodia(b.sorgente, canto, 0, false)));
  const blocco = bloccoMelodia($("pm-testo").value);
  tempoEditor.imposta(blocco ? leggiTempoMelodia(blocco) : leggiTempoCanto($("pm-testo").value));
}

/** Il primo blocco melodia del testo, se c'è. */
const bloccoMelodia = testo => (/\{start_of_melodia\}[\s\S]*?\{end_of_melodia\}/i.exec(testo) || [])[0];

// tempo e ritmo nell'editor: valgono per la melodia se c'è, altrimenti per tutto il canto
const tempoEditor = controlliTempo(t => {
  const area = $("pm-testo");
  const blocco = bloccoMelodia(area.value);
  area.value = blocco ? area.value.replace(blocco, () => scriviTempoMelodia(blocco, t))
    : scriviTempoCanto(area.value, t);
  anteprima();
});
$("pm-tempo").append(tempoEditor.box);

/* --- nell'editor: i tag si scelgono toccandoli, e finiscono nella riga {tags: …} --- */

function tagNelTesto(testo) {
  const m = /^\{tags:(.*)\}$/m.exec(testo);
  return m ? m[1].split(",").map(t => t.trim()).filter(Boolean) : [];
}

function conTag(testo, tags) {
  const riga = tags.length ? `{tags: ${tags.join(", ")}}` : "{tags:}";
  return /^\{tags:.*\}$/m.test(testo) ? testo.replace(/^\{tags:.*\}$/m, riga)
    : testo.replace(/^(\{title:.*\})$/m, `$1\n${riga}`);
}

function cambiaTagEditor(tags) {
  const area = $("pm-testo");
  area.value = conTag(area.value, tags);
  anteprima();
}

function disegnaTagEditor() {
  const scelti = tagNelTesto($("pm-testo").value);
  const box = $("pm-tag");
  box.replaceChildren();
  const tutti = ordinaTag(new Set([...GRUPPI_TAG.flatMap(([, t]) => t), ...tuttiTag().map(([t]) => t), ...scelti]));
  const gruppi = new Map();
  for (const t of tutti) gruppi.set(gruppoDi(t), [...(gruppi.get(gruppoDi(t)) || []), t]);
  for (const [gruppo, suoi] of gruppi) {
    const riga = el("div", "gruppo-filtri");
    riga.append(el("div", "gruppo-nome", gruppo));
    for (const t of suoi) {
      const b = coloraTag(el("button", "chip filtro", t), t);
      b.type = "button";
      b.setAttribute("aria-pressed", scelti.includes(t));
      b.onclick = () => {
        const attuali = tagNelTesto($("pm-testo").value);
        cambiaTagEditor(attuali.includes(t) ? attuali.filter(x => x !== t) : [...attuali, t]);
      };
      riga.append(b);
    }
    box.append(riga);
  }
  const nuovo = el("input", "chip-input");
  nuovo.placeholder = "nuovo tag, poi Invio";
  nuovo.onkeydown = e => {
    if (e.key !== "Enter" || !nuovo.value.trim()) return;
    e.preventDefault();
    cambiaTagEditor([...tagNelTesto($("pm-testo").value), nuovo.value.trim()]);
  };
  box.append(nuovo);
  $("pm-tag-scelti").textContent = scelti.length ? `(${scelti.length})` : "";
}

function chiudiModificaCanto() {
  if (!inModifica) return;
  inModifica = null;
  $("pannello-modifica").hidden = true;
  document.body.classList.remove("in-modifica");
}

async function salvaModifica() {
  const testo = $("pm-testo").value.replace(/\r/g, "");
  const titolo = (/^\{title:\s*(.*?)\s*\}$/m.exec(testo) || [])[1];
  if (!titolo) { avviso("Manca il titolo: {title: …}"); return; }
  const id = inModifica.id || nomeFile(titolo);
  if (await salvaCanto(id, testo, `${inModifica.id ? "Modifica" : "Nuovo canto"}: ${titolo}`)) {
    chiudiModificaCanto();
    riapri(id);
  }
}

async function eliminaCanto() {
  const canto = inModifica && inModifica.originale;
  if (!canto) return;
  const v = await finestra({ titolo: `Eliminare «${canto.meta.title}»?`, testo: "Il canto viene tolto dal canzoniere " +
    "(resta comunque nella cronologia di GitHub).", ok: "Elimina" });
  if (v && await salvaCanto(canto.id, null, `Elimina: ${canto.meta.title}`)) {
    chiudiModificaCanto();
    location.hash = "";
    mostraCanto(null);
  }
}

/* ===== Scalette ========================================================= */

// Una scaletta è una serie ordinata di canti per un'occasione (un ritiro, una Messa).
// Online sta in dati/scalette.bin, cifrata come i canti (per cambiarla serve la password);
// nella copia sul PC resta nel browser.
let SCALETTE = [];                                  // [{ id, nome, occasione, canti: [id] }]
const vista = { scheda: "canti", aperta: null, bozza: null };
let scalettaAttiva = null;  // la scaletta che si sta scorrendo con ‹ › sopra il canto

function scaletteLocali() {
  try { return JSON.parse(localStorage.getItem("canti-scalette")) || []; } catch { return []; }
}

async function apriScaletteCifrate(byte) {
  const chiaro = await decifra(sito.chiave, byte, "scalette");
  return JSON.parse(decodifica(await gzip(new Uint8Array(chiaro), false))).scalette;
}

async function caricaScalette() {
  if (!sito.attivo) { SCALETTE = scaletteLocali(); return; }
  const res = await fetch("dati/scalette.bin", { cache: "no-cache" }).catch(() => null);
  SCALETTE = [];
  if (res && res.ok) {
    try { SCALETTE = await apriScaletteCifrate(await res.arrayBuffer()); } catch { /* file illeggibile: nessuna scaletta */ }
  }
}

/** Salva le scalette; cambia() riceve l'elenco più recente (anche se cambiato da un altro dispositivo). */
async function salvaScalette(cambia, messaggio) {
  if (!sito.attivo) {
    SCALETTE = cambia(scaletteLocali());
    try { localStorage.setItem("canti-scalette", JSON.stringify(SCALETTE)); return true; }
    catch { avviso("Non riesco a salvare nel browser"); return false; }
  }
  if (!(await sbloccaModifiche())) return false;
  avviso("Salvataggio…");
  try {
    let attuale = null;
    try { attuale = await github("contents/dati/scalette.bin"); }
    catch (e) { if (!/404/.test(e.message)) throw e; }
    const elenco = cambia(attuale ? await apriScaletteCifrate(daBase64(attuale.content)) : []);
    const byte = await cifra(sito.chiave, await gzip(codifica(JSON.stringify({ scalette: elenco })), true), "scalette");
    await github("contents/dati/scalette.bin", {
      method: "PUT",
      body: JSON.stringify({ message: messaggio, content: aBase64(byte), ...(attuale ? { sha: attuale.sha } : {}) }),
    });
    SCALETTE = elenco;
    avviso("Scaletta salvata ✓");
    return true;
  } catch (e) {
    avviso(`Non salvata: ${e.message}`);
    return false;
  }
}

const titoloDi = id => (CANTI.find(c => c.id === id) || {}).meta?.title;

function mostraScheda(scheda) {
  vista.scheda = scheda;
  $("scheda-canti").setAttribute("aria-pressed", scheda === "canti");
  $("scheda-scalette").setAttribute("aria-pressed", scheda === "scalette");
  $("testa-canti").hidden = $("risultati").hidden = scheda !== "canti";
  $("scalette").hidden = scheda !== "scalette";
  if (scheda === "scalette") disegnaScalette();
}

function disegnaScalette() {
  const box = $("scalette");
  box.replaceChildren();
  if (vista.bozza) { disegnaEditorScaletta(box); return; }
  const aperta = SCALETTE.find(s => s.id === vista.aperta);
  if (aperta) { disegnaScaletta(box, aperta); return; }

  const nuova = el("button", "primario", "+ Nuova scaletta");
  nuova.onclick = () => modificaScaletta(null);
  box.append(nuova);
  if (!SCALETTE.length) {
    box.append(el("p", "scalette-vuoto", "Nessuna scaletta. Creane una per un ritiro o una celebrazione: " +
      "scegli i canti e mettili nell’ordine in cui li canterete."));
    return;
  }
  const ul = el("ul", "elenco-scalette");
  for (const s of SCALETTE) {
    const b = el("button", "voce-scaletta");
    b.append(el("span", "r-titolo", s.nome));
    b.append(el("span", "r-dettaglio", [s.occasione, `${s.canti.length} ${s.canti.length === 1 ? "canto" : "canti"}`]
      .filter(Boolean).join(" · ")));
    b.onclick = () => { vista.aperta = s.id; disegnaScalette(); };
    const li = el("li");
    li.append(b);
    ul.append(li);
  }
  box.append(ul);
}

function disegnaScaletta(box, s) {
  const tutte = el("button", "torna", "‹ Tutte le scalette");
  tutte.onclick = () => { vista.aperta = null; disegnaScalette(); };
  box.append(tutte, el("h2", "nome-scaletta", s.nome));
  if (s.occasione) box.append(el("p", "occasione", s.occasione));
  const ol = el("ol", "canti-scaletta");
  s.canti.forEach(id => {
    const li = el("li");
    const titolo = titoloDi(id);
    if (titolo) {
      const a = el("a", null, titolo);
      a.href = "#/" + id;
      a.onclick = () => entraInScaletta(s.id);
      if (stato.corrente && stato.corrente.id === id && scalettaAttiva === s.id) a.setAttribute("aria-current", "page");
      li.append(a);
    } else {
      li.append(el("span", "mancante", "(canto non più presente)"));
    }
    ol.append(li);
  });
  box.append(ol);
  const comandi = el("div", "editor-comandi");
  if (s.canti.some(titoloDi)) {
    const inizia = el("button", "primario", "▶ Inizia");
    inizia.onclick = () => { entraInScaletta(s.id); location.hash = "#/" + s.canti.find(titoloDi); };
    comandi.append(inizia);
  }
  const modifica = el("button", null, "✎ Modifica");
  modifica.onclick = () => modificaScaletta(s);
  const elimina = el("button", "pericolo", "Elimina");
  elimina.onclick = async () => {
    const ok = await finestra({ titolo: `Eliminare la scaletta «${s.nome}»?`, testo: "I canti restano nel canzoniere.", ok: "Elimina" });
    if (ok && await salvaScalette(l => l.filter(x => x.id !== s.id), `Elimina scaletta: ${s.nome}`)) {
      vista.aperta = null;
      if (scalettaAttiva === s.id) entraInScaletta(null);
      disegnaScalette();
    }
  };
  comandi.append(modifica, elimina);
  box.append(comandi);
}

async function modificaScaletta(s) {
  if (sito.attivo && !(await sbloccaModifiche())) return;
  vista.bozza = s ? { ...s, canti: [...s.canti] } : { id: null, nome: "", occasione: "", canti: [] };
  mostraScheda("scalette");
}

function disegnaEditorScaletta(box) {
  const b = vista.bozza;
  const nome = el("input", "campo");
  Object.assign(nome, { placeholder: "Nome (es. Ritiro di Pentecoste)", value: b.nome });
  nome.oninput = () => { b.nome = nome.value; };
  const occasione = el("input", "campo");
  Object.assign(occasione, { placeholder: "Occasione, data, note (facoltativo)", value: b.occasione || "" });
  occasione.oninput = () => { b.occasione = occasione.value; };
  box.append(el("h2", "nome-scaletta", b.id ? "Modifica scaletta" : "Nuova scaletta"), nome, occasione);

  // canti in ordine, con le frecce per spostarli
  const ol = el("ol", "canti-scaletta in-modifica");
  b.canti.forEach((id, i) => {
    const li = el("li");
    li.append(el("span", "titolo", titoloDi(id) || "(canto non più presente)"));
    const sposta = (d) => { [b.canti[i], b.canti[i + d]] = [b.canti[i + d], b.canti[i]]; disegnaScalette(); };
    const su = el("button", null, "↑");
    su.title = "Sposta su";
    su.disabled = i === 0;
    su.onclick = () => sposta(-1);
    const giu = el("button", null, "↓");
    giu.title = "Sposta giù";
    giu.disabled = i === b.canti.length - 1;
    giu.onclick = () => sposta(1);
    const togli = el("button", null, "×");
    togli.title = "Togli dalla scaletta";
    togli.onclick = () => { b.canti.splice(i, 1); disegnaScalette(); };
    li.append(su, giu, togli);
    ol.append(li);
  });
  if (!b.canti.length) box.append(el("p", "scalette-vuoto", "Aggiungi i canti cercandoli qui sotto."));
  box.append(ol);

  // aggiungere un canto: si cerca per titolo, parole o tag
  const cerca = el("input", "campo");
  Object.assign(cerca, { type: "search", placeholder: "Aggiungi un canto: cerca titolo, parole o tag…" });
  const proposte = el("ul", "proposte");
  cerca.oninput = () => {
    proposte.replaceChildren();
    const termini = normalizza(cerca.value.trim()).split(/\s+/).filter(Boolean);
    if (!termini.length) return;
    CANTI.filter(c => {
      const testo = c.ricerca + " " + normalizza(tagDi(c).join(" "));
      return termini.every(t => testo.includes(t));
    }).slice(0, 8).forEach(c => {
      const p = el("button", null, c.meta.title);
      if (b.canti.includes(c.id)) p.append(el("small", null, " (già nella scaletta)"));
      p.onclick = () => {
        b.canti.push(c.id);
        disegnaScalette();
        const nuovo = $("scalette").querySelector('input[type="search"]');
        if (nuovo) nuovo.focus();
      };
      const li = el("li");
      li.append(p);
      proposte.append(li);
    });
  };
  box.append(cerca, proposte);

  const comandi = el("div", "editor-comandi");
  const salvaB = el("button", "primario", sito.attivo ? "Salva online" : "Salva");
  salvaB.onclick = async () => {
    if (!b.nome.trim()) { avviso("Dai un nome alla scaletta"); nome.focus(); return; }
    const id = b.id || "s" + Date.now().toString(36);
    const nuova = { id, nome: b.nome.trim(), occasione: (b.occasione || "").trim(), canti: b.canti };
    const ok = await salvaScalette(l => {
      const i = l.findIndex(x => x.id === id);
      if (i >= 0) l[i] = nuova; else l.unshift(nuova);
      return l;
    }, `Scaletta: ${nuova.nome}`);
    if (ok) { vista.bozza = null; vista.aperta = id; disegnaScalette(); aggiornaNavigazione(); }
  };
  const annulla = el("button", null, "Annulla");
  annulla.onclick = () => { vista.bozza = null; disegnaScalette(); };
  comandi.append(salvaB, annulla);
  box.append(comandi);
}

/** Entra in una scaletta: sopra i suoi canti compaiono le frecce ‹ › (null per uscire). */
function entraInScaletta(id) {
  scalettaAttiva = id;
  try { id ? sessionStorage.setItem("scaletta-attiva", id) : sessionStorage.removeItem("scaletta-attiva"); }
  catch { /* resterà solo per questa pagina */ }
  aggiornaNavigazione();
}

function posizioneInScaletta() {
  const s = SCALETTE.find(x => x.id === scalettaAttiva);
  const i = s && stato.corrente ? s.canti.indexOf(stato.corrente.id) : -1;
  return { s, i };
}

function aggiornaNavigazione() {
  const { s, i } = posizioneInScaletta();
  $("naviga-scaletta").hidden = i < 0 || !!inModifica;
  if (i < 0) return;
  $("pos-scaletta").textContent = `${s.nome} · ${i + 1}/${s.canti.length}`;
  $("prec-scaletta").disabled = i === 0;
  $("succ-scaletta").disabled = i === s.canti.length - 1;
  if (vista.scheda === "scalette" && vista.aperta === s.id && !vista.bozza) disegnaScalette();
}

function vaiInScaletta(d) {
  const { s, i } = posizioneInScaletta();
  if (i < 0) return;
  const id = s.canti[i + d];
  if (id) location.hash = "#/" + id;
}

/* ===== Comandi ========================================================== */

function trasponi(delta) {
  const c = stato.corrente;
  if (!c) return;
  let n = (stato.trasp[c.id] || 0) + delta;
  if (n > 6) n -= 12;
  if (n < -6) n += 12;
  if (delta === 0 || n === 0) delete stato.trasp[c.id];
  else stato.trasp[c.id] = n;
  salva();
  disegna();
}

function applicaTema() {
  if (stato.tema) document.documentElement.dataset.theme = stato.tema;
  else delete document.documentElement.dataset.theme;
}

function apriDaIndirizzo() {
  if (!CANTI.length && sito.attivo && !$("blocco").hidden) return;
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  mostraCanto(CANTI.find(c => c.id === id) || null);
}

$("su").onclick = () => trasponi(1);
$("giu").onclick = () => trasponi(-1);
$("azzera").onclick = () => trasponi(0);
$("grande").onclick = () => { stato.dim = Math.min(stato.dim + 2, 34); salva(); disegna(); };
$("piccolo").onclick = () => { stato.dim = Math.max(stato.dim - 2, 13); salva(); disegna(); };
$("accordi").onclick = e => {
  stato.accordi = !stato.accordi;
  e.currentTarget.setAttribute("aria-pressed", stato.accordi);
  salva(); disegna();
};
$("notazione").onclick = () => { stato.int = !stato.int; salva(); disegna(); };
$("tema").value = stato.tema;
$("tema").onchange = e => { stato.tema = e.target.value; applicaTema(); salva(); };
$("scorri-via").onclick = () => (scorri.attivo ? fermaScorrimento() : avviaScorrimento());
$("scorri-lento").onclick = () => cambiaVelocita(-1);
$("scorri-veloce").onclick = () => cambiaVelocita(1);
$("esporta-tag").onclick = esportaTag;
$("azzera-filtri").onclick = () => { stato.filtri = []; salva(); aggiornaElenco(); };
$("indietro").onclick = () => { location.hash = ""; };
$("cerca").addEventListener("input", aggiornaElenco);
$("cerca").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const primo = $("risultati").querySelector("a");
    if (primo) location.hash = primo.getAttribute("href");
  }
});
document.addEventListener("keydown", e => {
  if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
  if (e.key === "/") { e.preventDefault(); $("cerca").focus(); }
  else if (e.key === "+" || e.key === "=") trasponi(1);
  else if (e.key === "-") trasponi(-1);
  else if (e.key === " " && stato.corrente && e.target.tagName !== "BUTTON") {
    e.preventDefault();
    scorri.attivo ? fermaScorrimento() : avviaScorrimento();
  }
  // nella scaletta: frecce (anche quelle dei pedali voltapagina) per il canto prima e dopo
  else if (!$("naviga-scaletta").hidden && ["ArrowRight", "PageDown"].includes(e.key) && !scorri.attivo) vaiInScaletta(1);
  else if (!$("naviga-scaletta").hidden && ["ArrowLeft", "PageUp"].includes(e.key) && !scorri.attivo) vaiInScaletta(-1);
});
$("scheda-canti").onclick = () => mostraScheda("canti");
$("scheda-scalette").onclick = () => mostraScheda("scalette");
$("prec-scaletta").onclick = () => vaiInScaletta(-1);
$("succ-scaletta").onclick = () => vaiInScaletta(1);
$("esci-scaletta").onclick = () => entraInScaletta(null);
window.addEventListener("hashchange", apriDaIndirizzo);

$("modifica-canto").onclick = () => modificaCanto(stato.corrente);
$("nuovo-canto").onclick = () => modificaCanto(null);
$("pm-testo").addEventListener("input", anteprima);
$("pm-salva").onclick = salvaModifica;
$("pm-annulla").onclick = () => {
  const originale = inModifica && inModifica.originale;
  chiudiModificaCanto();
  mostraCanto(originale || null);
};
$("pm-elimina").onclick = eliminaCanto;
$("blocco-form").onsubmit = async e => {
  e.preventDefault();
  const chiave = chiaveDalLink($("blocco-input").value);
  if (!chiave) { $("blocco-msg").textContent = "Incolla il link completo che hai ricevuto."; return; }
  if (await sblocca(chiave)) apriDaIndirizzo();
};

// sul telefono, all'apertura, prima la copertina (una volta per sessione)
$("entra").onclick = () => {
  document.body.classList.remove("in-copertina");
  try { sessionStorage.setItem("copertina-vista", "1"); } catch { /* niente */ }
};
$("torna-copertina").onclick = e => {
  e.preventDefault();
  document.body.classList.add("in-copertina");
  location.hash = "";
};

async function avvia() {
  let copertinaVista = false;
  try {
    copertinaVista = !!sessionStorage.getItem("copertina-vista");
    scalettaAttiva = sessionStorage.getItem("scaletta-attiva");
  } catch { /* niente */ }
  if (!copertinaVista && !location.hash.startsWith("#/")) document.body.classList.add("in-copertina");
  if (window.CANTI) {
    impostaCanti(window.CANTI);   // versione locale: canti in chiaro da canti.js
    await caricaScalette();
  } else {
    sito.attivo = true;
    document.body.classList.add("online");
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");
    const dalLink = chiaveDalLink(location.hash);
    if (dalLink) history.replaceState(null, "", location.pathname);  // la chiave non resta nell'indirizzo
    let salvata = null;
    try { salvata = localStorage.getItem("canti-chiave"); } catch { /* niente */ }
    const chiave = dalLink || salvata;
    if (!chiave) { mostraBlocco("Per aprire il canzoniere serve il link con la chiave."); return; }
    if (!(await sblocca(chiave))) return;
  }
  apriDaIndirizzo();
}

$("accordi").setAttribute("aria-pressed", stato.accordi);
applicaTema();
avvia();
