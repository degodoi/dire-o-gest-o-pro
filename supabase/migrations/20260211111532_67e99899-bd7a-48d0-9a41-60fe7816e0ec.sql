
-- Create lessons table
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 50,
  type TEXT NOT NULL DEFAULT 'pratica' CHECK (type IN ('pratica', 'prova')),
  instructor_id UUID NOT NULL REFERENCES public.employees(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada', 'cancelada', 'reagendada')),
  value NUMERIC NOT NULL DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Staff can view all lessons
CREATE POLICY "Staff can view lessons"
ON public.lessons FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role)
);

-- Instructors can view own lessons
CREATE POLICY "Instructors can view own lessons"
ON public.lessons FOR SELECT
USING (
  has_role(auth.uid(), 'instrutor'::app_role) AND
  instructor_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
);

-- Staff can insert lessons
CREATE POLICY "Staff can insert lessons"
ON public.lessons FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role)
);

-- Staff can update lessons
CREATE POLICY "Staff can update lessons"
ON public.lessons FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'secretaria'::app_role)
);

-- Admins can delete lessons
CREATE POLICY "Admins can delete lessons"
ON public.lessons FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for lessons
ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;
