import { useParams } from 'react-router'

// Stub — Task 7 thay bằng form sản phẩm thật (tạo/sửa + upload ảnh)
export default function ProductForm() {
  const { id } = useParams()
  return (
    <div className="py-16 text-center text-sm text-muted-foreground">
      Form sản phẩm {id !== undefined ? `(sửa #${id})` : '(tạo mới)'}
    </div>
  )
}
