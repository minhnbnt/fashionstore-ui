import { lazy } from 'react'

// Public pages
export const Home = lazy(() => import('./Home'))
export const Search = lazy(() => import('./Search'))
export const ProductDetail = lazy(() => import('./ProductDetail'))
export const Faq = lazy(() => import('./Faq'))
export const StaticPage = lazy(() => import('./StaticPage'))
export const Messages = lazy(() => import('./Messages'))

// Account
export const Account = lazy(() => import('./account/Account'))
export const Addresses = lazy(() => import('./account/Addresses'))
export const Login = lazy(() => import('./account/Login'))
export const ResetPassword = lazy(() => import('./account/ResetPassword'))
export const AuthCallback = lazy(() => import('./account/AuthCallback'))

// Admin
export const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
export const AdminShops = lazy(() => import('./admin/AdminShops'))
export const AdminShopDetail = lazy(() => import('./admin/AdminShopDetail'))
export const AdminUsers = lazy(() => import('./admin/AdminUsers'))
export const AdminUserDetail = lazy(() => import('./admin/AdminUserDetail'))
export const AdminProducts = lazy(() => import('./admin/AdminProducts'))
export const AdminContent = lazy(() => import('./admin/AdminContent'))
export const AdminOrders = lazy(() => import('./admin/AdminOrders'))
export const AdminHolidays = lazy(() => import('./admin/AdminHolidays'))
export const AdminBannedKeywords = lazy(() => import('./admin/AdminBannedKeywords'))

// Checkout
export const Cart = lazy(() => import('./checkout/Cart'))
export const Checkout = lazy(() => import('./checkout/Checkout'))
export const Orders = lazy(() => import('./checkout/Orders'))
export const OrderDetail = lazy(() => import('./checkout/OrderDetail'))
export const Wishlist = lazy(() => import('./checkout/Wishlist'))

// Shop
export const ShopDashboard = lazy(() => import('./shop/ShopDashboard'))
export const ShopStorefront = lazy(() => import('./shop/ShopStorefront'))
export const InvitationAccept = lazy(() => import('./shop/InvitationAccept'))
