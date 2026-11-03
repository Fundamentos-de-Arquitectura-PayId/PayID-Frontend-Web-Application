<script>

import {defineComponent} from "vue";
import NavBar from "./shared/presentation/components/nav-bar.vue";

export default defineComponent({
  components: {NavBar}
})
</script>

<template>


  <!--<router-view />-->

  <router-view />
  <!--<header><nav-bar></nav-bar></header>-->

</template>

<style>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}
</style>

//json-server --watch fixtures/db.json --port 4000
