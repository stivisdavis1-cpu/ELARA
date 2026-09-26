/**
 * Générateur de fichiers Word (.docx) sans dépendance externe.
 *
 * Un .docx est une archive ZIP contenant du WordprocessingML. Plutôt que
 * d'ajouter une librairie, on écrit le conteneur nous-mêmes : les entrées
 * sont stockées sans compression (méthode « store »), ce qui est parfaitement
 * valide pour Word, LibreOffice et Google Docs.
 *
 * Linterest d'export du module scanner passe par la chaîne Python
 * (python-docx) et échoue si Python n'est pas présent sur la machine.
 * Ce générateur n'a cette contrainte : il est écrit en pur Node et fonctionne
 * partout, Docker compris.
 */

const TABLE_CRC = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ TABLE_CRC[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/* ------------------------------------------------------------------ */
/* ZIP (méthode « store »)                                            */
/* ------------------------------------------------------------------ */

interface Entree {
  nom: string;
  contenu: Buffer;
}

function ecritureDos(date: Date): { heure: number; jour: number } {
  return {
    // Heure encodée par le format MS-DOS : (h<<11) | (min<<5) | (sec/2)
    heure: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    jour: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** Assemble une archive ZIP « store » à partir d'une liste d'entrées. */
export function empacepter(entrees: Entree[], horodatage = new Date()): Buffer {
  const { heure, jour } = ecritureDos(horodatage);
  const morceaux: Buffer[] = [];
  const repertoire: Buffer[] = [];
  let decalage = 0;

  for (const entree of entrees) {
    const nom = Buffer.from(entree.nom, 'utf8');
    const crc = crc32(entree.contenu);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version minimale
    local.writeUInt16LE(0, 6); // drapeaux
    local.writeUInt16LE(0, 8); // méthode 0 = store
    local.writeUInt16LE(heure, 10);
    local.writeUInt16LE(jour, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entree.contenu.length, 18);
    local.writeUInt32LE(entree.contenu.length, 22);
    local.writeUInt16LE(nom.length, 26);
    local.writeUInt16LE(0, 28);

    morceaux.push(local, nom, entree.contenu);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version d'origine
    central.writeUInt16LE(20, 6); // version minimale
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10); // méthode
    central.writeUInt16LE(heure, 12);
    central.writeUInt16LE(jour, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(entree.contenu.length, 20);
    central.writeUInt32LE(entree.contenu.length, 24);
    central.writeUInt16LE(nom.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // commentaire
    central.writeUInt16LE(0, 34); // disque
    central.writeUInt16LE(0, 36); // attributs internes
    central.writeUInt32LE(0, 38); // attributs externes
    central.writeUInt32LE(decalage, 42);

    repertoire.push(central, nom);
    decalage += local.length + nom.length + entree.contenu.length;
  }

  const centralConcat = Buffer.concat(repertoire);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(0, 4);
  fin.writeUInt16LE(0, 6);
  fin.writeUInt16LE(entrees.length, 8);
  fin.writeUInt16LE(entrees.length, 10);
  fin.writeUInt32LE(centralConcat.length, 12);
  fin.writeUInt32LE(decalage, 16);
  fin.writeUInt16LE(0, 20);

  return Buffer.concat([...morceaux, centralConcat, fin]);
}

/* ------------------------------------------------------------------ */
/* WordprocessingML                                                    */
/* ------------------------------------------------------------------ */

export type Bloc =
  | { type: 'titre'; texte: string }
  | { type: 'sous_titre'; texte: string }
  | { type: 'paragraphe'; texte: string; gras?: boolean; alignement?: 'left' | 'center' | 'right' }
  | { type: 'saut' }
  | { type: 'tableau'; entetes: string[]; lignes: string[][] };

function echapper(valeur: string): string {
  return String(valeur ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Les caractères de contrôle sont interdits en XML
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

const STYLES: Record<string, { taille: number; gras: boolean; espaceApres: number }> = {
  titre: { taille: 36, gras: true, espaceApres: 240 },
  sous_titre: { taille: 24, gras: true, espaceApres: 180 },
  paragraphe: { taille: 22, gras: false, espaceApres: 120 },
};

function paragraphe(texte: string, gras: boolean, alignement: 'left' | 'center' | 'right', taille: number, espaceApres: number): string {
  return (
    `<w:p><w:pPr><w:jc w:val="${alignement}"/>` +
    `<w:spacing w:after="${espaceApres}"/></w:pPr>` +
    `<w:r><w:rPr>${gras ? '<w:b/>' : ''}<w:sz w:val="${taille}"/><w:szCs w:val="${taille}"/></w:rPr>` +
    `<w:t xml:space="preserve">${echapper(texte)}</w:t></w:r></w:p>`
  );
}

function blocVersXml(bloc: Bloc): string {
  switch (bloc.type) {
    case 'saut':
      return '<w:p/>';
    case 'titre':
      return paragraphe(bloc.texte, true, 'center', STYLES.titre.taille, STYLES.titre.espaceApres);
    case 'sous_titre':
      return paragraphe(bloc.texte, true, 'left', STYLES.sous_titre.taille, STYLES.sous_titre.espaceApres);
    case 'paragraphe':
      return paragraphe(
        bloc.texte,
        Boolean(bloc.gras),
        bloc.alignement ?? 'left',
        STYLES.paragraphe.taille,
        STYLES.paragraphe.espaceApres,
      );
    case 'tableau': {
      const cellules = (valeurs: string[], entete: boolean) =>
        `<w:tr>${valeurs
          .map(
            (v) =>
              `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>` +
              paragraphe(v, entete, 'left', STYLES.paragraphe.taille, 0) +
              `</w:tc>`,
          )
          .join('')}</w:tr>`;
      const bordures =
        '<w:tblBorders>' +
        ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
          .map((b) => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>`)
          .join('') +
        '</w:tblBorders>';
      return (
        `<w:tbl><w:tblPr>${bordures}<w:tblW w:w="0" w:type="auto"/></w:tblPr>` +
        (bloc.entetes.length ? cellules(bloc.entetes, true) : '') +
        bloc.lignes.map((l) => cellules(l, false)).join('') +
        '</w:tbl><w:p/>'
      );
    }
  }
}

const CONTENU_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '</Types>';

const RELATIONS_RACINE =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>';

const RELATIONS_DOCUMENT =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:docDefaults><w:rPrDefault><w:rPr>' +
  '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>' +
  '<w:sz w:val="22"/><w:szCs w:val="22"/>' +
  '</w:rPr></w:rPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
  '</w:styles>';

/** Construit un .docx prêt à ouvrir à partir d'une liste de blocs. */
export function construireDocx(blocs: Bloc[]): Buffer {
  const document =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' +
    blocs.map(blocVersXml).join('') +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>' +
    '</w:body></w:document>';

  // Un ZIP valide exige `[Content_Types].xml` en première entrée.
  return empacepter([
    { nom: '[Content_Types].xml', contenu: Buffer.from(CONTENU_TYPES, 'utf8') },
    { nom: '_rels/.rels', contenu: Buffer.from(RELATIONS_RACINE, 'utf8') },
    { nom: 'word/_rels/document.xml.rels', contenu: Buffer.from(RELATIONS_DOCUMENT, 'utf8') },
    { nom: 'word/styles.xml', contenu: Buffer.from(STYLES_XML, 'utf8') },
    { nom: 'word/document.xml', contenu: Buffer.from(document, 'utf8') },
  ]);
}
