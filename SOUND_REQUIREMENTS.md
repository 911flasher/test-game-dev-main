# Требования к звукам и музыкальным дорожкам

Документ описывает требования к аудио для текущего проекта crash game (Aviator-style) на базе существующей логики клиента. Цель: подготовить понятное ТЗ для AI-генерации SFX, UI-звуков и музыкальных дорожек так, чтобы звук усиливал game feel, не мешал читаемости интерфейса и легко встраивался в текущие состояния игры.

## 1. Контекст проекта

Игра уже имеет следующие ключевые состояния и события:

- `WAITING`: ожидание нового раунда, экран показывает `Place your bets`.
- `COUNTDOWN`: обратный отсчет `3, 2, 1, GO!`.
- `FLYING`: множитель растет, ракета летит вверх, визуально усиливается напряжение.
- `CRASHED`: мгновенный краш, взрыв, screen shake, отображение `CRASHED @ X`.
- `bet:place`: игрок ставит ставку до начала раунда.
- `bet:cashout`: игрок выводит выигрыш во время полета.
- `CashoutCelebration`: на успешный cashout уже есть конфетти и текстовая celebration-анимация.

Звук должен быть синхронизирован именно с этими фазами и событиями.

## 2. Общая аудио-концепция

Желаемое ощущение:

- аркадное;
- современное;
- напряженное, но не агрессивно-казиношное;
- sci-fi / neon / rocket launch mood;
- короткие, читаемые, чистые звуки без грязной реверберации;
- музыка и SFX должны создавать нарастающее напряжение перед крашем и сильный контраст в момент cashout или crash.

Нежелательное ощущение:

- комичный cartoon sound;
- слишком реалистичный military/space sim;
- тяжелый EDM-клубный трек, который забивает интерфейс;
- слишком ярко выраженные слот-машинные / “Vegas jackpot” клише;
- гипер-длинные cinematic whoosh/hits.

## 3. Набор обязательных ассетов

Нужно подготовить 3 группы аудио:

1. UI / interaction SFX
2. Gameplay SFX
3. Музыкальные дорожки / стемы

## 4. UI / Interaction SFX

### 4.1 Place Bet

Событие:
- игрок нажимает кнопку ставки в `WAITING` или `COUNTDOWN`.

Требование:
- короткий подтверждающий звук интерфейса;
- длительность 120-300 мс;
- ощущение: “armed / locked in / confirmed”;
- без длинного хвоста;
- должен хорошо работать при частом повторении.

Характер:
- digital click;
- soft synth tick;
- light confirm pulse.

Избегать:
- кассового “coin” клише;
- громкого mechanical click.

### 4.2 Invalid / Disabled Action

Событие:
- попытка действия вне допустимой фазы или при отсутствии активной ставки.

Требование:
- мягкий короткий negative UI sound;
- длительность 80-200 мс;
- не раздражающий;
- должен явно отличаться от confirm.

### 4.3 Hover / Focus

Опционально, если будет расширяться UI:
- очень тихий rollover sound для интерактивных элементов;
- длительность до 100 мс;
- использовать только если не создает аудио-спам.

## 5. Gameplay SFX

### 5.1 Waiting Ambience

Событие:
- фаза `WAITING`.

Требование:
- очень легкий loop / bed;
- ощущение подготовки перед запуском;
- low intensity;
- без явного ритма, который спорит с countdown.

Характер:
- sci-fi room tone;
- subtle air / hum;
- faint machine power.

### 5.2 Countdown Tick 3-2-1

Событие:
- фаза `COUNTDOWN`, каждое изменение числа.

Требование:
- три отдельных акцентных тика или один набор из 3 близких по тембру звуков;
- `3` и `2`: короткие собранные удары;
- `1`: наиболее напряженный и чуть ярче;
- каждый звук 150-350 мс.

Характер:
- electronic pulse;
- compact impact;
- futuristic countdown blip.

### 5.3 GO / Launch Start

Событие:
- переход из `COUNTDOWN` в `FLYING`.

Требование:
- отдельный звук старта раунда;
- ощущение “ignite / launch / release”;
- длина 400-900 мс;
- должен открыть место для loop/engine слоя полета.

Характер:
- ignition burst;
- upward whoosh;
- compact launch accent.

### 5.4 Rocket / Flight Loop

Событие:
- вся фаза `FLYING`.

Требование:
- зацикливаемый engine/energy loop;
- стартует сразу после `GO`;
- имеет чистую петлю без щелчка;
- интенсивность должна позволять дополнительную автоматизацию громкости/фильтра по мере роста множителя.

