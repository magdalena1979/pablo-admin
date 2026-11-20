// Browser-only OAuth: the client ID is public; access tokens stay in memory.
export const GALLAGHER_FOLDER_ID = "1MwNFGhoj9VsOdVtLZPtX6DvoEILkWrv1"
export const GALLAGHER_FOLDER_URL = `https://drive.google.com/drive/folders/${GALLAGHER_FOLDER_ID}`
const scope = "https://www.googleapis.com/auth/drive.readonly"
interface TokenResponse { access_token?: string; expires_in?: number; error?: string; scope?: string }
interface GoogleIdentity { accounts: { oauth2: { initTokenClient(options: {
  client_id: string; scope: string; callback(response: TokenResponse): void
  error_callback(error: { type: string }): void
}): { requestAccessToken(options: { prompt: string }): void } } } }
declare global { interface Window { google?: GoogleIdentity } }
let loadingScript: Promise<void> | null = null
let token = "", expiresAt = 0
let authorizing: Promise<string> | null = null
const clientId = () => import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID?.trim()
export const isDriveConfigured = () => Boolean(clientId())

export function prepareDriveConnection(): Promise<void> {
  if (!clientId()) return Promise.reject(new Error("Falta configurar la conexión de Google Drive en esta aplicación."))
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (loadingScript) return loadingScript
  loadingScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    const timeout = window.setTimeout(() => { script.remove(); reject(new Error("Google no respondió. Intentá conectar Drive nuevamente.")) }, 20000)
    script.src = "https://accounts.google.com/gsi/client"; script.async = true
    script.onload = () => { clearTimeout(timeout); resolve() }
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error("No pudimos cargar la conexión con Google Drive.")) }
    document.head.appendChild(script)
  }).catch(error => { loadingScript = null; throw error })
  return loadingScript
}
async function accessToken(): Promise<string> {
  if (token && Date.now() < expiresAt) return token
  if (authorizing) return authorizing
  await prepareDriveConnection()
  authorizing = new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId()!, scope,
      callback: response => {
        if (response.error || !response.access_token || !response.scope?.split(" ").includes(scope)) {
          reject(new Error("No se autorizó la lectura de Drive. Usá una cuenta con acceso a la carpeta.")); return
        }
        token = response.access_token; expiresAt = Date.now() + Math.max(0, (Number(response.expires_in ?? 0) - 60)) * 1000
        resolve(token)
      },
      error_callback: () => reject(new Error("La conexión con Google se cerró o fue bloqueada. Permití la ventana emergente y volvé a pulsar Actualizar.")),
    })
    client.requestAccessToken({ prompt: "" })
  }).finally(() => { authorizing = null })
  return authorizing
}
async function driveGet(path: string, bearer: string, signal: AbortSignal) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, { headers: { Authorization: `Bearer ${bearer}` }, signal })
  if (response.status === 401) { token = ""; expiresAt = 0; throw new Error("La conexión con Drive venció. Pulsá Actualizar para reconectar.") }
  if (!response.ok) throw new Error(response.status === 403 ? "Google no permitió leer la carpeta. Revisá el acceso de tu cuenta y que Drive API esté habilitada." : response.status === 404 ? "La carpeta o el archivo no están disponibles para esta cuenta." : `No pudimos leer Drive (${response.status}).`)
  return response
}
export interface DriveCsvFile { id: string; name: string; modifiedTime: string; size?: string; mimeType: string }
export async function listDriveCsvFiles(signal: AbortSignal): Promise<{ files: DriveCsvFile[]; bearer: string }> {
  const bearer = await accessToken(), files: DriveCsvFile[] = []
  let pageToken = ""
  do {
    const params = new URLSearchParams({ q: `'${GALLAGHER_FOLDER_ID}' in parents and trashed = false`, fields: "nextPageToken,files(id,name,size,mimeType,modifiedTime)", pageSize: "100", orderBy: "name", supportsAllDrives: "true", includeItemsFromAllDrives: "true" })
    if (pageToken) params.set("pageToken", pageToken)
    const body = await (await driveGet(`files?${params}`, bearer, signal)).json() as { files?: DriveCsvFile[]; nextPageToken?: string }
    files.push(...(body.files ?? []).filter(file => /\.csv$/i.test(file.name) && file.mimeType !== "application/vnd.google-apps.shortcut"))
    if (files.length > 500) throw new Error("La carpeta supera los 500 CSV. Separá los archivos en una carpeta de trabajo más pequeña.")
    pageToken = body.nextPageToken ?? ""
  } while (pageToken)
  return { files, bearer }
}
export async function downloadDriveCsv(file: DriveCsvFile, bearer: string, signal: AbortSignal): Promise<File> {
  const max = 2 * 1024 * 1024
  if (Number(file.size ?? 0) > max) throw new Error("El CSV supera el límite de 2 MB por archivo para esta revisión.")
  const response = await driveGet(`files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`, bearer, signal)
  const reader = response.body?.getReader()
  if (!reader) throw new Error("No pudimos descargar el CSV.")
  const parts: ArrayBuffer[] = []; let size = 0
  while (true) {
    const { done, value } = await reader.read(); if (done) break
    size += value.byteLength
    if (size > max) { await reader.cancel(); throw new Error("El CSV supera los 2 MB permitidos.") }
    parts.push(value.slice().buffer)
  }
  return new File(parts, file.name, { type: "text/csv" })
}
