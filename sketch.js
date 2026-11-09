// Esercitazione 3 — I fiumi più lunghi del mondo

let table; // dati da rivers.csv
let rivers = []; // un oggetto per ogni fiume

let hovered = null; // fiume sotto il mouse
let selected = null; // fiume fissato con il click

// misure del layout
let margin = 48;
let sidebar = 300;
let colW = 54;
let maxH = 170; // altezza del fiume più lungo
let rowGap = 70;
let canvasH = 0;

let maxLength = 0;
let maxArea = 0;

let continents = [
  { key: "Asia", label: "ASIA" },
  { key: "Europe", label: "EUROPA" },
  { key: "Africa", label: "AFRICA" },
  { key: "North America", label: "AMERICA DEL NORD" },
  { key: "South America", label: "AMERICA DEL SUD" },
  { key: "Oceania", label: "OCEANIA" },
];

// classi: temperatura -> colore, portata -> spessore, affluenti -> rami
let tempClasses = [
  { max: 0, label: "sotto 0°", r: 29, g: 78, b: 137 },
  { max: 10, label: "0–10°", r: 95, g: 140, b: 180 },
  { max: 18, label: "10–18°", r: 150, g: 175, b: 165 },
  { max: 24, label: "18–24°", r: 235, g: 150, b: 100 },
  { max: 100, label: "oltre 24°", r: 215, g: 70, b: 40 },
];

let dischargeClasses = [
  { max: 1000, label: "fino a 1.000", weight: 1.5 },
  { max: 5000, label: "1.000–5.000", weight: 3 },
  { max: 15000, label: "5.000–15.000", weight: 4.5 },
  { max: 50000, label: "15.000–50.000", weight: 6.5 },
  { max: 1000000, label: "oltre 50.000", weight: 9 },
];

let tribClasses = [
  { max: 10, label: "fino a 10" },
  { max: 30, label: "11–30" },
  { max: 100, label: "31–100" },
  { max: 500, label: "101–500" },
  { max: 100000, label: "oltre 500" },
];

// restituisce l'indice della classe in cui cade il valore
function findClass(classes, value) {
  for (let i = 0; i < classes.length; i++) {
    if (value <= classes[i].max) {
      return i;
    }
  }
  return classes.length - 1;
}

// carico i dati e creo un oggetto per ogni riga
async function setup() {
  table = await loadTable("rivers.csv", ",", "header");

  for (let i = 0; i < table.getRowCount(); i++) {
    let river = {
      rank: table.getNum(i, "id"),
      name: table.get(i, "name"),
      shortName: table.get(i, "short_name"),
      nCountries: table.getNum(i, "n_countries"),
      length: table.getNum(i, "length"),
      area: table.getNum(i, "area"),
      discharge: table.getNum(i, "discharge"),
      outflow: table.get(i, "outflow"),
      continent: table.get(i, "continent"),
      tributaries: table.getNum(i, "tributaries"),
      minT: table.getNum(i, "min_temp"),
      maxT: table.getNum(i, "max_temp"),
      avgT: table.getNum(i, "avg_temp"),
      seed: i * 1.7,
    };
    river.tempClass = findClass(tempClasses, river.avgT);
    river.disClass = findClass(dischargeClasses, river.discharge);
    river.branches = findClass(tribClasses, river.tributaries) + 1;

    rivers.push(river);
    maxLength = max(maxLength, river.length);
    maxArea = max(maxArea, river.area);
  }

  computeLayout();
  createCanvas(windowWidth, canvasH);
}

// posizione di ogni fiume, raggruppati per continente

function computeLayout() {
  let left = sidebar + margin;
  let perRow = floor((windowWidth - left - margin) / colW);
  let y = margin + 40;

  for (let c = 0; c < continents.length; c++) {
    continents[c].labelY = y;
    continents[c].count = 0;
    y = y + 40;

    let col = 0;
    let rowH = 0;
    for (let i = 0; i < rivers.length; i++) {
      let r = rivers[i];
      if (r.continent == continents[c].key) {
        if (col == perRow) {
          col = 0;
          y = y + rowH + rowGap;
          rowH = 0;
        }
        r.h = map(r.length, 0, maxLength, 0, maxH);
        r.x = left + col * colW + colW / 2;
        r.y = y;
        rowH = max(rowH, r.h);
        col = col + 1;
        continents[c].count = continents[c].count + 1;
      }
    }
    y = y + rowH + rowGap + 16;
  }
  canvasH = max(windowHeight, y + margin);
}

