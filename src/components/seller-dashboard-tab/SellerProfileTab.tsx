import { useState } from 'react'

import { getMineQueryKey, useUpdateProfile } from '@generated/endpoints/shops/shops'
import {
  Storefront,
  FloppyDisk,
  CheckCircle,
  MapPin,
  Bank,
  IdentificationBadge,
  Clock,
  ShieldCheck,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import type { ShopProfileData } from '@/types/seller'

interface SellerProfileTabProps {
  shopId: string
  profile: ShopProfileData
}

export function SellerProfileTab({ shopId, profile }: SellerProfileTabProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<ShopProfileData>(profile)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const updateProfileMutation = useUpdateProfile({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getMineQueryKey() })
      },
    },
  })

  function handleSaveProfile(next: ShopProfileData) {
    updateProfileMutation.mutate({
      id: shopId,
      data: {
        phone: next.phone,
        address: next.pickupAddress,
        processingDays: next.daysToShip,
        bankName: next.bankName,
        bankAccount: next.bankAccount,
        bankHolder: next.bankHolder,
        workingHours: next.workingHours,
      },
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSaveProfile(formData)
    setSaveSuccess(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <div className="flex items-center gap-2">
            <Storefront size={24} className="text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Hồ Sơ Shop & Định Danh (Shop Profile & KYC)
            </h2>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            Quản lý tên shop, logo, địa chỉ kho lấy hàng, thông tin tài khoản ngân hàng và chính
            sách vận hành.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-2xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <FloppyDisk size={16} />
            Lưu hồ sơ shop
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div className="flex items-center justify-between rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-green-600" />
            <span>Cập nhật thông tin hồ sơ Shop & Cấu hình vận hành thành công!</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccess(false)}
            className="text-xs font-medium text-green-700 underline hover:text-green-900"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Section 1: Basic Information */}
      <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-zinc-800">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
            <Storefront size={18} className="text-blue-600" />
            1. Thông tin cơ bản gian hàng
          </h3>
          <div className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-sky-300">
            <ShieldCheck size={14} />
            <span>Gian hàng đã xác thực KYC nét Official</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="shopNameField"
              className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
            >
              Tên gian hàng (Shop Name) *
            </label>
            <input
              id="shopNameField"
              type="text"
              required
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
            <span className="mt-1 block text-[10px] text-gray-400">
              Tên hiển thị với người mua hàng.
            </span>
          </div>

          <div>
            <label
              htmlFor="slugField"
              className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
            >
              Đường dẫn Shop URL (Slug) *
            </label>
            <div className="flex items-center overflow-hidden rounded-xl border border-gray-300 dark:border-zinc-700">
              <span className="border-r border-gray-300 bg-gray-100 px-3 py-2 text-xs text-gray-500 select-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                netfashion.vn/shops/
              </span>
              <input
                id="slugField"
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full bg-white px-3 py-2 text-xs focus:outline-none dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <span className="mt-1 block text-[10px] text-gray-400">
              Chỉ dùng chữ cái thường, số và dấu gạch ngang.
            </span>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="bioField"
              className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
            >
              Mô tả Shop & Giới thiệu
            </label>
            <textarea
              id="bioField"
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="logoUrlField"
              className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
            >
              Ảnh đại diện Shop (Avatar URL)
            </label>
            <input
              id="logoUrlField"
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="bannerUrlField"
              className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
            >
              Ảnh bìa gian hàng (Banner URL)
            </label>
            <input
              id="bannerUrlField"
              type="url"
              value={formData.bannerUrl}
              onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Warehouse Pickup & Shipping SLA */}
      <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-gray-100 pb-3 dark:border-zinc-800">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
            <MapPin size={18} className="text-blue-600" />
            2. Địa chỉ lấy hàng & Thời gian chuẩn bị hàng (Warehouse & DTS)
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
            Đơn vị vận chuyển đối tác (nét Express, SPX Express, ViettelPost) sẽ đến địa chỉ này để
            lấy kiện hàng.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="contactNameField"
              className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
            >
              Người liên hệ tại kho
            </label>
            <input
              id="contactNameField"
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="phoneField"
              className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
            >
              Số điện thoại liên hệ nhận hàng *
            </label>
            <input
              id="phoneField"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="pickupAddressField"
              className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
            >
              Địa chỉ chi tiết kho hàng *
            </label>
            <input
              id="pickupAddressField"
              type="text"
              required
              value={formData.pickupAddress}
              onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="cityField"
              className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
            >
              Tỉnh / Thành phố
            </label>
            <input
              id="cityField"
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="daysToShipSelect"
              className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
            >
              Thời gian chuẩn bị hàng (DTS - Days To Ship)
            </label>
            <select
              id="daysToShipSelect"
              value={formData.daysToShip}
              onChange={(e) => setFormData({ ...formData, daysToShip: Number(e.target.value) })}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value={1}>1 ngày (Giao hàng nhanh chuẩn nét Express)</option>
              <option value={2}>2 ngày (Tiêu chuẩn)</option>
              <option value={7}>7 ngày (Hàng đặt trước / Pre-order)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Legal Identification & Bank Accounts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* KYC Verification Card */}
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-zinc-800">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
              <IdentificationBadge size={18} className="text-blue-600" />
              3. Định danh pháp lý (KYC)
            </h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
              ĐÃ DUYỆT
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="businessTypeSelect"
                className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
              >
                Loại hình kinh doanh
              </label>
              <select
                id="businessTypeSelect"
                value={formData.businessType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    businessType: e.target.value as 'INDIVIDUAL' | 'BUSINESS',
                  })
                }
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                <option value="INDIVIDUAL">Cá nhân (Căn cước công dân gắn chip)</option>
                <option value="BUSINESS">Hộ kinh doanh / Doanh nghiệp (Mã số thuế)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="taxOrIdNumberInput"
                className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
              >
                Số CCCD / Mã số thuế
              </label>
              <input
                id="taxOrIdNumberInput"
                type="text"
                value={formData.taxOrIdNumber}
                onChange={(e) => setFormData({ ...formData, taxOrIdNumber: e.target.value })}
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-[11px] leading-relaxed text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-sky-300">
              Thông tin định danh đã được hệ thống xác minh và bảo mật mã hóa theo chuẩn an ninh
              thương mại điện tử.
            </div>
          </div>
        </div>

        {/* Bank Account for Payouts */}
        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-zinc-800">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-white">
              <Bank size={18} className="text-blue-600" />
              4. Tài khoản ngân hàng nhận tiền
            </h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:bg-blue-950/40 dark:text-sky-300">
              LIÊN KẾT CHÍNH
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="bankNameInput"
                className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
              >
                Ngân hàng
              </label>
              <input
                id="bankNameInput"
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="bankAccountInput"
                className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
              >
                Số tài khoản ngân hàng
              </label>
              <input
                id="bankAccountInput"
                type="text"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="bankHolderInput"
                className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
              >
                Tên chủ tài khoản (In hoa)
              </label>
              <input
                id="bankHolderInput"
                type="text"
                value={formData.bankHolder}
                onChange={(e) => setFormData({ ...formData, bankHolder: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Operating Hours */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-2 dark:border-zinc-800">
          <Clock size={18} className="text-blue-600" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">
            5. Khung giờ làm việc & CSKH
          </h3>
        </div>
        <div>
          <label
            htmlFor="workingHoursInput"
            className="mb-1 block text-xs font-semibold text-gray-700 dark:text-zinc-300"
          >
            Khung giờ tiếp nhận & phản hồi chat
          </label>
          <input
            id="workingHoursInput"
            type="text"
            value={formData.workingHours}
            onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
            className="w-full max-w-md rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        </div>
      </div>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow transition-colors hover:bg-blue-700"
        >
          <FloppyDisk size={18} />
          Lưu tất cả thay đổi hồ sơ Shop
        </button>
      </div>
    </form>
  )
}
