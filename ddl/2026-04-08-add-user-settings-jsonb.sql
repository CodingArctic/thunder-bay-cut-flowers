BEGIN;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS settings JSONB;

UPDATE users
SET settings = '{}'::jsonb
WHERE settings IS NULL;

UPDATE users
SET settings = jsonb_set(settings, '{notifications}', '{}'::jsonb, true)
WHERE settings->'notifications' IS NULL
   OR jsonb_typeof(settings->'notifications') <> 'object';

UPDATE users
SET settings = jsonb_set(settings, '{notifications,enabled}', 'true'::jsonb, true)
WHERE settings#>'{notifications,enabled}' IS NULL
   OR jsonb_typeof(settings#>'{notifications,enabled}') <> 'boolean';

ALTER TABLE users
    ALTER COLUMN settings SET DEFAULT '{"notifications": {"enabled": true}}'::jsonb;

ALTER TABLE users
    ALTER COLUMN settings SET NOT NULL;

COMMIT;
