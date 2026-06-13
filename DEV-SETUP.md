# Praca na wielu PC — setup i workflow

> **Zasada nadrzędna:** synchronizacją między komputerami jest **git (GitHub)**, a **nie** Google Drive / OneDrive.
> Folder `.git/` synchronizowany przez Drive ulega korupcji (wyścig zapisu → uszkodzone obiekty, duplikaty `(1)`).
> Repo trzymamy w `C:\dev\` — **poza** katalogiem synchronizowanym przez Drive.

---

## 1. Pierwsze uruchomienie na nowym PC

```bash
# 1. Sklonuj z GitHub do C:\dev (NIE do folderu Drive)
git clone https://github.com/marekbereza83/forma-cms.git C:\dev\forma-cms

cd C:\dev\forma-cms

# 2. Zainstaluj zależności
npm install

# 3. Wygeneruj klienta Prisma
npx prisma generate

# 4. Skopiuj sekrety (patrz sekcja 3) — bez .env aplikacja nie wstanie

# 5. Przygotuj lokalną bazę dev:
#    albo odbuduj z fixture:
npm run reset && npm run seed
#    albo skopiuj prisma/dev.db z innego PC (patrz sekcja 3)

# 6. Sprawdź, że wszystko działa
npx tsc --noEmit
npx vitest run        # powinno być 8/8 suit zielonych
```

## 2. Codzienny workflow (każdego dnia, każda zmiana stanowiska)

```bash
# ZANIM przestaniesz pracować na PC A:
git push

# GDY siadasz do PC B:
git pull
```

Jeśli `git pull` zgłosi konflikt lub "local changes" — to znaczy, że poprzedni `push` się nie wykonał. Najpierw commit/push na poprzednim PC.

## 3. Pliki, których NIE ma w gicie — trzeba przenieść ręcznie

git synchronizuje tylko śledzone pliki. Te są ignorowane i muszą być na każdym PC osobno:

| Plik / katalog | Co to | Jak przenieść |
|---|---|---|
| `.env` | sekrety (R2, `NEXTAUTH_SECRET`) | skopiuj ręcznie z menedżera haseł (1Password/Bitwarden) — **nigdy** przez Drive ani do gita |
| `prisma/dev.db` | lokalna baza dev | skopiuj plik **albo** odbuduj: `npm run reset && npm run seed` |
| `public/uploads/<tenantId>/` | realne webp tenantów | skopiuj katalog ręcznie, jeśli potrzebne lokalnie |
| `.claude/settings.local.json` | lokalny allowlist uprawnień | opcjonalne; skopiuj dla wygody |

`.env.test` **jest** śledzony — przychodzi z klonem, nie trzeba kopiować.

> Nie kopiuj backupów `prisma/dev.db.backup-*` ani plików z `(1)` w nazwie — to artefakty/śmieci.

## 4. Wykluczenie z Drive (jednorazowo, na każdym PC)

W kliencie Google Drive → ustawienia synchronizacji → upewnij się, że **`C:\dev` NIE jest synchronizowany**.
Bez tego korupcja `.git/` wróci.

Drive jest OK dla: `generated_sites/`, screenshotów, dokumentów bez własnego repo.

---

## TL;DR

1. Repo żyje w `C:\dev\forma-cms`, poza Drive.
2. `git push` wychodząc, `git pull` siadając.
3. `.env` i `dev.db` przenosisz raz, ręcznie (nie przez git, nie przez Drive).
