/**
 * Saca las cuatro piezas de la lámina de la ruleta.
 *
 *   node herramientas/recortar.js assets/ruleta.png --escala 2
 *   node herramientas/ruleta.js
 *
 * La lámina trae la rueda, la aguja y los dos botones del centro. Van a
 * `assets/ruleta/` como archivos sueltos porque **se dibujan por separado**: la
 * rueda gira y la aguja y el botón no, así que no pueden ser una sola imagen.
 *
 * A la rueda se le deja el cuadro cuadrado y centrado. Es lo que permite
 * rotarla sin calcular nada: si el centro del dibujo no coincide con el centro
 * del cuadro, la rueda gira describiendo un círculo en vez de girar sobre sí
 * misma, y eso no se arregla con CSS.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PIEZAS = path.join(__dirname, 'recortes', 'ruleta');
const DESTINO = path.join(__dirname, '..', 'assets', 'ruleta');

const PARTES = [
  { id: 'rueda', pieza: 'f02c2', cuadrada: true, lado: 768 },
  { id: 'aguja', pieza: 'f01c1', cuadrada: false, lado: 160 },
  { id: 'boton-girar', pieza: 'f02c1', cuadrada: true, lado: 256 },
  { id: 'boton-video', pieza: 'f03c1', cuadrada: true, lado: 256 },
];

(async () => {
  fs.rmSync(DESTINO, { recursive: true, force: true });
  fs.mkdirSync(DESTINO, { recursive: true });

  for (const p of PARTES) {
    const archivo = path.join(PIEZAS, `${p.pieza}.png`);
    if (!fs.existsSync(archivo)) {
      console.error(`falta ${p.pieza}.png — ¿corriste recortar.js sobre assets/ruleta.png?`);
      process.exit(1);
    }

    const img = sharp(archivo).ensureAlpha();
    const { width, height } = await img.metadata();

    if (p.cuadrada) {
      // Cuadro cuadrado y centrado: el lado sale del más largo, así nada se
      // recorta y el centro del dibujo cae en el centro del archivo.
      const caja = Math.max(width, height);
      const fondo = { r: 0, g: 0, b: 0, alpha: 0 };

      // DOS PASADAS, Y NO UNA. En sharp el `resize` se aplica ANTES que el
      // `composite`, sin importar el orden en que se escriban: encadenados, el
      // lienzo se agranda primero y el dibujo se pega después a su tamaño
      // original, centrado pero chico. Quedaba ocupando el 79% del archivo, y
      // eso se ve como una rueda más chica de lo pedido y descentrada al
      // compensarlo por afuera. Componer primero y escalar después lo arregla.
      const compuesta = await sharp({
        create: { width: caja, height: caja, channels: 4, background: fondo },
      })
        .composite([{ input: await img.toBuffer(), gravity: 'center' }])
        .png()
        .toBuffer();

      await sharp(compuesta)
        .resize(p.lado, p.lado)
        .webp({ quality: 92 })
        .toFile(path.join(DESTINO, `${p.id}.webp`));
    } else {
      await img
        .resize({ height: p.lado, fit: 'inside' })
        .webp({ quality: 92 })
        .toFile(path.join(DESTINO, `${p.id}.webp`));
    }

    console.log(`${p.id.padEnd(14)} ${p.pieza}  ${width}x${height}`);
  }

  console.log(`\n${PARTES.length} piezas en ${DESTINO}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