// area del cerchio proporzionale all'area del bacino
function basinRadius(area) {
  return Math.sqrt(area / maxArea) * 26;
}

// ---------- disegno ----------

function draw() {
  background("#f4f2ee");

  hovered = null;
  for (let i = 0; i < rivers.length; i++) {
    if (isMouseOverRiver(rivers[i])) {
      hovered = rivers[i];
    }
  }

  let focus = hovered;
  if (focus == null) {
    focus = selected;
  }

  drawLegend();

  for (let c = 0; c < continents.length; c++) {
    drawContinentLabel(continents[c]);
  }

  for (let i = 0; i < rivers.length; i++) {
    let r = rivers[i];
    let alpha = 255;
    if (focus != null && r != focus) {
      alpha = 55;
    }
    drawRiver(r, r.x, r.y, 1, alpha);
    drawName(r, alpha);
  }

  if (focus != null) {
    drawBox(focus);
    drawTooltip(focus);
  }
}

function drawContinentLabel(c) {
  let left = sidebar + margin;
  noStroke();
  fill(22);
  textAlign(LEFT, TOP);
  textSize(14);
  text(c.label, left, c.labelY);
  fill(140);
  textSize(12);
  text(c.count + " fiumi", left + 180, c.labelY + 2);
  stroke(210);
  strokeWeight(1);
  line(left, c.labelY + 22, left + 240, c.labelY + 22);
}

// disegna un fiume con la sorgente in (x, y)
function drawRiver(r, x, y, s, alpha) {
  let tc = tempClasses[r.tempClass];

  push();
  translate(x, y);
  scale(s);

  // bacino alla foce
  let rb = basinRadius(r.area);
  fill(22, 22, 26, alpha * 0.08);
  stroke(22, 22, 26, alpha * 0.35);
  strokeWeight(0.7);
  circle(0, r.h, rb * 2);

  // rami: affluenti
  stroke(tc.r, tc.g, tc.b, alpha);
  strokeWeight(1.3);
  for (let i = 0; i < r.branches; i++) {
    let by = ((i + 1) / (r.branches + 1)) * r.h;
    let bx = meander(r, by);
    if (i % 2 == 0) {
      line(bx, by, bx + 11, by - 9);
    } else {
      line(bx, by, bx - 11, by - 9);
    }
  }

  // corso principale, lo spessore dipende dalla portata
  noFill();
  strokeWeight(dischargeClasses[r.disClass].weight);
  beginShape();
  for (let yy = 0; yy <= r.h; yy = yy + 2) {
    vertex(meander(r, yy), yy);
  }
  endShape();

  noStroke();
  fill(tc.r, tc.g, tc.b, alpha);
  circle(meander(r, 0), 0, 3);
  pop();
}

// fa serpeggiare la linea sommando due onde
function meander(r, yy) {
  return sin(yy * 0.09 + r.seed) * 4 + sin(yy * 0.031 + r.seed * 2) * 3;
}

function drawName(r, alpha) {
  noStroke();
  fill(22, 22, 26, alpha);
  textAlign(CENTER, TOP);
  textSize(9.5);
  let rb = max(basinRadius(r.area), 6);
  text(r.shortName, r.x, r.y + r.h + rb + 4);
}

function drawBox(r) {
  noFill();
  stroke(22);
  strokeWeight(1);
  rect(r.x - colW / 2 + 2, r.y - 10, colW - 4, r.h + 50, 4);
}

// hover: il mouse è dentro la colonna del fiume
function isMouseOverRiver(r) {
  return (
    mouseX > r.x - colW / 2 &&
    mouseX < r.x + colW / 2 &&
    mouseY > r.y - 10 &&
    mouseY < r.y + r.h + 40
  );
}

// click su un fiume per fissarlo, fuori per deselezionare
function mousePressed() {
  selected = null;
  for (let i = 0; i < rivers.length; i++) {
    if (isMouseOverRiver(rivers[i])) {
      selected = rivers[i];
    }
  }
}

