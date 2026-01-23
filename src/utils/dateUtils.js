const pad2 = (n) => String(n).padStart(2, "0")

export const getTodayStr = () => {
    const d = new Date()
    const y = d.getFullYear()
    const m = pad2(d.getMonth() + 1)
    const day = pad2(d.getDate())
    return `${y}-${m}-${day}`
}

export const parseLocalDate = (ymd) => {
    if (!ymd) return null
    const parts = String(ymd).split("-")
    if (parts.length !== 3) return null

    const y = Number(parts[0])
    const m = Number(parts[1])
    const d = Number(parts[2])
    if (!y || !m || !d) return null

    // 用本地時區建立日期，避免 iOS UTC 問題
    return new Date(y, m - 1, d)
}

export const getDays = (dateStr) => {
    const target = parseLocalDate(dateStr)
    if (!target) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const diffMs = target.getTime() - today.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export const addDaysToDate = (dateStr, days) => {
    const base = dateStr ? parseLocalDate(dateStr) : new Date()

    if (!base) return null

    base.setHours(0, 0, 0, 0)
    base.setDate(base.getDate() + days)

    const y = base.getFullYear()
    const m = pad2(base.getMonth() + 1)
    const d = pad2(base.getDate())
    return `${y}-${m}-${d}`
}
