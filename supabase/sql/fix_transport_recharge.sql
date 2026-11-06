-- Run in Supabase SQL Editor to repair demo transport top-ups.
-- The PayID demo card is only validated; it is never charged or locked for update.
create or replace function public.payid_recharge_transport(
  p_transport_card_id uuid,
  p_payment_card_id uuid,
  p_amount numeric
)
returns public.transport_transactions
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_transport_card public.transport_cards%rowtype;
  v_transaction public.transport_transactions%rowtype;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 1000 then raise exception 'Invalid recharge amount'; end if;

  perform 1 from public.payment_cards
    where id = p_payment_card_id and user_id = v_user_id and is_demo = true;
  if not found then raise exception 'Payment card not found'; end if;

  select * into v_transport_card from public.transport_cards
    where id = p_transport_card_id and user_id = v_user_id for update;
  if not found then raise exception 'Transport card not found'; end if;

  update public.transport_cards
    set balance = balance + p_amount, last_recharge_at = now()
    where id = v_transport_card.id;
  insert into public.transport_transactions (user_id, transport_card_id, payment_card_id, amount, status, reference)
    values (v_user_id, v_transport_card.id, p_payment_card_id, p_amount, 'simulated', gen_random_uuid()::text)
    returning * into v_transaction;
  return v_transaction;
end;
$$;

revoke all on function public.payid_recharge_transport(uuid, uuid, numeric) from public, anon;
grant execute on function public.payid_recharge_transport(uuid, uuid, numeric) to authenticated;
