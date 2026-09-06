import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { Caldero } from '../cocina/Caldero';
import { otroQuemado, type Quemado } from '../cocina/quemados';
import { Caja } from '../inventario/Caja';
import {
  TIPOS_MINIMOS,
  agregar,
  cuanto,
  puedenSalir,
  quitar,
  saleDe,
  type Mezcla,
} from '../juego/caldero';
import { colorDeNivel } from '../juego/datos';
import { INGREDIENTES, familiaDe, normalizar } from '../juego/ingredientes';
import { RECETAS, claveDe, deClase, type Receta as TReceta } from '../juego/recetas';
import { useT, useBuscador } from '../i18n';
import { useJuego } from '../juego/store';
import { Pantalla } from '../shell/Pantalla';
import { colors, columnasDeIngredientes, radius, spacing } from '../theme';

/**
 * La cocina: el caldero.
 *
 * ## Por qué no es una lista de recetas
 *
 * El bolso ya es el catálogo: contesta **qué existe**, muestra las cincuenta y
 * una tengas o no cada cosa, y ordena por nivel para que se vea la escalera. Una
 * cocina que liste lo que se puede armar es ese mismo mueble con otro orden, y
 * entonces no hace falta como sección.
 *
 * Acá se **hace**. Se tira adentro, se ve qué sale y se prende el fuego. La
 * decisión de qué combinar es el juego; elegir la receta de una lista y que se
 * llene sola es un botón con forma de olla.
 *
 * ## Cargar es gratis, cocinar se cobra
 *
 * Meter y sacar del caldero no toca el bolso: es la mesa, no la olla. Recién al
 * prender el fuego se gasta **todo lo que hay adentro, salga algo o no**.
 *
 * Por eso la pantalla dice antes lo que sabe —cuántas recetas siguen en carrera,
 * y cuál sale si la mezcla es exacta— y el botón cambia de nombre y de color
 * cuando no va a salir nada. Perder ingredientes tiene que ser una decisión que
 * se tomó mirando, no una trampa.
 */
/** El aire de la despensa: el mismo a los costados y entre cajitas que el bolso. */
const AIRE = 10;

