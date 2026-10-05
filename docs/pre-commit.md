# Pre-commit — fashionstore-ui

Chạy trong `fashionstore-ui/`, theo đúng thứ tự:

```bash
pnpm format
pnpm lint
pnpm build
```

- `pnpm lint` phải 0 error (oxlint). Lỗi format thì `pnpm format` rồi kiểm lại.
- `pnpm build` phải xanh (`tsc -b && vite build`).
- Xong mới `git add -A && git commit -m "feat|fix: ..."`.

Quy ước message: `feat: ...` tính năng mới, `fix: ...` sửa lỗi. Không commit `dist/`.
