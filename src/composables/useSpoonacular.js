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

            // number=12: 回傳 12 筆
            // ranking=1: 優先顯示能最大化利用現有食材的食譜 (Minimize missing ingredients)
            // ignorePantry=true: 假設家中沒有常備品 (油鹽等)，更嚴格匹配 (看需求，通常設 true 比較準確反應 "能煮什麼")
            const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredientNames}&number=12&ranking=1&ignorePantry=true&apiKey=${API_KEY}`

            const res = await fetch(url)

            if (!res.ok) {
                const errText = await res.text()
                throw new Error(`API Error: ${res.status} ${res.statusText} - ${errText}`)
            }

            recipes.value = await res.json()
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
