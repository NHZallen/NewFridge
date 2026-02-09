export function useImageCompression() {
    const compressFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onerror = () => reject(new Error('圖片讀取失敗'))
            reader.onload = (e) => {
                const img = new Image()
                img.onerror = () => reject(new Error('圖片載入失敗'))
                img.onload = () => {
                    const canvas = document.createElement("canvas")
                    const MAX_WIDTH = 800
                    const scale = MAX_WIDTH / img.width
                    const w = (img.width > MAX_WIDTH) ? MAX_WIDTH : img.width
                    const h = (img.width > MAX_WIDTH) ? img.height * scale : img.height

                    canvas.width = w
                    canvas.height = h
                    const ctx = canvas.getContext("2d")
                    ctx.drawImage(img, 0, 0, w, h)

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error('圖片壓縮失敗'))
                        }
                    }, "image/jpeg", 0.7)
                }
                img.src = e.target.result
            }
            reader.readAsDataURL(file)
        })
    }

    return {
        compressFile
    }
}
