"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * ArchiFlow — provider de thème.
 *
 * Points critiques (ce sont eux qui cassent 90 % des dark modes) :
 *  1. attribute="class"        -> pose la classe `dark` sur <html>, pas sur <body>
 *  2. defaultTheme="system"    -> l'utilisateur qui n'a rien choisi suit l'OS
 *  3. enableSystem             -> sinon `system` est ignoré silencieusement
 *  4. disableTransitionOnChange-> évite le flash de transition de couleurs au toggle
 *  5. suppressHydrationWarning sur <html> dans layout.tsx (obligatoire)
 *  6. Si tu as une CSP stricte : passe `nonce` sinon le script anti-flash est
 *     bloqué et le thème "revient au clair" à chaque rechargement.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
