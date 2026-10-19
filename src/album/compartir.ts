import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

/**
 * ───────────────────────────────────────────────────────────────────────────
 * COMPARTIR UNA CARTA
 * ───────────────────────────────────────────────────────────────────────────
 * Se manda una **imagen**, no un texto con un link. Un link pelado en un chat
 * no lo abre nadie; lo que hace que alguien quiera jugar es ver la carta. Por
 * eso lo que viaja es el dibujo, con el nombre del juego y la insignia de Play
 * impresos abajo: ver `TarjetaCompartir`.
 *
 * Es lo mismo que hace Oráculos con sus lecturas, incluido el detalle del
 * nombre del archivo que está acá abajo.
 */

/**
 * `captureRef` deja la foto en un temporal que se llama
 * `ReactNative-snapshot-image8412034.png`, y ese nombre viaja: es el que ve
 * quien la recibe y el que le queda en la galería. Dice de qué librería está
 * hecha la app, que es exactamente lo que no importa.
 *
 * Por eso se muda a un nombre propio antes de mandarla. Se muda y no se copia,
 * para no dejar dos archivos por cada vez que se comparte.
 */
function nombreDeArchivo(carta: string): string {
  // Sin acentos ni espacios: el nombre pasa por el sistema de archivos, por el
  // menú de compartir y por la app que lo reciba, y cualquiera de los tres
  // puede romperlo.
  const limpio = carta.normalize('NFD').replace(/[^a-z0-9]/gi, '') || 'carta';
  return `Kaurix-${limpio}.png`;
}

/**
 * Saca la foto de la tarjeta y abre el menú de compartir del sistema.
 *
 * **No se elige la app de destino desde acá.** Se abre el menú del sistema y
 * cada quien la manda adonde quiera, o la guarda. Eso además evita el problema
 * de siempre, que es apuntar a una app que no está instalada.
 *
 * Devuelve `false` si el dispositivo no sabe compartir —no pasa en Android,
 * pasa en un emulador pelado—: no es un error y no hay nada que avisar.
 */
export async function compartirCarta(
  ref: RefObject<View | null>,
  carta: string,
  titulo: string
): Promise<boolean> {
  if (!ref.current) return false;
  if (!(await Sharing.isAvailableAsync())) return false;

  // PNG y no JPG: el arte de las cartas tiene bordes dorados finos y zonas
  // planas, y el JPG las ensucia justo ahí.
  const temporal = await captureRef(ref, { format: 'png', quality: 1 });

  const foto = new File(temporal);
  const destino = new File(Paths.cache, nombreDeArchivo(carta));
  await foto.move(destino, { overwrite: true });

  await Sharing.shareAsync(destino.uri, {
    mimeType: 'image/png',
    dialogTitle: titulo,
    UTI: 'public.png',
  });
  return true;
}
