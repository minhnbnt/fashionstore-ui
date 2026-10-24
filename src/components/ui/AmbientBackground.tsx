// Nền ambient động dùng chung cho mọi trang: blob gradient trôi chậm sau nội dung.
// Nhét 1 lần ở App.tsx; .hero-blob (index.css) tự tôn trọng prefers-reduced-motion.
export default function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="hero-blob top-[-10rem] left-[-8rem] h-96 w-96 bg-sky-400/30" />
      <div className="hero-blob top-[30%] right-[-10rem] h-[28rem] w-[28rem] bg-indigo-400/25" />
      <div className="hero-blob bottom-[-12rem] left-[20%] h-[26rem] w-[26rem] bg-blue-500/20" />
    </div>
  )
}
