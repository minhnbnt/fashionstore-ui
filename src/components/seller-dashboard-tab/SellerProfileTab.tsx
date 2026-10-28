import { useState } from 'react'

import { getMineQueryKey, useUpdate2, useUpdateProfile } from '@generated/endpoints/shops/shops'
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

import ImageUploadField from '@/components/admin/ImageUploadField'
import RichTextEditor from '@/components/ui/RichTextEditor'

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

  const updateShopMutation = useUpdate2({
    mutation: {
      onSuccess: function () {
        void queryClient.invalidateQueries({ queryKey: getMineQueryKey() })
      },
    },
  })

  function handleSaveProfile(next: ShopProfileData) {
    let logoKey: string | null = null
    if (next.logoUrl !== '') {
      logoKey = next.logoUrl
    }
    let bannerKey: string | null = null
    if (next.bannerUrl !== '') {
      bannerKey = next.bannerUrl
    }

    updateShopMutation.mutate({
      id: shopId,
      data: {
        name: next.shopName,
        description: next.bio,
        logoKey,
        bannerKey,
      },
    })

    let returnPolicy: string | null = null
    if (next.returnPolicy !== undefined && next.returnPolicy !== '') {
      returnPolicy = next.returnPolicy
    }

    updateProfileMutation.mutate({
      id: shopId,
      data: {
        phone: next.phone,
        address: next.pickupAddress,
        returnPolicy,
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

  let returnPolicyValue = ''
  if (formData.returnPolicy !== undefined && formData.returnPolicy !== null) {
    returnPolicyValue = formData.returnPolicy
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm md:flex-row md:items-center dark:border-white/10 dark:bg-[#11182a]">
        <div>
          <div className="flex items-center gap-2">
            <Storefront size={24} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
              Hồ Sơ Shop & Định Danh (Shop Profile & KYC)
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Quản lý tên shop, logo, ảnh bìa, chính sách đổi trả, địa chỉ kho lấy hàng, thông tin tài
            khoản ngân hàng và chính sách vận hành.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="btn-primary flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold shadow-sm transition-colors"
          >
            <FloppyDisk size={16} />
            Lưu hồ sơ shop
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccess && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
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
      <div className="space-y-5 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-white/10">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
            <Storefront size={18} className="text-indigo-600 dark:text-indigo-400" />
            1. Thông tin cơ bản gian hàng
          </h3>
          <div className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
            <ShieldCheck size={14} />
            <span>Gian hàng đã xác thực eKYC nét Mall</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="shopNameField"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Tên gian hàng (Shop Name) *
            </label>
            <input
              id="shopNameField"
              type="text"
              required
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
            />
            <span className="mt-1 block text-[10px] text-zinc-400 dark:text-zinc-500">
              Tên hiển thị với người mua hàng.
            </span>
          </div>

          <div>
            <label
              htmlFor="slugField"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Đường dẫn Shop URL (Slug) *
            </label>
            <div className="flex items-center overflow-hidden rounded-full border border-zinc-300 dark:border-white/15">
              <span className="border-r border-zinc-300 bg-zinc-100 px-3 py-2 text-xs text-zinc-500 select-none dark:border-white/15 dark:bg-white/10 dark:text-zinc-400">
                netfashion.vn/
              </span>
              <input
                id="slugField"
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 text-xs focus:outline-none"
              />
            </div>
            <span className="mt-1 block text-[10px] text-zinc-400 dark:text-zinc-500">
              Chỉ dùng chữ cái thường, số và dấu gạch ngang.
            </span>
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="bioEditor"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Mô tả Shop & Giới thiệu
            </label>
            <RichTextEditor
              id="bioEditor"
              value={formData.bio}
              onChange={(bio) => setFormData({ ...formData, bio })}
              placeholder="Giới thiệu về nét riêng của shop, phong cách thời trang, cam kết chất lượng..."
              rows={4}
            />
          </div>

          <div>
            <ImageUploadField
              label="Ảnh đại diện Shop (Avatar)"
              hint="Ảnh vuông tỉ lệ 1:1, tối đa 5MB. Định dạng JPG, PNG, WEBP."
              aspectClass="aspect-square max-w-[120px]"
              value={formData.logoUrl}
              onChange={(key) => setFormData({ ...formData, logoUrl: key })}
              optional
            />
          </div>

          <div>
            <ImageUploadField
              label="Ảnh bìa gian hàng (Banner)"
              hint="Tỉ lệ 3:1 (khuyên dùng 1200x400px), tối đa 5MB."
              aspectClass="aspect-[3/1] max-w-full"
              value={formData.bannerUrl}
              onChange={(key) => setFormData({ ...formData, bannerUrl: key })}
              optional
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label
              htmlFor="returnPolicyField"
              className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Chính sách đổi trả riêng của Shop
            </label>
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
              <span className="font-semibold">Quy định tối thiểu của sàn:</span> Khách hàng được
              quyền đổi trả hàng trong vòng tối thiểu 7 ngày kể từ khi nhận kiện đối với sản phẩm bị
              lỗi do nhà sản xuất hoặc giao sai mẫu / kích thước. Chính sách riêng của Shop có thể
              kéo dài thời hạn (ví dụ 15 - 30 ngày) để tăng độ uy tín với khách hàng.
            </div>
            <textarea
              id="returnPolicyField"
              rows={3}
              value={returnPolicyValue}
              onChange={(e) => setFormData({ ...formData, returnPolicy: e.target.value })}
              placeholder="Nhập chi tiết điều kiện đổi trả, hoàn tiền, hỗ trợ đổi size của shop..."
              className="w-full rounded-2xl border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Warehouse Pickup & Shipping SLA */}
      <div className="space-y-5 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="border-b border-zinc-100 pb-3 dark:border-white/10">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
            <MapPin size={18} className="text-indigo-600 dark:text-indigo-400" />
            2. Địa chỉ lấy hàng & Thời gian chuẩn bị hàng (Warehouse & DTS)
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Đơn vị vận chuyển sẽ đến địa chỉ này để lấy kiện hàng.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="contactNameField"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Người liên hệ tại kho
            </label>
            <input
              id="contactNameField"
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
            />
          </div>

          <div>
            <label
              htmlFor="phoneField"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Số điện thoại liên hệ nhận hàng *
            </label>
            <input
              id="phoneField"
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="pickupAddressField"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Địa chỉ chi tiết kho hàng *
            </label>
            <input
              id="pickupAddressField"
              type="text"
              required
              value={formData.pickupAddress}
              onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
              className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
            />
          </div>

          <div>
            <label
              htmlFor="cityField"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Tỉnh / Thành phố
            </label>
            <input
              id="cityField"
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
            />
          </div>

          <div>
            <label
              htmlFor="daysToShipSelect"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Thời gian chuẩn bị hàng (DTS - Days To Ship)
            </label>
            <select
              id="daysToShipSelect"
              value={formData.daysToShip}
              onChange={(e) => setFormData({ ...formData, daysToShip: Number(e.target.value) })}
              className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
            >
              <option value={1}>1 ngày (Giao hàng hỏa tốc / Chuẩn bị ngay trong ngày)</option>
              <option value={2}>2 ngày (Tiêu chuẩn sàn nét)</option>
              <option value={3}>3 ngày (Mức tối đa cho phép)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Legal Identification & Bank Accounts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* KYC Verification Card */}
        <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-white/10">
            <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
              <IdentificationBadge size={18} className="text-indigo-600 dark:text-indigo-400" />
              3. Định danh pháp lý (KYC)
            </h3>
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
              ĐÃ DUYỆT
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="businessTypeSelect"
                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
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
                className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
              >
                <option value="INDIVIDUAL">Cá nhân (Căn cước công dân gắn chip)</option>
                <option value="BUSINESS">Hộ kinh doanh / Doanh nghiệp (Mã số thuế)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="taxOrIdNumberInput"
                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Số CCCD / Mã số thuế
              </label>
              <input
                id="taxOrIdNumberInput"
                type="text"
                value={formData.taxOrIdNumber}
                onChange={(e) => setFormData({ ...formData, taxOrIdNumber: e.target.value })}
                className="w-full rounded-full border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/5"
              />
            </div>

            <div className="rounded border border-blue-200 bg-blue-50 p-2.5 text-[11px] leading-relaxed text-blue-800">
              Thông tin định danh đã được hệ thống xác minh và bảo mật mã hóa theo chuẩn an ninh
              thương mại điện tử.
            </div>
          </div>
        </div>

        {/* Bank Account for Payouts */}
        <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-white/10">
            <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
              <Bank size={18} className="text-indigo-600 dark:text-indigo-400" />
              4. Tài khoản ngân hàng nhận tiền
            </h3>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600">
              LIÊN KẾT CHÍNH
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="bankNameInput"
                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Ngân hàng
              </label>
              <input
                id="bankNameInput"
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
              />
            </div>

            <div>
              <label
                htmlFor="bankAccountInput"
                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Số tài khoản ngân hàng
              </label>
              <input
                id="bankAccountInput"
                type="text"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                className="w-full rounded-full border border-zinc-300 px-3 py-2 font-mono text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
              />
            </div>

            <div>
              <label
                htmlFor="bankHolderInput"
                className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Tên chủ tài khoản (In hoa)
              </label>
              <input
                id="bankHolderInput"
                type="text"
                value={formData.bankHolder}
                onChange={(e) => setFormData({ ...formData, bankHolder: e.target.value })}
                className="w-full rounded-full border border-zinc-300 px-3 py-2 text-xs uppercase focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Operating Hours */}
      <div className="space-y-3 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-2 dark:border-white/10">
          <Clock size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
            5. Khung giờ làm việc & CSKH
          </h3>
        </div>
        <div>
          <label
            htmlFor="workingHoursInput"
            className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
          >
            Khung giờ tiếp nhận & phản hồi chat
          </label>
          <input
            id="workingHoursInput"
            type="text"
            value={formData.workingHours}
            onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
            className="w-full max-w-md rounded-full border border-zinc-300 px-3 py-2 text-xs focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10"
          />
        </div>
      </div>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="btn-primary flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold shadow transition-colors"
        >
          <FloppyDisk size={18} />
          Lưu tất cả thay đổi hồ sơ Shop
        </button>
      </div>
    </form>
  )
}
