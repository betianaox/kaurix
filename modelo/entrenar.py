"""
El entrenamiento del modelo de Kaurix, para correr en esta computadora.

Las fotos no salen de acá: las junta `fotos.py` y las elige `filtrar.py`. Esto
entrena con lo que haya en `datos/`, una carpeta por clase.

    .venv/Scripts/python.exe entrenar.py entrenar   # entrena y guarda el .keras
    .venv/Scripts/python.exe entrenar.py exportar   # .tflite con metadatos
    .venv/Scripts/python.exe entrenar.py propias    # acierto con fotos propias

## Por qué Python 3.9

`tflite-support`, que escribe los metadatos que ML Kit lee, no tiene versión
para Windows después de la 0.4.3, y esa llega hasta Python 3.9. TensorFlow 2.15
todavía soporta 3.9. Con otra combinación no instala.

## Por qué en procesador y no en la placa

TensorFlow dejó de usar placas NVIDIA en Windows nativo después de la 2.10.
Para este modelo no hace falta: MobileNetV3Small con unas veinte mil fotos
entrena en el procesador en unos minutos.
"""

import argparse
import random
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

AQUI = Path(__file__).resolve().parent

# Lo que espera MobileNetV3 y lo que la app le da: `mirar.ts` saca la foto a 320
# puntos y ML Kit la reescala a esto.
LADO = 224


# ─── entrenar ─────────────────────────────────────────────────────────────


def entrenar(args):
    import numpy as np
    import tensorflow as tf

    datos, salida = Path(args.datos), Path(args.salida)
    salida.mkdir(parents=True, exist_ok=True)
    tf.keras.utils.set_random_seed(1234)

    # Un quinto para validar. Sale del mismo pozo, así que no mide cómo anda en
    # una cocina de verdad: eso lo mide `propias`.
    comun = dict(validation_split=0.2, seed=1234, image_size=(LADO, LADO), batch_size=32, label_mode="categorical")
    entrena = tf.keras.utils.image_dataset_from_directory(datos, subset="training", **comun)
    valida = tf.keras.utils.image_dataset_from_directory(datos, subset="validation", **comun)

    # El orden lo fija Keras al leer las carpetas, y ese mismo orden va en los
    # metadatos. Se guarda para que exportar no tenga que adivinarlo.
    nombres = entrena.class_names
    (salida / "etiquetas.txt").write_text("\n".join(nombres), encoding="utf-8")
    print(len(nombres), "clases")

    # El recorte al azar es el que suple los recuadros que muchas clases no
    # tienen. Brillo y contraste imitan luz de tarde contra luz de tubo.
    aumentos = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.08),
        tf.keras.layers.RandomZoom(0.25),
        tf.keras.layers.RandomTranslation(0.1, 0.1),
        tf.keras.layers.RandomBrightness(0.25, value_range=(0, 255)),
        tf.keras.layers.RandomContrast(0.25),
    ], name="aumentos")

    AUTO = tf.data.AUTOTUNE
    # En memoria antes de aumentar: leer y decodificar catorce mil JPG en cada
    # vuelta es lo que más tarda en procesador. Entra holgado en la RAM.
    entrena = entrena.cache().shuffle(2000).map(lambda x, y: (aumentos(x, training=True), y), num_parallel_calls=AUTO).prefetch(AUTO)
    valida = valida.cache().prefetch(AUTO)

    # MobileNetV3Small: el más chico con precisión razonable. Va adentro del APK
    # y corre en gama media.
    #
    # `include_preprocessing=True` deja la normalización adentro del modelo, y
    # por eso los metadatos dicen media 0 y desvío 1. Normalizar de los dos
    # lados da un modelo que acierta acá y falla en el teléfono.
    Base = tf.keras.applications.MobileNetV3Large if args.base == "large" else tf.keras.applications.MobileNetV3Small
    base = Base(
        input_shape=(LADO, LADO, 3), include_top=False, weights="imagenet", include_preprocessing=True,
    )
    base.trainable = False
    modelo = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(LADO, LADO, 3)),
        base,
        tf.keras.layers.GlobalAveragePooling2D(),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(len(nombres), activation="softmax"),
    ])

    # Primera vuelta: solo la cabeza. La base ya sabe mirar; falta que aprenda
    # a nombrar estas cosas.
    # Hay clases con 500 fotos y clases con 60. Sin pesos, el modelo aprende que
    # decir "manzana" casi nunca es un error y el kiwi queda de adorno. Cada clase
    # pesa en proporción inversa a cuántas fotos tiene.
    cuantas = [len(list((datos / n).glob("*.jpg"))) for n in nombres]
    pesos = {i: sum(cuantas) / (len(cuantas) * n) for i, n in enumerate(cuantas)}

    modelo.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="categorical_crossentropy", metrics=["accuracy"])
    modelo.fit(entrena, validation_data=valida, epochs=args.epocas_cabeza, class_weight=pesos, verbose=2)

    # Segunda vuelta: se descongela la parte de arriba de la base, con paso
    # corto. De acá sale distinguir una pera de una manzana. Con el paso de
    # antes, la base olvida en dos lotes lo que aprendió en un millón de fotos.
    base.trainable = True
    for capa in base.layers[:-args.capas]:
        capa.trainable = False
    modelo.compile(optimizer=tf.keras.optimizers.Adam(args.paso_ajuste), loss="categorical_crossentropy", metrics=["accuracy"])
    modelo.fit(entrena, validation_data=valida, epochs=args.epocas_ajuste, class_weight=pesos, verbose=2)

    modelo.save(salida / "modelo.keras")

    # El promedio no alcanza para decidir: lo que importa es cuáles fallan.
    ciertas, predichas = [], []
    for x, y in valida:
        ciertas.extend(np.argmax(y.numpy(), axis=1))
        predichas.extend(np.argmax(modelo.predict(x, verbose=0), axis=1))
    ciertas, predichas = np.array(ciertas), np.array(predichas)

    lineas = [f"acierto general (validación, mismo pozo): {(ciertas == predichas).mean() * 100:.1f}%", ""]
    filas = []
    for i, n in enumerate(nombres):
        suyas = ciertas == i
        if not suyas.any():
            continue
        otras = predichas[suyas & (predichas != i)]
        conquien = nombres[np.bincount(otras).argmax()] if len(otras) else "—"
        filas.append((float((predichas[suyas] == i).mean()), n, conquien, int(suyas.sum())))
    lineas.append("por clase, de peor a mejor:")
    for acierto, n, conquien, cuantas in sorted(filas):
        lineas.append(f"   {n:<16} {acierto * 100:5.1f}%  ({cuantas} fotos)  se confunde con {conquien}")

    informe = "\n".join(lineas)
    (salida / "informe.txt").write_text(informe, encoding="utf-8")
    print(informe)


