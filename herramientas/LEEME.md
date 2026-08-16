# Herramientas

Convierten videos de criaturas en los WebP animados que usa el juego. Son
herramientas de escritorio: no se empaquetan en el APK, corren acá.

`npm install` ya deja ffmpeg listo (viene como dependencia de desarrollo).

## procesar.js

```sh
node herramientas/procesar.js assets/fly11.mp4 \
  --ancho 700 --fps 12 --calidad 80 \
  --salida assets/criaturas/mi-criatura.webp
```

Toma un video con fondo plano y devuelve un WebP animado con transparencia.

| opción | por defecto | qué hace |
|---|---|---|
| `--ancho` | 900 | ancho final en píxeles |
| `--fps` | 15 | cuadros por segundo |
| `--calidad` | 82 | 0 a 100 |
| `--umbral` | medido | fuerza la tolerancia de recorte |
| `--color` | detectado | fuerza el color de fondo |
| `--sin-seguimiento` | — | encuadre fijo en vez de seguir al personaje |
| `--sin-recorte` | — | deja el cuadro original entero |
| `--preview` | — | además deja un PNG sobre el fondo de la app |
| `--analizar` | — | solo informa, no convierte |

### Las cuatro cosas que hace y por qué

**Detecta el color de fondo** mirando las esquinas. Un azul comprimido no es
`0,0,255` sino algo como `0,16,240`, y recortar contra el color real en vez del
teórico deja el borde más limpio.

**Mide cuánta tolerancia admite cada criatura.** Sube el recorte hasta que
empieza a perder píxeles del personaje y se queda justo antes. Cada bicho da un
número distinto según cuánto se parezca a su fondo: fueron de 0,18 a 0,32 en la
primera tanda. Un valor fijo o deja filo de color, o se come partes del
personaje.

**Sigue al personaje cuadro a cuadro** para encuadrarlo. Si en vez de eso se
abarca todo su recorrido, la criatura comparte el cuadro con el aire por donde
pasa y termina viéndose chica.

**Verifica que ningún cuadro perdió la transparencia.** Este es el importante:
es un error que no da ningún aviso y no se ve hasta que la imagen ya está en el
teléfono.

### La escala

Al final informa `escala:`, que es qué proporción del video ocupaba la criatura
antes de recortarle el aire. **Ese número va en `src/art/index.ts`.**

Sin él, todas se dibujarían del mismo ancho y se perdería la relación de tamaño
entre ellas: un bicho de alas abiertas y uno compacto quedarían iguales aunque
en el original uno fuera bastante más grande.

## mejor-fondo.js

```sh
node herramientas/mejor-fondo.js assets/fly11.mp4
```

Dice contra qué color de fondo conviene generar una criatura, midiendo la
distancia entre los colores del personaje y cada candidato.

Conviene correrlo con un clip corto **antes** de generar una tanda de un
personaje de colores nuevos. Son treinta segundos y evita rehacer el trabajo.

## Cómo generar los videos

- **Fondo `#0000FF` puro**, sin sombra. Azul puro, no un azul "lindo": medido
  sobre el primer dragón, el azul puro daba 154 de margen y el azul rey 82.
- Si la criatura tiene azul o violeta, **`#00FF00` verde puro**. Y si tiene
  verde y azul, correr `mejor-fondo.js` y ver.
- **Nunca gris**: da 2 sobre 441. Los personajes tienen blancos, negros y
  sombreados, que son neutros, y coinciden con cualquier gris.
- **Nunca pasar por GIF.** GIF tiene transparencia de un solo bit: no hay medias
  tintas, y todo el borde suave se rompe ahí. Ningún paso intermedio lo repara.
- El fondo tiene que ser un color **que no exista en el personaje**. Esa es la
  regla; el color concreto es consecuencia.

## Cómo sumar una criatura al juego

1. Convertirla: `node herramientas/procesar.js ...`
2. Dejar el `.webp` en `assets/criaturas/`
3. Agregar una línea en `src/art/index.ts` con su nombre, elemento y la
   `escala` que informó el script

El contador, la colección y la búsqueda salen de esa lista, así que el total se
actualiza solo.
