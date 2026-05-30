// Cover images carry their vertical focal point in the URL (&pos=NN). This
// reads it so the chosen part of the image is shown (object-position) instead
// of always centering and cutting off the important part.
export function coverObjectPosition(url?: string | null): string {
  if (!url) return 'center 50%'
  const match = url.match(/[?&]pos=(\d+)/)
  const pos = match ? Math.min(100, Math.max(0, Number(match[1]))) : 50
  return `center ${pos}%`
}
