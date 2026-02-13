
-- Add lesson quota columns to students table
ALTER TABLE public.students
  ADD COLUMN max_lessons_a integer NOT NULL DEFAULT 0,
  ADD COLUMN max_lessons_b integer NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.students.max_lessons_a IS 'Quantidade máxima de aulas práticas categoria A (moto)';
COMMENT ON COLUMN public.students.max_lessons_b IS 'Quantidade máxima de aulas práticas categoria B (carro)';
