import { useCallback, useEffect, useRef, useState } from 'react';
import type { RewardedAd } from 'react-native-google-mobile-ads';
import { resolverConsentimiento } from './consentimiento';
import { AD_UNIT_ID_RECOMPENSADO, ads, adsDisponible, iniciarAds } from './publicidad';

export type EstadoAnuncio = 'cargando' | 'listo' | 'sinAnuncio';

/**
 * Cuanto se espera un pedido de anuncio antes de darlo por perdido.
 *
 * AdMob contesta en uno o dos segundos, y cuando no hay relleno dispara ERROR
 * enseguida. Este plazo no es el camino normal: es la red que atrapa el caso en
 * que el SDK no contesta ni una cosa ni la otra, que es justo el que dejaba el
 * boton muerto para siempre.
 */
const ESPERA_CARGA_MS = 5000;

/**
 * Anuncio recompensado de AdMob (el mismo enganche que en Oráculos).
 *
 * Pide el anuncio al SDK apenas se monta la pantalla que lo puede ofrecer, y
 * precarga el siguiente cuando se cierra. La recompensa se OTORGA AL CERRAR el
 * anuncio (si se gano), no al ganarla: EARNED_REWARD llega con el anuncio
 * todavia en pantalla, asi que el efecto (lo que se suma o se cobra) quedaria
 * tapado. Si el usuario corta el video antes de terminarlo, no
 * desbloquea nada.
 *
 * ## Nunca quedarse en 'cargando'
 *
 * De 'cargando' se sale por LOADED o por ERROR, y los dos los emite el anuncio.
 * Por eso el objeto y sus oyentes se crean AL MONTAR, sin esperar nada: antes
 * se creaban despues del consentimiento, y si la pantalla se desmontaba durante
 * esa espera el anuncio no llegaba a existir. El efecto no vuelve a correr,
 * `recargar()` no tenia que recargar, y el boton quedaba apagado diciendo
 * "preparando" hasta salir de la app.
 *
 * Crear el objeto no pide nada a la red. Lo unico que espera al consentimiento
 * es `load()`, que es lo que corresponde.
 */
