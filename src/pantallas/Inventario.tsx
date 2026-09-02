import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { useT } from '../i18n';
import { Caja } from '../inventario/Caja';
import { DondeSeEncuentra } from '../inventario/DondeSeEncuentra';
import { Receta } from '../inventario/Receta';
import { colorDeNivel } from '../juego/datos';
import {
  INGREDIENTES,
  LUGARES,
  familiaDe,
  normalizar,
  type Familia,
  type Ingrediente,
} from '../juego/ingredientes';
import {
  COMIDAS_COMO_RECETA,
  POCIONES,
  claveDe,
  sePuede,
  type Receta as TReceta,
} from '../juego/recetas';
import { useJuego } from '../juego/store';
import { Pantalla } from '../shell/Pantalla';
import { colors, radius, spacing } from '../theme';

/**
 * El morral: tres cajones.
 *
 * **Ingredientes** es lo que se junta con la cámara y se muestra entero, tengas
 * o no cada cosa: saber qué existe y dónde aparece es la mitad de la
 * información que hace falta para salir a buscar. Los que no tenés se ven
 * vacíos.
 *
 * **Pociones** muestra las doce, tengas o no cada una: la que no armaste se ve
 * clarita y tocándola aparece qué le hace falta. Un cajón que solo muestra lo
 * que ya tenés no le enseña a nadie qué se puede hacer, y saber qué existe es
 * justamente lo que da una razón para ir a buscar.
 *
 * **Comidas** igual, agrupadas por nivel, saladas y dulces mezcladas: para el
 * bicho son lo mismo, comida de tal nivel.
 *
 * ## Por qué el buscador está en dos de los tres
 *
 * Ingredientes son 73 y comidas 39: en las dos hay que scrollear para saber si
 * algo está, y buscar por nombre es más rápido que mirar.
 *
 * Las doce pociones entran casi de una sola vista, así que ahí un buscador sería
 * un campo de texto que tapa lugar para ahorrar un gesto que no cuesta nada.
 */

type Pestana = 'ingredientes' | 'comidas' | 'pociones';

const PESTANAS: { id: Pestana; clave: string; icono: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'ingredientes', clave: 'inventario.ingredientes', icono: 'leaf-outline' },
  { id: 'comidas', clave: 'inventario.comidas', icono: 'restaurant-outline' },
  { id: 'pociones', clave: 'inventario.pociones', icono: 'flask-outline' },
];

/** Cuántas cajitas entran por fila. */
const COLUMNAS = 4;

