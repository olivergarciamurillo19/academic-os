-- Migration: Enable required Postgres extensions
-- Reversible: drop extension if exists (below in down comment)

-- UP
create extension if not exists "pgcrypto"   with schema extensions;
create extension if not exists "uuid-ossp"  with schema extensions;
create extension if not exists "vector"     with schema extensions;
create extension if not exists "pg_cron"    with schema cron;
create extension if not exists "pg_net"     with schema extensions;

-- DOWN (run manually to revert):
-- drop extension if exists "pg_net";
-- drop extension if exists "pg_cron";
-- drop extension if exists "vector";
-- drop extension if exists "uuid-ossp";
-- drop extension if exists "pgcrypto";
