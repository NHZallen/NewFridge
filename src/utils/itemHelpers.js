import { getDays } from './dateUtils.js'

/**
 * 判斷物品是否無到期日
 */
export const isNoExpiry = (item) => {
    if (item?.noExpiry) return true
    if (!item?.expiryDate) return true
    return false
}

/**
 * 取得區域中文名稱
 */
export const getZoneName = (zone) => {
    switch (zone) {
        case 'all': return '全區'
        case 'cold': return '冷藏區'
        case 'frozen': return '冷凍區'
        case 'veggie': return '蔬果區'
        case 'nostock': return '無庫存區'
        default: return '冰箱庫存'
    }
}

/**
 * 取得區域顏色
 */
export const getZoneColor = (zone) => {
    switch (zone) {
        case 'cold': return '#0d6efd'
        case 'frozen': return '#6f42c1'
        case 'veggie': return '#198754'
        default: return '#6c757d'
    }
}

/**
 * 根據物品狀態取得提醒 CSS class
 */
export const getAlertClass = (item) => {
    if (isNoExpiry(item)) return ''
    const days = getDays(item.expiryDate)
    if (days === null) return ''
    if (days < 0) return 'border-danger expired-item'
    if (days <= 7) return 'border-warning warning-item'
    return ''
}

/**
 * 取得物品剩餘天數的顯示文字
 */
export const getExpiryText = (item) => {
    if (isNoExpiry(item)) return '無期限'
    const days = getDays(item.expiryDate)
    if (days === null) return ''
    if (days < 0) return `已過期 ${Math.abs(days)} 天`
    if (days === 0) return '今天到期'
    return `剩餘 ${days} 天`
}
