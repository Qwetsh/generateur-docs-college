/* global jspdf, logoPNG, setFont, wrappedText, formatDate, showPreview */
/* Demande de sortie / sejour — logic + PDF */

// ── State ──
let importedEleves = [];

// ── CSV Import ──
document.getElementById('dem-csv-file').addEventListener('change', function (e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (ev) {
    var text = ev.target.result;
    var lines = text.split('\n').filter(function (l) { return l.trim(); });
    if (lines.length < 2) return;

    // Parse header to find columns
    var header = lines[0].split(';').map(function (h) { return h.replace(/"/g, '').trim(); });
    var colNom = header.indexOf('Élèves') !== -1 ? header.indexOf('Élèves') : 0;
    var colSexe = header.indexOf('Sexe') !== -1 ? header.indexOf('Sexe') : 3;

    importedEleves = [];
    for (var i = 1; i < lines.length; i++) {
      var cols = lines[i].split(';').map(function (c) { return c.replace(/"/g, '').trim(); });
      if (!cols[colNom]) continue;
      var fullName = cols[colNom];
      var parts = fullName.split(' ');
      // First word(s) in uppercase = NOM, rest = Prenom
      var nom = [], prenom = [];
      for (var j = 0; j < parts.length; j++) {
        if (parts[j] === parts[j].toUpperCase() && parts[j].length > 1) {
          nom.push(parts[j]);
        } else {
          prenom.push(parts[j]);
        }
      }
      var sexe = cols[colSexe] || '';
      if (sexe === 'Féminin' || sexe === 'F\u00e9minin') sexe = 'F';
      else if (sexe === 'Masculin') sexe = 'M';

      importedEleves.push({
        nom: nom.join(' ') || fullName,
        prenom: prenom.join(' ') || '',
        sexe: sexe
      });
    }

    // Display editable table
    renderElevesTable(importedEleves);
    document.getElementById('dem-eleves-preview').classList.remove('hidden');
  };
  reader.readAsText(file, 'utf-8');
});

// ── Render editable eleves table ──
function renderElevesTable(eleves) {
  var tbody = document.querySelector('#dem-eleves-table tbody');
  tbody.innerHTML = '';
  eleves.forEach(function (el) { addEleveRow(tbody, el); });
  updateElevesCount();
}

function addEleveRow(tbody, el) {
  var tr = document.createElement('tr');
  tr.innerHTML = '<td class="eleve-num"></td>'
    + '<td><input type="text" class="eleve-nom" value="' + (el.nom || '') + '"></td>'
    + '<td><input type="text" class="eleve-prenom" value="' + (el.prenom || '') + '"></td>'
    + '<td><select class="eleve-sexe"><option value="M"' + (el.sexe === 'M' ? ' selected' : '') + '>M</option><option value="F"' + (el.sexe === 'F' ? ' selected' : '') + '>F</option></select></td>'
    + '<td><input type="tel" class="eleve-tel" value="' + (el.tel || '') + '" placeholder="06 ..."></td>'
    + '<td><button type="button" class="btn-remove" style="padding:0.15rem 0.4rem;font-size:0.75rem">✕</button></td>';
  tr.querySelector('.btn-remove').addEventListener('click', function () {
    tr.remove();
    updateElevesCount();
  });
  tbody.appendChild(tr);
  updateElevesCount();
}

function updateElevesCount() {
  var count = document.querySelectorAll('#dem-eleves-table tbody tr').length;
  document.getElementById('dem-eleves-count').textContent = count;
  // Update row numbers
  document.querySelectorAll('#dem-eleves-table tbody tr').forEach(function (tr, i) {
    tr.querySelector('.eleve-num').textContent = i + 1;
  });
}

function collectElevesFromTable() {
  var eleves = [];
  document.querySelectorAll('#dem-eleves-table tbody tr').forEach(function (tr) {
    var nom = tr.querySelector('.eleve-nom').value.trim();
    if (nom) {
      eleves.push({
        nom: nom,
        prenom: tr.querySelector('.eleve-prenom').value.trim(),
        sexe: tr.querySelector('.eleve-sexe').value,
        tel: tr.querySelector('.eleve-tel').value.trim()
      });
    }
  });
  return eleves;
}

document.getElementById('dem-add-eleve').addEventListener('click', function () {
  var tbody = document.querySelector('#dem-eleves-table tbody');
  addEleveRow(tbody, {});
  document.getElementById('dem-eleves-preview').classList.remove('hidden');
});

// ── Sejour toggle ──
document.querySelectorAll('input[name="dem-type"]').forEach(function (r) {
  r.addEventListener('change', function () {
    document.getElementById('dem-sejour-details').style.display = r.value === 'sejour' ? 'flex' : 'none';
  });
});

// ── Add classe row ──
document.getElementById('dem-add-classe').addEventListener('click', function () {
  var list = document.getElementById('dem-classes-list');
  var row = document.createElement('div');
  row.className = 'form-row dem-classe-row';
  row.innerHTML = '<div class="form-group"><input type="text" class="dem-classe-nom" placeholder="Ex: 5e4"></div>'
    + '<div class="form-group"><input type="number" class="dem-classe-effectif" min="0" placeholder="30"></div>'
    + '<div class="form-group"><input type="number" class="dem-classe-participants" min="0" placeholder="28"></div>'
    + '<div class="form-group" style="flex:0;align-self:flex-end"><button type="button" class="btn-remove">✕</button></div>';
  row.querySelector('.btn-remove').addEventListener('click', function () { row.remove(); });
  list.appendChild(row);
});

// ── Add accompagnateur row ──
document.getElementById('dem-add-accomp').addEventListener('click', function () {
  var list = document.getElementById('dem-accompagnateurs-list');
  var row = document.createElement('div');
  row.className = 'form-row dem-accomp-row';
  row.innerHTML = '<div class="form-group"><input type="text" class="dem-accomp-nom" placeholder="Nom Prenom"></div>'
    + '<div class="form-group"><input type="text" class="dem-accomp-qualite" placeholder="Enseignant, parent..."></div>'
    + '<div class="form-group"><input type="tel" class="dem-accomp-tel" placeholder="06 ..."></div>'
    + '<div class="form-group" style="flex:0;align-self:flex-end"><button type="button" class="btn-remove">✕</button></div>';
  row.querySelector('.btn-remove').addEventListener('click', function () { row.remove(); });
  list.appendChild(row);
});

// ── Budget auto-calc ──
function recalcBudget() {
  var nb = parseFloat(document.getElementById('dem-budget-nb-familles').value) || 0;
  var montant = parseFloat(document.getElementById('dem-budget-montant-famille').value) || 0;
  var totalFam = nb * montant;
  document.getElementById('dem-budget-total-familles').value = totalFam.toFixed(2);

  var recettes = totalFam
    + (parseFloat(document.getElementById('dem-budget-etablissement').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-dons').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-sub-commune').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-sub-dept').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-sub-region').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-sub-etat').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-sub-autres').value) || 0);

  var depenses =
    (parseFloat(document.getElementById('dem-budget-dep-bus').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-dep-train').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-dep-avion').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-dep-transport-autre').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-dep-hebergement').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-dep-repas').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-dep-activites').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-dep-materiel').value) || 0)
    + (parseFloat(document.getElementById('dem-budget-dep-divers').value) || 0);

  document.getElementById('dem-budget-total-recettes').textContent = recettes.toFixed(2);
  document.getElementById('dem-budget-total-depenses').textContent = depenses.toFixed(2);

  var balance = recettes - depenses;
  var balEl = document.getElementById('dem-budget-balance');
  if (recettes === 0 && depenses === 0) {
    balEl.textContent = '';
    balEl.style.background = '';
  } else if (balance >= 0) {
    balEl.textContent = 'Solde : +' + balance.toFixed(2) + ' EUR';
    balEl.style.background = '#e8f5e9';
    balEl.style.color = '#2e7d32';
  } else {
    balEl.textContent = 'Solde : ' + balance.toFixed(2) + ' EUR';
    balEl.style.background = '#ffebee';
    balEl.style.color = '#c62828';
  }
}

document.querySelectorAll('.budget-input').forEach(function (inp) {
  inp.addEventListener('input', recalcBudget);
});

// ── Collect data ──
function collectDemandeData() {
  function v(id) { return document.getElementById(id).value.trim(); }
  function n(id) { return parseFloat(document.getElementById(id).value) || 0; }
  function radio(name) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }

  var classes = [];
  document.querySelectorAll('.dem-classe-row').forEach(function (row) {
    var nom = row.querySelector('.dem-classe-nom').value.trim();
    if (nom) {
      classes.push({
        nom: nom,
        effectif: row.querySelector('.dem-classe-effectif').value || '',
        participants: row.querySelector('.dem-classe-participants').value || ''
      });
    }
  });

  var accompagnateurs = [];
  document.querySelectorAll('.dem-accomp-row').forEach(function (row) {
    var nom = row.querySelector('.dem-accomp-nom').value.trim();
    if (nom) {
      accompagnateurs.push({
        nom: nom,
        qualite: row.querySelector('.dem-accomp-qualite').value.trim(),
        tel: row.querySelector('.dem-accomp-tel').value.trim()
      });
    }
  });

  var domaines = [];
  if (document.getElementById('dem-dom-arts').checked) domaines.push('Arts / Culture');
  if (document.getElementById('dem-dom-orientation').checked) domaines.push('Orientation');
  if (document.getElementById('dem-dom-scientifique').checked) domaines.push('Scientifique');
  if (document.getElementById('dem-dom-linguistique').checked) domaines.push('Linguistique');
  if (document.getElementById('dem-dom-technique').checked) domaines.push('Technique / Technologique');
  if (document.getElementById('dem-dom-sportif').checked) domaines.push('Sportif');
  if (document.getElementById('dem-dom-appariement').checked) domaines.push('Appariement');
  if (document.getElementById('dem-dom-autre').checked) domaines.push('Autre');

  return {
    pays: radio('dem-pays'),
    departement: v('dem-departement'),
    adresse: v('dem-adresse'),
    nature: radio('dem-nature'),
    type: radio('dem-type'),
    reciprocite: radio('dem-reciprocite'),
    hebergement: v('dem-hebergement'),
    transport: v('dem-transport'),
    transportPrecision: v('dem-transport-precision'),
    responsable: v('dem-responsable'),
    qualite: v('dem-qualite'),
    telUrgence: v('dem-tel-urgence'),
    telChef: v('dem-tel-chef'),
    dateDepart: formatDate(v('dem-date-depart')),
    heureDepart: v('dem-heure-depart'),
    dateRetour: formatDate(v('dem-date-retour')),
    heureRetour: v('dem-heure-retour'),
    lieuDepart: v('dem-lieu-depart'),
    lieuRetour: v('dem-lieu-retour'),
    nbJournees: v('dem-nb-journees'),
    classes: classes,
    domaines: domaines,
    disciplines: v('dem-disciplines'),
    objectifs: v('dem-objectifs'),
    liens: v('dem-liens'),
    activites: v('dem-activites'),
    travauxPrepa: v('dem-travaux-prepa'),
    restitution: v('dem-restitution'),
    nonParticipants: v('dem-non-participants'),
    datePrepa: formatDate(v('dem-date-prepa')),
    dateBilan: formatDate(v('dem-date-bilan')),
    budget: {
      nbFamilles: n('dem-budget-nb-familles'),
      montantFamille: n('dem-budget-montant-famille'),
      etablissement: n('dem-budget-etablissement'),
      dons: n('dem-budget-dons'),
      subCommune: n('dem-budget-sub-commune'),
      subDept: n('dem-budget-sub-dept'),
      subRegion: n('dem-budget-sub-region'),
      subEtat: n('dem-budget-sub-etat'),
      subAutres: n('dem-budget-sub-autres'),
      depBus: n('dem-budget-dep-bus'),
      depTrain: n('dem-budget-dep-train'),
      depAvion: n('dem-budget-dep-avion'),
      depTransportAutre: n('dem-budget-dep-transport-autre'),
      depHebergement: n('dem-budget-dep-hebergement'),
      depRepas: n('dem-budget-dep-repas'),
      depActivites: n('dem-budget-dep-activites'),
      depMateriel: n('dem-budget-dep-materiel'),
      depDivers: n('dem-budget-dep-divers'),
    },
    accompagnateurs: accompagnateurs,
    eleves: collectElevesFromTable(),
    elevesClasse: v('dem-eleves-classe'),
    incidences: v('dem-incidences'),
  };
}

// ── PDF Generation ──
function buildDemandePDF(data) {
  var jsPDF = jspdf.jsPDF;
  var doc = new jsPDF({ unit: 'mm', format: 'a4' });
  var W = 210, H = 297, ML = 15, MR = 15, CW = W - ML - MR;
  var BLUE = [0, 0, 145], BLACK = [0, 0, 0], GRAY = [100, 100, 100];
  var LIGHT_BG = [245, 245, 254];
  var y = 10;

  function checkPage(needed) {
    if (y + needed > H - 15) { doc.addPage(); y = 15; }
    return y;
  }

  function label(text, x, yy) { setFont(doc, 'bold', 8, BLUE); doc.text(text, x, yy); }
  function value(text, x, yy) { setFont(doc, 'normal', 8, BLACK); doc.text(text || '', x, yy); }
  function sectionHead(title) {
    y = checkPage(12);
    doc.setFillColor(...BLUE);
    doc.roundedRect(ML, y, CW, 7, 1, 1, 'F');
    setFont(doc, 'bold', 9, [255, 255, 255]);
    doc.text(title, ML + 3, y + 5);
    y += 10;
  }

  // ═══ PAGE 1 ═══
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 6, 'F');

  if (logoPNG) doc.addImage(logoPNG, 'PNG', ML, 8, 20, 20);

  setFont(doc, 'bold', 14, BLUE);
  doc.text('SORTIES ET SEJOURS COLLECTIFS', W / 2, 16, { align: 'center' });
  setFont(doc, 'bold', 11, BLUE);
  doc.text("D'ELEVES DU SECOND DEGRE", W / 2, 22, { align: 'center' });
  setFont(doc, 'normal', 7, GRAY);
  doc.text('College Pierre Mendes France - 57140 WOIPPY', W / 2, 28, { align: 'center' });

  y = 34;

  // Destination
  sectionHead('DESTINATION');
  label(data.pays === 'france' ? 'France, departement :' : 'Etranger, pays :', ML, y);
  value(data.departement, ML + 40, y);
  y += 5;
  label('Adresse du lieu :', ML, y); value(data.adresse, ML + 35, y);
  y += 7;

  // Type & Transport
  sectionHead('TYPE DE DEPLACEMENT & TRANSPORT');
  label('Nature :', ML, y); value(data.nature === 'obligatoire' ? 'Obligatoire' : 'Facultatif', ML + 20, y);
  label('Type :', ML + 60, y); value(data.type === 'sortie' ? 'Sortie (sans nuitee)' : 'Sejour avec nuitee', ML + 75, y);
  y += 5;
  if (data.type === 'sejour') {
    label('Reciprocite :', ML, y); value(data.reciprocite === 'avec' ? 'Avec' : 'Sans', ML + 30, y);
    label('Hebergement :', ML + 60, y); value(data.hebergement, ML + 85, y);
    y += 5;
  }
  label('Transport :', ML, y); value(data.transport + (data.transportPrecision ? ' (' + data.transportPrecision + ')' : ''), ML + 25, y);
  y += 7;

  // Responsable
  sectionHead('RESPONSABLE DE LA SORTIE');
  label('Nom prenom :', ML, y); value(data.responsable, ML + 28, y);
  label('Qualite :', ML + 90, y); value(data.qualite, ML + 108, y);
  y += 5;
  label('Tel. urgence :', ML, y); value(data.telUrgence, ML + 28, y);
  label('Tel. chef etab. :', ML + 90, y); value(data.telChef, ML + 115, y);
  y += 7;

  // Deplacement
  sectionHead('RENSEIGNEMENTS DU DEPLACEMENT');
  label('Depart :', ML, y); value(data.dateDepart + ' a ' + (data.heureDepart || '...'), ML + 20, y);
  label('Lieu :', ML + 80, y); value(data.lieuDepart, ML + 92, y);
  y += 5;
  label('Retour :', ML, y); value(data.dateRetour + ' a ' + (data.heureRetour || '...'), ML + 20, y);
  label('Lieu :', ML + 80, y); value(data.lieuRetour, ML + 92, y);
  y += 5;
  label('Nb demi-journee(s) sur temps scolaire :', ML, y); value(data.nbJournees, ML + 65, y);
  y += 7;

  // Composition du groupe
  sectionHead('COMPOSITION DU GROUPE');
  if (data.classes.length > 0) {
    // Table header
    doc.setFillColor(...LIGHT_BG);
    doc.rect(ML, y - 3, CW, 6, 'F');
    setFont(doc, 'bold', 7, BLUE);
    doc.text('Classe', ML + 2, y);
    doc.text('Effectif', ML + 50, y);
    doc.text('Participants', ML + 80, y);
    y += 5;
    var totalEff = 0, totalPart = 0;
    data.classes.forEach(function (c) {
      setFont(doc, 'normal', 8, BLACK);
      doc.text(c.nom, ML + 2, y);
      doc.text(c.effectif + '', ML + 50, y);
      doc.text(c.participants + '', ML + 80, y);
      totalEff += parseInt(c.effectif) || 0;
      totalPart += parseInt(c.participants) || 0;
      y += 4;
    });
    setFont(doc, 'bold', 8, BLUE);
    doc.text('TOTAL', ML + 2, y);
    doc.text(totalEff + '', ML + 50, y);
    doc.text(totalPart + '', ML + 80, y);
    y += 7;
  }

  // Contenu pedagogique
  y = checkPage(50);
  sectionHead('CONTENU PEDAGOGIQUE');
  label('Domaines :', ML, y);
  value(data.domaines.join(', ') || '(aucun)', ML + 22, y);
  y += 5;
  label('Disciplines :', ML, y); value(data.disciplines, ML + 25, y);
  y += 5;

  label('Objectifs :', ML, y);
  setFont(doc, 'normal', 8, BLACK);
  y = wrappedText(doc, data.objectifs || '', ML + 22, y, CW - 22, 3.5);
  y += 2;

  label('Liens projet etab. :', ML, y);
  setFont(doc, 'normal', 8, BLACK);
  y = wrappedText(doc, data.liens || '', ML + 35, y, CW - 35, 3.5);
  y += 2;

  label('Activites :', ML, y);
  setFont(doc, 'normal', 8, BLACK);
  y = wrappedText(doc, data.activites || '', ML + 22, y, CW - 22, 3.5);
  y += 2;

  label('Travaux prepa. :', ML, y);
  setFont(doc, 'normal', 8, BLACK);
  y = wrappedText(doc, data.travauxPrepa || '', ML + 30, y, CW - 30, 3.5);
  y += 2;

  label('Restitution :', ML, y);
  setFont(doc, 'normal', 8, BLACK);
  y = wrappedText(doc, data.restitution || '', ML + 25, y, CW - 25, 3.5);
  y += 2;

  label('Eleves non-participants :', ML, y);
  setFont(doc, 'normal', 8, BLACK);
  y = wrappedText(doc, data.nonParticipants || '', ML + 42, y, CW - 42, 3.5);
  y += 4;

  label('Prepa pedagogique :', ML, y); value(data.datePrepa || '...', ML + 38, y);
  label('Bilan pedagogique :', ML + 90, y); value(data.dateBilan || '...', ML + 125, y);
  y += 10;

  // Signature
  y = checkPage(25);
  setFont(doc, 'normal', 8, BLACK);
  doc.text('Date de la demande : ___ / ___ / 20___', ML, y);
  doc.text('Signature du professeur organisateur :', ML + 90, y);
  y += 12;
  label('Decision du Chef d\'etablissement : le ___ / ___ / 20___', ML, y);
  // Checkboxes
  doc.rect(ML + 95, y - 3, 3, 3); value('Avis favorable', ML + 100, y);
  doc.rect(ML + 130, y - 3, 3, 3); value('Avis defavorable', ML + 135, y);
  y += 8;
  setFont(doc, 'normal', 8, BLACK);
  doc.text('Signature du Chef d\'etablissement et Cachet :', ML, y);

  // ═══ ANNEXE 1 : BUDGET ═══
  doc.addPage();
  y = 15;
  setFont(doc, 'bold', 14, BLUE);
  doc.text('Annexe 1 : Budget previsionnel', W / 2, y, { align: 'center' });
  y += 10;

  var b = data.budget;
  var halfW = (CW - 6) / 2;

  // Recettes
  function budgetTable(title, items, x, startY) {
    doc.setFillColor(...BLUE);
    doc.roundedRect(x, startY, halfW, 6, 1, 1, 'F');
    setFont(doc, 'bold', 8, [255, 255, 255]);
    doc.text(title, x + 2, startY + 4);
    var ty = startY + 9;
    var total = 0;
    items.forEach(function (item) {
      setFont(doc, 'normal', 7.5, BLACK);
      doc.text(item.label, x + 2, ty);
      doc.text(item.value.toFixed(2) + ' EUR', x + halfW - 2, ty, { align: 'right' });
      total += item.value;
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.1);
      doc.line(x, ty + 1.5, x + halfW, ty + 1.5);
      ty += 5;
    });
    doc.setFillColor(...LIGHT_BG);
    doc.rect(x, ty, halfW, 6, 'F');
    setFont(doc, 'bold', 8, BLUE);
    doc.text('TOTAL', x + 2, ty + 4);
    doc.text(total.toFixed(2) + ' EUR', x + halfW - 2, ty + 4, { align: 'right' });
    return ty + 8;
  }

  var recettesItems = [
    { label: 'Participation familles (' + b.nbFamilles + ' x ' + b.montantFamille.toFixed(2) + ')', value: b.nbFamilles * b.montantFamille },
    { label: 'Etablissement', value: b.etablissement },
    { label: 'Dons (FSE, MDL, associations)', value: b.dons },
    { label: 'Commune / Com. de communes', value: b.subCommune },
    { label: 'Conseil Departemental', value: b.subDept },
    { label: 'Conseil Regional', value: b.subRegion },
    { label: 'Etat', value: b.subEtat },
    { label: 'Autres subventions', value: b.subAutres },
  ];

  var depensesItems = [
    { label: 'Bus', value: b.depBus },
    { label: 'Train', value: b.depTrain },
    { label: 'Avion', value: b.depAvion },
    { label: 'Autres transport', value: b.depTransportAutre },
    { label: 'Hebergement', value: b.depHebergement },
    { label: 'Repas', value: b.depRepas },
    { label: 'Activites / Visites', value: b.depActivites },
    { label: 'Materiel pedagogique', value: b.depMateriel },
    { label: 'Divers', value: b.depDivers },
  ];

  var endR = budgetTable('RECETTES', recettesItems, ML, y);
  var endD = budgetTable('DEPENSES', depensesItems, ML + halfW + 6, y);
  y = Math.max(endR, endD);

  // ═══ ANNEXE 2 : LISTES ═══
  doc.addPage();
  y = 15;
  setFont(doc, 'bold', 14, BLUE);
  doc.text('Annexe 2 : Listes nominatives', W / 2, y, { align: 'center' });
  y += 10;

  // Accompagnateurs
  sectionHead('ACCOMPAGNATEURS');
  doc.setFillColor(...LIGHT_BG);
  doc.rect(ML, y - 3, CW, 5, 'F');
  setFont(doc, 'bold', 7, BLUE);
  doc.text('N', ML + 2, y); doc.text('Nom et Prenom', ML + 10, y);
  doc.text('Qualite', ML + 80, y); doc.text('Telephone', ML + 140, y);
  y += 4;

  for (var ai = 0; ai < Math.max(data.accompagnateurs.length, 4); ai++) {
    var a = data.accompagnateurs[ai] || {};
    setFont(doc, 'normal', 7.5, BLACK);
    doc.text((ai + 1) + '', ML + 2, y);
    doc.text(a.nom || '', ML + 10, y);
    doc.text(a.qualite || '', ML + 80, y);
    doc.text(a.tel || '', ML + 140, y);
    doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.1);
    doc.line(ML, y + 1.5, ML + CW, y + 1.5);
    y += 4;
  }
  y += 5;

  // Eleves
  sectionHead('ELEVES - Classe(s) : ' + (data.elevesClasse || '___'));
  doc.setFillColor(...LIGHT_BG);
  doc.rect(ML, y - 3, CW, 5, 'F');
  setFont(doc, 'bold', 7, BLUE);
  doc.text('N', ML + 2, y); doc.text('Nom', ML + 10, y);
  doc.text('Prenom', ML + 60, y); doc.text('Sexe', ML + 110, y);
  doc.text('Tel. urgence', ML + 130, y);
  y += 4;

  var eleves = data.eleves.length > 0 ? data.eleves : [];
  var maxRows = Math.max(eleves.length, 30);
  for (var ei = 0; ei < maxRows; ei++) {
    y = checkPage(5);
    var el = eleves[ei] || {};
    setFont(doc, 'normal', 7, BLACK);
    doc.text((ei + 1) + '', ML + 2, y);
    doc.text(el.nom || '', ML + 10, y);
    doc.text(el.prenom || '', ML + 60, y);
    doc.text(el.sexe || '', ML + 110, y);
    doc.text(el.tel || '', ML + 130, y);
    doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.1);
    doc.line(ML, y + 1.5, ML + CW, y + 1.5);
    y += 4;
  }

  // Incidences emploi du temps
  y += 5;
  y = checkPage(20);
  sectionHead('INCIDENCES SUR L\'EMPLOI DU TEMPS');
  setFont(doc, 'normal', 8, BLACK);
  if (data.incidences) {
    y = wrappedText(doc, data.incidences, ML, y, CW, 3.5);
  } else {
    for (var li = 0; li < 5; li++) {
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
      doc.line(ML, y, ML + CW, y);
      y += 5;
    }
  }

  // Page numbers
  var total = doc.internal.getNumberOfPages();
  for (var p = 1; p <= total; p++) {
    doc.setPage(p);
    setFont(doc, 'normal', 7, GRAY);
    doc.text(p + '/' + total, W - MR, H - 8, { align: 'right' });
    doc.text('College Pierre Mendes France - Woippy', ML, H - 8);
  }

  return doc;
}

// ── Event listeners ──
document.getElementById('btn-preview-demande').addEventListener('click', function () {
  var data = collectDemandeData();
  var doc = buildDemandePDF(data);
  showPreview(doc);
});

document.getElementById('btn-download-demande').addEventListener('click', function () {
  var data = collectDemandeData();
  var doc = buildDemandePDF(data);
  var filename = 'Demande_sortie_' + (data.classes.map(function(c){return c.nom;}).join('-') || 'classes') + '.pdf';
  doc.save(filename.replace(/\s+/g, '_'));
});
