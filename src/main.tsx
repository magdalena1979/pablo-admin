import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { App } from "@/app/App"
import { AuthProvider } from "@/app/providers/AuthProvider"
import "@/styles/globals.css"
import "@/styles/tokens.css"
import "@/styles/design-system.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></StrictMode>,
)

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/gallagher-share-worker.js").catch(error => {
    console.error("No se pudo habilitar la recepción de CSV compartidos.", error)
  })
}
