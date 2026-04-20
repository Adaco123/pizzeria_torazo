

import api from "./api"


export async function imprimirTicket(pedidoId: number): Promise<void> {
  
  const response = await api.get(
    `/api/v1.0/pedidos/${pedidoId}/ticket-cocina`,
    { responseType: "blob" }
  )

  
  const contentType: string = response.headers["content-type"] ?? ""
  if (!contentType.includes("application/pdf")) {
    
    const text: string = await (response.data as Blob).text()
    let msg = "Error al generar el ticket"
    try {
      const json = JSON.parse(text)
      msg = json.error ?? msg
    } catch {
      msg = text || msg
    }
    throw new Error(msg)
  }

  
  const blob    = new Blob([response.data], { type: "application/pdf" })
  const url     = URL.createObjectURL(blob)
  const ventana = window.open(url, "_blank")

  
  setTimeout(() => URL.revokeObjectURL(url), 60_000)

  
  if (!ventana) {
    const link    = document.createElement("a")
    link.href     = url
    link.download = `ticket-cocina-${pedidoId}.pdf`
    link.click()
  }
}