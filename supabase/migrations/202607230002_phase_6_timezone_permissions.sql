-- Allow authenticated writes to invoke the pure timezone lookup used by
-- trip and activity validation triggers. Public and anon remain revoked.

revoke all on function private.is_valid_timezone(text) from public, anon;
grant execute on function private.is_valid_timezone(text) to authenticated;

comment on function private.is_valid_timezone(text) is
  'Validates an IANA timezone name for authenticated trip and activity writes.';
