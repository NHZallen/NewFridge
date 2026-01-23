export function useImageCompression() {
    const compressFile = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = (e) => {
                const img = new Image()
                img.src = e.target.result
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
                    resolve(canvas.toDataURL("image/jpeg", 0.6))
                }
            }
        })
    }

    return {
        compressFile
    }
}