export function useAnuncioRecompensado() {
  const anuncioRef = useRef<RewardedAd | null>(null);
  const [estado, setEstado] = useState<EstadoAnuncio>(
    adsDisponible ? 'cargando' : 'sinAnuncio'
  );

  /** Plazo del pedido en curso, para cancelarlo cuando el SDK contesta. */
  const plazoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Anuncio en pantalla. Sin esto, dos toques en el mismo frame —antes de que
   * el modal alcance a cerrarse— enganchan dos juegos de oyentes sobre el mismo
   * anuncio, y la recompensa se entrega dos veces por un solo video.
   */
  const mostrandoRef = useRef(false);

  // En desarrollo el SDK nativo suele no estar (Expo Go) o no traer relleno, y
  // sin anuncio no hay gemas: la app queda trabada y no se puede probar nada
  // de lo que viene despues. Cuando eso pasa, y SOLO en dev, la recompensa se
  // otorga igual. `__DEV__` es constante de compilacion, asi que este camino ni
  // siquiera existe en el build de release.
  const simulado = __DEV__ && (!adsDisponible || estado === 'sinAnuncio');

  const cancelarPlazo = useCallback(() => {
    if (plazoRef.current) clearTimeout(plazoRef.current);
    plazoRef.current = null;
  }, []);

  /** Pide un anuncio y arma la red por si el SDK no contesta. */
  const pedir = useCallback(
    (anuncio: RewardedAd) => {
      cancelarPlazo();
      setEstado('cargando');
      plazoRef.current = setTimeout(() => {
        plazoRef.current = null;
        // Se pasa a 'sinAnuncio' y no se reintenta solo: el reintento lo decide
        // quien abre el modal, que es quien sabe si todavia le interesa.
        console.warn('[ads] el SDK no contesto en', ESPERA_CARGA_MS, 'ms');
        setEstado('sinAnuncio');
      }, ESPERA_CARGA_MS);
      anuncio.load();
    },
    [cancelarPlazo]
  );

  useEffect(() => {
    if (!ads) return;

    let anuncio: RewardedAd;
    try {
      iniciarAds();
      anuncio = ads.RewardedAd.createForAdRequest(AD_UNIT_ID_RECOMPENSADO);
    } catch (e) {
      // El SDK esta en el JS pero no en el binario nativo: hay que recompilar.
      console.warn('[ads] no se pudo crear el anuncio:', e);
      setEstado('sinAnuncio');
      return;
    }

    const { AdEventType, RewardedAdEventType } = ads;
    anuncioRef.current = anuncio;
    let vivo = true;

    const cancelarCargado = anuncio.addAdEventListener(RewardedAdEventType.LOADED, () => {
      cancelarPlazo();
      setEstado('listo');
    });
    // Sin red, sin relleno o con la unidad mal configurada: se avisa y se deja
    // reintentar (no se reintenta solo en bucle, que gasta pedidos al SDK).
    const cancelarError = anuncio.addAdEventListener(AdEventType.ERROR, (error) => {
      cancelarPlazo();
      console.warn('[ads] no se pudo cargar el anuncio:', error);
      setEstado('sinAnuncio');
    });
    // Al cerrarse, se precarga el siguiente para la proxima vez.
    const cancelarCerrado = anuncio.addAdEventListener(AdEventType.CLOSED, () => {
      mostrandoRef.current = false;
      pedir(anuncio);
    });

    /**
     * EL CONSENTIMIENTO VA ANTES DEL PRIMER PEDIDO.
     *
     * En Europa, pedir un anuncio sin haber preguntado es lo que Google no
     * permite; fuera de Europa la consulta contesta "no hace falta" enseguida y
     * no se nota.
     *
     * Si la consulta falla —sin red, tipicamente— se pide el anuncio igual y el
     * SDK sirve lo que pueda. Trabar la app por no poder preguntar seria peor
     * que preguntar tarde, sobre todo en un juego que funciona sin conexion.
     */
    void (async () => {
      await resolverConsentimiento();
      // Si la pantalla se fue mientras tanto no se pide nada, pero el anuncio ya
      // existe: nadie queda esperando un objeto que nunca llego a crearse.
      if (vivo) pedir(anuncio);
    })();

    return () => {
      vivo = false;
      cancelarPlazo();
      cancelarCargado();
      cancelarError();
      cancelarCerrado();
      anuncioRef.current = null;
    };
  }, [cancelarPlazo, pedir]);

  const recargar = useCallback(() => {
    const anuncio = anuncioRef.current;
    if (!anuncio) return;
    pedir(anuncio);
  }, [pedir]);

  const mostrar = useCallback(
    (onRecompensa: () => void) => {
      if (simulado) {
        console.warn('[ads] DEV: no hay anuncio real, se otorga la recompensa igual');
        // Un respiro antes de dar la recompensa, para que el cierre del modal se
        // vea y el efecto no aparezca de golpe, como con el anuncio de verdad.
        setTimeout(onRecompensa, 400);
        return;
      }

      const anuncio = anuncioRef.current;
      if (!ads || !anuncio || mostrandoRef.current) return;
      const { AdEventType, RewardedAdEventType } = ads;

      mostrandoRef.current = true;

      let gano = false;
      const cancelarRecompensa = anuncio.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          gano = true;
        }
      );
      const cancelarCerrado = anuncio.addAdEventListener(AdEventType.CLOSED, () => {
        cancelarRecompensa();
        cancelarCerrado();
        if (gano) onRecompensa();
      });

      try {
        anuncio.show();
      } catch (e) {
        // Si no llego a mostrarse no va a haber CLOSED, y sin esto el anuncio
        // quedaria marcado como en pantalla para siempre.
        console.warn('[ads] no se pudo mostrar el anuncio:', e);
        cancelarRecompensa();
        cancelarCerrado();
        mostrandoRef.current = false;
      }
    },
    [simulado]
  );

  return { estado, listo: estado === 'listo' || simulado, simulado, mostrar, recargar };
}

/**
 * Reintenta una vez cuando se ofrece el video y no hay anuncio.
 *
 * Es lo que en Oráculos hace el modal de la recompensa. Acá no hay un modal
 * único —el video se ofrece en el cartel de la cámara, en la ruleta y en el
 * camino—, así que cada lugar lo llama con su propio `visible`.
 *
 * Sin esto, un fallo de red o un pedido sin relleno deja la oferta apagada
 * hasta salir de la pantalla. Un solo reintento por vez que se muestra, para no
 * quedar pidiendo anuncios en bucle.
 */
export function useReintentarAlOfrecer(
  anuncio: Pick<ReturnType<typeof useAnuncioRecompensado>, 'estado' | 'recargar'>,
  visible: boolean
) {
  const { estado, recargar } = anuncio;
  const reintentado = useRef(false);
  useEffect(() => {
    if (!visible) {
      reintentado.current = false;
      return;
    }
    if (estado === 'sinAnuncio' && !reintentado.current) {
      reintentado.current = true;
      recargar();
    }
  }, [visible, estado, recargar]);
}
