/** Las dos letras que identifican a un extra en su botón: "Queso" → "Qu", "Borde de queso" → "BD". */
export function abreviatura(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/)
  if (palabras.length > 1) return (palabras[0][0] + palabras[1][0]).toUpperCase()
  const dos = nombre.trim().slice(0, 2)
  return dos.charAt(0).toUpperCase() + dos.slice(1)
}

export function cx(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(' ')
}
