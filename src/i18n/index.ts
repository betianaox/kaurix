import { normalizar } from '../juego/ingredientes';
import { useJuego } from '../juego/store';
import { IDIOMA_POR_DEFECTO, type CodigoIdioma } from './idiomas';
import { REGION_POR_DEFECTO, type Region } from './region';
import { excepcionDe, sinonimosDe } from './variantes';
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
export function traducir(
  clave: string,
  idioma: CodigoIdioma,
  vars?: Vars,
  region: Region = REGION_POR_DEFECTO
): string {
  const texto =
    // LA EXCEPCION REGIONAL VA PRIMERO, y solo existe en castellano. Los
    // nombres de las cosas cambian de un pais a otro —palta o aguacate, choclo
    // o elote— y son unos treinta casos; el resto sale del diccionario como
    // siempre. Ver `variantes.ts`.
    //
    // En ingles, portugues e italiano tambien hay regionalismos, pero todavia
    // no estan mapeados: por eso la excepcion se pide solo para 'es' en vez de
    // buscarla siempre y no encontrarla nunca.
    (idioma === 'es' ? excepcionDe(region, clave) : undefined) ??
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
  const region = useJuego((e) => e.juego.region);
  return (clave: string, vars?: Vars) => traducir(clave, idioma, vars, region);
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

/**
 * TODOS los nombres que puede tener una cosa, para poder buscarla.
 *
 * La etiqueta es una sola —la de tu región, en tu idioma— pero la búsqueda
 * acepta todas: las variantes regionales del castellano y los nombres en los
 * otros tres idiomas.
 *
 * ES LA MITAD BARATA DEL PROBLEMA DE LOS REGIONALISMOS, y la que más duele.
 * Una etiqueta que dice "palta" cuando vos decís aguacate se lee raro un
 * segundo; una búsqueda de "aguacate" que no devuelve nada parece que la cosa
 * no existe, y quien la busca deja de buscar.
 *
 * Los otros idiomas entran porque no cuesta nada y sirven para quien juega en
 * dos, o para quien puso el teléfono en inglés y piensa en castellano.
 */
export function nombresPosibles(clave: string): string[] {
  const nombres = new Set<string>(sinonimosDe(clave));
  for (const idioma of Object.keys(DICCIONARIOS) as CodigoIdioma[]) {
    const nombre = resolver(DICCIONARIOS[idioma], clave);
    if (nombre) nombres.add(nombre);
  }
  return [...nombres];
}

/**
 * Hook de búsqueda por nombre: `buscar('ingredientes.palta', 'aguacate')`.
 *
 * Compara contra el nombre que se muestra y contra todos los demás, siempre
 * normalizado — sin acentos ni mayúsculas, que es como se escribe en un buscador.
 */
export function useBuscador(): (clave: string, consulta: string) => boolean {
  const t = useT();
  return (clave, consulta) => {
    const q = normalizar(consulta);
    if (!q) return true;
    return [t(clave), ...nombresPosibles(clave)].some((n) => normalizar(n).includes(q));
  };
}

