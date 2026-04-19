-- Grant API role full DML on all app tables (fixes: permission denied 42501).
--
-- Why this happens: host/user/password only prove WHO you are. Tables still need
-- GRANT (or ownership). Wrong password => authentication error. 42501 => rights.
--
-- CRITICAL: run this while connected to database CookingDB (not "postgres").
--   psql:  psql -U postgres -d CookingDB -f database/grant_app_user.sql
--   pgAdmin: click database "CookingDB" in tree → right-click → Query Tool → paste → Execute.
--            (If you open Query Tool from server root, default DB is often "postgres" = wrong.)
--   You must run as a superuser (e.g. postgres), not as "Cooking".
--
-- Role name must match DB_USER in api/.env. If GRANT fails, list roles: \du
-- If the role was created unquoted, it may be lowercase cooking — change below.

SELECT current_database() AS connected_database;

GRANT USAGE ON SCHEMA public TO "Cooking";

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public
  TO "Cooking";

GRANT USAGE, SELECT, UPDATE
  ON ALL SEQUENCES IN SCHEMA public
  TO "Cooking";

-- Future tables/sequences created by postgres (common after psql imports)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "Cooking";
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO "Cooking";
