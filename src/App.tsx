import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, Suspense, lazy } from 'react'
import { Layout } from './components/layout/Layout'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
const TourProducts = lazy(() => import('./pages/TourProducts').then(module => ({ default: module.TourProducts })))
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(module => ({ default: module.ProductDetail })))
import { AdminGuard } from './components/auth/AdminGuard'
import { AuthGuard } from './components/auth/AuthGuard'
import { SEO } from './components/seo/SEO'

import { NotificationProvider } from './contexts/NotificationContext'
import { HeroSkeleton } from './components/skeletons/HeroSkeleton' // Minimal loading state

// Lazy Load Pages - Handling Named Exports
const Reservation = lazy(() => import('./pages/Reservation').then(module => ({ default: module.Reservation })))
const Payment = lazy(() => import('./pages/Payment').then(module => ({ default: module.Payment })))
const ReservationComplete = lazy(() => import('./pages/ReservationComplete').then(module => ({ default: module.ReservationComplete })))
const ReservationStatus = lazy(() => import('./pages/ReservationStatus').then(module => ({ default: module.ReservationStatus })))
const UserReviews = lazy(() => import('./pages/UserReviews').then(module => ({ default: module.UserReviews })))
const ReviewWrite = lazy(() => import('./pages/ReviewWrite').then(module => ({ default: module.ReviewWrite })))
const ReviewDetail = lazy(() => import('./pages/ReviewDetail').then(module => ({ default: module.ReviewDetail })))
const CustomEstimate = lazy(() => import('./pages/CustomEstimate').then(module => ({ default: module.CustomEstimate })))
const EstimateDetail = lazy(() => import('./pages/EstimateDetail').then(module => ({ default: module.EstimateDetail })))
const EstimateComplete = lazy(() => import('./pages/EstimateComplete').then(module => ({ default: module.EstimateComplete })))
const BusinessEstimate = lazy(() => import('./pages/BusinessEstimate').then(module => ({ default: module.BusinessEstimate })))
const BusinessEstimateDetail = lazy(() => import('./pages/BusinessEstimateDetail').then(module => ({ default: module.BusinessEstimateDetail })))
const TravelMates = lazy(() => import('./pages/TravelMates').then(module => ({ default: module.TravelMates })))
const TravelMateDetail = lazy(() => import('./pages/TravelMateDetail').then(module => ({ default: module.TravelMateDetail })))
const TravelMateWrite = lazy(() => import('./pages/TravelMateWrite').then(module => ({ default: module.TravelMateWrite })))
const ChatList = lazy(() => import('./pages/ChatList').then(module => ({ default: module.ChatList })))
const ChatRoom = lazy(() => import('./pages/ChatRoom').then(module => ({ default: module.ChatRoom })))
const TravelGuide = lazy(() => import('./pages/TravelGuide').then(module => ({ default: module.TravelGuide })))
const TravelGuideDetail = lazy(() => import('./pages/TravelGuideDetail').then(module => ({ default: module.TravelGuideDetail })))
const FAQPage = lazy(() => import('./pages/FAQ').then(module => ({ default: module.FAQPage })))
const TermsOfService = lazy(() => import('./pages/TermsOfService').then(module => ({ default: module.TermsOfService })))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })))

// MyPage components
const MyPage = lazy(() => import('./pages/MyPage').then(module => ({ default: module.MyPage })))
const MyTravelMates = lazy(() => import('./pages/MyTravelMates').then(module => ({ default: module.MyTravelMates })))
const MyEstimates = lazy(() => import('./pages/MyEstimates').then(module => ({ default: module.MyEstimates })))
const MyBusinessEstimates = lazy(() => import('./pages/MyBusinessEstimates').then(module => ({ default: module.MyBusinessEstimates })))
const MyReservations = lazy(() => import('./pages/MyReservations').then(module => ({ default: module.MyReservations })))
const MyNotifications = lazy(() => import('./pages/MyNotifications').then(module => ({ default: module.MyNotifications })))
const MyReviews = lazy(() => import('./pages/MyReviews').then(module => ({ default: module.MyReviews })))
const RecentlyViewed = lazy(() => import('./pages/RecentlyViewed').then(module => ({ default: module.RecentlyViewed })))
const Wishlist = lazy(() => import('./pages/Wishlist').then(module => ({ default: module.Wishlist })))

