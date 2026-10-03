/**
 * ───────────────────────────────────────────────────────────────────────────
 * CAPTURAS PARA LA FICHA DE PLAY
 * ───────────────────────────────────────────────────────────────────────────
 * Saca una captura del telefono conectado por adb y la deja lista para subir,
 * en `tienda/`.
 *
 *   node herramientas/captura.js coleccion
 *   node herramientas/captura.js camara-huevo
 *
 * ## Por que recorta
 *
 * Play exige que el lado largo no pase del doble del corto. El telefono de
 * desarrollo saca 1080x2392, que es 2,21:1, y esa captura **la rechaza**. Asi
 * que despues de bajarla se recorta al centro a 2:1 exacto: se van unos 100
 * pixeles arriba y abajo, que en estas pantallas es barra de estado y barra de
 * gestos. Si alguna pantalla tiene algo importante pegado al borde, conviene
 * mirar el recorte antes de subirlo.
 *
 * Guarda las dos: el `.original.png` queda al lado por si hace falta recortar
 * distinto, y es el que NO se sube.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const nombre = process.argv[2] || 'captura';
const destino = path.join(__dirname, '..', 'tienda');
fs.mkdirSync(destino, { recursive: true });

const original = path.join(destino, `${nombre}.original.png`);
const recortada = path.join(destino, `${nombre}.png`);

// `exec-out` manda el PNG crudo por stdout: sin esto, adb traduce los saltos de
// linea y el archivo llega corrupto en Windows.
let crudo;
try {
  crudo = execFileSync('adb', ['exec-out', 'screencap', '-p'], {
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (e) {
  // Sin esto, adb sin telefono enfrente tira un stack de child_process que no
  // dice nada de lo que hay que hacer.
  console.error('No se pudo hablar con el telefono. Revisa la conexion:');
  console.error('  adb devices -l');
  process.exit(1);
}

// Una captura vacia se ve igual que una buena en un `ls` apurado: si el telefono
// se desconecto, mejor enterarse ahora.
if (crudo.length < 1000) {
  console.error(`La captura salio vacia (${crudo.length} bytes). Revisa la conexion:`);
  console.error('  adb devices -l');
  process.exit(1);
}
fs.writeFileSync(original, crudo);

(async () => {
  const { width, height } = await sharp(original).metadata();
  const alto = Math.min(height, width * 2);
  await sharp(original)
    .extract({
      left: 0,
      top: Math.round((height - alto) / 2),
      width,
      height: alto,
    })
    .toFile(recortada);

  const kb = (n) => `${Math.round(n / 1024)} KB`;
  console.log(`${original}  ${width}x${height}  ${kb(crudo.length)}`);
  console.log(`${recortada}  ${width}x${alto}  ${kb(fs.statSync(recortada).size)}`);
})();
