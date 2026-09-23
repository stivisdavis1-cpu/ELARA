const CP1252: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡',
  0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š', 0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž',
  0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ', 0x9e: 'ž', 0x9f: 'Ÿ',
};

const SKIP_DESTINATIONS = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'header',
  'headerl', 'headerr', 'headerf', 'footer', 'footerl', 'footerr', 'footerf',
  'footnote', 'annotation', 'filetbl', 'listtable', 'listoverridetable',
  'generator', 'datastore', 'themedata', 'colorschememapping', 'latentstyles',
  'xmlnstbl', 'rsidtbl', 'doccomm', 'bkmkstart', 'bkmkend', 'v', 'fldinst', 'shp',
]);

function skipControlWord(rtf: string, index: number): number {
  const n = rtf.length;
  let i = index;
  if (rtf[i] === '*') i++;
  while (i < n && /[a-z]/i.test(rtf[i])) i++;
  if (rtf[i] === "'") {
    i += 3;
    return Math.min(i, n);
  }
  if (rtf[i] === '-' || (rtf[i] >= '0' && rtf[i] <= '9')) {
    if (rtf[i] === '-') i++;
    while (i < n && rtf[i] >= '0' && rtf[i] <= '9') i++;
  }
  if (rtf[i] === ' ') i++;
  return i;
}

/** Extrait le texte lisible d'un flux RTF (latin1 / \'hh / \uN). */
export function rtfToPlainText(input: string | ArrayBuffer): string {
  let rtf: string;
  if (typeof input !== 'string') {
    rtf = '';
    const bytes = new Uint8Array(input);
    for (let b = 0; b < bytes.length; b++) {
      rtf += String.fromCharCode(bytes[b]);
    }
  } else {
    rtf = input;
  }

  let out = '';
  const stack: boolean[] = [false];
  const inSkip = () => stack[stack.length - 1];
  const n = rtf.length;
  let i = 0;

  while (i < n) {
    const ch = rtf[i];

    if (ch === '{') {
      i++;
      if (inSkip()) {
        stack.push(true);
      } else if (rtf[i] === '\\') {
        let j = i + 1;
        if (rtf[j] === '*') {
          j++;
          stack.push(true);
          i = skipControlWord(rtf, j);
          continue;
        }
        let name = '';
        let k = j;
        while (k < n && /[a-z]/i.test(rtf[k])) {
          name += rtf[k];
          k++;
        }
        if (name && SKIP_DESTINATIONS.has(name)) {
          stack.push(true);
          i = skipControlWord(rtf, k);
          continue;
        }
        stack.push(false);
        if (name) {
          i = skipControlWord(rtf, k);
        } else {
          i = k;
        }
      } else {
        stack.push(false);
      }
      continue;
    }

    if (ch === '}') {
      if (stack.length > 1) stack.pop();
      i++;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      if (!inSkip()) out += '\n';
      i++;
      continue;
    }

    if (ch === '\t') {
      if (!inSkip()) out += '\t';
      i++;
      continue;
    }

    if (ch === '\\') {
      let j = i + 1;
      if (rtf[j] === '*') {
        j++;
        i = skipControlWord(rtf, j);
        continue;
      }
      if (rtf[j] === "'") {
        const hex = rtf.substring(j + 1, j + 3);
        const code = parseInt(hex, 16);
        if (!inSkip()) {
          const c = code >= 0x80 && code <= 0x9f ? (CP1252[code] ?? ' ') : String.fromCharCode(code);
          out += c === '\u00A0' ? ' ' : c;
        }
        i = j + 3;
        continue;
      }
      let name = '';
      let k = j;
      while (k < n && /[a-z]/i.test(rtf[k])) {
        name += rtf[k];
        k++;
      }
      let param = '';
      let p = k;
      if (rtf[p] === '-' || (rtf[p] >= '0' && rtf[p] <= '9')) {
        if (rtf[p] === '-') {
          param += '-';
          p++;
        }
        while (p < n && rtf[p] >= '0' && rtf[p] <= '9') {
          param += rtf[p];
          p++;
        }
      }

      if (name === 'u' && param.length > 0 && !inSkip()) {
        const code = parseInt(param, 10) & 0xffff;
        if (code > 31 && code !== 0x7f) out += String.fromCharCode(code);
        i = p;
        if (rtf[i] === '\\') {
          i = skipControlWord(rtf, i + 1);
        } else {
          i++;
        }
        continue;
      }
      if (name === 'bin' && param) {
        i = p + (parseInt(param, 10) || 0);
        continue;
      }
      if (name === '' && param === '') {
        if (!inSkip()) {
          const lit = rtf[j];
          if (lit === '~' || lit === '_' || lit === ' ') out += ' ';
          else out += lit;
        }
        i = Math.min(j + 1, n);
        continue;
      }
      if (!inSkip()) {
        switch (name) {
          case 'par':
          case 'line':
          case 'row':
          case 'sect':
          case 'softline':
            out += '\n';
            break;
          case 'tab':
            out += '\t';
            break;
          case '~':
          case '_':
            out += ' ';
            break;
          case 'bullet':
            out += '•';
            break;
          case 'endash':
            out += '–';
            break;
          case 'emdash':
            out += '—';
            break;
          case 'lquote':
            out += '‘';
            break;
          case 'rquote':
            out += '’';
            break;
          case 'ldblquote':
            out += '“';
            break;
          case 'rdblquote':
            out += '”';
            break;
          case 'enspace':
            out += ' ';
            break;
        }
      }
      i = p;
      if (rtf[i] === ' ') i++;
      continue;
    }

    if (!inSkip()) {
      out += ch === '\u00A0' ? ' ' : ch;
    }
    i++;
  }

  return out.replace(/\n{3,}/g, '\n\n').trim();
}