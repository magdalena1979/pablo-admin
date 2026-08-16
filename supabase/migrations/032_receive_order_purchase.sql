create or replace function public.receive_purchase_request(p_request_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_request public.purchase_requests;v_input public.work_order_inputs;v_reserve numeric;
begin
  select * into v_request from public.purchase_requests where id=p_request_id for update;
  if v_request.id is null or v_request.item_id is null or not public.can_manage_farm(v_request.farm_id) then raise exception 'Solicitud inválida' using errcode='42501';end if;
  if v_request.status in('recibida','anulada') then raise exception 'La solicitud ya está cerrada';end if;
  insert into public.inventory_movements(item_id,movement_date,movement_type,quantity,concept,reference,work_order_id,created_by)
  values(v_request.item_id,current_date,'ingreso',v_request.quantity,'Recepción de compra para '||v_request.item_name,'Solicitud de compra',v_request.work_order_id,auth.uid());
  if v_request.work_order_id is not null then
    select * into v_input from public.work_order_inputs where work_order_id=v_request.work_order_id and item_id=v_request.item_id for update;
    if v_input.id is not null then
      v_reserve:=least(v_request.quantity,greatest(v_input.required_quantity-v_input.reserved_quantity,0));
      if v_reserve>0 then
        insert into public.inventory_movements(item_id,movement_date,movement_type,quantity,concept,reference,work_order_id,created_by)
        values(v_request.item_id,current_date,'reserva',v_reserve,'Reserva de compra recibida para orden','Solicitud de compra',v_request.work_order_id,auth.uid());
        update public.work_order_inputs set reserved_quantity=reserved_quantity+v_reserve where id=v_input.id;
      end if;
    end if;
  end if;
  update public.purchase_requests set status='recibida' where id=v_request.id;
end;$$;
grant execute on function public.receive_purchase_request(uuid) to authenticated;
