import { useState } from 'react'

import {
  ArrowLeft,
  ArrowRight,
  Bank,
  Check,
  CheckCircle,
  FileText,
  IdentificationCard,
  ShieldCheck,
  Storefront,
  UploadSimple,
  WarningCircle,
  X,
} from '@phosphor-icons/react'

import { useRegister } from '@generated/endpoints/shops/shops'
import { useUpsert } from '@generated/endpoints/users/users'

interface Props {
  isOpen: boolean
  userEmail: string
  onClose: () => void
  onSuccess: () => void
}

type Step = 1 | 2 | 3 | 4

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

function slugify(text: string): string {
  let str = text.toLowerCase().trim()
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  str = str.replace(/[đĐ]/g, 'd')
  str = str.replace(/[^a-z0-9\s-]/g, '')
  str = str.replace(/[\s-]+/g, '-')
  str = str.replace(/^-+|-+$/g, '')
  return str
}

export default function ShopKycRegistrationModal({
  isOpen,
  userEmail,
  onClose,
  onSuccess,
}: Props) {
  const [currentStep, setCurrentStep] = useState<Step>(1)

  // Step 1: Shop Basic Info
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [autoSlug, setAutoSlug] = useState(true)

  // Step 2: eKYC Identity Info
  const [sellerType, setSellerType] = useState<'INDIVIDUAL' | 'CORPORATE'>('INDIVIDUAL')
  const [legalName, setLegalName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [idIssuedDate, setIdIssuedDate] = useState('20/05/2021')
  const [idIssuedPlace, setIdIssuedPlace] = useState('Cục Cảnh sát QLHC về TTXH')
  const [taxCode, setTaxCode] = useState('')
  const [idFrontFileName, setIdFrontFileName] = useState('cccd_front_verified.jpg')
  const [idBackFileName, setIdBackFileName] = useState('cccd_back_verified.jpg')
  const [idSelfieFileName, setIdSelfieFileName] = useState('portrait_holding_id.jpg')

  // Step 3: Bank Account for Settlement
  const [bankName, setBankName] = useState(VIETNAM_BANKS[0] || 'Vietcombank (VCB)')
  const [bankAccount, setBankAccount] = useState('')

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

  const isBusy = upsertUser.isPending || registerShop.isPending

  function handleNameChange(val: string) {
    setName(val)
    if (autoSlug) {
      setSlug(slugify(val))
    }
  }

  function handleLegalNameChange(val: string) {
    const uppercaseVal = val.toUpperCase()
    setLegalName(uppercaseVal)
  }

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
      setErrorMessage('Vui lòng nhập số Căn cước công dân (12 số).')
      return false
    }
    const idRegex = /^\d{9}$|^\d{12}$/
    if (idRegex.test(cleanId) === false) {
      setErrorMessage('Số CCCD phải gồm đúng 12 chữ số hợp lệ.')
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
    setErrorMessage(null)
    return true
  }

  function validateStep3(): boolean {
    if (bankAccount.trim() === '') {
      setErrorMessage('Vui lòng nhập số tài khoản ngân hàng nhận tiền doanh thu.')
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

    setErrorMessage(null)

    try {
      const displayName = legalName.trim() || userEmail.split('@')[0] || 'Chủ shop'
      await upsertUser.mutateAsync({
        data: {
          email: userEmail,
          displayName,
          avatarKey: null,
        },
      })

      // Register shop with comprehensive eKYC parameters
      await registerShop.mutateAsync({
        data: {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          logoKey: null,
          bannerKey: null,
          phone: phone.trim(),
          address: address.trim(),
          sellerType,
          legalName: legalName.trim(),
          idNumber: idNumber.trim(),
          idIssuedDate: idIssuedDate.trim(),
          idIssuedPlace: idIssuedPlace.trim(),
          taxCode: taxCode.trim() || null,
          idFrontKey: idFrontFileName,
          idBackKey: idBackFileName,
          idSelfieKey: idSelfieFileName,
          businessCertKey: null,
          bankName,
          bankAccount: bankAccount.trim(),
          bankHolder: legalName.trim(),
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
          msg = 'Tên chủ tài khoản ngân hàng phải trùng khớp 100% với Họ và tên trên Căn cước công dân.'
        }
      }
      setErrorMessage(msg)
    }
  }

  return (
    <div
      id="shop-registration-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
    >
      <div
        id="shop-registration-modal"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/80 px-6 py-4 dark:border-white/10 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/20">
              <Storefront size={24} weight="bold" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white">
                Đăng ký Mở Shop & Xác thực Danh tính (eKYC)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Chuẩn người bán Shopee — Phòng chống gian lận & Hàng giả
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-shop-modal"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Multi-Step Stepper Header */}
        <div className="border-b border-zinc-100 bg-white px-6 py-3 dark:border-white/10 dark:bg-zinc-900">
          <div className="grid grid-cols-4 gap-2 text-xs font-bold">
            <div
              className={`flex items-center gap-2 rounded-xl p-2 ${
                currentStep === 1
                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                  : currentStep > 1
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-400'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current text-[11px] font-extrabold text-white">
                {currentStep > 1 ? <Check size={12} weight="bold" /> : '1'}
              </span>
              <span className="hidden sm:inline">1. Thông tin Shop</span>
            </div>

            <div
              className={`flex items-center gap-2 rounded-xl p-2 ${
                currentStep === 2
                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                  : currentStep > 2
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-400'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current text-[11px] font-extrabold text-white">
                {currentStep > 2 ? <Check size={12} weight="bold" /> : '2'}
              </span>
              <span className="hidden sm:inline">2. Định danh eKYC</span>
            </div>

            <div
              className={`flex items-center gap-2 rounded-xl p-2 ${
                currentStep === 3
                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                  : currentStep > 3
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-zinc-400'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current text-[11px] font-extrabold text-white">
                {currentStep > 3 ? <Check size={12} weight="bold" /> : '3'}
              </span>
              <span className="hidden sm:inline">3. Ngân hàng</span>
            </div>

            <div
              className={`flex items-center gap-2 rounded-xl p-2 ${
                currentStep === 4
                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
                  : 'text-zinc-400'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-current text-[11px] font-extrabold text-white">
                4
              </span>
              <span className="hidden sm:inline">4. Cam kết</span>
            </div>
          </div>
        </div>

        {/* Modal Body / Steps */}
        <div className="flex-1 overflow-y-auto p-6 text-sm">
          {/* STEP 1: Thông tin Gian hàng & Kho */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <span className="font-bold">Bước 1/4:</span> Thiết lập thông tin nhận diện gian hàng
                và kho hàng để bưu tá đến lấy bưu kiện khi có đơn phát sinh.
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                  Tên gian hàng hiển thị <span className="text-red-500">*</span>
                  <input
                    id="input-shop-name"
                    type="text"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ví dụ: Nét Thời Trang Cao Cấp, Chic Trends..."
                    className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-normal outline-none focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                  Định danh Shop / Slug (URL) <span className="text-red-500">*</span>
                  <div className="mt-1 flex items-center rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-1 dark:border-white/10 dark:bg-zinc-800">
                    <span className="text-xs text-zinc-400">net.vn/shop/</span>
                    <input
                      id="input-shop-slug"
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setAutoSlug(false)
                        setSlug(slugify(e.target.value))
                      }}
                      placeholder="net-thoi-trang-cao-cap"
                      className="w-full bg-transparent px-2 py-1.5 font-normal outline-none"
                    />
                  </div>
                </label>
                <span className="mt-1 block text-[11px] text-zinc-400">
                  Dùng làm đường dẫn chia sẻ gian hàng cho khách mua sắm.
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                    Số điện thoại liên hệ kho <span className="text-red-500">*</span>
                    <input
                      id="input-shop-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912345678"
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-normal outline-none focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                    Địa chỉ kho lấy hàng <span className="text-red-500">*</span>
                    <input
                      id="input-shop-address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="456 Hai Bà Trưng, Quận 1, TP.HCM"
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-normal outline-none focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                  Mô tả phong cách gian hàng
                  <textarea
                    id="input-shop-desc"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Chuyên thời trang thiết kế trẻ trung, chất lượng cao..."
                    className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 font-normal outline-none focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                  />
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: Định danh Người bán eKYC */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-2xl bg-indigo-50/80 p-3.5 text-xs text-indigo-950 dark:bg-indigo-500/10 dark:text-indigo-200">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-indigo-600" weight="bold" />
                <div>
                  <p className="font-bold">Định danh người bán chính chủ (eKYC Bắt Buộc)</p>
                  <p className="mt-0.5 leading-relaxed">
                    Theo quy định TMĐT Việt Nam và chính sách Shopee, chủ shop bắt buộc phải khai báo
                    CCCD thật để chống lừa đảo, bán hàng giả và bảo vệ quyền lợi người tiêu dùng.
                  </p>
                </div>
              </div>

              {/* Loại hình người bán */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                  Loại hình kinh doanh
                </label>
                <div className="mt-1.5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSellerType('INDIVIDUAL')}
                    className={`flex-1 rounded-2xl border p-3 text-left transition ${
                      sellerType === 'INDIVIDUAL'
                        ? 'border-orange-500 bg-orange-50/60 text-orange-950 font-bold dark:bg-orange-500/20 dark:text-white'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-zinc-800'
                    }`}
                  >
                    <IdentificationCard size={18} className="mb-1 text-orange-600" weight="bold" />
                    <div>Cá nhân kinh doanh</div>
                    <div className="text-[11px] font-normal text-zinc-500">
                      Xác thực qua CCCD gắn chip
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSellerType('CORPORATE')}
                    className={`flex-1 rounded-2xl border p-3 text-left transition ${
                      sellerType === 'CORPORATE'
                        ? 'border-orange-500 bg-orange-50/60 text-orange-950 font-bold dark:bg-orange-500/20 dark:text-white'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/10 dark:bg-zinc-800'
                    }`}
                  >
                    <FileText size={18} className="mb-1 text-orange-600" weight="bold" />
                    <div>Công ty / Hộ KD</div>
                    <div className="text-[11px] font-normal text-zinc-500">
                      Xác thực qua Giấy phép ĐKKD
                    </div>
                  </button>
                </div>
              </div>

              {/* Họ tên thật theo CCCD */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                  Họ và tên thật chủ shop (in hoa theo CCCD) <span className="text-red-500">*</span>
                  <input
                    id="input-legal-name"
                    type="text"
                    value={legalName}
                    onChange={(e) => handleLegalNameChange(e.target.value)}
                    placeholder="NGUYEN HOANG HIEP"
                    className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-bold uppercase outline-none focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                  />
                </label>
                <span className="mt-1 block text-[11px] text-zinc-400">
                  Họ tên này sẽ được dùng để đối chiếu với Tên chủ tài khoản ngân hàng ở Bước 3.
                </span>
              </div>

              {/* Số CCCD & Mã số thuế */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                    Số Căn cước công dân (12 số) <span className="text-red-500">*</span>
                    <input
                      id="input-id-number"
                      type="text"
                      maxLength={12}
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="001202001234"
                      className="mt-1 w-full font-mono rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-bold outline-none focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                    Mã số thuế cá nhân / DN
                    <input
                      id="input-tax-code"
                      type="text"
                      value={taxCode}
                      onChange={(e) => setTaxCode(e.target.value)}
                      placeholder="8498765432"
                      className="mt-1 w-full font-mono rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-normal outline-none focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                    Ngày cấp CCCD <span className="text-red-500">*</span>
                    <input
                      id="input-id-date"
                      type="text"
                      value={idIssuedDate}
                      onChange={(e) => setIdIssuedDate(e.target.value)}
                      placeholder="20/05/2021"
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-normal outline-none focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                    Nơi cấp CCCD <span className="text-red-500">*</span>
                    <input
                      id="input-id-place"
                      type="text"
                      value={idIssuedPlace}
                      onChange={(e) => setIdIssuedPlace(e.target.value)}
                      placeholder="Cục Cảnh sát QLHC về TTXH"
                      className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-normal outline-none focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                    />
                  </label>
                </div>
              </div>

              {/* Upload ảnh định danh eKYC */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                  Tải lên giấy tờ định danh (Ảnh CCCD & Chân dung)
                </label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {/* Mặt trước CCCD */}
                  <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-3 text-center dark:border-white/20 dark:bg-zinc-800">
                    <UploadSimple size={22} className="mx-auto text-orange-600" />
                    <p className="mt-1 text-xs font-bold">Mặt trước CCCD</p>
                    <span className="mt-1 inline-block truncate rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      ✓ {idFrontFileName}
                    </span>
                  </div>

                  {/* Mặt sau CCCD */}
                  <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-3 text-center dark:border-white/20 dark:bg-zinc-800">
                    <UploadSimple size={22} className="mx-auto text-orange-600" />
                    <p className="mt-1 text-xs font-bold">Mặt sau CCCD</p>
                    <span className="mt-1 inline-block truncate rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      ✓ {idBackFileName}
                    </span>
                  </div>

                  {/* Selfie cầm CCCD */}
                  <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-3 text-center dark:border-white/20 dark:bg-zinc-800">
                    <UploadSimple size={22} className="mx-auto text-orange-600" />
                    <p className="mt-1 text-xs font-bold">Ảnh Selfie cầm CCCD</p>
                    <span className="mt-1 inline-block truncate rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      ✓ {idSelfieFileName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Tài khoản Ngân hàng (Anti-Fraud Rule) */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50/80 p-3.5 text-xs text-amber-950 dark:bg-amber-500/10 dark:text-amber-200">
                <Bank size={20} className="mt-0.5 shrink-0 text-amber-700" weight="bold" />
                <div>
                  <p className="font-bold">Nguyên tắc Vàng Chống Rửa Tiền & Gian Lận</p>
                  <p className="mt-0.5 leading-relaxed">
                    Tên chủ tài khoản nhận doanh thu bắt buộc phải trùng khớp 100% với Họ và tên trên
                    Căn cước công dân đã khai báo. Hệ thống tự động khóa trường này để ngăn chặn tẩu
                    tán tiền sang tài khoản người khác.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                  Ngân hàng thụ hưởng <span className="text-red-500">*</span>
                  <select
                    id="select-bank-name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-bold outline-none focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
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
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                  Số tài khoản ngân hàng <span className="text-red-500">*</span>
                  <input
                    id="input-bank-account"
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value.replace(/\s/g, ''))}
                    placeholder="Ví dụ: 0123456789"
                    className="mt-1 w-full font-mono rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-bold outline-none focus:border-orange-500 focus:bg-white dark:border-white/10 dark:bg-zinc-800"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider dark:text-zinc-300">
                  Tên chủ tài khoản (Đã đồng bộ từ CCCD)
                  <input
                    id="input-bank-holder"
                    type="text"
                    disabled
                    value={legalName}
                    className="mt-1 w-full rounded-2xl border border-zinc-200 bg-zinc-200/60 px-4 py-2.5 font-extrabold tracking-wider text-zinc-700 uppercase outline-none dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300"
                  />
                </label>
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={14} weight="fill" />
                  <span>Trùng khớp hoàn toàn với Họ tên trên CCCD: {legalName}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Cam kết Pháp lý & Hoàn tất */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-800">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Tóm tắt hồ sơ đăng ký mở shop:
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-400">Tên gian hàng:</span>{' '}
                    <span className="font-bold">{name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Đường dẫn:</span>{' '}
                    <span className="font-mono text-orange-600">net.vn/shop/{slug}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Chủ shop:</span>{' '}
                    <span className="font-bold">{legalName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Số CCCD:</span>{' '}
                    <span className="font-mono font-bold">{idNumber}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-400">Tài khoản nhận tiền:</span>{' '}
                    <span className="font-bold">
                      {bankAccount} ({bankName}) - {legalName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cam kết tuân thủ chính sách Shopee */}
              <div className="space-y-2.5 rounded-2xl bg-orange-50/70 p-4 dark:bg-orange-500/10">
                <p className="text-xs font-extrabold text-orange-900 uppercase tracking-wider dark:text-orange-200">
                  Cam kết người bán & Trách nhiệm pháp lý:
                </p>

                <label className="flex cursor-pointer items-start gap-2.5 text-xs text-zinc-700 select-none dark:text-zinc-300">
                  <input
                    id="pledge-genuine"
                    type="checkbox"
                    checked={pledgeGenuine}
                    onChange={(e) => setPledgeGenuine(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
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
                    className="mt-0.5 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
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
                    className="mt-0.5 rounded border-zinc-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span>
                    Tôi đồng ý để sàn nét lưu trữ dữ liệu định danh eKYC và cung cấp số liệu doanh
                    thu cho Cơ quan Thuế theo quy định TMĐT Việt Nam.
                  </span>
                </label>
              </div>
            </div>
          )}

          {errorMessage !== null && (
            <div
              id="shop-registration-error"
              className="mt-4 flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300"
            >
              <WarningCircle size={16} weight="bold" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer / Navigation */}
        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/80 px-6 py-4 dark:border-white/10 dark:bg-zinc-800/50">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                id="btn-kyc-prev-step"
                onClick={handleBack}
                disabled={isBusy}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-white/10 dark:text-zinc-200 dark:hover:bg-white/10"
              >
                <ArrowLeft size={14} weight="bold" />
                <span>Quay lại</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-cancel-shop-registration"
              onClick={onClose}
              disabled={isBusy}
              className="rounded-full px-4 py-2.5 text-xs font-bold text-zinc-500 hover:bg-zinc-200/60 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-white/10"
            >
              Hủy
            </button>

            {currentStep < 4 && (
              <button
                type="button"
                id="btn-kyc-next-step"
                onClick={handleNext}
                className="btn-primary flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold"
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
                {isBusy && <span>Đang gửi hồ sơ thẩm định…</span>}
                {isBusy === false && <span>Nộp hồ sơ eKYC & Mở shop</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
