import { useState } from 'react'

import { useListBanks } from '@generated/endpoints/banks/banks'
import { getMineQueryKey, useUpdate2, useUpdateProfile } from '@generated/endpoints/shops/shops'
import {
  Bank,
  CircleNotch,
  Clock,
  FloppyDisk,
  IdentificationBadge,
  MapPin,
  ShieldCheck,
  ShieldWarning,
  Storefront,
} from '@phosphor-icons/react'
import { useQueryClient } from '@tanstack/react-query'

import ImageUploadField from '@/components/admin/fields/ImageUploadField'
import LocationAddressSelector from '@/components/common/LocationAddressSelector'
import BankSearchSelector from '@/components/seller/BankSearchSelector'
import RichTextEditor from '@/components/ui/RichTextEditor'
import { takeData } from '@/lib/api/apiAdapters'
import { splitFullAddress } from '@/lib/format'
import { notify } from '@/lib/notifications'

import type { BankResponse } from '@/types/bank'
import type { ShopProfileData } from '@/types/seller'

interface SellerProfileTabProps {
  shopId: string
  profile: ShopProfileData
}

function findMatchingBankBin(banks: BankResponse[], bankName: string): string {
  const normalized = bankName.trim().toLowerCase()
  if (normalized === '') {
    return ''
  }
  for (const b of banks) {
    if (
      (b.shortName ?? '').toLowerCase() === normalized ||
      (b.code ?? '').toLowerCase() === normalized ||
      (b.name ?? '').toLowerCase() === normalized ||
      (b.bin ?? '').toLowerCase() === normalized
    ) {
      return b.bin ?? ''
    }
  }
  return ''
}

