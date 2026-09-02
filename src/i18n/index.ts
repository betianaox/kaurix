import { useJuego } from '../juego/store';
import { IDIOMA_POR_DEFECTO, type CodigoIdioma } from './idiomas';
import es from './es.json';
import en from './en.json';
import pt from './pt.json';
import it from './it.json';

/**
 * Los textos de la app, en un solo lugar.
 *
 * Ningún texto que vea el usuario se escribe suelto en una pantalla. No es
 * prolijidad: con los textos incrustados, cada idioma nuevo obliga a recorrer
 * todos los archivos, y siempre queda alguno afuera.
 *
 * **Y se redactan en español neutro**, sin voseo. "Agrega", no "agregá";
 * "puedes", no "podés". El voseo marca origen y deja afuera al resto de los
 * hispanohablantes, que son la mayoría de quienes van a jugar esto.
 *
 * Los nombres de las criaturas, ingredientes y recetas también viven acá, porque
 * son texto que se lee tanto como los botones.
 */

type Diccionario = Record<string, unknown>;

const DICCIONARIOS: Record<CodigoIdioma, Diccionario> = { es, en, pt, it };

/** Resuelve una clave con puntos ("cocina.vaciar") dentro de un diccionario. */
function resolver(dic: Diccionario, clave: string): string | undefined {
  const valor = clave.split('.').reduce<unknown>((acc, parte) => {
    if (acc && typeof acc === 'object' && parte in (acc as object)) {
      return (acc as Record<string, unknown>)[parte];
    }
    return undefined;
  }, dic);
  return typeof valor === 'string' ? valor : undefined;
}

/** Valores para rellenar los {marcadores} de un texto. */
export type Vars = Record<string, string | number>;

/**
 * Traduce una clave. Si falta, cae al español y, si tampoco está, devuelve la
 * clave misma — así una traducción olvidada se ve en pantalla en vez de quedar
 * en blanco.
 *
 * `vars` reemplaza los marcadores entre llaves: `t('cocina.minimo', { minimo: 3 })`.
 * Van con marcador y no partiendo la frase en pedazos porque el orden de las
 * palabras cambia con el idioma, y una frase armada por concatenación solo
 * funciona en el idioma en que se pensó.
 */
export function traducir(clave: string, idioma: CodigoIdioma, vars?: Vars): string {
  const texto =
    resolver(DICCIONARIOS[idioma], clave) ??
    resolver(DICCIONARIOS[IDIOMA_POR_DEFECTO], clave) ??
    clave;

  if (!vars) return texto;
  return texto.replace(/\{(\w+)\}/g, (marcador, nombre) =>
    nombre in vars ? String(vars[nombre]) : marcador
  );
}

/**
 * Hook de traducción, atado al idioma guardado.
 *
 * Uso: `const t = useT();` y después `t('cocina.cocinar')`.
 */
export function useT(): (clave: string, vars?: Vars) => string {
  const idioma = useJuego((e) => e.juego.idioma);
  return (clave: string, vars?: Vars) => traducir(clave, idioma, vars);
}

/**
 * El nombre de una cosa del juego, en el idioma puesto.
 *
 * Criaturas, ingredientes y recetas tienen su nombre en el diccionario como
 * cualquier otro texto: se leen tanto como los botones, y dejarlos en los
 * archivos de datos habría sido tener media app traducida.
 *
 * Los datos siguen guardando un nombre en español. **No es el que se muestra**:
 * queda como referencia para leer el código y como red por si falta una clave.
 */
export function useNombre(): (seccion: 'criaturas' | 'ingredientes' | 'comidas' | 'pociones', id: string) => string {
  const t = useT();
  return (seccion, id) => t(`${seccion}.${id}`);
}
