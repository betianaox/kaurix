import { Accelerometer, DeviceMotion, Gyroscope, Magnetometer } from 'expo-sensors';

/**
 * Qué puede hacer este dispositivo.
 *
 * Kaurix apunta a correr en cualquier Android, no solo en la gama alta, así que
 * lo único imprescindible es la cámara. Todo lo demás mejora la búsqueda de
 * criaturas pero no es condición para jugar.
 */
export type Capabilities = {
  gyroscope: boolean;
  magnetometer: boolean;
  accelerometer: boolean;
  /**
   * Si de verdad llegan datos de orientación. Decide cuál de los dos motores de
   * búsqueda corre, y no se puede deducir de la lista de sensores: Android a
   * veces sintetiza la rotación sin giroscopio, y otras veces expone el sensor
   * pero no emite nada útil. Por eso se mide escuchando.
   */
  orientation: boolean;
};

/**
 * Escucha la orientación real durante un rato corto y contesta si llegó algo
 * utilizable. `DeviceMotion.isAvailableAsync()` no sirve para esto: exige que
 * existan los cinco sensores que usa internamente, así que da negativo en
 * equipos sin giroscopio que igual reportan rotación.
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

export async function probeCapabilities(): Promise<Capabilities> {
  const [gyroscope, magnetometer, accelerometer, orientation] = await Promise.all([
    Gyroscope.isAvailableAsync().catch(() => false),
    Magnetometer.isAvailableAsync().catch(() => false),
    Accelerometer.isAvailableAsync().catch(() => false),
    probeOrientation(),
  ]);

  return { gyroscope, magnetometer, accelerometer, orientation };
}