// scheda con i dettagli del fiume
function drawTooltip(r) {
  let w = 370;
  let h = 170;
  let x = r.x + colW / 2 + 8;
  if (x + w > width - 10) {
    x = r.x - colW / 2 - 8 - w;
  }
  let y = r.y;

  noStroke();
  fill(22, 22, 26, 240);
  rect(x, y, w, h, 4);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(13);
  text("#" + r.rank + "  " + r.shortName, x + 12, y + 12);

  fill(190);
  textSize(10.5);
  text(r.name, x + 12, y + 32);

  let labels =
    "Lunghezza\nPortata media\nBacino\nAffluenti\nTemperatura\nPaesi attraversati\nFoce";
  let values =
    r.length + " km\n" +
    r.discharge + " m³/s\n" +
    r.area + " km²\n" +
    r.tributaries + "\n" +
    r.minT + "° / " + r.maxT + "° (media " + r.avgT + "°)\n" +
    r.nCountries + "\n" +
    r.outflow;

  textSize(11.5);
  fill(190);
  text(labels, x + 12, y + 56);
  fill(255);
  textAlign(RIGHT, TOP);
  text(values, x + w - 12, y + 56);
}

// titolo e legenda nella colonna di sinistra
function drawLegend() {
  let x = margin;
  let y = margin;

  noStroke();
  fill(22);
  textAlign(LEFT, TOP);
  textSize(24);
  text("I FIUMI PIÙ LUNGHI\nDEL MONDO", x, y);
  y = y + 70;

  textSize(13);
  text(
    "Ogni linea è uno dei " + rivers.length + " sistemi fluviali più\n" +
    "lunghi del mondo: scende dalla sorgente\n" +
    "alla foce. I fiumi sono divisi per\n" +
    "continente e ordinati dal più lungo.",
    x, y
  );
  y = y + 84;

  fill(140);
  textSize(11);
  text("LEGENDA", x, y);
  y = y + 22;

  fill(22);
  textSize(12);
  text("Lunghezza della linea: km", x, y);
  y = y + 22;
  let lens = [1000, 3000, 6650];
  for (let i = 0; i < lens.length; i++) {
    let demo = makeDemo(map(lens[i], 0, maxLength, 0, maxH), 2, 1, 0);
    let lx = x + 10 + i * 72;
    drawRiver(demo, lx, y, 0.4, 255);
    noStroke();
    fill(140);
    textAlign(CENTER, TOP);
    textSize(10.5);
    text(lens[i] + " km", lx, y + maxH * 0.4 + 10);
  }
  textAlign(LEFT, TOP);
  y = y + maxH * 0.4 + 38;

  fill(22);
  textSize(12);
  text("Spessore: portata media (m³/s)", x, y);
  y = y + 20;
  for (let i = 0; i < dischargeClasses.length; i++) {
    stroke(120);
    strokeWeight(dischargeClasses[i].weight);
    line(x + 4, y + 6 + i * 18, x + 40, y + 6 + i * 18);
    noStroke();
    fill(140);
    textSize(10.5);
    text(dischargeClasses[i].label, x + 52, y + i * 18);
  }
  y = y + 100;

  fill(22);
  textSize(12);
  text("Colore: temperatura media", x, y);
  y = y + 20;
  for (let i = 0; i < tempClasses.length; i++) {
    let tc = tempClasses[i];
    fill(tc.r, tc.g, tc.b);
    rect(x + i * 48, y, 44, 10);
    fill(140);
    textSize(9.5);
    textAlign(CENTER, TOP);
    text(tc.label, x + i * 48 + 22, y + 14);
  }
  textAlign(LEFT, TOP);
  y = y + 40;

  fill(22);
  textSize(12);
  text("Rami: numero di affluenti", x, y);
  y = y + 18;
  for (let i = 0; i < tribClasses.length; i++) {
    let lx = x + 10 + i * 50;
    drawRiver(makeDemo(30, 1, i + 1, 0), lx, y + 10, 1, 255);
    noStroke();
    fill(140);
    textAlign(CENTER, TOP);
    textSize(9.5);
    text(tribClasses[i].label, lx, y + 46);
  }
  textAlign(LEFT, TOP);
  y = y + 66;

  drawRiver(makeDemo(14, 1, 0, maxArea * 0.5), x + 18, y, 1, 255);
  noStroke();
  fill(22);
  textSize(12);
  text("Cerchio alla foce: area\ndel bacino idrografico (km²)", x + 50, y + 4);
  y = y + 50;

  fill(140);
  textSize(11);
  text("Passa sopra un fiume per i dettagli,\nclicca per fissarlo.", x, y);
}

// fiume finto per gli esempi della legenda
function makeDemo(h, disClass, branches, area) {
  return {
    h: h,
    disClass: disClass,
    branches: branches,
    area: area,
    tempClass: 2,
    seed: 1,
  };
}
