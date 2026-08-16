const { withGradleProperties } = require('expo/config-plugins');

/**
 * Habilita el soporte de WebP animado en las imágenes de React Native.
 *
 * Expo lo deja apagado por defecto porque suma ~3,4 MB y porque iOS no lo
 * soporta. Kaurix es solo Android y el arte animado (huevos, ingredientes,
 * dragones) sale de renders 3D convertidos a WebP animado, así que acá el
 * intercambio conviene.
 *
 * Sin esto, un .webp animado se muestra como imagen fija: no falla, no avisa,
 * simplemente no se mueve. Es de los errores más difíciles de diagnosticar.
 *
 * Va como plugin y no editando android/gradle.properties a mano porque esa
 * carpeta se regenera entera en cada prebuild.
 */
const KEY = 'expo.webp.animated';

module.exports = function withAnimatedWebp(config) {
  return withGradleProperties(config, (cfg) => {
    const existing = cfg.modResults.find(
      (item) => item.type === 'property' && item.key === KEY
    );

    if (existing) {
      existing.value = 'true';
    } else {
      cfg.modResults.push({ type: 'property', key: KEY, value: 'true' });
    }

    return cfg;
  });
};
