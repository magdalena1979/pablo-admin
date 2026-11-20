const sharePath = "/gallagher-share"
const storeName = "batches"
const retentionMs = 24 * 60 * 60 * 1000
const localHeaders = { "Cache-Control": "no-store" }

self.addEventListener("install", event => event.waitUntil(self.skipWaiting()))
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()))

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (event.request.method === "POST" && url.pathname === sharePath) {
    event.respondWith(receiveFiles(event.request))
  } else if (event.request.method === "GET" && url.pathname.startsWith(sharePath + "/")) {
    const id = url.pathname.slice(sharePath.length + 1)
    event.respondWith(readFiles(id))
  }
})

async function useStore(mode, operation) {
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open("gallagher-shares", 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName).createIndex("expiresAt", "expiresAt")
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode)
      const request = operation(transaction.objectStore(storeName))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

async function receiveFiles(request) {
  let destination = "recepcion-fallida"
  try {
    const form = await request.formData()
    const files = form.getAll("csv")
    if (!files.length || files.some(file => !(file instanceof File) || !/\.csv$/i.test(file.name))) {
      destination = "archivo-invalido"
    } else if (files.some(file => file.size > 2 * 1024 * 1024)
      || files.reduce((bytes, file) => bytes + file.size, 0) > 20 * 1024 * 1024) {
      destination = "archivo-grande"
    } else {
      const id = crypto.randomUUID()
      await useStore("readwrite", store => {
        const expired = store.index("expiresAt").openCursor(IDBKeyRange.upperBound(Date.now()))
        expired.onsuccess = () => {
          const cursor = expired.result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          }
        }
        return store.add({ files, expiresAt: Date.now() + retentionMs }, id)
      })
      destination = id
    }
  } catch (error) {
    console.error("No se pudo recibir el CSV compartido.", error)
  }
  return Response.redirect(new URL("/hacienda/" + destination, self.location.origin), 303)
}

async function readFiles(id) {
  if (!/^[\da-f-]{36}$/i.test(id)) return new Response(null, { status: 404, headers: localHeaders })
  try {
    const batch = await useStore("readonly", store => store.get(id))
    if (!batch || batch.expiresAt <= Date.now()) {
      return new Response(null, { status: 404, headers: localHeaders })
    }
    const form = new FormData()
    for (const file of batch.files) form.append("csv", file, file.name)
    return new Response(form, { headers: localHeaders })
  } catch {
    return new Response(null, { status: 500, headers: localHeaders })
  }
}