# ─── exportar ─────────────────────────────────────────────────────────────


def exportar(args):
    import numpy as np
    import tensorflow as tf
    from tflite_support.metadata_writers import image_classifier, writer_utils

    datos, salida = Path(args.datos), Path(args.salida)
    modelo = tf.keras.models.load_model(salida / "modelo.keras")
    etiquetas = salida / "etiquetas.txt"
    nombres = etiquetas.read_text(encoding="utf-8").split("\n")

    conv = tf.lite.TFLiteConverter.from_keras_model(modelo)
    conv.optimizations = [tf.lite.Optimize.DEFAULT]
    crudo = salida / "modelo_sin_metadatos.tflite"
    crudo.write_bytes(conv.convert())

    # Los metadatos hacen que ML Kit devuelva "manzana" y no el número 0. Media
    # 0 y desvío 1 porque la normalización ya está adentro del modelo.
    escritor = image_classifier.MetadataWriter.create_for_inference(
        writer_utils.load_file(str(crudo)),
        input_norm_mean=[0.0],
        input_norm_std=[1.0],
        label_file_paths=[str(etiquetas)],
    )
    final = salida / "modelo.tflite"
    writer_utils.save_file(escritor.populate(), str(final))
    print(f"{final}  {final.stat().st_size / 1e6:.2f} MB")

    # Que el archivo que se va a copiar funcione, antes de copiarlo.
    interp = tf.lite.Interpreter(model_path=str(final))
    interp.allocate_tensors()
    ent, sal = interp.get_input_details()[0], interp.get_output_details()[0]
    print("entrada:", ent["shape"], ent["dtype"].__name__, " salida:", sal["shape"], sal["dtype"].__name__)
    assert sal["shape"][-1] == len(nombres), "la salida no tiene una casilla por clase"

    fotos = sorted(datos.glob("*/*.jpg"))
    aciertos = 0
    muestra = random.Random(7).sample(fotos, min(200, len(fotos)))
    for f in muestra:
        img = tf.keras.utils.img_to_array(tf.keras.utils.load_img(f, target_size=(LADO, LADO)))
        interp.set_tensor(ent["index"], np.expand_dims(img, 0).astype(ent["dtype"]))
        interp.invoke()
        aciertos += nombres[int(np.argmax(interp.get_tensor(sal["index"])[0]))] == f.parent.name
    print(f"el .tflite acierta {aciertos}/{len(muestra)} fotos del dataset (tiene que dar parecido al keras)")


# ─── propias ──────────────────────────────────────────────────────────────


def propias(args):
    import tensorflow as tf

    salida, carpeta = Path(args.salida), Path(args.propias)
    if not carpeta.exists() or not any(carpeta.iterdir()):
        print(f"Todavía no hay fotos propias. Van en {carpeta}/<clase>/")
        return
    nombres = (salida / "etiquetas.txt").read_text(encoding="utf-8").split("\n")
    modelo = tf.keras.models.load_model(salida / "modelo.keras")
    # Mismo orden de clases, o los números no significan lo mismo.
    prueba = tf.keras.utils.image_dataset_from_directory(
        carpeta, image_size=(LADO, LADO), batch_size=32, label_mode="categorical", class_names=nombres,
    )
    _, acierto = modelo.evaluate(prueba, verbose=0)
    print(f"con fotos propias: {acierto * 100:.1f}%")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("paso", choices=["entrenar", "exportar", "propias"])
    p.add_argument("--datos", default=str(AQUI / "datos"))
    p.add_argument("--salida", default=str(AQUI / "salida"))
    p.add_argument("--propias", default=str(AQUI / "propias"))
    p.add_argument("--epocas-cabeza", type=int, default=12)
    p.add_argument("--epocas-ajuste", type=int, default=10)
    # Small es el de partida. Large pesa unos 4 MB en vez de 1 y sigue entrando
    # holgado en gama media; se prueba antes de decidir.
    p.add_argument("--base", choices=["small", "large"], default="small")
    p.add_argument("--capas", type=int, default=40, help="capas de arriba de la base que se ajustan")
    p.add_argument("--paso-ajuste", type=float, default=1e-5)
    args = p.parse_args()
    {"entrenar": entrenar, "exportar": exportar, "propias": propias}[args.paso](args)


if __name__ == "__main__":
    main()
