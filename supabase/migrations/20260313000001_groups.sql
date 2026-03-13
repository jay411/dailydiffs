-- Groups feature migration
-- Creates groups and group_members tables with RLS policies

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  invite_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(encode(gen_random_bytes(4), 'hex'), 1, 8)),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON group_members(user_id);
CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON group_members(group_id);
CREATE INDEX IF NOT EXISTS groups_invite_code_idx ON groups(invite_code);

-- RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Groups: anyone can read (for joining via invite code), authenticated users can create
CREATE POLICY "groups_select_public" ON groups FOR SELECT USING (true);
CREATE POLICY "groups_insert_auth" ON groups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Group members: members can view their own groups; authenticated users can join
CREATE POLICY "group_members_select_member" ON group_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR group_id IN (
      SELECT group_id FROM group_members gm WHERE gm.user_id = auth.uid()
    )
  );
CREATE POLICY "group_members_insert_auth" ON group_members
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "group_members_delete_own" ON group_members
  FOR DELETE USING (user_id = auth.uid());