export function CocinaScreen() {
  const juego = useJuego((e) => e.juego);
  const cocinar = useJuego((e) => e.cocinar);
  const t = useT();
  const buscar = useBuscador();
  const tinte = colorDeNivel(juego.nivel);
  const { width } = useWindowDimensions();

  /** Lo que hay adentro. No se guarda: vive mientras estás parado acá. */
  const [mezcla, setMezcla] = useState<Mezcla>({});
  /**
   * Lo último que pasó al prender el fuego.
   *
   * O salió una receta, o se quemó y entonces hay un quemado que mostrar. Las
   * dos cosas se guardan juntas porque son el mismo momento, y el quemado se
   * sortea una sola vez —acá— y no al dibujar: sorteado en el render, cambiaría
   * de verdura cada vez que la pantalla se vuelve a pintar.
   */
  const [salio, setSalio] = useState<{ receta: TReceta | null; quemado: Quemado | null } | null>(
    null
  );
  const [busqueda, setBusqueda] = useState('');

  const sale = useMemo(() => saleDe(mezcla), [mezcla]);
  const posibles = useMemo(() => puedenSalir(mezcla), [mezcla]);
  const cuantas = cuanto(mezcla);
  const hayAlgo = cuantas > 0;

  /** Los renglones de adentro de la olla, uno por cosa distinta. */
  const adentro = Object.keys(mezcla).filter((id) => mezcla[id] > 0);
  /** Cuántas cosas DISTINTAS hay adentro. Es una ficha en la mesa cada una. */
  const tipos = adentro.length;

  /**
   * Alcanza para prender el fuego.
   *
   * No es que sea poco probable con menos: es imposible. Ninguna receta lleva
   * menos de `TIPOS_MINIMOS` cosas **distintas**, y ninguna repite ingrediente,
   * así que abajo de eso el botón no ofrece una apuesta mala sino una que no
   * existe.
   *
   * SE CUENTAN TIPOS Y NO UNIDADES. Antes miraba `cuantas`, que suma unidades, y
   * con tres manzanas daba por buena una olla de la que no podía salir nada.
   */
  const alcanza = tipos >= TIPOS_MINIMOS;

  /*
   * EL CALDERO NO TIENE TOPE.
   *
   * Lo tenía: `cuantas >= TOPE`, con `TOPE` sacado de la receta más cara del
   * catálogo —seis unidades—. La idea era no dejar tirar al vacío, porque
   * `saleDe` exige coincidencia exacta y con algo de más no sale nada.
   *
   * Se sacó porque frenaba antes de tiempo: querer poner cuatro duraznos y que
   * la olla deje de aceptar en el segundo se lee como que la app está rota, no
   * como una regla. El único límite que queda es el de verdad: no se puede
   * tirar lo que no se tiene.
   *
   * A cambio, ahora se puede armar una olla de la que no sale nada. Eso ya
   * pasaba con tres cosas mal elegidas; lo que cambia es que ahora también pasa
   * por cantidad.
   */

  /**
   * La olla terminó y todavía no se limpió.
   *
   * Es un estado propio y no un rato muerto entre dos: mientras dure, lo que
   * salió está a la vista y la despensa no acepta nada. Sin esto, el resultado
   * se borraba en el mismo toque con el que empezabas la mezcla siguiente — o
   * sea que la verdura quemada, que es lo que más se quiere ver, desaparecía
   * justo cuando ibas a mirarla.
   */
  const enResultado = salio !== null;

  /**
   * La despensa se arma igual que la del bolso: mismas columnas y mismo aire.
   *
   * Son la misma cosa vista en dos pantallas —las cajitas de lo que tenés—, así
   * que si acá entran cuatro y allá cinco, pasar de una a la otra se siente
   * como cambiar de app. La cuenta sale de `columnasDeIngredientes`.
   */
  const columnas = columnasDeIngredientes(width);
  const lado = Math.floor((width - AIRE * 2 - AIRE * (columnas - 1)) / columnas);

  /** Cuánto tenés de algo, sea ingrediente o preparación. */
  const enElBolso = (id: string) =>
    juego.inventario.ingredientes[id] ??
    juego.inventario.comidas[id] ??
    juego.inventario.pociones[id] ??
    0;

  /**
   * La despensa: **solo lo que tenés**.
   *
   * Un cajón con las setenta y tres cosas que existen es el bolso otra vez. Acá
   * lo único que sirve es lo que se puede levantar y tirar adentro.
   */
  const despensa = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const cosas = [
      // LOS DE COCINA PRIMERO, igual que en el bolso. La lista de datos arranca
      // por el campo, asi que sin esto la despensa abria con hierbas y flores
      // aunque lo que se este por cocinar sea una comida. El orden adentro de
      // cada familia se mantiene: solo se adelanta un bloque entero.
      ...[...INGREDIENTES].sort(
        (x, y) => Number(familiaDe(x.lugar) === 'campo') - Number(familiaDe(y.lugar) === 'campo')
      ).map((i) => ({
        id: i.id,
        clave: `ingredientes.${i.id}`,
        nombre: t(`ingredientes.${i.id}`),
        arte: i.arte,
        nota: t('cocina.esIngrediente'),
      })),
      // LAS COMIDAS ANTES QUE LAS POCIONES. `RECETAS` viene con las pociones
      // primero porque es el orden en que se escribieron, y eso no es un orden
      // para mirar: las comidas son cuarenta contra doce, asi que dejarlas
      // segundas obliga a pasar de largo las pociones cada vez.
      ...[...deClase('comida'), ...deClase('pocion')].map((r) => ({
        id: r.id,
        clave: claveDe(r),
        nombre: t(claveDe(r)),
        arte: r.arte,
        nota: t(r.clase === 'pocion' ? 'cocina.esPocion' : 'cocina.esComida', { nivel: r.nivel }),
      })),
    ].filter((c) => enElBolso(c.id) > 0);

    // Igual que en el bolso: se busca por todos los nombres, no por el que
    // esta a la vista.
    return q ? cosas.filter((c) => buscar(c.clave, busqueda.trim())) : cosas;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, juego.inventario]);

  /**
   * El nombre de algo que está en la olla.
   *
   * Sale del diccionario, igual que en la despensa. Es un ingrediente o una
   * receta, y no hay más opciones: lo que se pudo levantar es lo único que puede
   * estar adentro.
   */
  const nombreDe = (id: string) =>
    INGREDIENTES.some((i) => i.id === id)
      ? t(`ingredientes.${id}`)
      : (() => {
          const r = RECETAS.find((x) => x.id === id);
          return r ? t(claveDe(r)) : id;
        })();

  const arteDe = (id: string) =>
    INGREDIENTES.find((i) => i.id === id)?.arte ?? RECETAS.find((r) => r.id === id)?.arte;

  function prender() {
    const receta = cocinar(mezcla);
    setSalio({ receta, quemado: receta ? null : otroQuemado(salio?.quemado ?? null) });
    setMezcla({});
  }

  /**
   * Los casilleros vacíos que quedan en la mesa.
   *
   * El espacio de la mesa está reservado siempre —si apareciera al tirar la
   * primera cosa, empujaría la despensa y el segundo toque caería sobre otro
   * ingrediente—, y reservado y liso era un rectángulo de fondo vacío en el
   * medio de la pantalla. Con los casilleros, ese mismo espacio pasa a decir
   * algo: cuántos lugares quedan libres.
   *
   * SE DESCUENTAN FICHAS, NO UNIDADES. Antes restaba `cuantas`, que cuenta
   * unidades, mientras que la fila dibuja **una ficha por ingrediente
   * distinto**: al tirar la segunda banana el total no cambiaba de ficha —solo
   * subía su número— pero se borraba un casillero igual, y la fila pasaba de
   * tres lugares a dos. Con la tercera quedaba un solo casillero y la mesa se
   * veía rota.
   *
   * Los dos números miden cosas distintas y solo coinciden mientras todo lo que
   * tirás sea diferente, que es el caso en el que se probó.
   *
   * Con algo ya salido no van: ahí la mesa muestra en qué se convirtió todo, y
   * unos casilleros al lado leerían como que falta algo más.
   */
  const huecos = salio ? 0 : Math.max(0, TIPOS_MINIMOS - tipos);

  return (
    <Pantalla titulo={t('cocina.titulo')} seccion="cocina">
      <ScrollView contentContainerStyle={estilos.hoja}>
        <View style={estilos.olla}>
          <Caldero ancho={Math.min(250, width * 0.62)} tinte={tinte} encendido={hayAlgo} />
        </View>

        {/* Lo que hay adentro, tocable para sacarlo. Sacar es gratis y tiene que
            verse que lo es: si no, cargar la olla da miedo.

            El alto está reservado aunque no haya nada. Si la fila apareciera al
            tirar la primera cosa, empujaría la despensa hacia abajo y el segundo
            toque caería sobre otro ingrediente — que es justo el error que este
            caldero cobra. */}
        <View style={estilos.dentro}>
          {/* Lo que salió, bien o mal, se dibuja igual: suelto y grande, en el
              mismo lugar donde estaban los ingredientes. Es en lo que se
              convirtieron.

              Sin recuadro y sin nombre. El recuadro lo convertía en una ficha de
              inventario más, y el nombre repetía lo que el dibujo ya dice. Donde
              importa el nombre igual está: en el bolso, adonde fue a parar, y en
              la etiqueta que lee un lector de pantalla. */}
          {salio ? (
            <Image
              source={salio.receta ? salio.receta.arte : salio.quemado!.arte}
              style={estilos.resultado}
              resizeMode="contain"
              fadeDuration={0}
              accessibilityLabel={
                salio.receta
                  ? t('cocina.salio', { receta: t(claveDe(salio.receta)) })
                  : t('cocina.seQuemo')
              }
            />
          ) : null}

          {adentro.map((id) => (
            <Pressable
              key={id}
              onPress={() => setMezcla((m) => quitar(m, id))}
              style={({ pressed }) => [estilos.ficha, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={t('cocina.sacar', { cosa: nombreDe(id) })}
            >
              <Image source={arteDe(id)} style={estilos.fichaArte} resizeMode="contain" />
              <Text style={estilos.fichaTexto} numberOfLines={1}>
                {nombreDe(id)}
              </Text>
              <View style={[estilos.fichaCuenta, { backgroundColor: tinte }]}>
                <Text style={estilos.fichaCuentaTexto}>{mezcla[id]}</Text>
              </View>
            </Pressable>
          ))}

          {/* Los lugares que faltan. No son tocables: no hay nada que sacar de
              un hueco, y hacerlos tocables invitaría a llenarlos desde acá
              cuando lo que se toca es la despensa de abajo. */}
          {Array.from({ length: huecos }, (_, i) => (
            <View
              key={`hueco-${i}`}
              style={[estilos.hueco, { borderColor: `${tinte}55` }]}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          ))}
        </View>

        {/* El estado del caldero, en una sola línea. */}
        <Text style={[estilos.pista, sale || salio?.receta ? { color: tinte } : null]}>
          {/* Un "Salió Savia" al lado de la savia dibujada es la misma frase dos
              veces. Lo quemado sí se dice, porque no queda nada que mostrar. */}
          {/* Los dos resultados se cuentan igual: el dibujo arriba y una línea
              abajo. Cuando el nombre estaba pegado al dibujo, decirlo otra vez
              acá era la misma frase dos veces; suelto debajo, es el pie de lo
              que se ve. */}
          {salio
            ? salio.receta
              ? // El nombre pelado y sin "Salió": es el pie del dibujo de arriba,
                // no el anuncio de un hecho. Lo que pasó ya se ve.
                t(claveDe(salio.receta))
              : t('cocina.quemado')
            : !hayAlgo
              ? t('cocina.vacia')
              : !alcanza
                ? // Se dice qué hacer, no qué no se puede. La regla es la misma,
                  // pero "agrega" deja al jugador con un próximo paso y la otra
                  // redacción lo dejaba con un dato.
                  t('cocina.minimo', { minimo: TIPOS_MINIMOS })
                : sale
                  ? t('cocina.vaASalir', { receta: t(claveDe(sale)) })
                  : posibles.length === 1
                    ? t('cocina.empiezanAsi_una')
                    : posibles.length
                      ? t('cocina.empiezanAsi', { cantidad: posibles.length })
                      : t('cocina.nadaSale')}
        </Text>

        <View style={estilos.botones}>
          {enResultado ? (
            // Ocupa el lugar de "Cocinar" a propósito: el pulgar ya está ahí y
            // no hay que salir a buscar cómo seguir.
            <Pressable
              onPress={() => setSalio(null)}
              style={({ pressed }) => [
                estilos.prender,
                // Hueco: es un paso de trámite, no el premio. Macizo competía
                // con el plato que acaba de salir, que es lo que hay que mirar.
                { backgroundColor: 'transparent', borderColor: tinte },
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('cocina.limpiarLaOlla')}
            >
              <Text style={[estilos.prenderTexto, { color: tinte }]}>{t('cocina.limpiar')}</Text>
            </Pressable>
          ) : (
          <Pressable
            onPress={prender}
            disabled={!alcanza}
            style={({ pressed }) => [
              estilos.prender,
              // Tres estados, y ninguno gris sobre gris. Apagado es hueco con
              // borde tenue —se lee que no se puede sin tener que adivinar qué
              // dice—; con receta es macizo, que es la única acción del juego
              // que da algo; y sin receta es hueco naranja, el mismo aviso que
              // el borde, no un relleno oscuro con letra oscura encima.
              !alcanza
                ? { backgroundColor: 'transparent', borderColor: colors.border }
                : sale
                  ? { backgroundColor: tinte, borderColor: tinte }
                  : { backgroundColor: 'transparent', borderColor: QUEMA },
              pressed && alcanza && { opacity: 0.75 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              sale ? t('cocina.cocinarReceta', { receta: t(claveDe(sale)) }) : t('cocina.cocinar')
            }
          >
            <Text
              style={[
                estilos.prenderTexto,
                { color: sale ? colors.sobreTinte : alcanza ? QUEMA : colors.textMuted },
              ]}
            >
              {/* Siempre "Cocinar". Lo que cambia es el color: naranja cuando no
                  va a salir nada. El aviso ya está en el renglón de arriba y en
                  el borde del botón, y agregarle "igual" era decirlo por tercera
                  vez, con un tono que suena a reproche antes de que pase nada. */}
              {t('cocina.cocinar')}
            </Text>
          </Pressable>

          )}

          {hayAlgo && !enResultado ? (
            <Pressable
              onPress={() => setMezcla({})}
              style={({ pressed }) => [estilos.vaciar, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={t('cocina.vaciarLaOlla')}
            >
              <Text style={estilos.vaciarTexto}>{t('cocina.vaciar')}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={estilos.separador} />

        {/* Apagada mientras se muestra el resultado, y no solo sorda: una
            despensa que se ve igual pero no responde parece rota. Apagada se
            lee como "ahora no", que es lo que es. Sacar sigue disponible: las
            fichas de la mesa, arriba. */}
        <View
          pointerEvents={enResultado ? 'none' : 'auto'}
          style={enResultado ? estilos.dormida : null}
        >
        <View style={estilos.buscador}>
          <Ionicons name="search" size={16} color={colors.textFaint} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder={t('cocina.buscarDespensa')}
            placeholderTextColor={colors.textFaint}
            style={estilos.campo}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {busqueda ? (
            <Pressable
              onPress={() => setBusqueda('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('cocina.borrarBusqueda')}
            >
              <Ionicons name="close-circle" size={16} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>

        {despensa.length ? (
          <View style={estilos.grilla}>
            {despensa.map((c) => {
              // Lo que queda para agarrar: lo del bolso menos lo que ya está en
              // la olla. Sin restar, se puede tirar cinco veces algo que tenés
              // una sola vez y recién falla al cocinar.
              const queda = enElBolso(c.id) - (mezcla[c.id] ?? 0);
              return (
                <Caja
                  key={c.id}
                  nombre={c.nombre}
                  arte={c.arte}
                  color={tinte}
                  cuantos={queda}
                  nota={c.nota}
                  lado={lado}
                  // Mientras quede en el bolso se puede seguir tirando, sin
                  // tope de cuántas.
                  onPress={queda > 0 ? () => setMezcla((m) => agregar(m, c.id)) : undefined}
                />
              );
            })}
          </View>
        ) : (
          <Text style={estilos.nada}>
            {busqueda.trim()
              ? t('cocina.sinResultado')
              : t('cocina.despensaVacia')}
          </Text>
        )}
        </View>
      </ScrollView>
    </Pantalla>
  );
}

/** El color del aviso: cocinar algo que no es nada. */
const QUEMA = '#E0784A';

const estilos = StyleSheet.create({
  hoja: { padding: AIRE, paddingBottom: spacing.xl },

  olla: { alignItems: 'center' },

  dentro: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    /**
     * LA LÍNEA VA CENTRADA, no pegada arriba.
     *
     * Con `flexWrap` la fila pasa a ser una línea, y `alignContent` —que por
     * defecto es `flex-start`— la apoya contra el borde de arriba del alto
     * reservado. El alto de esa línea lo marca el hijo más alto: los huecos
     * miden 62 y la ficha 57, así que al llenar la mesa desaparecían los
     * huecos, la línea se achicaba y las tres fichas subían tres puntos.
     *
     * Se veía solo con la mesa llena: mientras quedara un hueco, él seguía
     * marcando los 62 y nada se movía.
     */
    alignContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    // Reservado: la despensa de abajo no se mueve nunca. Da para la ficha más
    // alta y para el quemado, que es lo más grande que puede aparecer acá.
    height: 80,
  },
  /**
   * Un lugar vacío de la mesa. Punteado y sin relleno: se lee como un sitio
   * donde va a ir algo, no como una ficha apagada.
   */
  hueco: {
    width: 62,
    height: 62,
    borderRadius: radius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  ficha: {
    width: 62,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  fichaArte: { width: 34, height: 34 },
  fichaTexto: { color: colors.textMuted, fontSize: 9.5, textAlign: 'center' },
  /**
   * La cuenta. **El alto sale del texto, no al revés.**
   *
   * Tenía un `height` fijo de 16, medido contra el número a tamaño normal. Con
   * la tipografía del sistema más grande —una tablet suele traerla así— la caja
   * del texto crece, la píldora no, y el número se desborda por abajo hasta
   * quedar pegado al borde.
   *
   * Con `paddingVertical` la píldora crece con lo que tiene adentro y anda con
   * cualquier tamaño de letra. El `borderRadius` va en 999 por lo mismo: con la
   * mitad del alto anotada a mano deja de ser un círculo apenas el alto cambia.
   */
  fichaCuenta: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  fichaCuentaTexto: {
    color: colors.sobreTinte,
    fontSize: 10,
    fontWeight: '700',
    // Las dos juntas son las que centran de verdad en Android: sin ellas el
    // sistema le agrega un relleno propio arriba y abajo que no es simétrico, y
    // el número queda corrido aunque la caja tenga el alto que corresponde.
    lineHeight: 12,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  // Suelto y grande: es lo único que hay para ver, y la fila ya tiene el alto
  // reservado para él, así que nada de abajo se mueve.
  resultado: { width: 76, height: 76 },

  pista: {
    color: colors.textMuted,
    fontSize: 13.5,
    textAlign: 'center',
    marginTop: spacing.sm,
    minHeight: 19,
  },

  botones: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  prender: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  prenderTexto: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  // Mitad y mitad con "Cocinar": son las dos salidas de la misma decisión y
  // ninguna es más importante que la otra. De apéndice angosto al costado, se
  // leía como un botón de segunda.
  vaciar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  vaciarTexto: { color: colors.text, fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },

  separador: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  campo: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 8 },

  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: AIRE },
  nada: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.md },
  dormida: { opacity: 0.35 },
});
