<!--
Plantilla de PR — rellena cada sección. Borra lo que no aplique.
PRs sin descripción, sin issue o sin checklist se rechazan.
-->

## Qué

<!-- Resumen de los cambios en 1-3 frases. Qué añade/cambia/arregla este PR. -->

## Por qué (Issue: #NN)

<!-- Enlaza el issue o motivación. Si no hay issue, explica aquí por qué es necesario. -->

Closes #

## Cómo probar

<!--
Pasos concretos para validar el cambio en local o en preview:
1. Rama: ...
2. Ejecutar: ...
3. Verificar: ...
-->

## Screenshots / Recordings

<!-- Obligatorio en cambios de UI. Antes/después si aplica. -->

## Checklist

- [ ] `pnpm turbo typecheck` pasa
- [ ] `pnpm turbo lint` pasa
- [ ] `pnpm turbo test` pasa (unit + e2e afectados)
- [ ] Migraciones reversibles (o marcadas explícitamente como one-way con motivo)
- [ ] Variables de entorno nuevas documentadas en `docs/setup/ENV_VARS.md`
- [ ] Docs actualizados (`docs/`, `README.md`, ADRs si hay decisión nueva)
- [ ] Sin secretos, tokens ni URLs internas en el diff
- [ ] Cambios de schema revisados con RLS activo
