import { DeviceMotion } from 'expo-sensors';

/**
 * Escucha la orientación real durante un rato corto y contesta si llegó algo
 * utilizable.
 *
 * `DeviceMotion.isAvailableAsync()` no sirve para esto: exige que existan los
 * cinco sensores que usa internamente, así que da negativo en equipos sin
 * giroscopio que igual reportan rotación.
 *
 * Que esto conteste que sí no garantiza que el sensor sirva: hay equipos que
 * emiten siempre el mismo valor. Eso no se puede saber acá, hace falta mirar
 * varias lecturas seguidas, y lo resuelve `useAparicion` rindiéndose en caliente
 * y pasándose al motor que no necesita sensores.
 */
export function probeOrientation(timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let sub: { remove: () => void } | null = null;

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub?.remove();
      resolve(result);
    };

    const timer = setTimeout(() => finish(false), timeoutMs);

    try {
      DeviceMotion.setUpdateInterval(100);
      sub = DeviceMotion.addListener(({ rotation }) => {
        if (rotation && typeof rotation.alpha === 'number' && typeof rotation.beta === 'number') {
          finish(true);
        }
      });
    } catch {
      finish(false);
    }
  });
}
