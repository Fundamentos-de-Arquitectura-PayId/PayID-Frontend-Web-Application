import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../shared/services/supabase.js'

const LoginView    = () => import('../domains/auth/presentation/pages/LoginView.vue')
const RegisterView = () => import('../domains/auth/presentation/pages/RegisterView.vue')
const UpdatePasswordView = () => import('../domains/auth/presentation/pages/UpdatePasswordView.vue')
const PaymentDemoView = () => import('../domains/auth/presentation/pages/PaymentDemoView.vue')
const PlanSelectionView = () => import('../domains/auth/presentation/pages/PlanSelectionView.vue')
const AppLayout = () => import('../shared/layouts/AppLayout.vue')
const HomeView = () => import('../domains/Views/HomeView.vue')
const ProfileView = () => import('../domains/Views/ProfileView.vue')
const PaymentsView = () => import('../domains/Views/PaymentsView.vue')
const DocumentsView = () => import('../domains/Views/DocumentsView.vue')
const HistoryView = () => import('../domains/Views/HistoryView.vue')
const NotificationsView = () => import('../domains/Views/NotificationsView.vue')
const TechnicalSupportView = () => import('../domains/Views/TechnicalSupportView.vue')
const TransportView = () => import('../domains/transport/presentation/pages/TransportView.vue')
const FamilyView = () => import('../domains/Views/FamilyView.vue')
const StudentCredentialView = () => import('../domains/Views/StudentCredentialView.vue')
const WalletView = () => import('../domains/Views/WalletView.vue')

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/auth/login', alias: '/login', name: 'login', component: LoginView },
        { path: '/auth/register', name: 'register', component: RegisterView },
        { path: '/auth/update-password', name: 'update-password', component: UpdatePasswordView },
        { path: '/auth/payment', name: 'payment-demo', component: PaymentDemoView },
        { path: '/auth/plans', name: 'plan-selection', component: PlanSelectionView },
        {
            path: '/',
            component: AppLayout,
            children: [
                { path: '', redirect: { name: 'login' } },
                { path: 'home', name: 'home', component: HomeView },
                { path: 'profile', name: 'profile', component: ProfileView },
                { path: 'wallet', name: 'wallet', component: WalletView },
                { path: 'family', name: 'family', component: FamilyView },
                { path: 'student-card', name: 'student-card', component: StudentCredentialView },
                { path: 'documents', name: 'documents', component: DocumentsView },
                { path: 'payments', name: 'payments', component: PaymentsView },
                { path: 'transport', name: 'transport', component: TransportView },
                { path: 'history', name: 'history', component: HistoryView },
                { path: 'notifications', name: 'notifications', component: NotificationsView },
                { path: 'technicalSupport', name: 'technicalSupport', component: TechnicalSupportView },
            ],
        },
    ]
})

router.beforeEach(async (to) => {
    const protectedRoutes = new Set(['home', 'profile', 'wallet', 'family', 'student-card', 'documents', 'payments', 'transport', 'history', 'notifications', 'technicalSupport'])
    if (!protectedRoutes.has(to.name)) return true
    if (!supabase) return { name: 'login' }
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session?.user) return { name: 'login' }
    return true
})

export default router
