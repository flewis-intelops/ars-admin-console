
revoke execute on function public.current_handler_id() from public, anon;
revoke execute on function public.register_source(text,date,text,text,public.source_type,text,text) from public, anon;
grant execute on function public.current_handler_id() to authenticated;
