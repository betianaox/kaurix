import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import React from 'react';
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { useT } from '../i18n';
import { IDIOMAS } from '../i18n/idiomas';
import { colorDeNivel } from '../juego/datos';
import { useJuego } from '../juego/store';
import type { Rutas } from '../navegacion/rutas';
import { Pantalla } from '../shell/Pantalla';
import { colors, radius, spacing } from '../theme';

/**
 * Cómo se juega, y el idioma. Vive detrás del `?`, que va siempre arriba a la
 * derecha.
 *
 * ## El orden es el de alguien que abre esto sin saber nada
 *
 * **Buscar va primero**, y no por orden alfabético ni por el del footer: es lo
 * único que no se parece a ningún otro juego. Todo lo demás —criar, cocinar,
 * juntar— se entiende solo; que las criaturas estén en tu casa y que los
 * ingredientes salgan de lo que apuntás, no.
 *
 * Cada bloque lleva **el icono que esa sección tiene en el footer**. Así lo que
 * se lee acá se reconoce después ahí abajo sin tener que leer nada, y la ayuda
 * deja de ser una pared de texto.
 *
 * El icono y el nombre van juntos arriba, y el párrafo abajo a todo el ancho.
 *
 * ## El idioma y los enlaces van acá y no en una pantalla propia
 *
 * Es el mismo lugar que en Oráculos, y a propósito: **es un estándar entre las
 * apps de Imago**. Quien usa una y después la otra busca el idioma donde ya lo
 * encontró una vez. Una pantalla de ajustes aparte sería más ordenada en el
 * papel y peor de encontrar, para una app que tiene exactamente un ajuste.
 *
 * La lista también sigue el patrón: un rótulo, un grupo con borde, una fila por
 * idioma y un tilde en la puesta. **Cada idioma se nombra en sí mismo** —
 * "Português", no "Portugués"—, porque quien lo busca lo reconoce por cómo se
 * ve, no traducido a un idioma que no lee. Ese es el único texto de la app que
 * no pasa por el diccionario, y es correcto que no pase.
 */

/** Los mismos dibujos del footer: lo que se explica acá se reconoce allá. */
const ICONOS: Record<string, ImageSourcePropType> = {
  buscar: require('../../assets/ui/buscar.webp'),
  coleccion: require('../../assets/ui/coleccion.webp'),
  cocina: require('../../assets/ui/cocina.webp'),
  inventario: require('../../assets/ui/inventario.webp'),
  album: require('../../assets/ui/album.webp'),
};

const URL_PLAY = 'https://play.google.com/store/apps/details?id=com.imagostack.kaurix';
const CORREO = 'support@imagostack.com';

