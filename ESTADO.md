# Estado — 2026-08-17

Dónde quedó el demo y qué es lo próximo. Se actualiza al cerrar cada tanda de
trabajo.

## Lo que funciona

**La secuencia completa, en las ocho criaturas.** Se encuentra el huevo con la
cámara, se lo toca, no sale a la primera —entre 2 y 4 intentos fallidos,
sorteados por huevo— y cuando rompe el cascarón queda el adulto volando. Recién
tocando al adulto se considera atrapado y entra en la colección.

**La profundidad la maneja el código, no el arte.** La criatura arranca al 45% y
se acerca mientras la tengas a la vista, más rápido si está centrada. Si se te va
más de la mitad de cuadro, retrocede.

**Dos motores de búsqueda, elegidos por el dispositivo:** `orientacion` cuando
hay sensor de rotación —la criatura ocupa una dirección fija del mundo— y
`deriva` cuando no, donde vaga por la pantalla. Nada exige más que una cámara.

**Reconocimiento de imágenes**, en la pantalla de pruebas del home. Anda con el
modelo general de Google, sin internet. Todavía no está conectado al juego.

## Lo que quedó pendiente, en orden

### 1. La tablet no centra la criatura

En el celular anda bien. En la Galaxy Tab A11 la muestra pegada al borde
izquierdo, siempre parcial, o no la muestra.

Ya se corrigió un bug real que explica eso **si la tablet corre el motor
`deriva`**: los límites del recorrido quedaban invertidos cuando la criatura es
más ancha que la pantalla —los huevos lo son a propósito— y además el recorrido
se reiniciaba once veces por segundo. Está arreglado en el código pero **sin
verificar en el dispositivo**.

Falta el dato que distingue las dos causas posibles. En la tablet, entrar a
buscar y leer la línea de diagnóstico de arriba:

- Si dice `motor deriva` → el arreglo alcanza, hay que compilar y probar.
- Si dice `motor orientacion` → la tablet declara tener sensor de rotación pero
  da datos congelados. Hay que hacer que el motor se rinda y pase a `deriva`
  cuando detecta que la lectura no se mueve.

### 2. El empalme entre la eclosión y el adulto

Queda un salto de un cuadro. No es un hueco en blanco —eso ya se resolvió
precargando la pieza siguiente— sino que el dragón no está en la misma pose al
final de una animación que al principio de la otra.

**No intentar arreglarlo con un fundido.** Se probó: al superponer dos poses
distintas el personaje se lee doble y queda peor que el corte seco.

Se le está pidiendo al generador que cada animación termine donde empieza la
siguiente, pero no obedece. La salida que queda del lado del código es recortar
la cola de la eclosión con `--hasta`, buscando el cuadro donde más se parece al
arranque del vuelo. Sin probar todavía.

### 3. Decisiones abiertas

- **Los nombres y elementos de las ocho** los puso Claude para poder mostrar
  algo. Cambiarlos es una línea por criatura en `src/art/index.ts`.
- **El peso**: 23,5 MB de arte y unos 20 MB del modelo de reconocimiento, sobre
  92 MB de APK. Si hay que bajarlo, el modelo tiene una variante que se descarga
  desde Play, y las animaciones tienen margen en resolución y cuadros.
- **La firma**: el release va firmado con la clave de depuración. Sirve para
  probar y para compartir, pero Play lo rechaza. Antes de publicar hay que
  generar una clave propia y guardarla muy bien: si se pierde, no se puede volver
  a publicar la misma app nunca más.

## Cómo retomar

```powershell
# iterar en el celu, con la versión de desarrollo instalada
cd c:\dev\Imago\Kaurix
npx expo start
# en otra terminal, con el teléfono emparejado:
adb reverse tcp:8081 tcp:8081
```

```powershell
# APK autónomo
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
cd c:\dev\Imago\Kaurix\android
.\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"
```

Las comillas del último argumento no son opcionales: sin ellas PowerShell parte
el comando en la coma. El APK queda en
`android\app\build\outputs\apk\release\app-release.apk`.

**Release y desarrollo son dos mundos.** El release lleva el JavaScript adentro y
no escucha a Metro: si está instalado, los cambios de código no llegan hasta el
próximo build. Antes de dar por bueno un "no funciona", conviene confirmar cuál
de las dos versiones está instalada:

```powershell
adb shell "dumpsys package com.imago.kaurix | grep flags="
```

Si aparece `DEBUGGABLE`, es la de desarrollo.

## Sumar una criatura

Cuatro videos con fondo plano, numerados igual: `eggNN`, `failNN`, `eclNN`,
`flyNN`. Después:

```powershell
node herramientas/tanda.js assets/eggs 9 9
```

Convierte las cuatro, mide escalas y duraciones, y escribe el bloque listo para
pegar en `src/art/index.ts`. Las reglas de generación de los videos —qué color de
fondo pedir y por qué— están en `herramientas/LEEME.md`.
