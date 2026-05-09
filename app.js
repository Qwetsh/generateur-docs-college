/* global jspdf */
const { jsPDF } = jspdf;

// ── Logo preload (SVG → base64 PNG) ──
let logoPNG = null;
(function preloadLogo() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function () {
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    logoPNG = canvas.toDataURL('image/png');
  };
  img.src = 'assets/logo-academie.svg';
})();

// Helpers
function val(id) { return document.getElementById(id).value.trim(); }
function sel(id) { return document.getElementById(id).value; }
function chk(id) { return document.getElementById(id).checked; }

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── PDF constants ──
const PAGE_W = 210;
const PAGE_H = 297;
const ML = 20;        // margin left
const MR = 20;        // margin right
const CONTENT_W = PAGE_W - ML - MR;
const BLUE = [0, 0, 145];
const LIGHT_BLUE_BG = [245, 245, 254];
const BLACK = [0, 0, 0];
const GRAY = [100, 100, 100];

function collectData() {
  return {
    etablissement: val('etablissement'),
    tel: val('tel'),
    codepostal: val('codepostal'),
    annee: val('annee'),
    classe: val('classe'),
    finalites: val('finalites'),
    projet: val('projet'),
    titreOeuvre: val('titre-oeuvre'),
    dateDebut: formatDate(val('date-debut')),
    dateFin: formatDate(val('date-fin')),
    lieu: val('lieu'),
    supports: [
      chk('exploit-classe') && {
        label: 'Usage collectif en classe',
        detail: "Personnels administratif, equipe pedagogique et vie scolaire, eleves de l'etablissement"
      },
      chk('exploit-ent') && {
        label: 'En ligne (acces reserve : ENT, plateforme, extranet)',
        detail: val('exploit-ent-site') ? 'Site(s) : ' + val('exploit-ent-site') : ''
      },
      chk('exploit-internet') && {
        label: 'En ligne - Internet (monde entier)',
        detail: val('exploit-internet-site') ? 'Site(s) : ' + val('exploit-internet-site') : ''
      },
      chk('exploit-stockage') && {
        label: 'Support de stockage amovible',
        detail: val('exploit-stockage-dest') ? 'Destinataires : ' + val('exploit-stockage-dest') : ''
      },
      chk('exploit-projection') && {
        label: 'Projection collective',
        detail: [
          chk('proj-classe') ? '- Usage collectif dans les classes des eleves enregistres' : '',
          chk('proj-instit') ? '- Autres usages institutionnels a vocation educative' : '',
          chk('proj-externe') ? "- Usages de communication externe de l'institution" : '',
        ].filter(Boolean).join('\n')
      },
      chk('exploit-autre') && {
        label: 'Autre',
        detail: val('exploit-autre-dest') ? val('exploit-autre-dest') : ''
      },
    ].filter(Boolean)
  };
}

// ── Text helpers ──
function setFont(doc, style, size, color) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function wrappedText(doc, text, x, y, maxW, lineH) {
  const lines = doc.splitTextToSize(text, maxW);
  doc.text(lines, x, y);
  return y + lines.length * lineH;
}

function sectionTitle(doc, num, title, y) {
  setFont(doc, 'bold', 13, BLUE);
  doc.text(`${num} -  ${title}`, PAGE_W / 2, y, { align: 'center' });
  const titleW = doc.getTextWidth(`${num} -  ${title}`);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  const tx = (PAGE_W - titleW) / 2;
  doc.line(tx, y + 1, tx + titleW, y + 1);
  return y + 8;
}

function checkPageBreak(doc, y, needed) {
  if (y + needed > PAGE_H - 20) {
    doc.addPage();
    // page number footer on previous page handled at end
    return 25;
  }
  return y;
}

function addPageNumbers(doc) {
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    setFont(doc, 'normal', 8, GRAY);
    doc.text(`${i}/${total}`, PAGE_W - MR, 15, { align: 'right' });
  }
}

