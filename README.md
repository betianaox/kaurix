# Kaurix

Juego de aventuras de fantasía. El jugador es elegido como mago de uno de los
cuatro elementos —aire, tierra, agua o fuego—, encuentra un huevo usando la
cámara, lo cuida hasta que eclosiona y cría al dragón que nace, alimentándolo
con comidas y pociones armadas con ingredientes que también encuentra en el
mundo real.

**Android, tema oscuro, sin iOS.**

## Regla que ordena todo lo demás

Kaurix tiene que correr en **cualquier Android con cámara**, no solo en la gama
alta. Lo único imprescindible es la cámara: los sensores mejoran la búsqueda,
pero ninguno hace falta para jugar.

Por eso no se usa ARCore. Se probó ViroReact sobre ARCore y funcionaba, pero
Google certifica los dispositivos uno por uno y deja afuera casi toda la gama
media y baja — incluido el teléfono de desarrollo de este proyecto. Además
pesaba 31 MB. Está descartado a propósito, no por no haberlo intentado.

## Estado: demo de viabilidad

Lo único implementado es la prueba que define si la idea es posible: encontrar
el huevo con la cámara. Hay **dos motores** y el que corre lo decide el
dispositivo, sin preguntarle nada al jugador:

| Motor | Cómo funciona | Requiere |
|---|---|---|
| `orientacion` | El huevo ocupa una dirección fija del mundo. Girás con el teléfono, guiado por flechas, hasta que aparece. | Sensor de rotación |
| `deriva` | El huevo aparece sobre la cámara y va y viene por la pantalla. Lo tocás cuando lo ves. | Nada, solo cámara |

El huevo **nunca se apoya en el piso**: sin detección de superficies no hay piso
que detectar. Por eso flota sobre una nube, con destellos alrededor. La
limitación se convirtió en estética en vez de leerse como un error.

Cada huevo encontrado se guarda con el motor y los segundos que llevó.

## Correr en un dispositivo

No hay forma de probar esto en emulador: hace falta un Android físico. Se puede
sin cable, por depuración inalámbrica.

```sh
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
npm install
npx expo run:android
```

Sin cable, con el teléfono en la misma red:

```sh
# Ajustes → Opciones de desarrollador → Depuración inalámbrica → vincular
# El puerto de vinculación cambia cada vez que se abre ese cuadro. Este comando
# encuentra el que está activo en este momento:
adb mdns services

adb pair 192.168.x.x:PUERTO_DE_VINCULACION CODIGO
adb connect 192.168.x.x:PUERTO_DE_CONEXION
adb reverse tcp:8081 tcp:8081
```

El primer build tarda unos minutos. Después, mientras no cambien dependencias
nativas ni `app.json`, alcanza con `npx expo start`.

Si el huevo se mueve para el lado contrario al que girás, el único valor a tocar
es `YAW_SIGN` en `src/screens/SearchScreen.tsx`.

## Herramientas

`herramientas/` convierte los videos de criaturas en los WebP animados que usa
el juego. Se documenta solo en `herramientas/LEEME.md`, que además guarda las
reglas de generación —qué color de fondo pedir y por qué— aprendidas a los
golpes.

```sh
npm run criatura -- assets/fly11.mp4 --salida assets/criaturas/nueva.webp
npm run fondo -- assets/prueba.mp4
```

## Arte

El arte va en `assets/eggs/` y se registra en `src/art/index.ts`. Mientras un
elemento no tenga archivo, se dibuja un huevo provisorio hecho a mano y el juego
funciona igual. Las especificaciones están en `assets/eggs/LEEME.md`.

**No hay 3D en tiempo de ejecución y no hace falta.** Nada rota con la cámara,
así que un modelo 3D se vería idéntico a una imagen pero costando motor de
render, peso y batería. El 3D se usa para *producir* el arte y se exporta a WebP.

El soporte de WebP animado está habilitado por `plugins/withAnimatedWebp.js`.
Sin ese plugin, un WebP animado se muestra como imagen fija: no falla y no
avisa.

Para dar profundidad conviene mover tres cosas juntas por código —tamaño,
altura en pantalla y neblina—, porque la escala sola se lee como que el objeto
creció, no como que se acercó.

## Estructura

```
App.tsx                        navegación por estado (todavía no hace falta router)
src/theme.ts                   paleta oscura y los cuatro elementos
src/art/index.ts               registro del arte, con placeholder si falta
src/game/capabilities.ts       qué sabe hacer el dispositivo
src/game/eggs.ts               registro de huevos encontrados (AsyncStorage)
src/components/FloatingEgg.tsx huevo + nube + destellos, con su animación
src/components/EggGlyph.tsx    huevo provisorio dibujado a mano
src/components/FoundOverlay.tsx
src/screens/HomeScreen.tsx
src/screens/SearchScreen.tsx   los dos motores de búsqueda
plugins/withAnimatedWebp.js
```

`android/` está generado por `expo prebuild` y va ignorado: se regenera desde
`app.json`. Nunca editar a mano lo que hay adentro.

## Lo que falta definir

- El módulo de elección de mago (los cuatro elementos, estética y habilidades).
- Los tipos de dragón y el arte de huevos y dragones.
- Ingredientes, recetas de comidas y pociones.
- Cómo se distribuyen los hallazgos en el mundo (¿siempre disponible? ¿por
  tiempo? ¿por lugar?).
