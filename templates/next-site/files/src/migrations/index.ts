// Payload rewrites this file on every `yarn payload migrate:create`. In
// production the database adapter runs any migration listed here that has not
// run yet, when the server starts (prodMigrations in payload.config.ts).
// A fresh project has none: create the first one before its first deploy.
export const migrations = [];
