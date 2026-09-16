# Kaurix

Juego de colección con la cámara. Hay criaturas escondidas en el mundo real: se
encuentran apuntando el teléfono, se juntan ingredientes de lo que la cámara
mira, se cocinan comidas y pociones, y con eso se hace crecer a cada criatura
hasta que se vuelve adulta y deja una carta para el álbum.

**Android, tema claro, sin iOS.** Textos en español neutro, inglés, italiano y
portugués.

## Regla que ordena todo lo demás

Kaurix tiene que correr en **cualquier Android con cámara**, no solo en la gama
alta. Lo único imprescindible es la cámara: los sensores mejoran la búsqueda,
pero ninguno hace falta para jugar.

Por eso no se usa ARCore. Se probó ViroReact sobre ARCore y funcionaba, pero
Google certifica los dispositivos uno por uno y deja afuera casi toda la gama
media y baja — incluido el teléfono de desarrollo de este proyecto. Además
pesaba 31 MB. Está descartado a propósito, no por no haberlo intentado.

## Cómo se juega

| Pantalla | Qué hay |
|---|---|
| Colección | La casa. Las criaturas encontradas, la ruleta diaria y cuánto falta. |
| Bicho | La ficha de una criatura: su barra, qué come y qué le falta. |
| Buscar | La cámara. Aparecen criaturas e ingredientes. |
| Cocina | El caldero: se tiran ingredientes y sale lo que salga. |
| Inventario | El bolso, con las recetas y dónde se encuentra cada cosa. |
| Álbum | Las cartas que dejan las criaturas al crecer. |
| Pendientes | Los avisos y el camino de los días (un premio gratis y uno por video). |

Una criatura aparece sobre la cámara con uno de **dos motores**, y el que corre
lo decide el dispositivo sin preguntarle nada al jugador:

| Motor | Cómo funciona | Requiere |
|---|---|---|
| `orientacion` | La criatura ocupa una dirección fija del mundo y aparece al apuntar hacia allá. | Sensor de rotación |
| `deriva` | Va y viene por la pantalla. | Nada, solo cámara |

Si la criatura se mueve para el lado contrario al giro, el único valor a tocar
es `YAW_SIGN` en `src/buscar/useAparicion.ts`.

## Estado

El juego se puede recorrer entero. Lo que falta para testing cerrado:

- **El reconocedor.** Hoy los ingredientes salen al azar. El modelo propio se
  entrena con `modelo/` (ver `modelo/LEEME.md`) y, cuando esté, se enciende
  `RECONOCEDOR_MANDA` y se reescribe `src/buscar/objetivos.ts`.
- **Las distancias reales.** `TODO_CERCA` está encendido para probar sentado;
  se apaga y se calibra en la calle.

Los interruptores de prueba viven en `src/flags.ts`, y cada uno dice cuándo se
enciende y cuándo se borra.

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

AdMob y el reconocedor son módulos nativos: en Expo Go no existen y el juego
sigue andando sin ellos.

## Anuncios

En desarrollo se usan siempre los anuncios de prueba de Google. La unidad real
va en `EXPO_PUBLIC_AD_REWARDED`, cargada como variable de entorno de EAS en el
entorno `production` (igual que en Oráculos); si falta, la app cae a los de
prueba sin avisar. Los detalles están en
`src/anuncios/publicidad.ts`.

## Herramientas

`herramientas/` convierte los videos de criaturas en los WebP animados que usa
el juego, y arma las hojas de ingredientes y comidas. Se documenta en
`herramientas/LEEME.md`, que además guarda las reglas de generación —qué color
de fondo pedir y por qué— aprendidas a los golpes.

```sh
npm run criatura -- assets/fly11.mp4 --salida assets/criaturas/nueva.webp
npm run fondo -- assets/prueba.mp4
npm run reconocedor   # prueba la lógica del reconocedor sin teléfono
npm run album         # prueba el reparto de cartas
npm run typecheck
```

## Arte

**No hay 3D en tiempo de ejecución y no hace falta.** Nada rota con la cámara,
así que un modelo 3D se vería idéntico a una imagen pero costando motor de
render, peso y batería. El 3D se usa para *producir* el arte y se exporta a WebP.

El arte se registra en `src/art/index.ts`. El soporte de WebP animado está
habilitado por `plugins/withAnimatedWebp.js`. Sin ese plugin, un WebP animado se
muestra como imagen fija: no falla y no avisa.

## Estructura

```
App.tsx                  arranque, tema de navegación y bienvenida
src/theme.ts             paleta clara (papel de herbario)
src/flags.ts             interruptores de prueba, con fecha de salida
src/navegacion/          rutas y pila de pantallas
src/shell/               encabezado, pie, bienvenida
src/pantallas/           una por ruta
src/juego/               reglas y estado: crecimiento, caldero, recetas,
                         ruleta, camino de los días, guardado
src/buscar/              aparición sobre la cámara y reconocedor
src/cocina/  src/inventario/  src/album/  src/coleccion/
src/anuncios/            AdMob y consentimiento
src/i18n/                textos en cuatro idiomas
modules/reconocedor/     módulo nativo con ML Kit
modelo/                  entrenamiento del modelo propio
herramientas/            conversión de arte (no va en el APK)
plugins/                 plugins de configuración de Expo
```

`android/` está generado por `expo prebuild` y va ignorado: se regenera desde
`app.json`. Nunca editar a mano lo que hay adentro.
