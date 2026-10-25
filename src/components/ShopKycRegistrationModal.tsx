import { useState } from 'react'
import { createPortal } from 'react-dom'

import { useRegister } from '@generated/endpoints/shops/shops'
import { useUpsert } from '@generated/endpoints/users/users'
import {
  ArrowLeft,
  ArrowRight,
  Bank,
  Check,
  CheckCircle,
  Clock,
  ShieldCheck,
  UploadSimple,
  WarningCircle,
} from '@phosphor-icons/react'

import { uploadImage } from '@/lib/uploadImage'

import Modal from './Modal'

import type { Step } from '@/types/seller'

interface Props {
  isOpen: boolean
  userEmail: string
  onClose: () => void
  onSuccess: () => void
}

const VIETNAM_BANKS = [
  'Vietcombank (VCB)',
  'MBBank (Quân Đội)',
  'Techcombank (TCB)',
  'ACB (Á Châu)',
  'VPBank (Việt Nam Thịnh Vượng)',
  'TPBank (Tiên Phong)',
  'BIDV (Đầu tư và Phát triển VN)',
  'Agribank (Nông nghiệp & PTNT)',
  'Sacombank (Sài Gòn Thương Tín)',
  'OCB (Phương Đông)',
  'VIB (Quốc Tế)',
  'HDBank (Phát triển TP.HCM)',
]

// Recipe input theo form chuẩn (account/AddressFormModal.tsx + docs/design-system.md):
// pill bo tròn, nền trắng trong mờ, focus xanh dương; dark dùng nền trắng mờ trên panel navy.
const INPUT_BASE =
  'mt-1 w-full rounded-full border border-zinc-300 bg-white/80 px-3.5 py-2.5 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500'

// Textarea nhiều dòng không dùng pill (đầu pill trông kỳ ở khối cao), giữ nguyên recipe còn lại.
const TEXTAREA_BASE =
  'mt-1 w-full rounded-2xl border border-zinc-300 bg-white/80 px-4 py-2.5 text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-zinc-500'

// Vùng thả ảnh (dashed dropzone) dùng chung cho logo, banner, CCCD, selfie, GPKD.
const DROPZONE_BASE =
  'group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-white/60 text-center transition hover:border-blue-500 hover:bg-blue-50/30 dark:border-white/20 dark:bg-white/5'

function slugify(text: string): string {
  let str = text.toLowerCase().trim()
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  str = str.replace(/[đĐ]/g, 'd')
  str = str.replace(/[^a-z0-9\s-]/g, '')
  str = str.replace(/[\s-]+/g, '-')
  str = str.replace(/^-+|-+$/g, '')
  return str
}

