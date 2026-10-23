# Pre-commit — fashionstore-ui

Chạy trong `fashionstore-ui/`, theo đúng thứ tự:

```bash
pnpm format
pnpm lint
pnpm build
```

- `pnpm lint` phải 0 error (oxlint). Lỗi format thì `pnpm format` rồi kiểm lại.
- `pnpm build` phải xanh (`tsc -b && vite build`).
- Xong mới `git add -A && git commit -m "<type>: ..."`.

Quy ước message (conventional commits): `feat: ...` tính năng mới, `fix: ...` sửa lỗi, `docs: ...` tài liệu, `chore: ...` cấu hình/vệ sinh, `refactor: ...` tái cấu trúc không đổi hành vi. Có thể kèm scope: `feat(address): ...`. Không commit `dist/`.