Характер:
- futuristic engine;
- turbine/synth hybrid;
- rising energy without harsh distortion.

Важно:
- базовая версия должна быть нейтральной;
- допускается отдельный “high tension” layer, который можно домешивать после `2x`, `5x`, `10x`.

### 5.5 Multiplier Threshold Accents

Событие:
- прохождение визуально значимых зон множителя: `2x`, `5x`, `10x`.

Требование:
- короткие маркерные акценты;
- длительность 100-250 мс;
- каждый следующий threshold звучит чуть дороже и опаснее.

Характер:
- tonal shimmer;
- synth ping;
- energized accent.

Назначение:
- подчеркнуть переход цветовых состояний интерфейса;
- усилить чувство роста риска.

### 5.6 Cashout Success

Событие:
- успешный `bet:cashout`, после которого показывается `CashoutCelebration`.

Требование:
- главный позитивный reward sound;
- длительность 600-1800 мс;
- должен ощущаться выигрышно, но не как “jackpot of a slot machine”;
- обязателен быстрый яркий старт и приятный музыкальный хвост;
- должен хорошо сочетаться с конфетти-анимацией.

Характер:
- clean reward burst;
- tonal rise + success chord;
- premium arcade win.

Вариативность:
- желательно 2-3 варианта или layered structure:
  - small win;
  - medium win;
  - big win.

Минимальное правило:
- размер reward может зависеть от `cashedOutAt`, например:
  - до `2x`: restrained;
  - `2x-5x`: brighter;
  - `5x+`: richer, более праздничный.

### 5.7 Crash Hit

Событие:
- переход в `CRASHED`.

Требование:
- мощный, короткий, читаемый crash impact;
- должен совпадать с explosion и screen shake;
- длительность 500-1200 мс;
- очень сильная атака в первые 100 мс;
- не должен быть слишком низкочастотным, чтобы не мылить микс.

Характер:
- impact + burst;
- digital explosion;
- sharp energy rupture.

Дополнительно:
- хорошо, если crash состоит из 2 слоев:
  - front transient;
  - короткий debris/noise tail.

### 5.8 Loss / Missed Cashout Stinger

Событие:
- у игрока была активная ставка, но произошел `CRASHED` без cashout.

Требование:
- отдельный короткий негативный sting поверх общего crash impact;
- должен выражать потерю, но не унижать игрока;
- длительность 200-500 мс.

### 5.9 Post-Crash Reset Sweep

Событие:
- конец crash-сцены, переход обратно к ожиданию нового раунда.

Требование:
- мягкий reset transition;
- короткий descending или cleansing sweep;
- нужен для психологического “сброса” после напряжения.

## 6. Музыкальные дорожки / стемы

Нужна не одна полноценная песня, а адаптивный музыкальный набор.

### 6.1 Music Stem A: Lobby / Waiting

Использование:
- `WAITING`.

Требование:
- спокойный фон ожидания;
- low-mid energy;
- ощущение подготовки и технологичности;
- без доминирующей мелодии.

Параметры:
- loop 30-90 секунд;
- seamless loop;
- можно использовать пульсирующий pad, легкий pulse, редкие arps.

### 6.2 Music Stem B: Countdown Tension

Использование:
- `COUNTDOWN`.

Требование:
- отдельный короткий tension stem или transition stem;
- должен быстро поднимать напряжение;
- хорошо, если за 3 секунды естественно приводит к старту полета.

Параметры:
- длина 3-5 секунд;
- может быть one-shot или очень короткий loop.

### 6.3 Music Stem C: Flight Core

Использование:
- `FLYING`.

Требование:
- основной драйвовый loop полета;
- умеренный темп;
- чувство ускорения и риска;
- не слишком плотный низ;
- оставить место для engine loop и event SFX.

Параметры:
- loop 20-60 секунд;
- seamless loop;
- желателен пульс / секвенсор, но без вокала.

### 6.4 Music Stem D: High Tension Overlay

Использование:
- можно домешивать на высоких множителях (`2x+`, `5x+`, `10x+`).

Требование:
- отдельный слой нарастания;
- может быть высокочастотный arpeggio, riser-pad или rhythmic synth layer;
- должен усиливать тревогу, не ломая основной трек.

### 6.5 Music Stem E: Crash Resolve

Использование:
- сразу после `CRASHED`.

Требование:
- короткий музыкальный aftermath / downer;
- может быть отдельный sting 1-2 секунды;
- нужен, если хотим сильнее подчеркнуть конец раунда.

