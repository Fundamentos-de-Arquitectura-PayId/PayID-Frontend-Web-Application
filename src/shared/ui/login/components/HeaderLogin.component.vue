<template>
  <div class="right" aria-label="Language">
        <button
            class="lang-btn"
            @click="set('en')"
            :data-active="is('en')"
        >{{ t('layout.lang_en') }}</button>

        <button
            class="lang-btn"
            @click="set('es')"
            :data-active="is('es')"
        >{{ t('layout.lang_es') }}</button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import {setLocale} from "../../../../i18n.js";

const { locale, t } = useI18n()

const is = (l) => locale.value === l
const set = (l) => setLocale(l)
</script>

<style scoped>
.right{ display:flex; gap:4px;padding:5px;border:1px solid #ffffff55;background:#ffffff1c;border-radius:999px;backdrop-filter:blur(10px) }
.lang-btn{
  border:0; background:transparent; color:#f7f6ee;
  border-radius:999px; padding:6px 10px; font-weight:700;font-size:12px;
  transition:.15s all ease;cursor:pointer
}
.lang-btn:hover{ transform: translateY(-1px); }
.lang-btn[data-active="true"]{ background:#ffffff35; color:#fff; }
</style>
