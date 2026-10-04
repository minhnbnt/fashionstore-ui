import { useParams } from 'react-router'

function formTitle(id: string | undefined) {
  if (id !== undefined) {
    return `Form sản phẩm (sửa #${id})`
  }
  return 'Form sản phẩm (tạo mới)'
}

// Stub — Task 7 thay bằng form sản phẩm thật (tạo/sửa + upload ảnh)
export default function ProductForm() {
  const { id } = useParams()
  return (
    <div className="py-16 text-center text-sm text-muted-foreground">{formTitle(id)}</div>
  )
}
