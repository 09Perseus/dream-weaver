-- Drop the existing ALL policy that covers insert/select already
-- and add specific granular policies for orders

-- Users can read their own orders
CREATE POLICY "Users can read their own orders"
ON public.orders FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own orders  
CREATE POLICY "Users can insert their own orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());