import { ref } from 'vue'

const API_KEY = 'rmgY2DQ9HprVQxD2YuBFGTmvneOUrJRz'

export function useSpoonacular() {
    const recipes = ref([])
    const loading = ref(false)
    const error = ref(null)

    const searchByIngredients = async (items) => {
        if (!items || items.length === 0) {
            recipes.value = []
            return
        }

        loading.value = true
        error.value = null
        recipes.value = []

        try {
            // 簡單過濾：只取有效且數量 > 0 的物品名稱
            // 可以考慮只取快過期的，這邊先取前 10 個避免 URL 過長
            const ingredientNames = items
                .filter(i => parseInt(i.quantity) > 0)
                .map(i => i.name)
                .slice(0, 20) // 限制數量
                .join(',')

            if (!ingredientNames) {
                loading.value = false
                return
            }

            // 改用 APILayer 的 complexSearch Endpoint
            // includeIngredients: 指定食材
            // fillIngredients=true: 回傳食材詳細資訊 (used/missed)
            // sort=max-used-ingredients: 優先顯示能用最多現有食材的
            // number=12: 回傳數量
            const url = `https://api.apilayer.com/spoonacular/recipes/complexSearch?includeIngredients=${ingredientNames}&fillIngredients=true&sort=max-used-ingredients&number=12&ignorePantry=true`

            const res = await fetch(url, {
                headers: {
                    'apikey': API_KEY
                }
            })

            if (!res.ok) {
                const errText = await res.text()
                throw new Error(`API Error: ${res.status} ${res.statusText} - ${errText}`)
            }

            const data = await res.json()
            // complexSearch 回傳 { results: [...] }
            // 且為了兼容 UI，確保 usedIngredientCount 等欄位存在
            recipes.value = (data.results || []).map(r => ({
                ...r,
                usedIngredientCount: r.usedIngredientCount || (r.usedIngredients || []).length,
                missedIngredientCount: r.missedIngredientCount || (r.missedIngredients || []).length
            }))
        } catch (err) {
            console.error('Spoonacular API Error:', err)
            error.value = `無法取得食譜: ${err.message}`
        } finally {
            loading.value = false
        }
    }

    return {
        recipes,
        loading,
        error,
        searchByIngredients
    }
}
