/** The Astra page is already the chat, so the floating launcher stays off that route. */
export function adminAstraLauncherVisible(pathname: string): boolean {
  return pathname !== "/admin/astra";
}
