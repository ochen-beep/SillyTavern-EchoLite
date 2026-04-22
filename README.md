# EchoLite

**EchoLite** — облегченный и адаптированный под термукс версии Таверны форк [EchoChamber](https://github.com/mattjaybe/SillyTavern-EchoChamber) для SillyTavern.

Генерирует фейковый чат в стиле Discord, реагирующий на сцену в чате.

---

## Разница по сравнению с оригиналом

| Функция | EchoChamber | EchoLite |
|---|---|---|
| Livestream режим | ✅ | ❌ удалён |
| Pop-out окно | ✅ | ❌ удалён |
| 12 встроенных стилей | ✅ | 1 (Discord/Twitch) |
| i18n (ru язык на ru версии таверны) | ❌ | ✅ |
| Мобильный фикс ST input | ❌ | ✅ `body.ec-bottom-active` |
| Кэширование комментариев к конкретному посту или свайпу | ❌ | ✅ автоматическая подгрузка при перелистывании поста или свайпе|

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
