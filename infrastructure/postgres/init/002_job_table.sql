create table if not exists users (
  id text primary key,
  name text,
  length int
);

create table if not exists videos (
  id text primary key,
  created_by text references users(id),
  name text,
  extension text,
  video_key text not null,

  status text not null
    check (status in (
      'UPLOAD_COMPLETE',
      'EXTRACTING',
      'PROCESSING',
      'DONE',
      'FAILED'
    )),

  frames_prefix text,
  result_key text,

  error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_videos_status_created_at on videos(status, created_at);
create index if not exists idx_videos_status_updated_at on videos(status, updated_at);