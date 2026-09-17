import { DeviceMotion } from 'expo-sensors';

/**
 * Escucha la orientación real durante un rato corto y contesta si sirve para
 * ubicar a la criatura en una dirección del mundo.
 *
 * **Hace falta giroscopio**, no solo rotación. Sin giroscopio la rotación sale
 * del acelerómetro y la brújula, y con el equipo parado es inservible: en una
 * Galaxy Tab A11 temblaba unos ±17° quieta y cada tanto saltaba 200° de una
 * lectura a otra. La criatura aparecía en el borde y salía volando, y no había
 * forma de encontrarla. Sin giroscopio se juega con el motor de deriva, que la
 * deja siempre dentro de la pantalla.
 *
 * Que haya giroscopio se sabe porque llega `rotationRate`: sin él viene vacío.
 *
 * `DeviceMotion.isAvailableAsync()` no sirve para esto: exige que existan los
 * cinco sensores que usa internamente, y contesta que no por cualquiera que
 * falte.
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
      // No se decide con la primera lectura: si el giroscopio tarda en arrancar,
      // un teléfono que lo tiene podría caer en deriva por una muestra vacía.
      let sinGiroscopio = 0;
      sub = DeviceMotion.addListener(({ rotation, rotationRate }) => {
        if (!rotation || typeof rotation.alpha !== 'number' || typeof rotation.beta !== 'number') {
          return;
        }
        if (rotationRate) {
          finish(true);
          return;
        }
        sinGiroscopio += 1;
        if (sinGiroscopio >= 8) finish(false);
      });
    } catch {
      finish(false);
    }
  });
}
