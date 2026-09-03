import { useCallback, useEffect, useRef, useState } from 'react';
import type { RewardedAd } from 'react-native-google-mobile-ads';
import { resolverConsentimiento } from './consentimiento';
import { AD_UNIT_ID_RECOMPENSADO, ads, adsDisponible, iniciarAds } from './publicidad';

export type EstadoAnuncio = 'cargando' | 'listo' | 'sinAnuncio';

/**
 * Anuncio recompensado de AdMob (el mismo enganche que en Runas y Tarot).
 *
 * Pide el anuncio al SDK apenas se monta la pantalla que lo puede ofrecer, y
 * precarga el siguiente cuando se cierra. La recompensa se OTORGA AL CERRAR el
 * anuncio (si se gano), no al ganarla: EARNED_REWARD llega con el anuncio
 * todavia en pantalla, asi que el efecto (las cartas del bloque dandose vuelta)
 * quedaria tapado. Si el usuario corta el video antes de terminarlo, no
 * desbloquea nada.
 */
export function useAnuncioRecompensado() {
  const anuncioRef = useRef<RewardedAd | null>(null);
  const [estado, setEstado] = useState<EstadoAnuncio>(
    adsDisponible ? 'cargando' : 'sinAnuncio'
  );

  // En desarrollo el SDK nativo suele no estar (Expo Go) o no traer relleno, y
  // sin anuncio no hay gemas: la app queda trabada y no se puede probar nada
  // de lo que viene despues. Cuando eso pasa, y SOLO en dev, la recompensa se
  // otorga igual. `__DEV__` es constante de compilacion, asi que este camino ni
  // siquiera existe en el build de release.
  const simulado = __DEV__ && (!adsDisponible || estado === 'sinAnuncio');

  useEffect(() => {
    if (!ads) return;

    // Lo que haya que desenchufar al desmontar. Se va llenando cuando el
    // anuncio existe, que ahora pasa despues de una espera.
    let limpiar: (() => void) | null = null;
    let vivo = true;

    /**
     * EL CONSENTIMIENTO VA ANTES DEL PRIMER PEDIDO, y por eso esto es asincrono.
     *
     * En Europa, pedir un anuncio sin haber preguntado es lo que Google no
     * permite; fuera de Europa la consulta contesta "no hace falta" enseguida y
     * no se nota. Es la unica razon por la que este efecto dejo de ser directo.
     *
     * Si la consulta falla —sin red, tipicamente— se sigue igual: se pide el
     * anuncio y el SDK sirve lo que pueda. Trabar la app por no poder preguntar
     * seria peor que preguntar tarde, sobre todo en una app que funciona sin
     * conexion.
     */
    void (async () => {
      await resolverConsentimiento();
      if (!vivo || !ads) return;

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

      const cancelarCargado = anuncio.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setEstado('listo');
      });
      // Sin red, sin relleno o con la unidad mal configurada: se avisa y se deja
      // reintentar (no se reintenta solo en bucle, que gasta pedidos al SDK).
      const cancelarError = anuncio.addAdEventListener(AdEventType.ERROR, (error) => {
        console.warn('[ads] no se pudo cargar el anuncio:', error);
        setEstado('sinAnuncio');
      });
      // Al cerrarse, se precarga el siguiente para la proxima vez.
      const cancelarCerrado = anuncio.addAdEventListener(AdEventType.CLOSED, () => {
        setEstado('cargando');
        anuncio.load();
      });

      limpiar = () => {
        cancelarCargado();
        cancelarError();
        cancelarCerrado();
        anuncioRef.current = null;
      };

      // Si el componente se fue mientras se resolvia el consentimiento, se
      // desarma en el momento en vez de dejar los oyentes colgados.
      if (!vivo) {
        limpiar();
        return;
      }

      anuncio.load();
    })();

    return () => {
      vivo = false;
      limpiar?.();
    };
  }, []);

  const recargar = useCallback(() => {
    const anuncio = anuncioRef.current;
    if (!anuncio) return;
    setEstado('cargando');
    anuncio.load();
  }, []);

  const mostrar = useCallback((onRecompensa: () => void) => {
    if (simulado) {
      console.warn('[ads] DEV: no hay anuncio real, se otorga la recompensa igual');
      // Un respiro antes de dar la recompensa, para que el cierre del modal se
      // vea y el efecto no aparezca de golpe, como con el anuncio de verdad.
      setTimeout(onRecompensa, 400);
      return;
    }

    const anuncio = anuncioRef.current;
    if (!ads || !anuncio) return;
    const { AdEventType, RewardedAdEventType } = ads;

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

    anuncio.show();
  }, [simulado]);

  return { estado, listo: estado === 'listo' || simulado, simulado, mostrar, recargar };
}