// Admin Pages
const AdminLogin = lazy(() => import('./pages/AdminLogin').then(module => ({ default: module.AdminLogin })))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })))
const AdminQuoteManage = lazy(() => import('./pages/AdminQuoteManage').then(module => ({ default: module.AdminQuoteManage })))
const AdminReservationManage = lazy(() => import('./pages/AdminReservationManage').then(module => ({ default: module.AdminReservationManage })))
const AdminCalendar = lazy(() => import('./pages/AdminCalendar').then(module => ({ default: module.AdminCalendar })))
const AdminBannerManage = lazy(() => import('./pages/AdminBannerManage').then(module => ({ default: module.AdminBannerManage })))
const AdminProductManage = lazy(() => import('./pages/AdminProductManage').then(module => ({ default: module.AdminProductManage })))
const AdminCategoryManage = lazy(() => import('./pages/AdminCategoryManage').then(module => ({ default: module.AdminCategoryManage })))
const AdminSettings = lazy(() => import('./pages/AdminSettings').then(module => ({ default: module.AdminSettings })))
const AdminGuideManage = lazy(() => import('./pages/AdminGuideManage').then(module => ({ default: module.AdminGuideManage })))
const AdminMagazineManage = lazy(() => import('./pages/AdminMagazineManage').then(module => ({ default: module.AdminMagazineManage })))
const AdminAccommodationManage = lazy(() => import('./pages/AdminAccommodationManage').then(module => ({ default: module.AdminAccommodationManage })))
const AdminReviewManage = lazy(() => import('./pages/AdminReviewManage').then(module => ({ default: module.AdminReviewManage })))
const AdminFAQManage = lazy(() => import('./pages/AdminFAQManage').then(module => ({ default: module.AdminFAQManage })))

// Loading Component
const PageLoader = () => (
  <div className="flex h-[50vh] w-full items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary"></div>
  </div>
)

function App() {
  const location = useLocation();

  return (
    <>

      <SEO />
      <NotificationProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <Layout>
                <Home />
              </Layout>
            } />
            <Route path="/products" element={<TourProducts />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/reservation/:id" element={<Reservation />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/reservation-complete" element={<ReservationComplete />} />
            <Route path="/reservation-status" element={<ReservationStatus />} />
            <Route path="/reviews" element={<UserReviews />} />
            <Route path="/reviews/write" element={<ReviewWrite />} />
            <Route path="/reviews/:id" element={<ReviewDetail />} />
            <Route path="/custom-estimate" element={<CustomEstimate />} />
            <Route path="/estimate/:id" element={<EstimateDetail />} />
            <Route path="/estimate-complete" element={<EstimateComplete />} />
            <Route path="/business-estimate" element={<BusinessEstimate />} />
            <Route path="/business-estimate/:id" element={<BusinessEstimateDetail />} />
            <Route path="/travel-mates" element={<TravelMates />} />
            <Route path="/travel-mates/:id" element={<TravelMateDetail />} />
            <Route path="/travel-mates/write" element={<TravelMateWrite />} />
            <Route path="/chats" element={<ChatList />} />
            <Route path="/chats/:id" element={<ChatRoom />} />
            <Route path="/travel-guide" element={<TravelGuide />} />
            <Route path="/travel-guide/:id" element={<TravelGuideDetail />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/mypage/travel-mates" element={<AuthGuard><MyTravelMates /></AuthGuard>} />
            <Route path="/mypage/estimates" element={<AuthGuard><MyEstimates /></AuthGuard>} />
            <Route path="/mypage/business-estimates" element={<AuthGuard><MyBusinessEstimates /></AuthGuard>} />
            <Route path="/mypage/reservations" element={<AuthGuard><MyReservations /></AuthGuard>} />
            <Route path="/mypage/notifications" element={<AuthGuard><MyNotifications /></AuthGuard>} />
            <Route path="/mypage/reviews" element={<AuthGuard><MyReviews /></AuthGuard>} />
            <Route path="/mypage/recently-viewed" element={<AuthGuard><RecentlyViewed /></AuthGuard>} />
            <Route path="/mypage/wishlist" element={<AuthGuard><Wishlist /></AuthGuard>} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
            <Route path="/admin/quotes" element={<AdminGuard><AdminQuoteManage /></AdminGuard>} />
            <Route path="/admin/reservations" element={<AdminGuard><AdminReservationManage /></AdminGuard>} />
            <Route path="/admin/calendar" element={<AdminGuard><AdminCalendar /></AdminGuard>} />
            <Route path="/admin/banners" element={<AdminGuard><AdminBannerManage /></AdminGuard>} />
            <Route path="/admin/products" element={<AdminGuard><AdminProductManage /></AdminGuard>} />
            <Route path="/admin/categories" element={<AdminGuard><AdminCategoryManage /></AdminGuard>} />
            <Route path="/admin/settings" element={<AdminGuard><AdminSettings /></AdminGuard>} />
            <Route path="/admin/guides" element={<AdminGuard><AdminGuideManage /></AdminGuard>} />
            <Route path="/admin/magazines" element={<AdminGuard><AdminMagazineManage /></AdminGuard>} />
            <Route path="/admin/accommodations" element={<AdminGuard><AdminAccommodationManage /></AdminGuard>} />
            <Route path="/admin/reviews" element={<AdminGuard><AdminReviewManage /></AdminGuard>} />
            <Route path="/admin/faq" element={<AdminGuard><AdminFAQManage /></AdminGuard>} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          </Routes>
        </Suspense>
      </NotificationProvider>
    </>
  )
}

export default App
// trigger vercel deployment test
