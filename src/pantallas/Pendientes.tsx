import React from 'react';

import { useT } from '../i18n';
import { Pantalla } from '../shell/Pantalla';
import { EnObra } from './EnObra';

/**
 * Lo que hay para hacer, en orden de urgencia, cada cosa con el botón que la
 * resuelve. Es lo que hace que volver a los tres días no sea llegar a una
 * pantalla sin saber qué estabas haciendo.
 */
export function PendientesScreen() {
  const t = useT();

  return (
    <Pantalla titulo={t('avisos.titulo')} encima>
      <EnObra
        que={t('avisos.que')}
        espera={t('avisos.espera')}
      />
    </Pantalla>
  );
}
