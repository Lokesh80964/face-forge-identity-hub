
-- Create table for face registrations
CREATE TABLE public.face_registrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    face_encoding TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.face_registrations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (can be restricted later for auth)
CREATE POLICY "Allow all operations on face_registrations" 
    ON public.face_registrations 
    FOR ALL 
    USING (true) 
    WITH CHECK (true);