export function InventarioScreen() {
  const juego = useJuego((e) => e.juego);
  const t = useT();
  const tinte = colorDeNivel(juego.nivel);
  const { width } = useWindowDimensions();

  const [pestana, setPestana] = useState<Pestana>('ingredientes');
  const [busqueda, setBusqueda] = useState('');
  /** La receta abierta encima, si hay alguna. */
  const [receta, setReceta] = useState<TReceta | null>(null);
  /** El ingrediente abierto encima, si hay alguno. */
  const [ingrediente, setIngrediente] = useState<Ingrediente | null>(null);

  /**
   * Todo lo preparado junto, de las dos clases.
   *
   * Una receta puede pedir de base una preparación de la otra pestaña, así que
   * la ayuda tiene que poder contar las dos sin saber en cuál estás parado.
   */
  const preparadas = { ...juego.inventario.comidas, ...juego.inventario.pociones };

  const lado = Math.floor((width - spacing.md * 2 - spacing.sm * (COLUMNAS - 1)) / COLUMNAS);

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return INGREDIENTES;
    return INGREDIENTES.filter((i) => normalizar(t(`ingredientes.${i.id}`)).includes(q));
  }, [busqueda]);

  const comidas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return COMIDAS_COMO_RECETA;
    return COMIDAS_COMO_RECETA.filter((r) => normalizar(t(claveDe(r))).includes(q));
  }, [busqueda]);

  /** Las pociones son pocas y se ven todas juntas: ahí no hace falta buscar. */
  const conBuscador = pestana !== 'pociones';
  const lista = pestana === 'pociones' ? POCIONES : comidas;
  const sinResultados = conBuscador && !(pestana === 'ingredientes' ? filtrados : comidas).length;

  return (
    <Pantalla titulo={t('inventario.titulo')} seccion="inventario">
      <View style={estilos.pestanas}>
        {PESTANAS.map((p) => {
          const puesta = p.id === pestana;
          return (
            <Pressable
              key={p.id}
              // Se limpia al cambiar de cajón: una búsqueda que sobrevive al
              // cambio deja el cajón nuevo casi vacío sin que se vea por qué.
              onPress={() => {
                setPestana(p.id);
                setBusqueda('');
              }}
              style={({ pressed }) => [
                estilos.pestana,
                puesta && { borderBottomColor: tinte },
                pressed && { opacity: 0.6 },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: puesta }}
              accessibilityLabel={t(p.clave)}
            >
              <Ionicons name={p.icono} size={17} color={puesta ? tinte : colors.textMuted} />
              <Text style={[estilos.pestanaTexto, puesta && { color: tinte }]}>{t(p.clave)}</Text>
            </Pressable>
          );
        })}
      </View>

      {conBuscador ? (
        <View style={estilos.buscador}>
          <Ionicons name="search" size={16} color={colors.textFaint} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder={t(pestana === 'comidas' ? 'inventario.buscarComida' : 'inventario.buscarIngrediente')}
            placeholderTextColor={colors.textFaint}
            style={estilos.campo}
            autoCorrect={false}
            // Sin acentos ni mayúsculas para comparar: quien escribe "rocio"
            // tiene que encontrar "Rocío".
            autoCapitalize="none"
          />
          {busqueda ? (
            <Pressable
              onPress={() => setBusqueda('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('inventario.borrarBusqueda')}
            >
              <Ionicons name="close-circle" size={16} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {pestana === 'ingredientes' ? (
        <>
          <ScrollView contentContainerStyle={estilos.hoja}>
            {filtrados.length ? (
              // Agrupados por familia: lo del campo hace pociones y se junta
              // afuera; lo de la cocina hace comidas y se junta apuntando a
              // comida de verdad. Son dos salidas distintas y conviene que el
              // morral lo diga.
              //
              // LA COCINA VA PRIMERO. Son cincuenta de los setenta y cuatro
              // ingredientes, asi que es la mitad grande y la que mas se mira;
              // dejarla segunda obligaba a pasar de largo el campo entero cada
              // vez para llegar a lo que se estaba buscando.
              (['cocina', 'campo'] as Familia[]).map((familia) => {
                const grupo = filtrados.filter((i) => familiaDe(i.lugar) === familia);
                if (!grupo.length) return null;
                return (
                  <View key={familia} style={estilos.grupo}>
                    <Text style={estilos.grupoTitulo}>
                      {t(familia === 'campo' ? 'inventario.delCampo' : 'inventario.deLaCocina')}
                    </Text>
                    <View style={estilos.grilla}>
                      {grupo.map((i) => (
                        <Caja
                          key={i.id}
                          nombre={t(`ingredientes.${i.id}`)}
                          arte={i.arte}
                          color={LUGARES[i.lugar].color}
                          cuantos={juego.inventario.ingredientes[i.id] ?? 0}
                          nota={t(`lugares.${i.lugar}`)}
                          lado={lado}
                          onPress={() => setIngrediente(i)}
                        />
                      ))}
                    </View>
                  </View>
                );
              })
            ) : (
              <Vacio texto={t('inventario.sinIngrediente', { texto: busqueda.trim() })} />
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerStyle={estilos.hoja}>
          {/* Se muestran todas, tengas o no cada una: la que todavía no armaste
              se ve clarita, y tocarla dice qué hace falta. Un cajón que solo
              muestra lo que ya tenés no le enseña a nadie qué se puede hacer. */}
          {sinResultados ? (
            <Vacio texto={t('inventario.sinComida', { texto: busqueda.trim() })} />
          ) : null}

          {([1, 2, 3] as const).map((nivel) => {
            // Dentro del nivel, primero las saladas y después las dulces.
            const grupo = lista
              .filter((r) => r.nivel === nivel)
              .sort((a, b) => Number(a.dulce ?? 0) - Number(b.dulce ?? 0));
            const guardadas =
              pestana === 'pociones' ? juego.inventario.pociones : juego.inventario.comidas;

            // Buscando, un nivel sin coincidencias no lleva ni el título: dejar
            // "NIVEL 2" solo se lee como que ahí había algo y desapareció.
            if (!grupo.length) return null;

            return (
              <View key={nivel} style={estilos.grupo}>
                <Text style={estilos.grupoTitulo}>{t('inventario.nivel', { nivel })}</Text>
                <View style={estilos.grilla}>
                  {grupo.map((r) => (
                    <Caja
                      key={r.id}
                      nombre={t(claveDe(r))}
                      arte={r.arte}
                      color={tinte}
                      cuantos={guardadas[r.id] ?? 0}
                      nota={
                        sePuede(r, juego.inventario.ingredientes, preparadas)
                          ? t('inventario.podesArmarla')
                          : undefined
                      }
                      lado={lado}
                      onPress={() => setReceta(r)}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Receta
        receta={receta}
        ingredientes={juego.inventario.ingredientes}
        preparadas={preparadas}
        tinte={tinte}
        onVer={setReceta}
        onCerrar={() => setReceta(null)}
      />

      <DondeSeEncuentra
        ingrediente={ingrediente}
        cuantos={ingrediente ? (juego.inventario.ingredientes[ingrediente.id] ?? 0) : 0}
        tinte={tinte}
        onCerrar={() => setIngrediente(null)}
      />
    </Pantalla>
  );
}

function Vacio({ texto, nota }: { texto: string; nota?: string }) {
  return (
    <View style={estilos.vacio}>
      <Text style={estilos.vacioTexto}>{texto}</Text>
      {nota ? <Text style={estilos.vacioNota}>{nota}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  pestanas: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pestana: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: spacing.sm,
    // El borde de abajo lo pone la pestaña puesta; acá va el hueco para que las
    // tres midan lo mismo y no salten al cambiar.
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  pestanaTexto: { color: colors.textMuted, fontSize: 12.5 },

  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  campo: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: 8 },

  hoja: { padding: spacing.md, paddingBottom: spacing.xl },
  grupo: { marginBottom: spacing.md },
  grupoTitulo: {
    color: colors.textFaint,
    fontSize: 10.5,
    letterSpacing: 2,
    marginBottom: 8,
  },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  vacio: { paddingVertical: spacing.xl, alignItems: 'center', gap: 8 },
  vacioTexto: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  vacioNota: { color: colors.textFaint, fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
});
