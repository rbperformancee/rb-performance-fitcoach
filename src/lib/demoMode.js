// Detection mode demo client — route /demo-client ou ?demo-client=true
// Utilise dans les composants client pour bloquer les writes (sinon
// chaque prospect ecrit sur le compte lucas.demo et le suivant voit
// les donnees du precedent).
export function isClientDemoMode() {
  if (typeof window === "undefined") return false;
  return window.location.pathname === "/demo-client"
    || new URLSearchParams(window.location.search).get("demo-client") === "true";
}
