import { execFileSync } from 'child_process';
import { Logger } from '@nestjs/common';

const logger = new Logger('PythonBin');

let cache: string | null = null;

/**
 * Interpréteur Python à utiliser pour les scripts OCR.
 *
 * L'image Docker n'installe que `python3` (Alpine ne fournit pas d'alias
 * `python`), alors que les appels utilisaient `python`. Résultat : chaque
 * `execSync` levait `ENOENT` et l'OCR personnalisé — comme l'aperçu PDF et
 * le repli OCR — ne fonctionnaient que sur les postes qui avaient un
 * interpréteur `python` installé, pas en conteneur.
 *
 * On résout une fois pour le processus : c'est le même interpréteur qui
 * sert au recadrage, à la rastérisation et à la conversion DOCX.
 */
export function pythonBin(): string {
  if (cache) return cache;
  if (process.env.PYTHON_BIN) {
    cache = process.env.PYTHON_BIN;
    return cache;
  }
  for (const candidat of ['python3', 'python']) {
    try {
      execFileSync(candidat, ['--version'], { stdio: 'ignore' });
      cache = candidat;
      return cache;
    } catch { /* on essaie le suivant */ }
  }
  // Aucun des deux n'est présent : on rend quand même python3 pour que
  // l'échec soit explicite dans le message d'erreur de l'appelant.
  logger.warn("Aucun interpréteur Python trouvé (python3/python). Définissez PYTHON_BIN.");
  cache = 'python3';
  return cache;
}
