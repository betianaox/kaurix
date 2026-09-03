type ModuloAds = typeof import('react-native-google-mobile-ads');

/**
 * Acceso al SDK de AdMob. Se carga con require y no con import estatico porque
 * es un modulo NATIVO: en Expo Go o en web no existe, y un import arriba de
 * todo tiraria la app entera al abrirla. Asi, si no esta, la app corre igual y
 * `adsDisponible` queda en false.
 */
let modulo: ModuloAds | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  modulo = require('react-native-google-mobile-ads') as ModuloAds;
} catch (e) {
  modulo = null;
  // Casi siempre es "estas corriendo un binario sin el modulo nativo" (Expo Go,
  // o un dev build viejo de antes de instalar AdMob): hay que volver a compilar
  // con `npm run android`, recargar el JS no alcanza.
  console.warn('[ads] AdMob no esta disponible en este binario:', e);
}

export const ads = modulo;
export const adsDisponible = modulo !== null;

/**
 * ─────────────────────────────────────────────────────────────────────────
 * UNIDAD DE ANUNCIO RECOMPENSADO
 * ─────────────────────────────────────────────────────────────────────────
 * La real sale de `EXPO_PUBLIC_AD_REWARDED`, y se usa SOLO en builds de
 * produccion. En desarrollo va siempre la de test de Google, pase lo que pase.
 *
 * ESO ULTIMO NO ES UNA PREFERENCIA. Tocar los propios anuncios reales es
 * trafico invalido para Google, y el castigo no es que no se cobre ese clic: es
 * que suspenden la cuenta de AdMob entera. Por eso `__DEV__` manda por encima
 * de la variable — aunque este configurada, en desarrollo no se usa.
 *
 * Y SI FALTA LA VARIABLE, CAE A LA DE TEST en vez de romper. Es la decision
 * menos mala de las dos: sin unidad no hay anuncio, y sin anuncio la app queda
 * trabada sin forma de sumar gemas. Pero ojo, porque esta caida NO SE VE — el
 * video aparece, la gema se suma y todo parece andar, solo que no genera un
 * peso. Por eso el valor vive en `eas.json`, dentro del perfil de produccion:
 * ahi no se puede olvidar, porque va con el perfil.
 *
 * Como conseguir la unidad real: AdMob → Apps → Kaurix → Bloques de anuncios
 * → Crear → Bonificado. Devuelve un id con la forma
 * `ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY` — con barra, que es lo que lo
 * distingue del App ID, que lleva tilde de virgulilla.
 *
 * LA DE KAURIX YA ESTA CREADA: `ca-app-pub-5829308591228932/2381630020`, y el
 * App ID de la app —el de la tilde, que va en `app.json`— es
 * `ca-app-pub-5829308591228932~8823020495`.
 *
 * El bloque NO se escribe aca a proposito: va en la variable de entorno del
 * perfil de produccion de EAS, por lo que dice el parrafo de arriba.
 */
const UNIDAD_REAL = process.env.EXPO_PUBLIC_AD_REWARDED;

/** `true` cuando se estan sirviendo anuncios de prueba (o sea, sin ingresos). */
export const anunciosDePrueba = __DEV__ || !UNIDAD_REAL;

export const AD_UNIT_ID_RECOMPENSADO = anunciosDePrueba
  ? (modulo?.TestIds.REWARDED ?? '')
  : UNIDAD_REAL;

// El SDK se inicializa una sola vez por sesion, la primera vez que alguien
// pide un anuncio.
let iniciado = false;
export function iniciarAds(): void {
  if (!modulo || iniciado) return;
  iniciado = true;
  modulo.default().initialize();
}
