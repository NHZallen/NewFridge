/**
 * 基礎圖片壓縮 composable
 * - 目標：回傳可上傳的 Blob（jpeg）
 * - 備註：目前仍在主執行緒進行，後續若要再優化可搬到 Web Worker
 */
export function useImageCompression() {
    const MAX_WIDTH = 1600
    const MAX_HEIGHT = 1600
    const OUTPUT_QUALITY = 0.82
    const OUTPUT_MIME = 'image/jpeg'

    const loadImage = (file) => new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            URL.revokeObjectURL(url)
            resolve(img)
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('圖片載入失敗'))
        }
        img.src = url
    })

    const compressFile = async (file) => {
        if (!file) throw new Error('未提供檔案')
        if (!file.type || !file.type.startsWith('image/')) {
            throw new Error('僅支援圖片檔')
        }

        // SVG 不做 raster 壓縮，直接回傳原檔避免意外破圖
        if (file.type === 'image/svg+xml') return file

        const img = await loadImage(file)
        const scale = Math.min(MAX_WIDTH / img.width, MAX_HEIGHT / img.height, 1)
        const targetWidth = Math.max(1, Math.round(img.width * scale))
        const targetHeight = Math.max(1, Math.round(img.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = targetWidth
        canvas.height = targetHeight

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) throw new Error('無法建立 Canvas 上下文')

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((result) => {
                if (!result) {
                    reject(new Error('圖片壓縮失敗'))
                    return
                }
                resolve(result)
            }, OUTPUT_MIME, OUTPUT_QUALITY)
        })

        return blob
    }

    return {
        compressFile
    }
}
