<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- User accounts are created only via server functions using the admin client (public signup is disabled); why: only analista/coordenador may create users.
- Roles live in `user_roles`; permissions are enforced with RLS via `is_editor`/`is_active_user`; why: UI hiding is not security.
- Records are never deleted (no DELETE grants/policies); use `ativo`; uniqueness is a partial unique index on accent-insensitive `nome_norm` where active; why: preserve history.
