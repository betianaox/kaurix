import React, { useState } from 'react';
import { LayoutChangeEvent, Modal, StyleSheet, Text, View } from 'react-native';

import { CartaGrande } from '../album/CartaGrande';
import type { Casilla } from '../album/casillas';
import { Hoja } from '../album/Hoja';
import { Libro } from '../album/Libro';
import { albumCompleto } from '../album/sorteo';
import { Conseguido } from '../components/Conseguido';
import { COLOR_NIVEL, NIVELES } from '../juego/datos';
import { useJuego } from '../juego/store';
import { useT } from '../i18n';
import { Pantalla } from '../shell/Pantalla';
import { colors, spacing } from '../theme';

/**
 * El álbum de figuritas.
 *
 * Ocho hojas, una por vuelta, y nueve cartas en cada una: los ocho bichos
 * alrededor y la legendaria en el centro. Se hojea arrastrando.
 *
 * Arranca vacío y se muestra entero desde el primer día. Ver los setenta y dos
 * huecos es lo que da ganas de llenarlos; un álbum que va apareciendo a medida
 * que se completa no le dice a nadie cuánto falta.
 *
 * ## Y cuando se llena, se termina el juego
 *
 * Las ocho hojas completas son el final. Se anuncia con el mismo cartel que
 * todo lo demás que se gana, y ofrece las dos únicas salidas que tiene sentido
 * ofrecer: empezar otra vez, o quedárselo lleno para mirarlo.
 */

/** El mismo dibujo que tiene el álbum en el footer. Ver la memoria de iconos. */
const ICONO = require('../../assets/ui/album.webp');

export function AlbumScreen() {
  const juego = useJuego((e) => e.juego);

  // Abre en la vuelta en curso, no en la primera: es donde está pasando algo.
  const [indice, setIndice] = useState(() => Math.min(NIVELES, juego.nivel) - 1);
  const [abierta, setAbierta] = useState<{
    casilla: Casilla;
    nivel: number;
    ganada: boolean;
  } | null>(null);

  const t = useT();
  const volverAEmpezar = useJuego((e) => e.volverAEmpezar);

  /**
   * Cerrar el festejo **no es una decisión, es un rato**.
   *
   * Se guarda acá adentro y no en el disco: apagarlo dura mientras dure esta
   * visita al álbum, y la próxima vez que se entra el juego vuelve a ofrecer
   * empezar de nuevo.
   *
   * Un 'ya lo vi' escrito en el guardado dejaba el juego terminado sin ninguna
   * forma de terminarlo: quien quisiera mirar el álbum lleno un rato perdía
   * para siempre el botón de volver a empezar. La oferta tiene que seguir ahí.
   */
  const [pospuesto, setPospuesto] = useState(false);

  /**
   * El juego está terminado y el cartel no está pospuesto.
   *
   * Se mira acá y no al ganar la última carta a propósito: la carta que cierra
   * el álbum se gana en la ficha del bicho, donde ya se encadenan dos carteles
   * —la carta y su dorada—, y un tercero encima convertiría el momento en una
   * fila de ventanas. Acá el álbum lleno está a la vista detrás del cartel, que
   * es justamente lo que hay para mostrar.
   */
  const terminado = albumCompleto(juego.cartas) && !pospuesto;

  const [caja, setCaja] = useState({ ancho: 0, alto: 0 });
  const medir = (e: LayoutChangeEvent) =>
    setCaja({ ancho: e.nativeEvent.layout.width, alto: e.nativeEvent.layout.height });

  return (
    <Pantalla titulo={t('album.titulo')} seccion="album">
      <View style={estilos.hoja}>
        <View style={estilos.libro} onLayout={medir}>
          {caja.ancho > 0 ? (
            <Libro
              total={NIVELES}
              indice={indice}
              onCambio={setIndice}
              ancho={caja.ancho}
              alto={caja.alto}
              hoja={(i) => (
                <Hoja
                  nivel={i + 1}
                  /* Las que de verdad conseguiste. Estuvo un tiempo cableado a
                     las nueve para poder mirar el arte mientras se dibujaba;
                     con eso puesto el álbum no era un álbum, era una galería. */
                  ganadas={juego.cartas}
                  ancho={caja.ancho}
                  alto={caja.alto}
                  // La que no conseguiste no abre nada. Agrandar un hueco para
                  // mostrar el hueco en grande es prometer algo y no darlo: se
                  // toca esperando ver la carta y aparece la misma nada.
                  onCarta={(casilla, ganada) =>
                    ganada ? setAbierta({ casilla, nivel: i + 1, ganada }) : undefined
                  }
                />
              )}
            />
          ) : null}
        </View>

        {/* En qué hoja estás, con el color de cada ciclo.

            Acá los puntos **sí** son un paginador: pasan hojas. En la colección
            había unos iguales que no navegaban a ningún lado, y se sacaron
            justamente por eso: dos componentes idénticos que hacen cosas
            distintas enseñan a tocar donde no hay nada. */}
        <View style={estilos.puntos}>
          {COLOR_NIVEL.map((color, i) => (
            <View
              key={i}
              style={[
                estilos.punto,
                { backgroundColor: color },
                i === indice && estilos.puntoActual,
                i !== indice && { opacity: 0.3 },
              ]}
            />
          ))}
        </View>

      </View>

      <CartaGrande abierta={abierta} onCerrar={() => setAbierta(null)} />

      {/* Adentro de un Modal, igual que el reparto de cartas: `Pantalla` mete
          los children en el cuerpo, debajo del header, así que suelto acá
          quedaría el título y la X de cerrar por encima del festejo — y con
          esa X se saldría del final del juego sin haberlo leído. */}
      {terminado ? (
        <Modal visible transparent animationType="none" statusBarTranslucent>
          <Conseguido
            arte={ICONO}
            texto={t('album.completaste')}
            detalle={t('album.albumLleno')}
            // Oro y no el color de la vuelta: acá no hay vuelta en curso, están
            // las ocho terminadas, y elegir uno de los ocho sería arbitrario —el
            // mismo final se vería distinto según en cuál te agarró. Ver
            // `colors.doradoTinta`, que es el oro que se puede leer sobre papel.
            tinte={colors.doradoTinta}
            // El festejo grande, el mismo de las doradas. Si terminar el juego
            // festejara como una carta cualquiera, no se notaría que terminó.
            festejo
            // Y con la estrella de las doradas detrás, no el halo redondo de
            // los ingredientes: lo que se está festejando es del tamaño de una
            // dorada, no del de haber juntado una zanahoria.
            fondo="estrella"
            aceptar={t('album.volverAEmpezar')}
            onAceptar={() => {
              volverAEmpezar();
              // Y de vuelta a la primera hoja. El número de hoja se fija al
              // montar la pantalla, así que sin esto el álbum recién
              // vaciado se quedaba abierto en la octava.
              setIndice(0);
            }}
            // Postergarlo es la opción segura y por eso va con la ficha de
            // cerrar: no borra nada y no cierra ninguna puerta. El álbum queda
            // lleno para mirarlo, y al volver a entrar el cartel está de vuelta.
            rechazar={{ texto: t('album.ahoraNo'), onPress: () => setPospuesto(true) }}
          />
        </Modal>
      ) : null}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  hoja: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    // El botón de buscar sobresale por encima de la barra de abajo: sin este
    // aire, los puntos de vuelta le quedan debajo y se cortan.
    paddingBottom: 30,
    gap: spacing.sm,
  },
  libro: { flex: 1 },

  puntos: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
    height: 16,
  },
  punto: { width: 8, height: 8, borderRadius: 4 },
  puntoActual: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.text,
  },

});
