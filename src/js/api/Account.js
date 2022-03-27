/**
 * @typedef AccountDto
 *
 * @property {string} id - Идентификатор счёта.
 * @property {AccountType} type - Тип счёта.
 * @property {string} name - Название счёта.
 * @property {AccountStatus} status - Статус счёта.
 * @property {import("./Timestamp").Timestamp} openedDate - Дата открытия счёта в часовом поясе UTC.
 * @property {import("./Timestamp").Timestamp} closedDate - Дата закрытия счёта в часовом поясе UTC.
 * @property {AccessLevel} accessLevel - Уровень доступа к текущему счёту (определяется токеном).
 */

/**
 * @typedef {(
 *  'ACCOUNT_ACCESS_LEVEL_UNSPECIFIED' |
 *  'ACCOUNT_ACCESS_LEVEL_FULL_ACCESS' |
 *  'ACCOUNT_ACCESS_LEVEL_READ_ONLY' |
 *  'ACCOUNT_ACCESS_LEVEL_NO_ACCESS'
 * )} AccessLevel
 *
 * ACCOUNT_ACCESS_LEVEL_UNSPECIFIED - Уровень доступа не определён.
 * ACCOUNT_ACCESS_LEVEL_FULL_ACCESS - Полный доступ к счёту.
 * ACCOUNT_ACCESS_LEVEL_READ_ONLY - Доступ с уровнем прав "только чтение".
 * ACCOUNT_ACCESS_LEVEL_NO_ACCESS - Доступ отсутствует.
 */

/**
 * @typedef {(
 *  'ACCOUNT_STATUS_UNSPECIFIED' |
 *  'ACCOUNT_STATUS_NEW' |
 *  'ACCOUNT_STATUS_OPEN' |
 *  'ACCOUNT_STATUS_CLOSED'
 * )} AccountStatus
 *
 * ACCOUNT_STATUS_UNSPECIFIED - Статус счёта не определён.
 * ACCOUNT_STATUS_NEW - Новый, в процессе открытия.
 * ACCOUNT_STATUS_OPEN - Открытый и активный счёт.
 * ACCOUNT_STATUS_CLOSED - Закрытый счёт.
 */

export {};
