import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';

vi.mock('child_process', () => ({ execFileSync: vi.fn() }));

/**
 * Régression : l'image Docker n'installe que `python3`. Les appels
 * utilisaient `python`, qui n'existe pas sur Alpine — l'OCR personnalisé
 * échouait en conteneur sans qu'aucun test ne le révèle, parce que le
 * développeur travaillait sur une machine où `python` existe.
 */
describe('pythonBin', () => {
  it('retombe sur python3 quand seul python3 répond', async () => {
    vi.resetModules();
    (execFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((bin: string) => {
      if (bin === 'python') throw new Error('ENOENT');
      return Buffer.from('Python 3.12');
    });
    const { pythonBin } = await import('./python-bin.js');
    expect(pythonBin()).toBe('python3');
  });

  it('accepte python quand python3 est absent', async () => {
    vi.resetModules();
    (execFileSync as unknown as ReturnType<typeof vi.fn>).mockImplementation((bin: string) => {
      if (bin === 'python3') throw new Error('ENOENT');
      return Buffer.from('Python 3.11');
    });
    const { pythonBin } = await import('./python-bin.js');
    expect(pythonBin()).toBe('python');
  });

  it('honore PYTHON_BIN sans rien exécuter', async () => {
    vi.resetModules();
    process.env.PYTHON_BIN = '/opt/venv/bin/python3.12';
    const { pythonBin } = await import('./python-bin.js');
    expect(pythonBin()).toBe('/opt/venv/bin/python3.12');
    delete process.env.PYTHON_BIN;
  });
});
