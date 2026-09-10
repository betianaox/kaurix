package expo.modules.reconocedor

import android.content.Context
import android.net.Uri
import com.google.mlkit.common.model.LocalModel
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeler
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.custom.CustomImageLabelerOptions
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * ───────────────────────────────────────────────────────────────────────────
 * EL ETIQUETADOR
 * ───────────────────────────────────────────────────────────────────────────
 * Mira una foto y dice qué hay. Es la mitad del reconocedor que depende de un
 * modelo; la otra mitad —el color— vive en JavaScript y no necesita nada de
 * esto.
 *
 * ## Por qué está escrito acá y no se usa una librería
 *
 * Porque ninguna sirve para lo único que hace falta: **cargar un modelo
 * propio**.
 *
 * `@react-native-ml-kit/image-labeling`, que es lo que había, importa
 * `...label.defaults.ImageLabelerOptions` y expone una sola función sin
 * opciones: no hay por dónde pasarle un `.tflite`. Y el modelo base de ML Kit
 * tiene 447 etiquetas entre las que no hay una sola fruta ni verdura por
 * nombre, así que con él el juego nunca va a distinguir una zanahoria de un
 * morrón. Eso está medido y anotado en `docs/kaurix-clases-del-modelo.md`.
 *
 * La otra opción era `@infinitered/react-native-mlkit-image-labeling`, que sí
 * carga modelos propios, pero su última versión es de noviembre de 2025 y
 * apunta al SDK 54 —tres versiones atrás—, y trae un paquete `core` con
 * contextos y hooks de React para algo que acá se llama desde una función
 * suelta. Se depende de un módulo desactualizado o se escriben estas ochenta
 * líneas; escribirlas sale más barato que quedar colgado de él.
 *
 * ## Se le pasa el archivo, no los píxeles
 *
 * `InputImage.fromFilePath` abre el JPEG, lo decodifica, lo rota según el EXIF
 * y lo escala a lo que el modelo pide leyendo los metadatos del `.tflite`.
 *
 * Eso es exactamente lo que hubo que descartar de la vía TensorFlow Lite a
 * secas (`react-native-fast-tflite`): ahí la entrada es un tensor, así que
 * decodificar el JPEG y normalizar los píxeles quedaba de nuestro lado, a mano
 * y en JavaScript, para terminar en el mismo lugar.
 */
class ReconocedorModule : Module() {

  private val contexto: Context?
    get() = appContext.reactContext

  /**
   * Si el modelo propio está dentro de este binario.
   *
   * Se pregunta abriendo el archivo y no listando la carpeta: `assets.list` en
   * la raíz devuelve también lo que empaquetan las otras librerías, y bastaba
   * con que algo se llamara parecido para creer que el modelo estaba.
   */
  private val propio: Boolean by lazy {
    try {
      contexto?.assets?.open(MODELO)?.close()
      contexto != null
    } catch (e: Exception) {
      false
    }
  }

  /**
   * El etiquetador, armado una sola vez.
   *
   * Construirlo carga el modelo en memoria, así que hacerlo en cada lectura
   * —una cada segundo y medio— sería pagar esa carga todo el tiempo.
   */
  private val etiquetador: ImageLabeler by lazy {
    if (propio) {
      val modelo = LocalModel.Builder().setAssetFilePath(MODELO).build()
      ImageLabeling.getClient(
        CustomImageLabelerOptions.Builder(modelo)
          .setConfidenceThreshold(CONFIANZA)
          .setMaxResultCount(CUANTAS)
          .build()
      )
    } else {
      ImageLabeling.getClient(
        ImageLabelerOptions.Builder().setConfidenceThreshold(CONFIANZA).build()
      )
    }
  }

  override fun definition() = ModuleDefinition {
    Name("Reconocedor")

    /**
     * Qué modelo está andando. Lo lee `mirar.ts` para no tener que adivinar si
     * las etiquetas que le llegan son las 55 clases del juego o las 447 del
     * modelo base, que se leen igual pero no significan lo mismo.
     */
    Constants {
      mapOf("propio" to propio)
    }

    AsyncFunction("etiquetar") { uri: String, promise: Promise ->
      val ctx = contexto
      if (ctx == null) {
        promise.resolve(emptyList<Map<String, Any>>())
        return@AsyncFunction
      }

      try {
        val imagen = InputImage.fromFilePath(ctx, Uri.parse(uri))
        etiquetador
          .process(imagen)
          .addOnSuccessListener { etiquetas ->
            promise.resolve(
              etiquetas.map {
                mapOf(
                  "texto" to it.text,
                  // El índice de la clase. Con el modelo propio es lo que de
                  // verdad identifica: `text` sale de los metadatos del
                  // `.tflite` y viene vacío si el modelo se exportó sin mapa
                  // de etiquetas, y ahí el índice es lo único que queda.
                  "indice" to it.index,
                  "confianza" to it.confidence
                )
              }
            )
          }
          .addOnFailureListener {
            // Una lectura que no salió, no un error del que haya que enterarse:
            // la foto puede llegar a medio escribir si la cámara se estaba
            // cerrando. El bucle de arriba ya sabe esperar a la siguiente.
            promise.resolve(emptyList<Map<String, Any>>())
          }
      } catch (e: Exception) {
        promise.resolve(emptyList<Map<String, Any>>())
      }
    }

    OnDestroy {
      try {
        etiquetador.close()
      } catch (e: Exception) {
        // Cerrar algo que ya se cerró no es un problema.
      }
    }
  }

  companion object {
    /** El modelo propio, en `android/src/main/assets`. Todavía no existe. */
    private const val MODELO = "modelo.tflite"

    /**
     * El piso de confianza nativo, a propósito bajo.
     *
     * El umbral que decide de verdad está en `mirar.ts`, que es JavaScript y se
     * puede mover recargando en vez de recompilando. Si el filtro fino
     * estuviera acá, cada ajuste costaría un build de Gradle.
     */
    private const val CONFIANZA = 0.1f

    /** Cuántas etiquetas devolver como mucho. Ninguna escena tiene más. */
    private const val CUANTAS = 10
  }
}
