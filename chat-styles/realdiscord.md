# RealDiscord Style — Chat Commentary

Generate Discord-style chat messages reacting to the recent plot developments in scene. Use the EXACT format below.

## OUTPUT FORMAT

**Regular message:**
```
neon_coder_42: message text here
```

**Reply to someone:**
```
reply:neon_coder_42:quoted text snippet
ghost_reader: message text here
```

**Message with reactions:**
```
neon_coder_42: message text here
reactions: 😭 2, 😊, 🔥 15
```

**Reply + reactions combined:**
```
reply:neon_coder_42:quoted text snippet
ghost_reader: message text here
reactions: 😭 4, 💀 12
```

**Complete example (3 messages):**
```
soft_tiger_paws: Блин, как же он тяжело отрывался от кровати 😭
reactions: 😭 12, 🐈 25

reply:soft_tiger_paws:тяжело отрывался от кровати
Тамара_Васильевна: Ой, бедняжка... Пусть кушает хорошо!
reactions: 🙏 10

ALLCAPS_CHAOS: АХАХАХА ОН ЖЕ ПРОСТО КОТ А НЕ ИМПЕРАТОР
reactions: 🤣 45, 💀 20
```

## FORMAT RULES

- **Separate every message with a blank line** — this is mandatory
- The `reply:` line and its message are ONE block — no blank line between them
- The `reactions:` line belongs to the message directly above it — no blank line between them
- The nickname comes FIRST, directly before the colon — NEVER write the word "Username" literally
- Each message starts with `actual_nickname: message text` on one line
- Reaction format: `emoji count` (with space) or just `emoji` — separated by commas
- Counts: realistic numbers like `3`, `17`, `2.4K` — NOT every message needs reactions
- Reply quotes: short fragment (4–8 words), verbatim from the target's message
- Nickname: max 32 chars, NO colons inside nickname
- Max 1–4 reactions per message — only messages that genuinely hit

## NICKNAME AESTHETICS

Nicknames are a reflection of personality. Every nickname is unique and carries character. They can be completely different:

Simple, atmospheric, fandom-related, references, Cyrillic, in English, in Japanese, kaomoji; they can be poetic, ironic, or absurd. 
Character cameos — {{user}}, {{char}}, or NPCs may appear using their real social media names.

## COMMENTER PERSONAS

Mix freely:

- **Average Readers** — emotional reactions, simple pain/joy/screaming at the situation.
- **Lore Goblins** — notice details, references, inconsistencies, and easter eggs.
- **Shippers** — "just kiss already," measuring the centimeters between characters.
- **Channers** — users of 2ch, 4chan, etc.
- **Simps/Stans** — obsessed with one character.
- **Well-actually guys** 
- **Chaotics** — write in all caps, lose their minds, use memes and absurdity.
- **Drama Seekers** — quote the craziest lines, "WHAT JUST HAPPENED," "eating glass" (consuming angst), etc.
- **Housewives** — stumbled upon the chapter by accident and REALLY want a sequel, make silly guesses about characters and plot, give unsolicited/out-of-place advice.
- **{{user}} and {{char}}** — can appear as readers from outside the story.

## LANGUAGE & TONE

- **Primary Language:** Russian with internet slang, Gen Z slang, older generation slang, etc. — depending on the commenter's persona.
- **Profanity allowed:** Use organically, only to heighten the emotion.
- **Caps for emphasis:** HE REALLY DID IT, WHAT THE HELL, I'M FUCKING SHOCKED.
- **Emojis:** Integrated naturally within the text.

## GENERATE

Based on the scene context, generate {{count}} Discord chat messages. Use a natural mix of message types. Not every message needs reactions — only the ones that genuinely hit.
