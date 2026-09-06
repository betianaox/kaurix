const { withProjectBuildGradle } = require('expo/config-plugins');

/**
 * Obliga a que todo el Kotlin del proyecto compile contra Java 17.
 *
 * El JDK que trae Android Studio es el 21. Gradle compila el Java de cada
 * módulo a 17, pero Kotlin toma 21 del JDK que esté corriendo, y cuando una
 * librería no fija su propio jvmTarget el build muere con "Inconsistent
 * JVM-target compatibility". Le pasa a `react-native-image-colors`, que es una
 * de las dos mitades del reconocedor.
 *
 * No es un problema del proyecto sino de una dependencia de terceros, así que
 * no se arregla ahí: se fija acá para todos los módulos de una vez. Si mañana
 * otra librería hace lo mismo, ya está cubierta.
 *
 * Va como plugin y no editando android/build.gradle a mano porque esa carpeta
 * se regenera entera en cada prebuild.
 */
const ANCLA = '// jvmTarget parejo para todos los módulos Kotlin';

const BLOQUE = `
${ANCLA}
subprojects { sub ->
  sub.tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
    compilerOptions {
      jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
  }
}
`;

module.exports = function withKotlinJvmTarget(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        'withKotlinJvmTarget espera un build.gradle en Groovy, no en Kotlin DSL.'
      );
    }

    if (!cfg.modResults.contents.includes(ANCLA)) {
      cfg.modResults.contents += BLOQUE;
    }

    return cfg;
  });
};