export function AyudaScreen() {
  const t = useT();
  const nav = useNavigation<NativeStackNavigationProp<Rutas>>();
  const idioma = useJuego((e) => e.juego.idioma);
  const nivel = useJuego((e) => e.juego.nivel);
  const setIdioma = useJuego((e) => e.setIdioma);
  const olvidarSaludo = useJuego((e) => e.olvidarSaludo);
  const completarAlbum = useJuego((e) => e.completarAlbum);
  const tinte = colorDeNivel(nivel);

  const abrir = (url: string) => {
    void Linking.openURL(url).catch(() => {});
  };

  /** La política vive en el sitio, y en el idioma de la app. */
  const urlPrivacidad = `https://imagostack.com${idioma === 'es' ? '' : `/${idioma}`}/apps/kaurix/privacidad`;
  const version = Constants.expoConfig?.version ?? '';

  return (
    <Pantalla titulo={t('ayuda.titulo')} encima>
      <ScrollView contentContainerStyle={estilos.hoja}>
        <Text style={[estilos.rotulo, estilos.rotuloPrimero]}>{t('ayuda.comoSeJuega')}</Text>

        <View style={estilos.grupo}>
          {/* Buscar lleva dos párrafos y es el único: uno para la criatura y
              otro para los ingredientes. Son dos cosas distintas que pasan en
              la misma pantalla, y la segunda es la que nadie se imagina. */}
          <Bloque
            icono="buscar"
            tinte={tinte}
            titulo={t('ayuda.buscarTitulo')}
            textos={[t('ayuda.buscarTexto'), t('ayuda.buscarAumentada')]}
          />
          <Bloque
            icono="coleccion"
            tinte={tinte}
            titulo={t('ayuda.coleccionTitulo')}
            textos={[t('ayuda.coleccionTexto')]}
            borde
          />
          <Bloque
            icono="cocina"
            tinte={tinte}
            titulo={t('ayuda.cocinaTitulo')}
            textos={[t('ayuda.cocinaTexto')]}
            borde
          />
          <Bloque
            icono="inventario"
            tinte={tinte}
            titulo={t('ayuda.inventarioTitulo')}
            textos={[t('ayuda.inventarioTexto')]}
            borde
          />
          <Bloque
            icono="album"
            tinte={tinte}
            titulo={t('ayuda.albumTitulo')}
            textos={[t('ayuda.albumTexto')]}
            borde
          />
        </View>

        {/* ── El idioma ───────────────────────────────────────────────────── */}
        <Text style={estilos.rotulo}>{t('ajustes.idioma')}</Text>
        <View style={estilos.grupo}>
          {IDIOMAS.map((item, i) => {
            const puesto = item.codigo === idioma;
            return (
              <Pressable
                key={item.codigo}
                onPress={() => setIdioma(item.codigo)}
                style={({ pressed }) => [
                  estilos.fila,
                  i > 0 && estilos.filaBorde,
                  pressed && estilos.filaPresionada,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: puesto }}
                accessibilityLabel={item.etiqueta}
              >
                <Text style={estilos.filaTitulo}>{item.etiqueta}</Text>
                {puesto ? <Ionicons name="checkmark" size={20} color={tinte} /> : null}
              </Pressable>
            );
          })}
        </View>

        {/* ── Acerca de ───────────────────────────────────────────────────── */}
        <Text style={estilos.rotulo}>{t('ayuda.acerca')}</Text>
        <View style={estilos.grupo}>
          {(
            [
              ['star-outline', 'valorar', () => abrir(URL_PLAY)],
              ['shield-checkmark-outline', 'privacidad', () => abrir(urlPrivacidad)],
              ['mail-outline', 'contacto', () => abrir(`mailto:${CORREO}`)],
            ] as const
          ).map(([icono, clave, alTocar], i) => (
            <Pressable
              key={clave}
              onPress={alTocar}
              style={({ pressed }) => [
                estilos.fila,
                i > 0 && estilos.filaBorde,
                pressed && estilos.filaPresionada,
              ]}
              accessibilityRole="button"
            >
              <Ionicons name={icono} size={20} color={colors.textMuted} />
              <Text style={estilos.filaTitulo}>{t(`ayuda.${clave}`)}</Text>
              <Ionicons name="open-outline" size={16} color={colors.textFaint} />
            </Pressable>
          ))}
        </View>

        <Text style={estilos.version}>{t('ayuda.version', { v: version })}</Text>

        {/* Herramientas de desarrollo: `__DEV__` es falso en el build de
            producción, así que estos botones no existen allí. Las dos puntas
            del juego —cómo se ve al abrirlo por primera vez y cómo se ve al
            terminarlo— son justamente las que no se pueden mirar jugando, una
            porque ya pasó y la otra porque está a sesenta y cuatro crianzas. */}
        {__DEV__ ? (
          <>
            <Pressable
              // Cierra la ayuda además de reactivar el saludo: el saludo vive
              // sobre el navegador, así que dejando esta hoja abierta aparecía
              // detrás de ella y parecía que el botón no hacía nada.
              onPress={() => {
                olvidarSaludo();
                nav.goBack();
              }}
              style={({ pressed }) => [estilos.dev, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
            >
              <Text style={estilos.devTexto}>{t('ayuda.verSaludo')}</Text>
            </Pressable>

            <Pressable
              // Llena el álbum y lleva ahí, que es donde vive el festejo. No
              // abre una maqueta: deja las mismas cartas que dejaría terminar
              // el juego, así que lo que aparece es la pantalla de verdad.
              //
              // `replace` y no `navigate`: la ayuda es una hoja modal encima de
              // la pantalla anterior, y navegando quedaba apilada debajo del
              // álbum — al volver atrás se caía otra vez en la ayuda.
              onPress={() => {
                completarAlbum();
                nav.replace('Album');
              }}
              style={({ pressed }) => [estilos.dev, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
            >
              <Text style={estilos.devTexto}>{t('ayuda.verFinal')}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </Pantalla>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Una sección del juego: su icono, su nombre y qué se hace ahí.
 *
 * ## El icono y el nombre arriba, el texto abajo
 *
 * Los tres estuvieron en una fila —icono a la izquierda, título y párrafo en una
 * columna al lado—, y ahí el texto arrancaba corrido a la derecha en una caja
 * más angosta que la hoja. Con cinco bloques seguidos eso es una canaleta de
 * texto flaca al lado de una fila de dibujos, y cada renglón entraba menos
 * palabras de las que entran.
 *
 * Ahora el icono y el nombre forman el encabezado —se leen como una sola cosa,
 * que es lo que son: el nombre de esa sección— y el párrafo va debajo ocupando
 * todo el ancho.
 *
 * Los iconos siguen alineados a la izquierda uno abajo del otro, así que la
 * columna que se recorre de un vistazo —la misma que está en el footer— no se
 * pierde.
 */
function Bloque({
  icono,
  titulo,
  textos,
  tinte,
  borde = false,
}: {
  icono: keyof typeof ICONOS;
  titulo: string;
  textos: string[];
  tinte: string;
  borde?: boolean;
}) {
  return (
    <View style={[estilos.bloque, borde && estilos.filaBorde]}>
      <View style={estilos.encabezado}>
        <Image source={ICONOS[icono]} style={estilos.icono} resizeMode="contain" fadeDuration={0} />
        <Text style={[estilos.bloqueTitulo, { color: tinte }]}>{titulo}</Text>
      </View>
      {textos.map((texto, i) => (
        <Text key={i} style={estilos.bloqueTexto}>
          {texto}
        </Text>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  hoja: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },

  rotulo: {
    color: colors.textFaint,
    fontSize: 10.5,
    letterSpacing: 2,
    // Aire antes de cada rótulo, que es lo que separa un grupo del siguiente.
    marginTop: spacing.md,
  },
  /**
   * El primero no lo lleva.
   *
   * La hoja ya trae su propio margen arriba, así que el de más caía encima y
   * el primer rótulo quedaba al doble de distancia del header que del borde de
   * al lado. Ese aire separa grupos entre sí; arriba del primero no hay ningún
   * grupo del que separarse.
   */
  rotuloPrimero: { marginTop: 0 },

  grupo: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    // Recorta las filas contra las esquinas redondeadas: sin esto, la de arriba
    // y la de abajo pintan sus rectángulos por encima de la curva al tocarlas.
    overflow: 'hidden',
  },

  /** El encabezado arriba y los párrafos abajo, uno tras otro. */
  bloque: { padding: spacing.md, gap: 8 },

  /**
   * El icono y el nombre, en la misma línea.
   *
   * Centrados entre sí y no alineados por arriba: el dibujo es más alto que la
   * palabra, y colgados del mismo techo el nombre quedaba pegado al borde de
   * arriba del icono en vez de a su altura.
   */
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  /** El dibujo del footer, del tamaño en que se lo ve allá. */
  icono: { width: 34, height: 34 },
  bloqueTitulo: { fontSize: 15.5, fontWeight: '700', letterSpacing: 0.2 },
  /**
   * El párrafo, liviano.
   *
   * Es el mismo criterio que en la bienvenida: lo que pesa es el título, que
   * ordena la pantalla, y el texto se lee de un saque sin competirle. Con los
   * dos al mismo tono el bloque era una pared gris pareja.
   */
  bloqueTexto: {
    color: colors.textFaint,
    fontSize: 14,
    lineHeight: 20.5,
    fontWeight: '300',
  },

  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  // Separador entre filas, no marco: la primera no lo lleva.
  filaBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  filaPresionada: { backgroundColor: colors.surfaceAlt },
  filaTitulo: { flex: 1, color: colors.text, fontSize: 16 },

  version: {
    color: colors.textFaint,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  dev: { alignSelf: 'center', padding: spacing.sm },
  devTexto: { color: colors.textFaint, fontSize: 12, textDecorationLine: 'underline' },
});
