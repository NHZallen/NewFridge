<template>
  <div class="recipe-view pb-5">
    <!-- Header -->
    <div class="d-flex align-items-center mb-4">
      <button class="btn btn-outline-secondary rounded-circle me-3" @click="$emit('go-back')">
        <i class="bi bi-arrow-left"></i>
      </button>
      <div>
        <h4 class="fw-bold m-0"><i class="bi bi-lightbulb text-warning me-2"></i>食譜靈感</h4>
        <small class="text-muted">基於您冰箱現有的食材推薦</small>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary mb-3" role="status"></div>
      <p class="text-muted">正在尋找美味食譜...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-warning text-center" role="alert">
      <i class="bi bi-exclamation-triangle me-2"></i>{{ error }}
      <div class="mt-2">
        <button class="btn btn-sm btn-outline-dark" @click="refreshRecipes">重試</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="recipes.length === 0" class="text-center py-5 text-muted">
      <i class="bi bi-basket display-1 opacity-25"></i>
      <p class="mt-3">找不到相關食譜，試試看增加更多食材？</p>
    </div>

    <!-- Recipe Grid -->
    <div v-else class="row g-4">
      <div v-for="recipe in recipes" :key="recipe.id" class="col-12 col-md-6 col-lg-4">
        <div class="card h-100 shadow-sm border-0 recipe-card">
          <div class="position-relative">
            <img :src="recipe.image" class="card-img-top" :alt="recipe.title" loading="lazy" style="height: 200px; object-fit: cover;">
            <div class="position-absolute top-0 end-0 p-2">
              <span class="badge bg-light text-dark shadow-sm">
                <i class="bi bi-heart-fill text-danger me-1"></i>{{ recipe.likes }}
              </span>
            </div>
          </div>
          
          <div class="card-body">
            <h5 class="card-title fw-bold text-truncate mb-3">{{ recipe.title }}</h5>
            
            <div class="mb-3">
              <small class="text-success fw-bold d-block mb-1">
                <i class="bi bi-check-circle-fill me-1"></i>已有食材 ({{ recipe.usedIngredientCount }})
              </small>
              <div class="d-flex flex-wrap gap-1">
                <span v-for="ing in recipe.usedIngredients" :key="ing.id" class="badge bg-success-subtle text-success-emphasis border border-success-subtle">
                  {{ ing.name }}
                </span>
              </div>
            </div>

            <div v-if="recipe.missedIngredientCount > 0">
              <small class="text-danger fw-bold d-block mb-1">
                <i class="bi bi-cart-plus me-1"></i>缺少食材 ({{ recipe.missedIngredientCount }})
              </small>
              <div class="d-flex flex-wrap gap-1">
                <span v-for="ing in recipe.missedIngredients" :key="ing.id" class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle">
                  {{ ing.name }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="card-footer bg-white border-top-0 pt-0 pb-3">
             <!-- 這裡未來可以做「查看完整食譜」連結到外部網站 -->
             <a :href="`https://spoonacular.com/recipes/${recipe.title.replace(/\s+/g, '-')}-${recipe.id}`" target="_blank" class="btn btn-outline-primary w-100 rounded-pill">
               查看食譜做法 <i class="bi bi-box-arrow-up-right ms-1"></i>
             </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSpoonacular } from '../composables/useSpoonacular'

const props = defineProps({
  currentItems: { type: Array, required: true }
})

defineEmits(['go-back'])

const { recipes, loading, error, searchByIngredients } = useSpoonacular()

const refreshRecipes = () => {
  searchByIngredients(props.currentItems)
}

onMounted(() => {
  if (recipes.value.length === 0) {
    refreshRecipes()
  }
})
</script>

<style scoped>
.recipe-card {
  transition: transform 0.2s;
}
.recipe-card:hover {
  transform: translateY(-5px);
}
</style>
