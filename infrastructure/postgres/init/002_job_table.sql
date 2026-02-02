create table if not exists jobs (
  id serial primary key,

  video_id text not null unique,
  video_key text not null,

  status text not null
    check (status in (
      'QUEUED_EXTRACT',
      'RUNNING_EXTRACT',
      'EXTRACTION_COMPLETE',
      'RUNNING_INFER',
      'DONE',
      'FAILED'
    )),

  frames_prefix text,
  result_key text,

  error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
