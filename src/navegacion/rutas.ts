/**
 * Las pantallas del juego y qué recibe cada una.
 *
 * La colección es la casa: es lo primero que se ve al abrir, porque lo primero
 * que alguien quiere saber es cuánto le falta.
 */
export type Rutas = {
  Coleccion: undefined;
  /** La ficha de una criatura: su barra, qué come, qué le falta. */
  Bicho: { criatura: string };
  Inventario: undefined;
  /** La mesa donde se combina: comidas y pociones. */
  Cocina: undefined;
  Album: undefined;
  Buscar: undefined;
  Pendientes: undefined;
  Ayuda: undefined;
};