// ── Build PDF ──
function buildPDF(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 15;

  // ── Header: blue bar ──
  doc.setFillColor(0, 0, 145);
  doc.rect(0, 0, PAGE_W, 8, 'F');

  // Logo academie
  if (logoPNG) {
    doc.addImage(logoPNG, 'PNG', ML, 10, 30, 30);
  }

  // Republic marker (shifted right of logo)
  y = 18;
  const textX = logoPNG ? ML + 33 : ML;
  setFont(doc, 'bold', 7, BLUE);
  doc.text('MINISTERE', textX, y);
  doc.text("DE L'EDUCATION", textX, y + 3);
  doc.text('NATIONALE,', textX, y + 6);
  doc.text('DE LA JEUNESSE', textX, y + 9);
  doc.text('ET DES SPORTS', textX, y + 12);

  setFont(doc, 'italic', 6.5, GRAY);
  doc.text("Liberte", textX, y + 16);
  doc.text("Egalite", textX, y + 19);
  doc.text("Fraternite", textX, y + 22);

  // Intro text
  y = 45;
  setFont(doc, 'italic', 7.5, BLACK);
  y = wrappedText(doc,
    "La presente demande est destinee a recueillir le consentement et les autorisations necessaires dans le cadre de l'enregistrement, la captation, l'exploitation et l'utilisation de l'image des eleves (photographie, voix) quel que soit le procede envisage. Elle est formulee dans le cadre du projet specifie ci-dessous et les objectifs ont ete prealablement expliques aux eleves et leurs responsables legaux.",
    ML, y, CONTENT_W, 3.5);

  y += 3;
  setFont(doc, 'italic', 6, GRAY);
  y = wrappedText(doc,
    "Vu le Code Civil (article 9), la Declaration universelle des droits de l'homme (article 12), la Convention europeenne des droits de l'homme (article 8) et la Charte des droits fondamentaux de l'Union europeenne (article 7)",
    ML, y, CONTENT_W, 2.8);
  y += 1;
  y = wrappedText(doc,
    "Vu le reglement general europeen N 2016/679 du 27 avril 2016 relatif a la protection des personnes physiques a l'egard du traitement des donnees a caractere personnel et a la libre circulation des donnees (RGPD) et a la loi n 78-17 du 06 janvier 1978 modifiee le 29 juin 2018 relative a l'informatique, aux fichiers et aux libertes",
    ML, y, CONTENT_W, 2.8);

  // ── Etablissement block ──
  y += 4;
  setFont(doc, 'italic', 8, GRAY);
  doc.text("[A completer par l'ecole ou l'etablissement scolaire en debut d'annee scolaire]", ML, y);

  y += 5;
  // Light blue background box
  doc.setFillColor(...LIGHT_BLUE_BG);
  doc.roundedRect(ML, y - 4, CONTENT_W, 28, 2, 2, 'F');

  setFont(doc, 'bold', 9, BLACK);
  doc.text("Ecole ou etablissement scolaire : ", ML + 3, y);
  setFont(doc, 'normal', 9, BLACK);
  doc.text(data.etablissement, ML + 3 + doc.getTextWidth("Ecole ou etablissement scolaire : "), y);

  y += 7;
  setFont(doc, 'bold', 9, BLACK);
  doc.text("Tel. : ", ML + 3, y);
  setFont(doc, 'normal', 9, BLACK);
  doc.text(data.tel, ML + 3 + doc.getTextWidth("Tel. : "), y);

  setFont(doc, 'bold', 9, BLACK);
  doc.text("Code postal / Commune : ", PAGE_W / 2, y);
  setFont(doc, 'normal', 9, BLACK);
  doc.text(data.codepostal, PAGE_W / 2 + doc.getTextWidth("Code postal / Commune : "), y);

  y += 7;
  setFont(doc, 'bold', 9, BLACK);
  doc.text("Annee scolaire : ", ML + 3, y);
  setFont(doc, 'normal', 9, BLACK);
  doc.text(data.annee, ML + 3 + doc.getTextWidth("Annee scolaire : "), y);

  setFont(doc, 'bold', 9, BLACK);
  doc.text("Classe de : ", PAGE_W / 2, y);
  setFont(doc, 'normal', 9, BLACK);
  doc.text(data.classe, PAGE_W / 2 + doc.getTextWidth("Classe de : "), y);

  // ── Section 1: Finalites ──
  y += 14;
  y = sectionTitle(doc, '1', 'Finalites envisagees', y);

  y += 2;
  setFont(doc, 'italic', 8, GRAY);
  doc.text("Gestion administrative, activites pedagogiques,", ML, y);
  y += 3.5;
  doc.text("Merci de detailler autant que possible les differentes finalites envisagees et de les completer si besoin :", ML, y);
  y += 5;
  setFont(doc, 'normal', 9, BLACK);
  y = wrappedText(doc, data.finalites || '(non precise)', ML, y, CONTENT_W, 4);

  // ── Section 2: Projet ──
  y += 6;
  y = sectionTitle(doc, '2', 'Designation du projet audio-visuel', y);

  y += 2;
  setFont(doc, 'bold', 9, BLACK);
  doc.text("Projet : ", ML, y);
  setFont(doc, 'normal', 9, BLACK);
  const projetLabel = `\u00AB ${data.projet} \u00BB`;
  doc.text(projetLabel, ML + doc.getTextWidth("Projet : "), y);

  y += 6;
  setFont(doc, 'bold', 9, BLACK);
  doc.text("Titre de l'oeuvre si applicable : ", ML, y);
  setFont(doc, 'normal', 9, BLACK);
  doc.text(data.titreOeuvre || '', ML + doc.getTextWidth("Titre de l'oeuvre si applicable : "), y);

  y += 6;
  setFont(doc, 'normal', 8.5, BLACK);
  doc.text("L'enregistrement aura lieu aux dates/moments et lieux indiques ci-apres.", ML, y);

  y += 5;
  setFont(doc, 'bold', 9, BLACK);
  const dateLabel = "Date(s) d'enregistrement  ";
  doc.text(dateLabel, ML, y);
  setFont(doc, 'normal', 9, [200, 0, 0]);
  const dateRange = `du ${data.dateDebut || '...'} au ${data.dateFin || '...'}`;
  doc.text(dateRange, ML + doc.getTextWidth(dateLabel) + 2, y);

  setFont(doc, 'bold', 9, BLACK);
  const lieuX = ML + doc.getTextWidth(dateLabel) + 2 + doc.getTextWidth(dateRange) + 5;
  doc.text("Lieu(x) : ", Math.min(lieuX, PAGE_W / 2 + 20), y);
  setFont(doc, 'normal', 9, BLACK);
  doc.text(data.lieu || '', Math.min(lieuX, PAGE_W / 2 + 20) + doc.getTextWidth("Lieu(x) : "), y);

  y += 6;
  setFont(doc, 'normal', 7.5, BLACK);
  y = wrappedText(doc,
    "La presente autorisation est consentie a titre gratuit. Le producteur de l'oeuvre audiovisuelle creee ou le beneficiaire de l'enregistrement exercera l'integralite des droits d'exploitation attaches a cette oeuvre/cet enregistrement. L'oeuvre/l'enregistrement demeurera sa propriete exclusive. Le producteur/le beneficiaire de l'autorisation, s'interdit expressement de ceder les presentes autorisations a un tiers.",
    ML, y, CONTENT_W, 3.2);

  y += 2;
  setFont(doc, 'italic', 7, GRAY);
  doc.text("* Le cas echeant", ML, y);

  // ── Section 3: Modes d'exploitation envisagees ──
  y += 8;
  y = checkPageBreak(doc, y, 40);
  y = sectionTitle(doc, '3', "Modes d'exploitation envisagees", y);

  y += 2;
  setFont(doc, 'italic', 7.5, GRAY);
  doc.text("Pour chaque support, le(s) representant(s) legal(aux) coche(nt) la case correspondant a leur choix.", ML, y);
  y += 3;
  doc.text("Conservation : 1 annee scolaire pour tous les supports.", ML, y);
  y += 6;

  // Table header
  const colAuth = ML;
  const colSupport = ML + 28;
  const colDetail = ML + 90;

  doc.setFillColor(...LIGHT_BLUE_BG);
  doc.rect(ML, y - 3.5, CONTENT_W, 7, 'F');
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.3);
  doc.line(ML, y + 3.5, ML + CONTENT_W, y + 3.5);

  setFont(doc, 'bold', 8, BLUE);
  doc.text('Autorisation', colAuth + 1, y);
  doc.text('Support', colSupport + 1, y);
  doc.text("Precision / Etendue", colDetail + 1, y);
  y += 8;

  for (const support of data.supports) {
    y = checkPageBreak(doc, y, 16);

    // OUI / NON checkboxes (empty, for parents to fill)
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.rect(colAuth + 1, y - 2.5, 3, 3);
    setFont(doc, 'normal', 7, BLACK);
    doc.text('OUI', colAuth + 5.5, y);
    doc.rect(colAuth + 14, y - 2.5, 3, 3);
    doc.text('NON', colAuth + 18.5, y);

    // Support label
    setFont(doc, 'bold', 8, BLACK);
    const supportLines = doc.splitTextToSize(support.label, 58);
    doc.text(supportLines, colSupport + 1, y);

    // Detail
    setFont(doc, 'normal', 7, GRAY);
    const detailLines = support.detail ? doc.splitTextToSize(support.detail, CONTENT_W - 90) : [];
    if (detailLines.length) {
      doc.text(detailLines, colDetail + 1, y);
    }

    const rowH = Math.max(supportLines.length, detailLines.length, 1) * 3.5 + 5;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(ML, y + rowH - 4, ML + CONTENT_W, y + rowH - 4);
    y += rowH;
  }

  // ═══════════ PAGE 2 ═══════════
  y += 4;
  y = checkPageBreak(doc, y, 50);

  // ── Section 4: Consentement eleve ──
  y = sectionTitle(doc, '4', "Consentement de l'eleve", y);
  y += 2;
  setFont(doc, 'normal', 9, BLACK);
  doc.text("On m'a explique et j'ai compris a quoi servait ce projet.", ML, y); y += 5;
  doc.text("On m'a explique et j'ai compris qui pourrait voir cet enregistrement.", ML, y); y += 5;
  doc.text("Et je suis d'accord pour que l'on enregistre, pour ce projet,     mon image     ma voix.", ML, y);
  y += 4;

  // Checkboxes for image / voix
  doc.rect(ML + doc.getTextWidth("Et je suis d'accord pour que l'on enregistre, pour ce projet,  "), y - 7, 3, 3);
  doc.rect(ML + doc.getTextWidth("Et je suis d'accord pour que l'on enregistre, pour ce projet,     mon image  "), y - 7, 3, 3);

  y += 4;
  setFont(doc, 'bold', 9, BLACK);
  doc.text("Nom prenom de l'eleve : ", ML, y);
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(ML + doc.getTextWidth("Nom prenom de l'eleve : "), y + 1, ML + CONTENT_W, y + 1);

  y += 8;
  doc.text("Signature :", ML + CONTENT_W - 30, y);

  // ── Section 5: Autorisation parentale ──
  y += 10;
  y = checkPageBreak(doc, y, 65);
  y = sectionTitle(doc, '5', 'Autorisation parentale', y);
  y += 2;
  setFont(doc, 'normal', 9, BLACK);

  doc.text("Je (Nous) soussigne(e)(s) : ", ML, y);
  setFont(doc, 'italic', 9, GRAY);
  doc.text("[Nom - Prenom]", ML + doc.getTextWidth("Je (Nous) soussigne(e)(s) : "), y);
  y += 5;

  setFont(doc, 'normal', 9, BLACK);
  doc.text("Demeurant : ", ML, y);
  setFont(doc, 'italic', 9, GRAY);
  doc.text("[adresse]", ML + doc.getTextWidth("Demeurant : "), y);
  y += 5;

  setFont(doc, 'normal', 9, BLACK);
  doc.text("Et ", ML, y);
  setFont(doc, 'italic', 9, GRAY);
  doc.text("[Nom - Prenom]", ML + doc.getTextWidth("Et "), y);
  y += 5;

  setFont(doc, 'normal', 9, BLACK);
  doc.text("Demeurant : ", ML, y);
  setFont(doc, 'italic', 9, GRAY);
  doc.text("[adresses a preciser si differentes]", ML + doc.getTextWidth("Demeurant : "), y);
  y += 5;

  setFont(doc, 'normal', 9, BLACK);
  doc.text("Agissant en qualite de representant(s) legal(aux) de : ", ML, y);
  setFont(doc, 'italic', 9, GRAY);
  doc.text("[Nom - Prenom de l'eleve]", ML + doc.getTextWidth("Agissant en qualite de representant(s) legal(aux) de : "), y);
  y += 7;

  setFont(doc, 'normal', 8, BLACK);
  y = wrappedText(doc,
    "Je reconnais etre entierement investi de mes droits civils a son egard. Je reconnais expressement que le mineur que je represente n'est lie par aucun contrat exclusif pour l'utilisation de son image et/ou de sa voix, voire de son nom et",
    ML, y, CONTENT_W, 3.5);

  y += 3;
  // Authorize checkbox
  doc.rect(ML + 2, y - 3, 3, 3);
  setFont(doc, 'bold', 8.5, BLACK);
  doc.text("autorise(ons) la captation de l'image / de la voix de l'enfant et l'utilisation qui en sera faite par son ecole /", ML + 7, y);
  y += 4;
  doc.text("etablissement scolaire.", ML + 7, y);

  y += 6;
  doc.rect(ML + 2, y - 3, 3, 3);
  setFont(doc, 'bold', 8.5, BLACK);
  doc.text("n'autorise(ons) pas la captation de l'image / de la voix de l'enfant.", ML + 7, y);

  y += 6;
  setFont(doc, 'normal', 8.5, BLACK);
  doc.text('Merci d\'ecrire lisiblement le mot "REFUS" : _______________', ML + 10, y);

  y += 8;
  setFont(doc, 'normal', 9, BLACK);
  doc.text("Fait a .............................................", ML, y);
  y += 6;
  doc.text("Le .................................................", ML, y);
  doc.text("Signature (s) :", ML + CONTENT_W - 40, y);

  // ── Section 6: Droits ──
  y += 10;
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, '6', 'Pour exercer vos droits', y);
  y += 2;
  setFont(doc, 'normal', 7.5, BLACK);

  y = wrappedText(doc,
    "Les donnees recueillies au sein de ce formulaire font l'objet d'un traitement par le chef d'etablissement pour les colleges et lycees ou le directeur academique des services de l'education nationale pour les ecoles afin de repondre a une mission d'interet public. Ces donnees ne sont pas conservees au-dela de l'annee scolaire relative a la presente autorisation. Les informations vous concernant ainsi que votre enfant ne sont transmises qu'aux seules personnes en charge du traitement de la presente autorisation.",
    ML, y, CONTENT_W, 3.2);

  y += 4;
  y = wrappedText(doc,
    "Vous disposez d'un droit d'acces aux donnees vous concernant, d'un droit de rectification, d'un droit d'opposition et d'un droit a la limitation du traitement de vos donnees. Vous disposez egalement d'un droit a l'effacement concernant l'image/la voix enregistree et utilisee dans le cadre decrit ci-dessus.",
    ML, y, CONTENT_W, 3.2);

  y += 4;
  y = wrappedText(doc,
    "Pour exercer vos droits ou pour toute question sur le traitement de vos donnees, vous pouvez contacter le delegue a la protection des donnees a l'adresse suivante: dpd@ac-nancy-metz.fr Si vous estimez que vos droits ne sont pas respectes vous pouvez adresser une reclamation aupres de la CNIL, en ligne sur www.cnil.fr ou par voie postale a l'adresse suivante : 3 place de Fontenoy - TSA 80715 - 75334 PARIS Cedex 07",
    ML, y, CONTENT_W, 3.2);

  y += 6;
  setFont(doc, 'bold', 8.5, BLACK);
  doc.text("Fait en autant d'originaux que necessaire (representants legaux, organisateur projet et etablissement scolaire).", PAGE_W / 2, y, { align: 'center' });

  // Page numbers
  addPageNumbers(doc);

  return doc;
}

// ── Event listeners ──
document.getElementById('btn-preview').addEventListener('click', function () {
  const data = collectData();
  const doc = buildPDF(data);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const iframe = document.getElementById('pdf-iframe');
  iframe.src = url;
  document.getElementById('pdf-preview').classList.remove('hidden');
  iframe.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btn-download').addEventListener('click', function () {
  const data = collectData();
  const doc = buildPDF(data);
  const filename = `Autorisation_captation_${data.classe || 'classe'}_${data.projet || 'projet'}.pdf`;
  doc.save(filename.replace(/\s+/g, '_'));
});
