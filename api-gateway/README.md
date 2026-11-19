# API Gateway — Навык дня

Отдельный ASP.NET Core 10 + YARP 2.3 сервис. Все браузерные `/api/*` идут
через Gateway. На первом этапе подключён Auth Service; другие API добавляются
после согласования их контрактов. Своей БД и копий обработчиков регистрации нет.

## Запуск

Из корня репозитория:

```sh
docker compose up -d --build
docker compose ps
```

Сайт: http://127.0.0.1:8080. Почта для разработки:
http://127.0.0.1:8025. Gateway и Auth Service доступны только внутри Docker-сети;
отдельный публичный порт для Gateway не требуется.

Цепочка запроса:

```text
Браузер /api/auth/login
  → frontend (Nginx), путь сохраняется
  → api-gateway:8080/api/auth/login
  → auth-service:8080/auth/login
```

Nginx передаёт `/api` без изменений. Только Gateway удаляет этот префикс,
один раз. `API_GATEWAY_URL` задаёт адрес Gateway для Nginx. Адрес Auth Service
задаётся переменной `ReverseProxy__Clusters__auth__Destinations__primary__Address`.
Переменная `AUTH_SERVICE_URL` во фронтенде больше не нужна.

## Эндпоинты

Все существующие `/api/auth/*` сохранены, включая:

| Метод | Путь | Назначение |
| --- | --- | --- |
| GET | `/api/auth/config` | Требуется ли подтверждение почты |
| POST | `/api/auth/register` | Регистрация, письмо при включённом подтверждении |
| POST | `/api/auth/confirm-email` | Подтверждение email |
| POST | `/api/auth/resend-confirmation` | Повторное письмо |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/refresh` | Продление сессии |
| POST | `/api/auth/logout` | Выход |
| POST | `/api/auth/logout-all` | Выход со всех устройств |
| GET | `/api/auth/me` | Текущий пользователь |
| POST | `/api/auth/forgot-password` | Запрос сброса пароля |
| POST | `/api/auth/reset-password` | Сброс пароля по ссылке |
| POST | `/api/auth/change-password` | Смена пароля |
| POST | `/api/auth/change-email` | Запрос смены email |
| POST | `/api/auth/confirm-email-change` | Подтверждение нового email |
| DELETE | `/api/auth/account` | Удаление аккаунта |
| GET | `/api/auth/admin/check` | Проверка роли Admin |
| GET | `/api/auth/.well-known/jwks.json` | Публичные ключи JWT |
| GET | `/api/auth/openapi/v1.json` | Контракт Auth API, Development |
| GET | `/api/health/live` | Работает процесс Gateway |
| GET | `/api/health/ready` | Gateway видит готовый Auth Service и его БД |

Полные тела, ответы и правила доступа описаны в
[Auth Service](../auth-service/README.md). Для OpenAPI базовый URL клиента —
`http://127.0.0.1:8080/api`, поскольку пути в документе начинаются с `/auth`.

Gateway передаёт Bearer, Origin, cookies, Set-Cookie и ответы сервиса.
Существующий refresh-cookie сохраняет Path `/`, HttpOnly и SameSite.
Проверки паролей, подписи JWT, отзыва сессии, роли Admin, источника запроса и
ограничения частоты выполняет Auth Service. В самом Gateway на этом этапе
проверка JWT не дублируется. При добавлении других сервисов нужно явно
назначить политики доступа и проверки прав на их данные.

Неподключённый маршрут возвращает `404 application/problem+json`.
При ошибке соединения с сервисом — JSON `502`, при таймауте — `504`.
Обычные ответы Auth Service, в том числе `401`, `403` и `429`, передаются
без изменения. Для диагностики Gateway использует стандартный W3C TraceId:
контекст передаётся в Auth Service через `traceparent`, тот же идентификатор
возвращается в заголовках `X-Request-ID` и `X-Trace-ID`. При ошибке Gateway идентификатор
также находится в поле `requestId`. Собственный журнал запросов не содержит
тел, query string, паролей, токенов и cookies.

Визуальные журналы, цепочки запросов и HTTP-метрики доступны в Aspire Dashboard:
http://127.0.0.1:18888. Связанные записи Gateway и Auth открываются по одному
TraceId. Настройка и сценарий показа — в [observability/README.md](../observability/README.md).
Общая библиотека телеметрии находится в `observability/ServiceDefaults`; Dockerfile
Gateway использует контекст корня репозитория, как указано в Compose.

Внутренние `/health/live` и `/health/ready` используются Docker HEALTHCHECK.
Readiness проверяет `/health/ready` Auth Service с таймаутом 3 секунды.
Таймаут бездействия при проксировании — 30 секунд, Nginx ждёт 35 секунд.
Пароли, ключи подписи и пользовательские данные остаются в Auth Service.

Nginx заменяет присланный клиентом X-Forwarded-For своим адресом соединения;
Gateway также не использует произвольные forwarded-заголовки для принятия
решений о доступе. Auth Service пока считает лимиты по адресу Gateway.
Перед внешним развёртыванием следует настроить доверенную цепочку прокси и
передачу реального IP; нельзя просто разрешать forwarded-заголовки от всех.

## Проверки

Нужны .NET SDK 10 и Node.js 22+. Проверка транспорта запускает отдельный
Gateway и временный HTTP-сервис на случайных loopback-портах, не трогая БД:

```sh
dotnet build api-gateway/src/ApiGateway/ApiGateway.csproj -c Release
node --test api-gateway/tests/proxy.test.mjs
```

Проверка настоящих регистрации, писем, JWT, refresh/replay, ролей, выхода,
смены пароля/email и удаления через Nginx → Gateway → Auth Service:

```sh
node --test auth-service/tests/auth.test.mjs
```

Проверка в браузере:

```sh
cd frontend
AUTH_INTEGRATION=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 npm run test:e2e -- --grep 'Real auth-service'
```

Интеграционные проверки создают только тестовые аккаунты и требуют локального
Mailpit. Не запускайте их с внешним SMTP. Между полным прогоном API-тестов и
браузерным прогоном дождитесь следующего минутного окна лимита Auth Service;
ограничения запросов при тестировании остаются включёнными. Состояние и журнал Gateway:

```sh
docker compose logs -f api-gateway
curl http://127.0.0.1:8080/api/health/ready
```

Данные вакансий и roadmap на фронтенде пока демонстрационные. Gateway сам
их не создаёт. Чтобы подключить следующий сервис, добавьте его контейнер,
маршрут и destination в `src/ApiGateway/appsettings.json`, согласуйте
внешние пути, преобразование префиксов и авторизацию, затем проверьте контракт.