function normalizeName(name: string): string {
  return name
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

function getStepClass(stepNumber: number, activeStep: number): string {
  if (stepNumber === activeStep) {
    return 'flex items-center gap-2 rounded-xl p-2 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
  }
  if (activeStep > stepNumber) {
    return 'flex items-center gap-2 rounded-xl p-2 text-emerald-600 dark:text-emerald-400'
  }
  return 'flex items-center gap-2 rounded-xl p-2 text-zinc-400'
}

function renderStepBadge(stepNumber: number, activeStep: number) {
  if (activeStep > stepNumber) {
    return <Check size={12} weight="bold" />
  }
  return String(stepNumber)
}

export default function ShopKycRegistrationModal({ isOpen, userEmail, onClose, onSuccess }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>(1)

  // Step 1: Shop Basic Info & Branding
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugSuffix] = useState(function () {
    return Math.random().toString(36).substring(2, 6)
  })
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')

  const [logoKey, setLogoKey] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  const [bannerKey, setBannerKey] = useState('')
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [bannerUploading, setBannerUploading] = useState(false)

  // Step 2: eKYC Identity Info (Không có loại hình người bán)
  const [legalName, setLegalName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [idIssuedDate, setIdIssuedDate] = useState('')
  const [idIssuedPlace, setIdIssuedPlace] = useState('')
  const [taxCode, setTaxCode] = useState('')

  const [idFrontKey, setIdFrontKey] = useState('')
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null)
  const [idFrontUploading, setIdFrontUploading] = useState(false)

  const [idBackKey, setIdBackKey] = useState('')
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null)
  const [idBackUploading, setIdBackUploading] = useState(false)

  const [idSelfieKey, setIdSelfieKey] = useState('')
  const [idSelfiePreview, setIdSelfiePreview] = useState<string | null>(null)
  const [idSelfieUploading, setIdSelfieUploading] = useState(false)

  const [businessCertKey, setBusinessCertKey] = useState('')
  const [businessCertPreview, setBusinessCertPreview] = useState<string | null>(null)
  const [businessCertUploading, setBusinessCertUploading] = useState(false)

  // Step 3: Bank Account for Settlement (Tên chủ TK cho phép người dùng tự điền)
  const [bankName, setBankName] = useState(VIETNAM_BANKS[0] ?? 'Vietcombank (VCB)')
  const [bankAccount, setBankAccount] = useState('')
  const [bankHolder, setBankHolder] = useState('')
  const [bankHolderTouched, setBankHolderTouched] = useState(false)

  // Step 4: Pledges
  const [pledgeGenuine, setPledgeGenuine] = useState(false)
  const [pledgeLegal, setPledgeLegal] = useState(false)
  const [pledgeTax, setPledgeTax] = useState(false)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const upsertUser = useUpsert()
  const registerShop = useRegister()

  if (isOpen === false) {
    return null
  }

  const isUploadingAny =
    logoUploading ||
    bannerUploading ||
    idFrontUploading ||
    idBackUploading ||
    idSelfieUploading ||
    businessCertUploading

  const isBusy = upsertUser.isPending || registerShop.isPending || isUploadingAny

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    onKey: (key: string) => void,
    onPreview: (url: string | null) => void,
    onBusy: (busy: boolean) => void,
  ) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) {
      return
    }

    onBusy(true)
    setErrorMessage(null)

    const reader = new FileReader()
    reader.onload = function (event) {
      if (typeof event.target?.result === 'string') {
        onPreview(event.target.result)
      }
    }
    reader.readAsDataURL(file)

    try {
      const key = await uploadImage(file)
      onKey(key)
    } catch (err: unknown) {
      let msg = 'Tải ảnh thất bại, vui lòng thử lại.'
      if (err instanceof Error && err.message) {
        msg = err.message
      }
      setErrorMessage(msg)
      onPreview(null)
      onKey('')
    } finally {
      onBusy(false)
    }
  }

  function handleNameChange(val: string) {
    setName(val)
    const clean = slugify(val)
    if (clean === '') {
      setSlug('')
      return
    }
    setSlug(`${clean}-${slugSuffix}`)
  }

  function handleLegalNameChange(val: string) {
    const uppercaseVal = val.toUpperCase()
    setLegalName(uppercaseVal)
    if (!bankHolderTouched) {
      setBankHolder(uppercaseVal)
    }
  }

  function handleBankHolderChange(val: string) {
    setBankHolderTouched(true)
    setBankHolder(val.toUpperCase())
  }

  const isBankHolderMatch =
    bankHolder.trim() !== '' &&
    legalName.trim() !== '' &&
    normalizeName(bankHolder) === normalizeName(legalName)

  function validateStep1(): boolean {
    if (name.trim() === '') {
      setErrorMessage('Vui lòng nhập tên gian hàng.')
      return false
    }
    if (slug.trim() === '') {
      setErrorMessage('Vui lòng nhập định danh Shop (slug).')
      return false
    }
    const slugRegex = /^[a-z0-9-]+$/
    if (slugRegex.test(slug.trim()) === false) {
      setErrorMessage('Slug chỉ được chứa chữ thường không dấu, số và dấu gạch ngang.')
      return false
    }
    if (phone.trim() === '') {
      setErrorMessage('Vui lòng nhập số điện thoại kho hàng.')
      return false
    }
    if (address.trim() === '') {
      setErrorMessage('Vui lòng nhập địa chỉ lấy hàng.')
      return false
    }
    if (description.trim() === '') {
      setErrorMessage('Vui lòng nhập mô tả phong cách gian hàng.')
      return false
    }
    if (logoKey.trim() === '') {
      setErrorMessage('Vui lòng tải lên ảnh Logo gian hàng.')
      return false
    }
    if (bannerKey.trim() === '') {
      setErrorMessage('Vui lòng tải lên Ảnh bìa gian hàng.')
      return false
    }
    setErrorMessage(null)
    return true
  }

  function validateStep2(): boolean {
    if (legalName.trim() === '') {
      setErrorMessage('Vui lòng nhập Họ và tên thật theo Căn cước công dân.')
      return false
    }
    const cleanId = idNumber.trim()
    if (cleanId === '') {
      setErrorMessage('Vui lòng nhập số Căn cước công dân (9 hoặc 12 số).')
      return false
    }
    const idRegex = /^\d{9}$|^\d{12}$/
    if (idRegex.test(cleanId) === false) {
      setErrorMessage('Số CCCD/CMND phải gồm đúng 9 hoặc 12 chữ số hợp lệ.')
      return false
    }
    if (idIssuedDate.trim() === '') {
      setErrorMessage('Vui lòng nhập ngày cấp CCCD.')
      return false
    }
    if (idIssuedPlace.trim() === '') {
      setErrorMessage('Vui lòng nhập nơi cấp CCCD.')
      return false
    }
    if (idFrontKey.trim() === '') {
      setErrorMessage('Vui lòng tải lên ảnh mặt trước CCCD.')
      return false
    }
    if (idBackKey.trim() === '') {
      setErrorMessage('Vui lòng tải lên ảnh mặt sau CCCD.')
      return false
    }
    if (idSelfieKey.trim() === '') {
      setErrorMessage('Vui lòng tải lên ảnh chân dung cầm CCCD.')
      return false
    }
    setErrorMessage(null)
    return true
  }

  function validateStep3(): boolean {
    if (bankName.trim() === '') {
      setErrorMessage('Vui lòng chọn ngân hàng thụ hưởng.')
      return false
    }
    if (bankAccount.trim() === '') {
      setErrorMessage('Vui lòng nhập số tài khoản ngân hàng nhận tiền doanh thu.')
      return false
    }
    if (bankHolder.trim() === '') {
      setErrorMessage('Vui lòng nhập tên chủ tài khoản ngân hàng.')
      return false
    }
    if (!isBankHolderMatch) {
      setErrorMessage(
        `Tên chủ tài khoản ngân hàng (${bankHolder.trim()}) phải trùng khớp 100% với Họ và tên trên CCCD (${legalName.trim()}) để phòng chống gian lận & rửa tiền.`,
      )
      return false
    }
    setErrorMessage(null)
    return true
  }

  function handleNext() {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2)
      }
      return
    }
    if (currentStep === 2) {
      if (validateStep2()) {
        if (!bankHolderTouched || bankHolder.trim() === '') {
          setBankHolder(legalName.trim())
        }
        setCurrentStep(3)
      }
      return
    }
    if (currentStep === 3) {
      if (validateStep3()) {
        setCurrentStep(4)
      }
      return
    }
  }

  function handleBack() {
    setErrorMessage(null)
    if (currentStep === 4) {
      setCurrentStep(3)
      return
    }
    if (currentStep === 3) {
      setCurrentStep(2)
      return
    }
    if (currentStep === 2) {
      setCurrentStep(1)
      return
    }
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pledgeGenuine || !pledgeLegal || !pledgeTax) {
      setErrorMessage('Vui lòng tích chọn cam kết tuân thủ đầy đủ cả 3 điều khoản để nộp hồ sơ.')
      return
    }

    if (isUploadingAny) {
      setErrorMessage('Hình ảnh đang được tải lên máy chủ, vui lòng đợi trong giây lát.')
      return
    }

    setErrorMessage(null)

    try {
      const displayName = legalName.trim() || userEmail.split('@')[0] || 'Chủ shop'
      await upsertUser.mutateAsync({
        data: {
          email: userEmail,
          displayName,
          avatarKey: logoKey || null,
        },
      })

      await registerShop.mutateAsync({
        data: {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          logoKey: logoKey.trim(),
          bannerKey: bannerKey.trim(),
          phone: phone.trim(),
          address: address.trim(),
          sellerType: 'INDIVIDUAL',
          legalName: legalName.trim(),
          idNumber: idNumber.trim(),
          idIssuedDate: idIssuedDate.trim(),
          idIssuedPlace: idIssuedPlace.trim(),
          taxCode: taxCode.trim() || null,
          idFrontKey: idFrontKey.trim(),
          idBackKey: idBackKey.trim(),
          idSelfieKey: idSelfieKey.trim(),
          businessCertKey: businessCertKey.trim() || null,
          bankName: bankName.trim(),
          bankAccount: bankAccount.trim(),
          bankHolder: bankHolder.trim(),
        },
      })

      onSuccess()
    } catch (err: unknown) {
      let msg = 'Đăng ký hồ sơ mở shop không thành công. Vui lòng kiểm tra lại thông tin.'
      if (err !== null && typeof err === 'object' && 'message' in err) {
        const raw = String((err as { message?: string }).message)
        if (raw.includes('409') || raw.includes('Conflict') || raw.includes('taken')) {
          msg = 'Định danh shop (slug) này đã có người đăng ký. Vui lòng chọn slug khác.'
        }
        if (raw.includes('trùng khớp') || raw.includes('CCCD')) {
          msg =
            'Tên chủ tài khoản ngân hàng phải trùng khớp 100% với Họ và tên trên Căn cước công dân.'
        }
      }
      setErrorMessage(msg)
    }
  }

  return createPortal(
    <Modal title="Đăng ký Mở Shop & Định danh eKYC" onClose={onClose} widthClass="max-w-2xl">
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Chống hàng giả, gian lận & rửa tiền theo quy chuẩn TMĐT
      </p>

      {/* Multi-Step Stepper Header */}
      <div className="mt-4 grid grid-cols-4 gap-2 text-xs font-bold">
        <div className={getStepClass(1, currentStep)}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current">
            <span className="text-[11px] font-extrabold text-white">
              {renderStepBadge(1, currentStep)}
            </span>
          </span>
          <span className="hidden sm:inline">1. Thông tin Shop</span>
        </div>

        <div className={getStepClass(2, currentStep)}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current">
            <span className="text-[11px] font-extrabold text-white">
              {renderStepBadge(2, currentStep)}
            </span>
          </span>
          <span className="hidden sm:inline">2. Định danh eKYC</span>
        </div>

        <div className={getStepClass(3, currentStep)}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current">
            <span className="text-[11px] font-extrabold text-white">
              {renderStepBadge(3, currentStep)}
            </span>
          </span>
          <span className="hidden sm:inline">3. Ngân hàng</span>
        </div>

        <div className={getStepClass(4, currentStep)}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current">
            <span className="text-[11px] font-extrabold text-white">4</span>
          </span>
          <span className="hidden sm:inline">4. Cam kết</span>
        </div>
      </div>

      {/* Modal Body / Steps */}
      <div className="mt-5 text-sm">
        {/* STEP 1: Thông tin Gian hàng, Kho & Nhận diện Logo/Banner */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-sky-50/80 p-3.5 text-xs text-sky-900 dark:bg-sky-500/10 dark:text-sky-200">
              <span className="font-bold">Bước 1/4:</span> Thiết lập thông tin nhận diện gian hàng,
              ảnh đại diện, ảnh bìa và địa chỉ kho lấy hàng khi phát sinh đơn.
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Tên gian hàng hiển thị <span className="text-red-500">*</span>
                <input
                  id="input-shop-name"
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="VD: Nét Boutique, Thời Trang GenZ, An Fashion..."
                  className={`${INPUT_BASE} font-medium`}
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Định danh Shop / Slug (URL){' '}
                <span className="font-normal text-zinc-400">(Tự sinh độc nhất)</span>{' '}
                <span className="text-red-500">*</span>
                <div className="mt-1 flex items-center rounded-full border border-zinc-300 bg-white/80 px-4 py-2 dark:border-white/15 dark:bg-white/10">
                  <span className="text-xs text-zinc-400">net.vn/shop/</span>
                  <input
                    id="input-shop-slug"
                    type="text"
                    value={slug}
                    readOnly
                    placeholder="VD: net-boutique-4f2a"
                    className="w-full bg-transparent px-2 text-xs font-medium text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500"
                  />
                </div>
              </label>
              <span className="mt-1 block text-[11px] text-zinc-400">
                Đường dẫn độc nhất toàn sàn được tự động tạo kèm mã định danh để tránh trùng lặp.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Số điện thoại liên hệ kho <span className="text-red-500">*</span>
                  <input
                    id="input-shop-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className={`${INPUT_BASE} font-medium`}
                  />
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Địa chỉ kho lấy hàng <span className="text-red-500">*</span>
                  <input
                    id="input-shop-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="VD: 123 Phố Huế, Phường Hàng Bài, Hà Nội"
                    className={`${INPUT_BASE} font-medium`}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Mô tả giới thiệu gian hàng <span className="text-red-500">*</span>
                <textarea
                  id="input-shop-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="VD: Chuyên cung cấp thời trang nam nữ cao cấp, thiết kế hiện đại, cam kết chính hãng 100%..."
                  className={`${TEXTAREA_BASE} font-medium`}
                />
              </label>
            </div>

            {/* Upload Logo và Banner Shop */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Logo gian hàng */}
              <div>
                <p className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Logo gian hàng (Tỉ lệ 1:1) <span className="text-red-500">*</span>
                </p>
                <label htmlFor="upload-shop-logo" className={`${DROPZONE_BASE} mt-1.5 h-32 p-2`}>
                  <input
                    id="upload-shop-logo"
                    type="file"
                    accept="image/*"
                    disabled={logoUploading}
                    onChange={(e) => {
                      void handleUpload(e, setLogoKey, setLogoPreview, setLogoUploading)
                    }}
                    className="hidden"
                  />
                  {!logoPreview && (
                    <div className="py-2 text-center">
                      <UploadSimple
                        size={24}
                        className="mx-auto text-blue-600 transition group-hover:scale-110"
                      />
                      <p className="mt-1 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {logoUploading && 'Đang tải lên…'}
                        {!logoUploading && 'Tải Logo Shop'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400 italic">
                        Vuông 1:1, tối đa 5MB
                      </p>
                    </div>
                  )}
                  {logoPreview && (
                    <div className="relative h-full w-full">
                      <img
                        src={logoPreview}
                        alt="Logo Shop"
                        className="h-full w-full rounded-xl object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-900 shadow">
                          Đổi ảnh
                        </span>
                      </div>
                    </div>
                  )}
                </label>
                {logoKey && (
                  <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ Đã tải logo
                  </p>
                )}
              </div>

              {/* Ảnh bìa / Banner gian hàng */}
              <div>
                <p className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Ảnh bìa / Banner (Tỉ lệ 16:9) <span className="text-red-500">*</span>
                </p>
                <label htmlFor="upload-shop-banner" className={`${DROPZONE_BASE} mt-1.5 h-32 p-2`}>
                  <input
                    id="upload-shop-banner"
                    type="file"
                    accept="image/*"
                    disabled={bannerUploading}
                    onChange={(e) => {
                      void handleUpload(e, setBannerKey, setBannerPreview, setBannerUploading)
                    }}
                    className="hidden"
                  />
                  {!bannerPreview && (
                    <div className="py-2 text-center">
                      <UploadSimple
                        size={24}
                        className="mx-auto text-blue-600 transition group-hover:scale-110"
                      />
                      <p className="mt-1 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {bannerUploading && 'Đang tải lên…'}
                        {!bannerUploading && 'Tải Ảnh Bìa Shop'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400 italic">
                        Ngang 16:9, tối đa 5MB
                      </p>
                    </div>
                  )}
                  {bannerPreview && (
                    <div className="relative h-full w-full">
                      <img
                        src={bannerPreview}
                        alt="Banner Shop"
                        className="h-full w-full rounded-xl object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-900 shadow">
                          Đổi ảnh
                        </span>
                      </div>
                    </div>
                  )}
                </label>
                {bannerKey && (
                  <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓ Đã tải ảnh bìa
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Định danh Người bán eKYC (CCCD + GPKD nếu có) */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-2xl bg-indigo-50/80 p-3.5 text-xs text-indigo-950 dark:bg-indigo-500/10 dark:text-indigo-200">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-indigo-600" weight="bold" />
              <div>
                <p className="font-bold">Định danh người bán chính chủ (eKYC Bắt Buộc)</p>
                <p className="mt-0.5 leading-relaxed">
                  Theo quy định TMĐT Việt Nam, chủ shop bắt buộc phải khai báo CCCD thật để chống
                  lừa đảo, bán hàng giả và bảo vệ quyền lợi người tiêu dùng.
                </p>
              </div>
            </div>

            {/* Họ tên thật theo CCCD */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Họ và tên thật chủ shop (theo CCCD) <span className="text-red-500">*</span>
                <input
                  id="input-legal-name"
                  type="text"
                  value={legalName}
                  onChange={(e) => handleLegalNameChange(e.target.value)}
                  placeholder="VD: NGUYỄN VĂN A"
                  className={`${INPUT_BASE} font-bold uppercase`}
                />
              </label>
              <span className="mt-1 block text-[11px] text-zinc-400">
                Họ tên này bắt buộc phải trùng khớp với Tên chủ tài khoản ngân hàng ở Bước 3.
              </span>
            </div>

            {/* Số CCCD & Mã số thuế */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Số CCCD / CMND (9 hoặc 12 số) <span className="text-red-500">*</span>
                  <input
                    id="input-id-number"
                    type="text"
                    maxLength={12}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="VD: 001202001234"
                    className={`${INPUT_BASE} font-mono font-bold`}
                  />
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Mã số thuế (nếu có)
                  <input
                    id="input-tax-code"
                    type="text"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    placeholder="VD: 8392019281 (nếu có)"
                    className={`${INPUT_BASE} font-mono font-medium`}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Ngày cấp CCCD <span className="text-red-500">*</span>
                  <input
                    id="input-id-date"
                    type="text"
                    value={idIssuedDate}
                    onChange={(e) => setIdIssuedDate(e.target.value)}
                    placeholder="VD: 15/08/2021"
                    className={`${INPUT_BASE} font-medium`}
                  />
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Nơi cấp CCCD <span className="text-red-500">*</span>
                  <input
                    id="input-id-place"
                    type="text"
                    value={idIssuedPlace}
                    onChange={(e) => setIdIssuedPlace(e.target.value)}
                    placeholder="VD: Cục Cảnh sát QLHC về TTXH"
                    className={`${INPUT_BASE} font-medium`}
                  />
                </label>
              </div>
            </div>

            {/* Upload ảnh định danh eKYC */}
            <div>
              <p className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Tải lên giấy tờ định danh (Ảnh CCCD & Chân dung){' '}
                <span className="text-red-500">*</span>
              </p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* Mặt trước CCCD */}
                <label htmlFor="upload-id-front" className={DROPZONE_BASE}>
                  <input
                    id="upload-id-front"
                    type="file"
                    accept="image/*"
                    disabled={idFrontUploading}
                    onChange={(e) => {
                      void handleUpload(e, setIdFrontKey, setIdFrontPreview, setIdFrontUploading)
                    }}
                    className="hidden"
                  />
                  {!idFrontPreview && (
                    <div className="py-2 text-center">
                      <UploadSimple
                        size={24}
                        className="mx-auto text-blue-600 transition group-hover:scale-110"
                      />
                      <p className="mt-1 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {idFrontUploading && 'Đang tải lên…'}
                        {!idFrontUploading && 'Mặt trước CCCD *'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400 italic">Nhấn để tải ảnh</p>
                    </div>
                  )}
                  {idFrontPreview && (
                    <div className="relative w-full">
                      <img
                        src={idFrontPreview}
                        alt="Mặt trước CCCD"
                        className="h-24 w-full rounded-xl object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-100">
                          Đổi ảnh
                        </span>
                      </div>
                    </div>
                  )}
                </label>

                {/* Mặt sau CCCD */}
                <label htmlFor="upload-id-back" className={DROPZONE_BASE}>
                  <input
                    id="upload-id-back"
                    type="file"
                    accept="image/*"
                    disabled={idBackUploading}
                    onChange={(e) => {
                      void handleUpload(e, setIdBackKey, setIdBackPreview, setIdBackUploading)
                    }}
                    className="hidden"
                  />
                  {!idBackPreview && (
                    <div className="py-2 text-center">
                      <UploadSimple
                        size={24}
                        className="mx-auto text-blue-600 transition group-hover:scale-110"
                      />
                      <p className="mt-1 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {idBackUploading && 'Đang tải lên…'}
                        {!idBackUploading && 'Mặt sau CCCD *'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400 italic">Nhấn để tải ảnh</p>
                    </div>
                  )}
                  {idBackPreview && (
                    <div className="relative w-full">
                      <img
                        src={idBackPreview}
                        alt="Mặt sau CCCD"
                        className="h-24 w-full rounded-xl object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-100">
                          Đổi ảnh
                        </span>
                      </div>
                    </div>
                  )}
                </label>

                {/* Selfie cầm CCCD */}
                <label htmlFor="upload-id-selfie" className={DROPZONE_BASE}>
                  <input
                    id="upload-id-selfie"
                    type="file"
                    accept="image/*"
                    disabled={idSelfieUploading}
                    onChange={(e) => {
                      void handleUpload(e, setIdSelfieKey, setIdSelfiePreview, setIdSelfieUploading)
                    }}
                    className="hidden"
                  />
                  {!idSelfiePreview && (
                    <div className="py-2 text-center">
                      <UploadSimple
                        size={24}
                        className="mx-auto text-blue-600 transition group-hover:scale-110"
                      />
                      <p className="mt-1 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {idSelfieUploading && 'Đang tải lên…'}
                        {!idSelfieUploading && 'Ảnh Selfie CCCD *'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-400 italic">Nhấn để tải ảnh</p>
                    </div>
                  )}
                  {idSelfiePreview && (
                    <div className="relative w-full">
                      <img
                        src={idSelfiePreview}
                        alt="Ảnh Selfie cầm CCCD"
                        className="h-24 w-full rounded-xl object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-900 shadow dark:bg-zinc-900 dark:text-zinc-100">
                          Đổi ảnh
                        </span>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Giấy phép kinh doanh (nếu có - tùy chọn) */}
            <div>
              <p className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Giấy phép kinh doanh / ĐKKD (Nếu có - không bắt buộc)
              </p>
              <label htmlFor="upload-business-cert" className={`${DROPZONE_BASE} mt-1.5 h-24 p-3`}>
                <input
                  id="upload-business-cert"
                  type="file"
                  accept="image/*"
                  disabled={businessCertUploading}
                  onChange={(e) => {
                    void handleUpload(
                      e,
                      setBusinessCertKey,
                      setBusinessCertPreview,
                      setBusinessCertUploading,
                    )
                  }}
                  className="hidden"
                />
                {!businessCertPreview && (
                  <div className="text-center">
                    <UploadSimple
                      size={20}
                      className="mx-auto text-zinc-500 transition group-hover:scale-110 group-hover:text-blue-600"
                    />
                    <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                      {businessCertUploading && 'Đang tải lên…'}
                      {!businessCertUploading && 'Tải ảnh Giấy phép kinh doanh (nếu có)'}
                    </p>
                  </div>
                )}
                {businessCertPreview && (
                  <div className="relative h-full w-full">
                    <img
                      src={businessCertPreview}
                      alt="Giấy phép kinh doanh"
                      className="h-full w-full rounded-xl object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-900 shadow">
                        Đổi ảnh
                      </span>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>
        )}

        {/* STEP 3: Tài khoản Ngân hàng (Cho phép điền + Real-time Anti-Fraud Check) */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/80 p-3.5 text-xs text-amber-950 dark:bg-amber-500/10 dark:text-amber-200">
              <Bank size={20} className="mt-0.5 shrink-0 text-amber-700" weight="bold" />
              <div>
                <p className="font-bold">Quy tắc Phòng Chống Rửa Tiền & Gian Lận</p>
                <p className="mt-0.5 leading-relaxed">
                  Tên chủ tài khoản nhận doanh thu bắt buộc phải trùng khớp 100% với Họ và tên trên
                  Căn cước công dân đã khai báo ({legalName || 'Họ tên CCCD'}). Hệ thống tự động đối
                  soát để ngăn chặn tẩu tán tiền và gian lận thương mại.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Ngân hàng thụ hưởng <span className="text-red-500">*</span>
                <select
                  id="select-bank-name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={`${INPUT_BASE} font-medium`}
                >
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Số tài khoản ngân hàng <span className="text-red-500">*</span>
                <input
                  id="input-bank-account"
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value.replace(/\s/g, ''))}
                  placeholder="VD: 1903829102838 (STK chính chủ)"
                  className={`${INPUT_BASE} font-mono font-bold`}
                />
              </label>
            </div>

            {/* Tên chủ tài khoản: CHO PHÉP TỰ ĐIỀN */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Tên chủ tài khoản ngân hàng <span className="text-red-500">*</span>
                <input
                  id="input-bank-holder"
                  type="text"
                  value={bankHolder}
                  onChange={(e) => handleBankHolderChange(e.target.value)}
                  placeholder="VD: NGUYEN VAN A"
                  className={`${INPUT_BASE} font-bold tracking-wider uppercase`}
                />
              </label>

              {/* Real-time Match Validation Alert */}
              {bankHolder.trim() !== '' && isBankHolderMatch && (
                <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={15} weight="fill" />
                  <span>✓ Trùng khớp hoàn toàn với Họ tên trên CCCD: {legalName}</span>
                </div>
              )}

              {bankHolder.trim() !== '' && !isBankHolderMatch && (
                <div className="mt-2 rounded-2xl bg-red-50 p-2.5 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">
                  ⚠️ Tên chủ tài khoản ngân hàng ({bankHolder}) phải trùng khớp 100% với Họ và tên
                  trên CCCD ({legalName}) để phòng chống gian lận & rửa tiền.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Cam kết Pháp lý & Hoàn tất */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                Tóm tắt hồ sơ đăng ký mở shop:
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-zinc-400">Tên gian hàng:</span>{' '}
                  <span className="font-bold">{name}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Đường dẫn:</span>{' '}
                  <span className="font-mono text-blue-600">net.vn/shop/{slug}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Chủ shop (CCCD):</span>{' '}
                  <span className="font-bold">{legalName}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Số CCCD:</span>{' '}
                  <span className="font-mono font-bold">{idNumber}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-zinc-400">Tài khoản nhận tiền:</span>{' '}
                  <span className="font-bold">
                    {bankAccount} ({bankName}) - {bankHolder}
                  </span>
                </div>
              </div>
            </div>

            {/* Thông báo thời gian chờ duyệt 1-3 ngày làm việc */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-sky-50 p-3.5 text-xs text-sky-950 dark:bg-sky-500/10 dark:text-sky-200">
              <Clock size={20} weight="bold" className="shrink-0 text-sky-600" />
              <div>
                <p className="font-bold">Thời gian xét duyệt hồ sơ</p>
                <p className="mt-0.5 leading-relaxed">
                  Hồ sơ mở shop của bạn sẽ được Ban kiểm duyệt thẩm định trong vòng{' '}
                  <strong>1-3 ngày làm việc</strong> (không tính Thứ 7, Chủ Nhật và ngày Lễ).
                </p>
              </div>
            </div>

            {/* Cam kết tuân thủ chính sách sàn */}
            <div className="space-y-2.5 rounded-2xl bg-sky-50/70 p-4 dark:bg-sky-500/10">
              <p className="text-xs font-extrabold text-sky-900 dark:text-sky-200">
                Cam kết người bán & Trách nhiệm pháp lý:
              </p>

              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-zinc-700 select-none dark:text-zinc-300">
                <input
                  id="pledge-genuine"
                  type="checkbox"
                  checked={pledgeGenuine}
                  onChange={(e) => setPledgeGenuine(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 dark:border-white/15 dark:bg-white/10"
                />
                <span>
                  Tôi cam kết chỉ bán sản phẩm thời trang chính hãng, có nguồn gốc xuất xứ rõ ràng,
                  không kinh doanh hàng giả, hàng nhái hoặc vi phạm quyền sở hữu trí tuệ.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-zinc-700 select-none dark:text-zinc-300">
                <input
                  id="pledge-legal"
                  type="checkbox"
                  checked={pledgeLegal}
                  onChange={(e) => setPledgeLegal(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 dark:border-white/15 dark:bg-white/10"
                />
                <span>
                  Tôi hoàn toàn chịu trách nhiệm trước pháp luật và bồi thường 100% thiệt hại phát
                  sinh nếu có hành vi gian lận, lừa đảo hoặc gửi hàng sai lệch cho người mua.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-zinc-700 select-none dark:text-zinc-300">
                <input
                  id="pledge-tax"
                  type="checkbox"
                  checked={pledgeTax}
                  onChange={(e) => setPledgeTax(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 dark:border-white/15 dark:bg-white/10"
                />
                <span>
                  Tôi đồng ý để sàn nét lưu trữ dữ liệu định danh eKYC và cung cấp số liệu doanh thu
                  cho Cơ quan Thuế theo quy định TMĐT Việt Nam.
                </span>
              </label>
            </div>
          </div>
        )}

        {errorMessage !== null && (
          <div
            id="shop-registration-error"
            className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <WarningCircle size={18} weight="fill" className="shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Footer / Navigation */}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4 dark:border-white/10">
        <div>
          {currentStep > 1 && (
            <button
              type="button"
              id="btn-kyc-prev-step"
              onClick={handleBack}
              disabled={isBusy}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Quay lại</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="btn-cancel-shop-registration"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-full px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            Hủy
          </button>

          {currentStep < 4 && (
            <button
              type="button"
              id="btn-kyc-next-step"
              onClick={handleNext}
              disabled={isBusy || (currentStep === 3 && !isBankHolderMatch)}
              className="btn-primary flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold disabled:opacity-50"
            >
              <span>Tiếp tục</span>
              <ArrowRight size={14} weight="bold" />
            </button>
          )}

          {currentStep === 4 && (
            <button
              type="button"
              id="btn-submit-kyc-registration"
              onClick={function (e) {
                void handleFinalSubmit(e)
              }}
              disabled={isBusy || !pledgeGenuine || !pledgeLegal || !pledgeTax}
              className="btn-primary flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-bold disabled:opacity-50"
            >
              <ShieldCheck size={16} weight="bold" />
              {isBusy && <span>Đang xử lý nộp hồ sơ…</span>}
              {!isBusy && <span>Nộp hồ sơ eKYC & Mở shop</span>}
            </button>
          )}
        </div>
      </div>
    </Modal>,
    document.body,
  )
}
