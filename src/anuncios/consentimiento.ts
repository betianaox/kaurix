import { ads } from './publicidad';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * EL CONSENTIMIENTO DE ANUNCIOS
 * ───────────────────────────────────────────────────────────────────────────
 * Google no deja servir publicidad en la Unión Europea, el Reino Unido y Suiza
 * sin haberle preguntado antes a la persona qué acepta. La herramienta es el
 * UMP, que viene adentro del mismo paquete de AdMob que ya usamos.
 *
 * ## Cuándo aparece
 *
 * **Lo decide Google, no nosotros.** Se le pregunta si hace falta un formulario
 * y contesta según de dónde se está abriendo la app. Desde Argentina, México o
 * Brasil contesta que no, y quien juega no ve absolutamente nada — ni un
 * parpadeo. En Europa aparece antes del primer anuncio.
 *
 * ## Y ojo con la parte que no es código
 *
 * ESTO SOLO NO ALCANZA. Hay que crear y **publicar** el mensaje en la consola de
 * AdMob (Privacidad y mensajes → RGPD). Si no está publicado, todo esto corre
 * perfecto, Google contesta "no hay formulario disponible", no se muestra nada
 * y se sigue incumpliendo. Es la misma clase de falla silenciosa que la unidad
 * de prueba: parece que anda.
 *
 * ## Qué pasa si dicen que no
 *
 * Siguen viendo anuncios, pero **no personalizados**: pagan menos, no cero.
 * Nadie se queda sin gemas por no aceptar.
 */

/** Si algo falla, se sigue igual: sin anuncios personalizados, pero sin trabar. */
type Resultado = { pudo: boolean; error?: string };

let resuelto: Promise<Resultado> | null = null;

/**
 * Pide el consentimiento si hace falta. Se resuelve UNA vez por sesión.
 *
 * Devuelve la misma promesa a todos los que llamen: si dos pantallas piden un
 * anuncio al mismo tiempo, el formulario no se muestra dos veces.
 */
export function resolverConsentimiento(): Promise<Resultado> {
  resuelto ??= pedir();
  return resuelto;
}

async function pedir(): Promise<Resultado> {
  if (!ads) return { pudo: false, error: 'sin modulo' };

  try {
    const { AdsConsent } = ads;
    const prueba = opcionesDePrueba();

    // PROBANDO, SE OLVIDA LO ANTERIOR. El SDK guarda lo que Google contestó la
    // vez pasada y no lo vuelve a evaluar; si ya quedó anotado "acá no hace
    // falta formulario" —porque se consultó desde Argentina— fingir estar en
    // Europa no cambia nada hasta borrarlo. Solo corre con un dispositivo de
    // prueba configurado, así que en producción no existe.
    if (prueba) await AdsConsent.reset();

    // En desarrollo se puede fingir estar en Europa para poder ver el
    // formulario desde acá. Ver `DISPOSITIVOS_DE_PRUEBA`.
    await AdsConsent.requestInfoUpdate(prueba);

    // Muestra el formulario SOLO si Google dice que corresponde. Si no,
    // no hace nada y vuelve enseguida.
    await AdsConsent.loadAndShowConsentFormIfRequired();

    if (__DEV__) {
      const info = await AdsConsent.getConsentInfo();
      // warn y no log: los console.log de RN no llegan a logcat, se quedan en
      // la consola de Metro. Esto es diagnostico y tiene que poder leerse.
      console.warn(
        '[ads] consentimiento:',
        JSON.stringify({
          estado: info.status,
          puedePedirAnuncios: info.canRequestAds,
          hayFormulario: info.isConsentFormAvailable,
          opcionesDePrivacidad: info.privacyOptionsRequirementStatus,
        })
      );
    }

    return { pudo: true };
  } catch (e) {
    // Sin internet no se puede resolver, y eso NO puede trabar la app: las
    // lecturas funcionan sin conexión y el consejo del día también. Se sigue,
    // y en la próxima sesión se vuelve a intentar.
    const error = e instanceof Error ? e.message : String(e);
    console.warn('[ads] no se pudo resolver el consentimiento:', error);
    // Se limpia para que el próximo intento no reciba este fracaso cacheado.
    resuelto = null;
    return { pudo: false, error };
  }
}

/**
 * Hay que ofrecerle a la persona cambiar lo que eligió.
 *
 * Google lo exige cuando el formulario que se mostró tiene opciones que se
 * pueden revisar. Fuera de Europa devuelve `false` y la entrada de Ayuda
 * simplemente no aparece: no se le muestra a nadie una opción que no le
 * corresponde.
 */
export async function hayOpcionesDePrivacidad(): Promise<boolean> {
  if (!ads) return false;
  try {
    const { privacyOptionsRequirementStatus } = await ads.AdsConsent.getConsentInfo();
    return privacyOptionsRequirementStatus === ads.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch {
    return false;
  }
}

/** Vuelve a abrir el formulario, desde Ayuda. */
export async function abrirOpcionesDePrivacidad(): Promise<void> {
  if (!ads) return;
  try {
    await ads.AdsConsent.showPrivacyOptionsForm();
  } catch (e) {
    console.warn('[ads] no se pudo abrir las opciones de privacidad:', e);
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * PROBARLO DESDE ACÁ
 * ─────────────────────────────────────────────────────────────────────────
 * Desde Argentina el formulario NO aparece nunca, que es justamente lo
 * correcto — y por eso no hay forma de verlo sin fingir.
 *
 * Poniendo el id de este teléfono en `DISPOSITIVOS_DE_PRUEBA`, el SDK lo trata
 * como si estuviera en Europa y muestra el formulario. El id sale del log de
 * AdMob la primera vez que se pide un anuncio: busca una línea que dice
 * "Use RequestConfiguration.Builder.setTestDeviceIds" con un hash adentro.
 *
 * Solo corre en `__DEV__`: en producción no se le finge la ubicación a nadie.
 */
// VACIO A PROPOSITO, y con una advertencia.
//
// Se intento con un id sacado del log buscando "32 caracteres hexadecimales" y
// NO ERA EL CORRECTO: la simulacion nunca se activo y estuvimos probando el
// comportamiento argentino creyendo que era el europeo. Google contesto
// "No available form can be built", que es lo que dice cuando no corresponde
// mostrar nada.
//
// El id de verdad lo imprime el SDK en una linea que dice
// "setTestDeviceIds(Arrays.asList(...))" al pedir un anuncio. Este telefono no
// la emite, asi que hasta tener uno que si la emita, esto queda vacio.
const DISPOSITIVOS_DE_PRUEBA: string[] = [];

function opcionesDePrueba() {
  if (!__DEV__ || !ads || DISPOSITIVOS_DE_PRUEBA.length === 0) return undefined;
  return {
    debugGeography: ads.AdsConsentDebugGeography.EEA,
    testDeviceIdentifiers: DISPOSITIVOS_DE_PRUEBA,
  };
}

/**
 * Borra lo que la persona respondió, para volver a ver el formulario.
 *
 * Solo para probar: en producción no se le borra la elección a nadie.
 */
export async function olvidarConsentimiento(): Promise<void> {
  if (!__DEV__ || !ads) return;
  try {
    await ads.AdsConsent.reset();
    resuelto = null;
  } catch (e) {
    console.warn('[ads] no se pudo reiniciar el consentimiento:', e);
  }
}
