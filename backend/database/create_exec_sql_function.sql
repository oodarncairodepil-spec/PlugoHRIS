-- Create an RPC function to execute arbitrary SQL via Supabase
-- WARNING: Use only in secure environments with service role key
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result text := 'ok';
BEGIN
  EXECUTE sql_query;
  RETURN result;
END;
$$;

ALTER FUNCTION public.exec_sql(sql_query text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.exec_sql(sql_query text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_sql(sql_query text) TO service_role;