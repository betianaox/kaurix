/**
 * Arma las pociones a partir de las piezas de la lámina.
 *
 *   node herramientas/recortar.js assets/pociones.png
 *   node herramientas/pociones.js
 *
 * La lámina trae 14, pero dos son la misma —diente de león, lapislázuli y
 * hinojo aparece dos veces, en la fila 6 derecha y en la 7 izquierda—, así que
 * quedan 13.
 *
 * A diferencia de los ingredientes, acá no hace falta normalizar nada: son
 * todos el mismo frasco y ya vienen del mismo tamaño. Solo se centran.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PIEZAS = path.join(__dirname, 'recortes', 'pociones');
const DESTINO = path.join(__dirname, '..', 'assets', 'pociones');
const LADO = 256;

/**
 * Los nombres son provisorios y describen cómo se ven, no lo que hacen: qué
 * hace cada una todavía no está decidido.
 */
const CATALOGO = [
  { id: 'amatista-liquida', nombre: 'Amatista líquida', pieza: 'f01c4' },
  { id: 'nacar', nombre: 'Nácar', pieza: 'f02c4' },
  { id: 'aliento-frio', nombre: 'Aliento frío', pieza: 'f02c8' },
  { id: 'ambar', nombre: 'Ámbar', pieza: 'f03c4' },
  { id: 'tornasol', nombre: 'Tornasol', pieza: 'f03c8' },
  { id: 'granate', nombre: 'Granate', pieza: 'f04c4' },
  { id: 'espesura', nombre: 'Espesura', pieza: 'f04c8' },
  { id: 'raiz', nombre: 'Raíz', pieza: 'f05c4' },
  { id: 'marea', nombre: 'Marea', pieza: 'f05c8' },
  { id: 'savia', nombre: 'Savia', pieza: 'f06c4' },
  { id: 'doble-cielo', nombre: 'Doble cielo', pieza: 'f06c8' },
  { id: 'vacio', nombre: 'Vacío', pieza: 'f07c8' },
];

(async () => {
  fs.rmSync(DESTINO, { recursive: true, force: true });
  fs.mkdirSync(DESTINO, { recursive: true });

  for (const it of CATALOGO) {
    const archivo = path.join(PIEZAS, `${it.pieza}.png`);
    if (!fs.existsSync(archivo)) {
      console.error(`falta ${it.pieza}.png — ¿corriste recortar.js?`);
      process.exit(1);
    }

    const ajustada = await sharp(archivo)
      .ensureAlpha()
      .resize(Math.round(LADO * 0.92), Math.round(LADO * 0.92), {
        fit: 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    await sharp({
      create: { width: LADO, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: ajustada, gravity: 'center' }])
      .webp({ quality: 90 })
      .toFile(path.join(DESTINO, `${it.id}.webp`));

    console.log(`${it.id.padEnd(18)} ${it.pieza}`);
  }

  console.log(`\n${CATALOGO.length} pociones en ${DESTINO}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