export function SellerProfileTab({ shopId, profile }: SellerProfileTabProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<ShopProfileData>(profile)
  // Chỉ track ảnh MỚI upload; undefined = giữ nguyên logo/banner cũ (API: null = giữ nguyên)
  const [newLogoUploadId, setNewLogoUploadId] = useState<string | undefined>(undefined)
  const [newBannerUploadId, setNewBannerUploadId] = useState<string | undefined>(undefined)

  const banksQuery = useListBanks()
  let banks: BankResponse[] = []
  if (banksQuery.data !== undefined) {
    const rawBanks = takeData(banksQuery.data)
    if (Array.isArray(rawBanks)) {
      banks = rawBanks
    }
  }
  const selectedBankBin = findMatchingBankBin(banks, formData.bankName)

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

  const isSaving = updateShopMutation.isPending || updateProfileMutation.isPending

  function handleSaveProfile(next: ShopProfileData) {
    let logoUploadId: string | undefined
    if (newLogoUploadId !== undefined) {
      logoUploadId = newLogoUploadId
    }
    let bannerUploadId: string | undefined
    if (newBannerUploadId !== undefined) {
      bannerUploadId = newBannerUploadId
    }

    let returnPolicy: string | null = null
    if (next.returnPolicy !== undefined && next.returnPolicy !== '') {
      returnPolicy = next.returnPolicy
    }

    void notify.promise(
      Promise.all([
        updateShopMutation.mutateAsync({
          id: shopId,
          data: {
            name: next.shopName,
            description: next.bio,
            logoUploadId,
            bannerUploadId,
          },
        }),
        updateProfileMutation.mutateAsync({
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
        }),
      ]),
      {
        loading: 'Đang lưu hồ sơ gian hàng...',
        success: 'Cập nhật thông tin hồ sơ Shop & Cấu hình vận hành thành công!',
        error: function (err: unknown) {
          return notify.safeErrorMessage(
            err,
            'shops',
            'Không thể lưu hồ sơ gian hàng. Vui lòng thử lại.',
          )
        },
      },
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    handleSaveProfile(formData)
  }

  let returnPolicyValue = ''
  if (formData.returnPolicy !== undefined && formData.returnPolicy !== null) {
    returnPolicyValue = formData.returnPolicy
  }

  const isVerified = formData.isVerified === true

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm md:flex-row md:items-center dark:border-white/10 dark:bg-[#11182a]">
        <div>
          <div className="flex items-center gap-2">
            <Storefront size={24} className="text-blue-700 dark:text-sky-300" />
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
            disabled={isSaving}
            className="btn-primary flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving && <CircleNotch size={16} className="animate-spin" />}
            {!isSaving && <FloppyDisk size={16} />}
            {isSaving && <span>Đang lưu...</span>}
            {!isSaving && <span>Lưu hồ sơ shop</span>}
          </button>
        </div>
      </div>

      {/* Section 1: Basic Information */}
      <div className="space-y-5 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 dark:border-white/10">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
            <Storefront size={18} className="text-blue-700 dark:text-sky-300" />
            1. Thông tin cơ bản gian hàng
          </h3>
          {isVerified && (
            <div className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <ShieldCheck size={14} weight="fill" />
              <span>Gian hàng đã xác thực eKYC DHMQ Mall</span>
            </div>
          )}
          {!isVerified && (
            <div className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
              <ShieldWarning size={14} weight="fill" />
              <span>Chờ xác thực eKYC</span>
            </div>
          )}
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
              className="w-full rounded-full border border-zinc-300 bg-white/80 px-3.5 py-2 text-xs text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
            <span className="mt-1 block text-[10px] text-zinc-400 dark:text-zinc-500">
              Tên hiển thị với người mua hàng.
            </span>
          </div>

          <div>
            <label
              htmlFor="slugField"
              className="mb-1 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              <span>Đường dẫn Shop URL (Slug)</span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                Chỉ xem
              </span>
            </label>
            <div className="flex items-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-white/5">
              <span className="border-r border-zinc-200 bg-zinc-100 px-3 py-2 text-xs text-zinc-500 select-none dark:border-white/10 dark:bg-white/10 dark:text-zinc-400">
                dhmq.vn/
              </span>
              <input
                id="slugField"
                type="text"
                readOnly
                value={formData.slug}
                className="w-full cursor-not-allowed bg-transparent px-3 py-2 text-xs text-zinc-500 focus:outline-none dark:text-zinc-400"
              />
            </div>
            <span className="mt-1 block text-[10px] text-zinc-400 dark:text-zinc-500">
              Đường dẫn cố định theo đăng ký ban đầu, không thể chỉnh sửa tại đây.
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
              onChange={(uploadId, previewUrl) => {
                setFormData({ ...formData, logoUrl: previewUrl })
                setNewLogoUploadId(uploadId ?? undefined)
              }}
              optional
            />
          </div>

          <div>
            <ImageUploadField
              label="Ảnh bìa gian hàng (Banner)"
              hint="Tỉ lệ 3:1 (khuyên dùng 1200x400px), tối đa 5MB."
              aspectClass="aspect-[3/1] max-w-full"
              value={formData.bannerUrl}
              onChange={(uploadId, previewUrl) => {
                setFormData({ ...formData, bannerUrl: previewUrl })
                setNewBannerUploadId(uploadId ?? undefined)
              }}
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
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
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
              className="w-full rounded-2xl border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-xs text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Warehouse Pickup & Shipping SLA */}
      <div className="space-y-5 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="border-b border-zinc-100 pb-3 dark:border-white/10">
          <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
            <MapPin size={18} className="text-blue-700 dark:text-sky-300" />
            2. Địa chỉ lấy hàng & Thời gian chuẩn bị hàng (Warehouse & DTS)
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Đơn vị vận chuyển sẽ đến địa chỉ này để lấy kiện hàng.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              className="w-full rounded-full border border-zinc-300 bg-white/80 px-3.5 py-2 text-xs text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
          </div>

          <div className="md:col-span-2">
            <LocationAddressSelector
              idPrefix="seller-profile"
              required
              value={formData.pickupAddress}
              onChange={(fullAddress) => {
                const parsed = splitFullAddress(fullAddress)
                setFormData({
                  ...formData,
                  pickupAddress: fullAddress,
                  city: parsed.province,
                })
              }}
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
              className="w-full rounded-full border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-[#0a0f1e] dark:text-white"
            >
              <option value={1}>1 ngày (Giao hàng hỏa tốc / Chuẩn bị ngay trong ngày)</option>
              <option value={2}>2 ngày (Tiêu chuẩn sàn DHMQ)</option>
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
              <IdentificationBadge size={18} className="text-blue-700 dark:text-sky-300" />
              3. Định danh pháp lý (KYC)
            </h3>
            {isVerified && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                ĐÃ DUYỆT
              </span>
            )}
            {!isVerified && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                CHỜ DUYỆT
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="businessTypeSelect"
                className="mb-1 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                <span>Loại hình kinh doanh</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                  Chỉ xem
                </span>
              </label>
              <select
                id="businessTypeSelect"
                disabled
                value={formData.businessType}
                className="w-full cursor-not-allowed rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs text-zinc-500 focus:outline-none dark:border-white/10 dark:bg-[#0a0f1e] dark:text-zinc-400"
              >
                <option value="INDIVIDUAL">Cá nhân (Căn cước công dân gắn chip)</option>
                <option value="BUSINESS">Hộ kinh doanh / Doanh nghiệp (Mã số thuế)</option>
              </select>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-3 text-[11px] leading-relaxed text-sky-900 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
              Thông tin pháp nhân (CCCD / mã số thuế) và loại hình kinh doanh được quản lý trong
              luồng eKYC đăng ký shop, không chỉnh sửa tại đây.
            </div>
          </div>
        </div>

        {/* Bank Account for Payouts */}
        <div className="space-y-4 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-white/10">
            <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
              <Bank size={18} className="text-blue-700 dark:text-sky-300" />
              4. Tài khoản ngân hàng nhận tiền
            </h3>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300">
              LIÊN KẾT CHÍNH
            </span>
          </div>

          <div className="space-y-3">
            <BankSearchSelector
              banks={banks}
              selectedBankBin={selectedBankBin}
              fallbackBankLabel={formData.bankName}
              idPrefix="seller-profile-bank"
              onSelectBank={(bank) => {
                const chosenName = bank.shortName || bank.name || bank.code || ''
                setFormData({ ...formData, bankName: chosenName })
              }}
            />

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
                className="w-full rounded-full border border-zinc-300 bg-white/80 px-3.5 py-2 font-mono text-xs text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-white"
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
                className="w-full rounded-full border border-zinc-300 bg-white/80 px-3.5 py-2 text-xs text-zinc-900 uppercase focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Operating Hours */}
      <div className="space-y-3 rounded-3xl border border-zinc-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-[#11182a]">
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-2 dark:border-white/10">
          <Clock size={18} className="text-blue-700 dark:text-sky-300" />
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
            className="w-full max-w-md rounded-full border border-zinc-300 bg-white/80 px-3.5 py-2 text-xs text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-white/15 dark:bg-white/10 dark:text-white"
          />
        </div>
      </div>

      {/* Bottom Save Action */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold shadow transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving && <CircleNotch size={18} className="animate-spin" />}
          {!isSaving && <FloppyDisk size={18} />}
          {isSaving && <span>Đang lưu thay đổi...</span>}
          {!isSaving && <span>Lưu tất cả thay đổi hồ sơ Shop</span>}
        </button>
      </div>
    </form>
  )
}
