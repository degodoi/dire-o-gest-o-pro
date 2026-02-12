
-- Revoke anon access to profiles table (contains emails, phone numbers)
REVOKE ALL ON public.profiles FROM anon;

-- Revoke anon access to employees table (contains CPF, RG, addresses, etc.)
REVOKE ALL ON public.employees FROM anon;
