# UAL Bridge — Chrome MV3 Extension

Extensión Chrome que captura anuncios, tareas y materiales en
`aulavirtual.ual.es` y los envía a Academic OS.

## Build

```bash
pnpm --filter @academic-os/extension build
# Produce packages/extension/dist/ listo para cargar en Chrome.
```

## Instalar en Chrome (modo desarrollador)

1. `chrome://extensions`
2. Activar "Modo de desarrollador"
3. "Cargar descomprimida" → seleccionar `packages/extension/dist/`

## Cómo funciona

- `content-script.ts` se inyecta en `https://aulavirtual.ual.es/*`, extrae los
  bloques visibles (anuncios, entregas, materiales) y envía un snapshot al
  `background.ts` cuando detecta cambios respecto al último guardado.
- `background.ts` guarda el JWT del usuario en `chrome.storage.local` y hace
  `POST` a `https://academic-os-mu.vercel.app/api/sync/blackboard` con
  `Authorization: Bearer <jwt>`.
- `popup.html` muestra estado de conexión, última sincronización y permite
  pegar el JWT manualmente desde la UI de Academic OS.

## Iconos

Coloca `icons/icon-16.png`, `icon-48.png` y `icon-128.png` en
`packages/extension/icons/` antes de empaquetar para la Chrome Web Store.
