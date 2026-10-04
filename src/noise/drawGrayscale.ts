export function drawGrayscale(ctx: CanvasRenderingContext2D, res: number, map: Float32Array): void {
  ctx.canvas.width = res
  ctx.canvas.height = res
  const imageData = ctx.createImageData(res, res)
  for (let p = 0; p < map.length; p++) {
    const v = Math.max(0, Math.min(255, Math.round(map[p] * 255)))
    imageData.data[p * 4] = v
    imageData.data[p * 4 + 1] = v
    imageData.data[p * 4 + 2] = v
    imageData.data[p * 4 + 3] = 255
  }
  ctx.putImageData(imageData, 0, 0)
}
