# EchoLite

**EchoLite** — оптимизированный форк расширения [EchoChamber](https://github.com/mattjaybe/SillyTavern-EchoChamber) для SillyTavern.

Генерирует фейковый чат (зрители / комментарии), реагирующий на текущий диалог персонажей.

---

## Изменения по сравнению с оригиналом

| Функция | EchoChamber | EchoLite |
|---|---|---|
| Livestream режим | ✅ | ❌ удалён |
| Pop-out окно | ✅ | ❌ удалён |
| 12 встроенных стилей | ✅ | 2 (Discord/Twitch + TikTok/Twitter) |
| i18n (ru-ru) | ❌ | ✅ встроен в JS |
| Мобильный фикс ST input | ❌ | ✅ `body.ec-bottom-active` |
| 100dvh | ❌ | ✅ |
| Touch-targets ≥44px | частично | ✅ |
| Compact-mode header | ✅ | ✅ сохранён |
| Override Max Tokens | ✅ | ✅ |

---

## Установка

1. Скопировать папку `SillyTavern-EchoLite` в:
   ```
   SillyTavern/public/scripts/extensions/third-party/
   ```
2. Перезапустить SillyTavern
3. Включить в Extensions → EchoLite

---

## Использование

1. Включи **Enable EchoLite** в настройках расширения
2. Нажми кнопку питания ⏻ на панели чата
3. Чат автоматически генерируется после каждого сообщения (если включён Auto-update)

---

## Структура файлов

```
SillyTavern-EchoLite/
├── manifest.json
├── index.js
├── style.css
├── settings.html
├── chat-styles/
│   ├── discordtwitch.md
│   └── twitterx.md
└── i18n/
    └── ru-ru.json
```

---

## Лицензия

MIT — based on EchoChamber by mattjaybe
