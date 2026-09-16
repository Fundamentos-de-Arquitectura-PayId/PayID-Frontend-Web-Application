<script>
import navBar from "../presentation/components/nav-bar.vue";
export default {
  name : "AppLayout",
  components: {nav: navBar},
}
</script>

<template>
  <div class="app-layout layout">
    <Header aria-label="navbar from application"/>

    <main aria-label="main from application">
      <RouterView/>
    </main>

  </div>
</template>

<style scoped>


</style>