**Ethereal Docs** — минималистичный, безопасный и быстрый Markdown‑редактор с живым предпросмотром и облачной синхронизацией.

Платформа построена на **Next.js 15 + Supabase + TypeScript** и ориентирована на приватность, безопасность и UX.

---

## 🧠 Что это?

Инструмент для комфортного сохранения/чтения/доработки текста написанного ИИ, с сохранением исходного оформления:

- живое preview
- автосохранение
- экспорт в Word
- безопасная архитектура

---

## ✍️ Основной функционал

### 📝 Редактор
- CodeMirror 6
- Поддержка GitHub Flavored Markdown
- Заголовки, списки, чекбоксы, таблицы
- Code blocks
- Blockquotes
- Inline formatting

### 👀 Режимы работы
- **Write** — чистый Markdown
- **Split** — редактор + preview
- **Preview** — чистый рендер

### ☁️ Автосохранение
- Debounce 2 секунды
- Статусы: Saving → Saved
- Защита от сохранения чужих документов

### 🎨 Темы
- Light
- Dark
- Sepia
- Персональные настройки на документ

### 📤 Экспорт
- Экспорт в `.docx`
- Сохраняет структуру документа
- Санитизация имени файла
- Безопасная обработка ссылок

---

## 🔐 Безопасность

Проект спроектирован с акцентом на безопасность.

### 🛡 Supabase

- ✅ Row Level Security (RLS)
- ✅ Проверка `user_id` при update/delete
- ✅ Защита от доступа к чужим данным
- ✅ Нет публичных write‑политик

---

### 🚫 XSS защита

- Нет `dangerouslySetInnerHTML`
- Используется `react-markdown`
- Фильтрация:
  - `javascript:` ссылок
  - `data:` URI
  - небезопасных `href`
- Санитизация заголовков
- Ограничение размера контента

---

### 🔁 Open Redirect защита

- Санитизация `next` параметра
- Разрешены только внутренние пути

---

### 🔒 HTTP Security Headers

Настроены через `next.config.ts`:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-*` политики

Оценка SecurityHeaders: **A**

---

### ⚡ Дополнительная защита

- Ограничение размера документа (500KB)
- Санитизация имени файла при экспорте
- Client-side rate limiting
- Централизованное логирование security событий
- Защита от hydration-based XSS

---

## 🏗 Архитектура

- **Next.js 15 (App Router)**
- **Supabase Auth + PostgreSQL**
- **Framer Motion**
- **CodeMirror 6**
- **TypeScript Strict Mode**

---
