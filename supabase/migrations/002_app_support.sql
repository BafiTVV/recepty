-- Run this migration in Supabase SQL Editor AFTER the first setup SQL.
-- Allows shared editors to update recipe fields without changing ownership.
CREATE OR REPLACE FUNCTION public.prevent_recipe_owner_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Recipe ownership cannot be changed.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_recipe_owner_change_trigger ON public.recipes;
CREATE TRIGGER prevent_recipe_owner_change_trigger
BEFORE UPDATE ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.prevent_recipe_owner_change();

DROP POLICY IF EXISTS "Update own recipes" ON public.recipes;
DROP POLICY IF EXISTS "Update editable recipes" ON public.recipes;
CREATE POLICY "Update editable recipes"
ON public.recipes
FOR UPDATE
TO authenticated
USING (public.can_edit_recipe(id))
WITH CHECK (public.can_edit_recipe(id));

-- A safe, authenticated-only overview of shares for the current user.
-- This also returns the recipe title for pending invitations, without
-- granting access to the recipe itself before the invitation is accepted.
CREATE OR REPLACE FUNCTION public.get_my_recipe_shares()
RETURNS TABLE (
  id UUID,
  recipe_id UUID,
  recipe_title TEXT,
  owner_id UUID,
  user_id UUID,
  role TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  direction TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.recipe_id,
    r.title AS recipe_title,
    s.owner_id,
    s.user_id,
    s.role,
    s.status,
    s.created_at,
    CASE WHEN s.user_id = auth.uid() THEN 'incoming' ELSE 'outgoing' END AS direction
  FROM public.recipe_shares s
  JOIN public.recipes r ON r.id = s.recipe_id
  WHERE s.owner_id = auth.uid() OR s.user_id = auth.uid()
  ORDER BY s.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_my_recipe_shares() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_recipe_shares() TO authenticated;
