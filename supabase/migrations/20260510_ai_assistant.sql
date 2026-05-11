-- ============================================================
-- AI Assistant — ai_conversations, ai_messages
-- Design Ref: §3 Database Schema
-- Plan SC: SC-3 (영구 저장), SC-7 (RLS)
-- ============================================================

-- 1. ai_conversations: 대화 세션 (1 user → N conversations)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text,
  archived    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_conversations_user_updated_idx
  ON public.ai_conversations (user_id, updated_at DESC);

-- 2. ai_messages: 대화의 개별 메시지 (1 conversation → N messages)
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user', 'model', 'tool')),
  content         text        NOT NULL DEFAULT '',
  tool_name       text,
  tool_args       jsonb,
  tool_result     jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_messages_conversation_created_idx
  ON public.ai_messages (conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS ai_messages_user_created_idx
  ON public.ai_messages (user_id, created_at DESC);

-- 3. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.set_ai_conversation_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER trg_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_ai_conversation_updated_at();

-- 새 메시지가 들어오면 부모 conversation의 updated_at 갱신
CREATE OR REPLACE FUNCTION public.bump_ai_conversation_on_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.ai_conversations
     SET updated_at = now()
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_messages_bump_conversation ON public.ai_messages;
CREATE TRIGGER trg_ai_messages_bump_conversation
  AFTER INSERT ON public.ai_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_ai_conversation_on_message();

-- 4. RLS — 본인 데이터만 read/write
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_conversations" ON public.ai_conversations;
CREATE POLICY "own_conversations" ON public.ai_conversations
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own_messages" ON public.ai_messages;
CREATE POLICY "own_messages" ON public.ai_messages
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. 권한 부여 (Supabase 기본 패턴)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
