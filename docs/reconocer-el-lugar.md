# Reconocer qué hay enfrente

Cómo la cámara va a decidir qué ingrediente aparece. Es el plan, no está
implementado.

## Por qué no alcanza con la categoría

La salida fácil es reconocer el grupo —"esto es fruta"— y sortear adentro. Se
descarta, y por una razón de juego, no de tecnología:

> Si necesitás una frutilla y apuntar a cualquier fruta te da una al azar, podés
> apuntar veinte veces y no conseguirla nunca.

Buscar deja de ser buscar y pasa a ser tirar de una palanca. La categoría sirve
para que el sistema funcione, no para que el juego funcione.

## La regla

**Cada ingrediente declara contra qué se consigue.** No hay una regla única para
los setenta y cuatro: hay cuatro regímenes, uno por grupo, porque los grupos son
cosas distintas.

### Fruta y verdura — el objeto real, más alternativas

Naranja se consigue apuntando a una naranja. Pero puede no ser temporada, o la
persona puede no tener, así que **cada una acepta además un par de cosas
parecidas**: para la naranja, cosas de color anaranjado.

La alternativa no es una concesión: es lo que hace que el juego se pueda jugar
en una cocina real un martes cualquiera.

### Piedra — nunca contra la piedra real

Ninguna se consigue apuntando a la gema. Distinguir amatista de citrino con la
cámara de un teléfono no lo hace un gemólogo sin lupa.

Cada una va contra **una escena**: una son piedras cualesquiera, otra ladrillos,
otra arena. Con una o dos alternativas cada una, igual que las frutas.

El color desempata dentro de la escena, que es lo que hace que nueve gemas
distintas salgan de un mismo tipo de lugar sin pisarse.

### Proteína — como la fruta, pero con más manga ancha

Va contra lo real, aceptando **muchas variantes**: la carne cruda cambia de
aspecto según el corte, la luz y el envase. Más alternativas.

**Sin cerrar.** Es el grupo que hay que mirar con más cuidado.

### Despensa — acá sí la categoría

Harina, azúcar y sal son polvo blanco en un frasco: no hay forma de
distinguirlas mirando, y no la va a haber. Así que la despensa **va contra el
lugar**: una alacena, una góndola de supermercado. Ahí aparecen al azar.

Pero no parejo: **con probabilidad de aparición**, unas más fáciles y otras más
difíciles. Eso ya existe — el campo `peso` de cada ingrediente en
`src/juego/ingredientes.ts`.

Es el único grupo donde la lotería está bien, porque son los insumos comunes: no
se sale a buscar sal, se abre la alacena y hay.

## Las dos señales

Para resolver lo de arriba hacen falta dos cosas de cada imagen, y solo una es
un modelo:

1. **Etiquetas.** Qué objeto hay. Modelo local; nada sale del teléfono.
2. **Color dominante.** Qué color predomina. Es una cuenta sobre los píxeles:
   sin modelo, sin latencia, sin margen de error.

El color es la mitad barata del sistema y resuelve buena parte del diseño de
arriba —"cosas anaranjadas", las nueve gemas por tono— sin pedirle nada a la
visión por computadora. **Conviene apoyarse en él todo lo que se pueda.**

### El ejemplo que muestra que funciona: las nueve piedras

| Gema | Escena | Color |
|---|---|---|
| Arenisca | arena, pared | tostado |
| Pirita | piedras | dorado |
| Jade | piedras | verde |
| Amatista | piedras | violeta |
| Citrino | piedras | amarillo |
| Lapislázuli | piedras, pared | azul |
| Piedra luna | piedras | blanco / gris claro |
| Rubí | ladrillos | rojo |
| Obsidiana | piedras | negro |

Nueve resultados distintos de un modelo que solo sabe decir "piedra", "ladrillo"
y "arena". La precisión no sale del modelo: sale de cruzarlo con el color.

## La forma de los datos

Cada ingrediente suma qué acepta. Algo así, a afinar:

```ts
type Objetivo = {
  /** Etiquetas del modelo que valen. Vacío = cualquiera. */
  etiquetas?: string[];
  /** Tonos que valen, en grados de matiz. Vacío = cualquiera. */
  color?: { desde: number; hasta: number };
};

type Reconocimiento = {
  /** Lo que da el ingrediente derecho viejo. */
  principal: Objetivo;
  /** Una o dos salidas para cuando no se tiene lo principal. */
  alternativas: Objetivo[];
};
```

La despensa no lleva `principal`: le alcanza el lugar y su `peso`.

## Lo que se verificó, no se supuso

- **`expo-camera` en SDK 57 no tiene frame processor.** No hay `onFrame` ni
  acceso al stream; lo único continuo es `onBarcodeScanned`. Para sacar imagen
  solo está `takePictureAsync`.
- **Un modelo genérico no alcanza para el objeto real.** Contra las 1000 clases
  de ImageNet, de los 74 ingredientes se reconocen **11**:

  | Grupo | De | Reconocibles |
  |---|---|---|
  | Fruta | 15 | 6 — manzana, naranja, lima, banana, frutilla, ananá |
  | Verdura | 16 | 5 — zucchini, morrón, brócoli, champiñón, coliflor |
  | Flor | 8 | 0 |
  | Planta | 5 | 0 |
  | Piedra | 9 | 0 |
  | Despensa | 12 | 0 |
  | Proteína | 7 | 0 |

  Por eso el diseño de arriba no depende de que el modelo sea bueno: **depende
  de que cada ingrediente pida algo que se pueda ver.**

- **Tamaño de ML Kit**: el modelo va incrustado en el APK (+5,7 MB) o descargado
  por Play Services (+200 KB, con espera la primera vez).

## Cadencia

`CADA = 3800` en `useIngredientes`: aparece un ingrediente cada 3,8 segundos.
Una lectura por segundo y medio sobra, y a esa frecuencia `takePictureAsync`
alcanza: no hace falta traer `react-native-vision-camera`, worklets, ni
reemplazar la cámara que ya dibuja las criaturas.

Con **suavizado**: dos o tres lecturas de acuerdo antes de cambiar. Sin eso, lo
que ofrece la cámara titila con cada movimiento de mano.

## Lo que ya está hecho

- `useIngredientes` recibe `lugar?: LugarId` y limita el sorteo. Hoy nadie se lo
  pasa. Va a haber que ensancharlo para que reciba el ingrediente resuelto y no
  solo el lugar.
- Cada ingrediente ya tiene `peso`, que es la probabilidad que pide la despensa.
- Los textos `lugares.*` de `src/i18n/` **ya describen este diseño**: "piedras,
  grava o una pared de ladrillo", "la alacena: harina, aceite, lo que haya". La
  copia se escribió antes que el reconocedor y le acertó.

## Lo que falta decidir

- **Las variantes de proteína.** El grupo más flojo y el que no está pensado.
- **Las alternativas de cada uno de los 74.** Es trabajo de diseño de juego, no
  de código: hay que escribir la tabla a mano, ingrediente por ingrediente.
- **Qué pasa cuando no reconoce nada.** Una pared blanca, poca luz. ¿No aparece
  nada, o cae a algo? Sin decidir.
- **Si se le muestra a quien juega qué está viendo la cámara.** La pantalla
  quedó sin texto a propósito, así que si se muestra tiene que ser sin palabras.
- **Umbral de confianza y cuántas lecturas de acuerdo.** Salen de probar en la
  calle, no de elegirlos acá.

## Cómo se prueba

ML Kit es código nativo: en Expo Go no corre. Hay Android Studio en la otra
computadora, así que `expo run:android` desde ahí.
