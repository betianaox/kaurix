# Arte de los huevos

Acá van los cuatro huevos, uno por elemento:

```
aire.webp
tierra.webp
agua.webp
fuego.webp
```

Después de dejar el archivo, descomentá su línea en `src/art/index.ts`. Mientras
un elemento no tenga archivo, el juego dibuja el huevo provisorio hecho a mano y
sigue funcionando igual.

## Formato

- **WebP con transparencia.** Calidad 90 o más: por debajo de eso aparece un
  halo sucio en el borde recortado. Si igual queda sucio, exportá ese sin
  pérdida — a este tamaño la diferencia de peso es despreciable.
- **768 px de alto.** En pantalla ocupa unos 140 pt; aun en las pantallas más
  densas eso son 420 px reales, así que sobra.
- **Sin sombra ni piso pegados a la imagen.** Si hace falta sombra se agrega
  aparte, para que pueda reaccionar al movimiento.
- **Misma dirección de luz en los cuatro.** Es lo único que si sale distinto se
  nota feo y obliga a rehacerlos.

## Si es animado

El soporte de WebP animado está habilitado a propósito (ver
`plugins/withAnimatedWebp.js`); sin eso un WebP animado se ve como imagen fija,
sin error ni aviso.

- Loop corto que cierre sobre sí mismo: 1,5 s a 15 cuadros anda bien.
- El movimiento de conjunto —flotar, hamacarse, acercarse, alejarse— lo pone el
  código. En el archivo va solo lo que el código no puede hacer: el escorzo
  cambiando, las partes que se ocultan y aparecen.

## Si renderizás varios ángulos

Si sacás el huevo desde 8 o 12 posiciones alrededor, se puede elegir cuál
mostrar según hacia dónde mira el jugador, y el huevo parece girar cuando lo
rodea. Nombralos `aire-01.webp`, `aire-02.webp`, etc. Conviene sacarlos en la
misma sesión de render que el resto: es el mismo trabajo ahora que después.
