import { createRouter, createWebHistory } from 'vue-router'

const LoginView    = () => import('../domains/auth/presentation/pages/LoginView.vue')
const RegisterView = () => import('../domains/auth/presentation/pages/RegisterView.vue')

const HomeView=()=>import('../domains/Views/HomeView.vue')
const PaymentsView=()=>import('../domains/Views/PaymentsView.vue')
const DocumentsView=()=>import('../domains/Views/DocumentsView.vue')
//const TransportView=()=>import('../domains/Views/TransportView.vue')
const HistoryView=()=>import('../domains/Views/HistoryView.vue')
const NotificationsView=()=>import('../domains/Views/NotificationsView.vue')
const TechnicalSupportView=()=>import('../domains/Views/TechnicalSupportView.vue')
const TransportView=()=>import('../domains/transport/presentation/pages/TransportView.vue')

const PruebaView=()=>import('../views/PruebaView.vue')

//cloning web application


//const navBar = ()=>import('../shared/presentation/components/nav-bar.vue')

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', redirect: '/auth/login' },
        { path: '/auth/login', name: 'login', component: LoginView },
        { path: '/auth/register', name: 'register', component: RegisterView },
        { path: '/home', name: 'home', component:HomeView },
        { path: '/documents', name: 'documents', component:DocumentsView },
        { path: '/payments', name: 'payments', component: PaymentsView },
        { path: '/transport', name: 'transport', component: TransportView },
        { path: '/history', name: 'history', component: HistoryView },
        { path: '/notifications', name: 'notifications', component: NotificationsView },
        { path: '/technicalSupport', name: 'technicalSupport', component: TechnicalSupportView },



    ]
})

router.beforeEach((to) => {
    if (to.name !== 'home') return true
    try { if (!JSON.parse(localStorage.getItem('kapakid:user')||'null')) return { name:'login' } }
    catch { return { name:'login' } }
    return true
})

export default router