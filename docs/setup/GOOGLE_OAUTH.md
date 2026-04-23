# Google OAuth — setup

El botón "Continuar con Google" en `/login` llama a
`supabase.auth.signInWithOAuth({ provider: 'google' })`. Supabase gestiona
el flujo PKCE y redirige a `/api/auth/callback`, que ya está implementado
en [apps/web/src/app/api/auth/callback/route.ts](../../apps/web/src/app/api/auth/callback/route.ts).

Para que funcione en producción hay dos pasos manuales en consolas
externas que no podemos hacer desde el código.

## 1. Google Cloud Console

1. https://console.cloud.google.com/apis/credentials
2. Create Credentials → OAuth client ID → Web application
3. Authorized JavaScript origins:
   - `https://academic-os-mu.vercel.app`
   - `http://localhost:3000` (para dev)
4. Authorized redirect URIs:
   - `https://xnbkfkalmxalxazqogmu.supabase.co/auth/v1/callback`
5. Copia el **Client ID** y **Client Secret**.

## 2. Supabase dashboard

1. https://supabase.com/dashboard/project/xnbkfkalmxalxazqogmu/auth/providers
2. Google → Enable
3. Pega el Client ID y el Client Secret del paso anterior
4. Redirect URL (ya configurada): `https://xnbkfkalmxalxazqogmu.supabase.co/auth/v1/callback`
5. Save

## 3. Verificación

1. Abre `https://academic-os-mu.vercel.app/login` en incógnito
2. Click "Continuar con Google" → Google auth screen
3. Tras aceptar → vuelves a `/api/auth/callback` → redirect automático a
   `/onboarding` (nuevo) o `/dashboard` (ya con membership)

Si falla con `error=exchange_failed`, revisa que el Client ID/Secret en
Supabase coinciden exactamente con los de Google Cloud (sin espacios
extras).

## Provider adicionales

La misma pantalla de Supabase permite habilitar GitHub, Apple, etc. El
código no necesita cambios — el callback soporta cualquier provider
OAuth.
