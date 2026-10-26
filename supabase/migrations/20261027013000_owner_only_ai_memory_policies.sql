-- Keep the existing tables and data.
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_memory ENABLE ROW LEVEL SECURITY;

-- Remove the existing shop-only policies.
DROP POLICY IF EXISTS "Isolate chat memory"
ON public.ai_chat_messages;

DROP POLICY IF EXISTS "Isolate business memory"
ON public.business_memory;

-- Make the migration safe to rerun.
DROP POLICY IF EXISTS "Owner only chat memory"
ON public.ai_chat_messages;

DROP POLICY IF EXISTS "Owner only business memory"
ON public.business_memory;

-- Only authenticated owners can access their shop's chat history.
CREATE POLICY "Owner only chat memory"
ON public.ai_chat_messages
FOR ALL
TO authenticated
USING (
  client_id = public.get_current_client_id()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'owner'
  )
)
WITH CHECK (
  client_id = public.get_current_client_id()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'owner'
  )
);

-- Only authenticated owners can access their shop's business memory.
CREATE POLICY "Owner only business memory"
ON public.business_memory
FOR ALL
TO authenticated
USING (
  client_id = public.get_current_client_id()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'owner'
  )
)
WITH CHECK (
  client_id = public.get_current_client_id()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'owner'
  )
);