### 6.6 Music Stem F: Cashout Reward Overlay

Использование:
- поверх обычной музыки при успешном cashout игрока.

Требование:
- короткий музыкальный reward-слой;
- не должен конфликтовать с основным `Cashout Success` SFX;
- может быть тональным дополнением, а не самостоятельным главным звуком.

## 7. Технические требования к генерации

### Формат поставки

Нужно получить:

- `WAV`, 24-bit, `48 kHz` для мастеров;
- при необходимости дополнительно `OGG` для runtime-использования;
- каждый ассет отдельным файлом;
- отдельная папка `sfx` и отдельная папка `music`.

### Монозвуки и стерео

- UI SFX: mono или narrow stereo;
- gameplay hits: stereo;
- музыка и ambience: stereo;
- низкочастотные элементы держать в центре.

### Громкость и запас по миксу

- SFX не должны быть пережаты;
- избегать brickwall limiting;
- нужен headroom для сведения в игре;
- ориентир:
  - UI SFX: умеренные, чистые;
  - reward/crash: заметно громче, но без клиппинга;
  - music stems: тише SFX, чтобы интерфейсные события читались поверх.

### Петли

Для всех loop-ассетов:

- seamless loop обязателен;
- без заметного клика на стыке;
- без длинного pre-roll;
- отдельный tail допускается только если предусмотрен runtime crossfade.

## 8. Референс по настроению для AI-генерации

Использовать в промптах такие формулировки:

- futuristic arcade crash game;
- neon sci-fi betting tension;
- compact high-clarity game UI sound;
- premium casual game audio;
- rocket launch energy with rising risk;
- elegant reward, not casino slot jackpot;
- digital explosion with clean transient.

Избегать в промптах:

- cartoon;
- comedy;
- children game;
- Vegas slot;
- orchestral trailer;
- horror;
- dubstep drop;
- distorted industrial noise.

## 9. Требования к вариативности

Чтобы звук не утомлял, желательно:

- минимум 3 варианта для `Place Bet`;
- минимум 3 countdown ticks;
- минимум 2 варианта для `Crash Hit`;
- минимум 3 reward-варианта для cashout;
- 1 базовый flight loop + 1 tension overlay.

Если AI-генератор не дает консистентную серию, допустим layered-подход:

- одна стабильная база;
- несколько коротких interchangeable one-shot accents.

## 10. Приоритет ассетов для первой итерации

Если делать в 1 проход без перегруза, приоритет такой:

1. `Place Bet`
2. `Countdown 3-2-1`
3. `GO / Launch`
4. `Flight Loop`
5. `Cashout Success`
6. `Crash Hit`
7. `Loss Stinger`
8. `Waiting Ambience`
9. `Lobby / Waiting Music Stem`
10. `Flight Core Music Stem`

## 11. Критерии приемки

Аудио считается подходящим, если:

- звук явно поддерживает текущие фазы игры;
- countdown повышает напряжение;
- flight дает чувство нарастающего риска;
- cashout ощущается как награда;
- crash ощущается резко и убедительно;
- звуки не мешают читать множитель и UI;
- loop-ассеты не слышно “режутся” на повторе;
- стиль всех ассетов ощущается частью одной sci-fi arcade системы.

## 12. Короткий набор промптов для AI

### Prompt: Place Bet

`Short futuristic UI confirm sound for a neon sci-fi crash game, clean digital click with soft synth pulse, premium arcade feel, very short, no coin casino cliché, no reverb tail`

### Prompt: Countdown Tick

`Futuristic countdown tick for a crash game, tense electronic pulse, compact transient, high clarity, short game-ready one shot, not cartoon, not cinematic trailer`

### Prompt: GO / Launch

`Rocket launch start sound for a sci-fi arcade crash game, ignition burst with upward whoosh, compact and energetic, game-ready, clean transient, no long cinematic tail`

### Prompt: Flight Loop

`Seamless futuristic engine loop for a rocket flying upward in a neon sci-fi crash game, tense but controlled, clean synthetic energy, not too noisy, suitable as gameplay loop`

### Prompt: Cashout Success

`Premium arcade reward sound for successful cashout in a sci-fi crash betting game, elegant win burst with tonal uplift, exciting but not slot machine jackpot, polished, game-ready`

### Prompt: Crash Hit

`Sharp digital explosion impact for a rocket crash in a neon sci-fi arcade game, strong transient, short debris tail, dramatic and clean, not realistic war explosion, not muddy`

