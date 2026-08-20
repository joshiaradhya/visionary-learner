-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  xp int NOT NULL DEFAULT 0,
  streak int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  last_active_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- LESSONS
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL CHECK (language IN ('ASL','ISL')),
  title text NOT NULL,
  description text,
  order_index int NOT NULL,
  mindmap_mermaid text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_public_read" ON public.lessons FOR SELECT USING (true);

-- SIGNS
CREATE TABLE public.signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  gloss text NOT NULL,
  category text,
  description text,
  reference_clip_url text,
  dataset_source text CHECK (dataset_source IN ('ASLLVD','INCLUDE')),
  difficulty text NOT NULL DEFAULT 'Beginner',
  order_index int NOT NULL
);
GRANT SELECT ON public.signs TO anon, authenticated;
GRANT ALL ON public.signs TO service_role;
ALTER TABLE public.signs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signs_public_read" ON public.signs FOR SELECT USING (true);

-- REFERENCE LANDMARKS
CREATE TABLE public.reference_landmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sign_id uuid NOT NULL REFERENCES public.signs(id) ON DELETE CASCADE,
  landmark_sequence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reference_landmarks TO anon, authenticated;
GRANT INSERT ON public.reference_landmarks TO authenticated;
GRANT ALL ON public.reference_landmarks TO service_role;
ALTER TABLE public.reference_landmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_landmarks_public_read" ON public.reference_landmarks FOR SELECT USING (true);
CREATE POLICY "ref_landmarks_insert_auth" ON public.reference_landmarks FOR INSERT TO authenticated WITH CHECK (true);

-- QUIZ QUESTIONS
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quiz_questions TO anon, authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_questions_public_read" ON public.quiz_questions FOR SELECT USING (true);

-- ATTEMPTS
CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sign_id uuid REFERENCES public.signs(id) ON DELETE SET NULL,
  matched_sign_id uuid REFERENCES public.signs(id) ON DELETE SET NULL,
  confidence double precision,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_own" ON public.attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- QUIZ RESULTS
CREATE TABLE public.quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_results TO authenticated;
GRANT ALL ON public.quiz_results TO service_role;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_results_own" ON public.quiz_results FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ROOMS
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'open',
  conversation_prompt text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms_public_read" ON public.rooms FOR SELECT USING (true);

-- ROOM PARTICIPANTS
CREATE TABLE public.room_participants (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.room_participants TO authenticated;
GRANT ALL ON public.room_participants TO service_role;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_participants_read_auth" ON public.room_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "room_participants_write_own" ON public.room_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "room_participants_delete_own" ON public.room_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- REPORTS
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_own" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- SEED
INSERT INTO public.lessons (id, language, title, description, order_index, mindmap_mermaid) VALUES
('11111111-1111-1111-1111-111111111111','ASL','Greetings & Courtesy','Core expressions you will use in the first ten seconds of any conversation.',1,
'mindmap
  root((Greetings))
    Openers
      HELLO
      NICE TO MEET YOU
    Courtesy
      THANK YOU
      PLEASE
      SORRY
    Responses
      YES
      NO
    Closers
      GOODBYE'),
('22222222-2222-2222-2222-222222222222','ISL','Everyday Basics','Common ISL signs for daily interaction, drawn from the INCLUDE dataset.',2,
'mindmap
  root((Everyday ISL))
    People
      FRIEND
      FAMILY
    Needs
      WATER
      FOOD
      HELP
    Courtesy
      THANK YOU
      NAMASTE');

INSERT INTO public.signs (lesson_id, gloss, category, description, dataset_source, difficulty, order_index) VALUES
('11111111-1111-1111-1111-111111111111','HELLO','Greeting','An open flat hand starts at the forehead and moves outward and away, like a relaxed salute.','ASLLVD','Beginner',1),
('11111111-1111-1111-1111-111111111111','THANK YOU','Gratitude','A flat hand moves outward from the chin. It is a single, clear motion demonstrating gratitude. Ensure your facial expression matches the sentiment.','ASLLVD','Beginner',2),
('11111111-1111-1111-1111-111111111111','PLEASE','Request','A flat open palm rests on the chest and moves in a smooth clockwise circle.','ASLLVD','Beginner',3),
('11111111-1111-1111-1111-111111111111','YES','Confirmation','A closed fist bobs up and down at the wrist, like a nodding head.','ASLLVD','Beginner',4),
('11111111-1111-1111-1111-111111111111','NO','Confirmation','Index and middle finger tap the thumb once, snapping closed.','ASLLVD','Beginner',5),
('11111111-1111-1111-1111-111111111111','SORRY','Courtesy','A closed fist circles over the chest with an apologetic expression.','ASLLVD','Intermediate',6),
('11111111-1111-1111-1111-111111111111','HELP','Support','A closed fist with the thumb up rests on the flat opposite palm; both hands lift together.','ASLLVD','Intermediate',7),
('11111111-1111-1111-1111-111111111111','GOODBYE','Closing','Fingers fold down toward the palm twice in a small wave.','ASLLVD','Beginner',8);

INSERT INTO public.signs (lesson_id, gloss, category, description, dataset_source, difficulty, order_index) VALUES
('22222222-2222-2222-2222-222222222222','NAMASTE','Greeting','Both palms join in front of the chest with a slight bow of the head.','INCLUDE','Beginner',1),
('22222222-2222-2222-2222-222222222222','THANK YOU','Gratitude','Joined palms move slightly forward from the chest with a nod.','INCLUDE','Beginner',2),
('22222222-2222-2222-2222-222222222222','WATER','Needs','A cupped hand moves toward the mouth as if drinking.','INCLUDE','Beginner',3),
('22222222-2222-2222-2222-222222222222','FOOD','Needs','Pinched fingertips move toward the mouth twice.','INCLUDE','Beginner',4),
('22222222-2222-2222-2222-222222222222','HELP','Support','One flat palm lifts the other closed hand upward.','INCLUDE','Intermediate',5),
('22222222-2222-2222-2222-222222222222','FRIEND','People','Index fingers hook together and swap positions.','INCLUDE','Intermediate',6),
('22222222-2222-2222-2222-222222222222','FAMILY','People','Both hands form circles that sweep outward and meet again.','INCLUDE','Intermediate',7);

INSERT INTO public.quiz_questions (lesson_id, prompt, options, correct_index) VALUES
('11111111-1111-1111-1111-111111111111','Which sign starts with a flat hand at the chin and moves outward?','["HELLO","THANK YOU","YES","NO"]'::jsonb,1),
('11111111-1111-1111-1111-111111111111','Which sign uses a closed fist bobbing at the wrist?','["PLEASE","GOODBYE","YES","SORRY"]'::jsonb,2),
('11111111-1111-1111-1111-111111111111','Which sign circles a flat palm on the chest?','["PLEASE","HELP","NO","HELLO"]'::jsonb,0),
('22222222-2222-2222-2222-222222222222','Which ISL sign joins both palms in front of the chest?','["WATER","NAMASTE","FOOD","FRIEND"]'::jsonb,1),
('22222222-2222-2222-2222-222222222222','Which sign brings a cupped hand toward the mouth?','["FOOD","HELP","WATER","FAMILY"]'::jsonb,2),
('22222222-2222-2222-2222-222222222222','Which sign hooks the index fingers together?','["FRIEND","FAMILY","THANK YOU","NAMASTE"]'::jsonb,0);

INSERT INTO public.rooms (slug, status, conversation_prompt) VALUES
('demo','open','Introduce yourself, then ask your partner what they learned today.');