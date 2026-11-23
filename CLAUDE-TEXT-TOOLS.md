# Text tools for Claude

Directions for Claude sessions working in this repository. Three skills are
installed as project skills under `.claude/skills/`. Use them only on the shop
owner's own content: product descriptions, collection texts, blog posts,
product photos and documents for this store.

## Installed skills

| Skill | Source | What it does | Needs the service? |
| --- | --- | --- | --- |
| `humanizer` | [blader/humanizer](https://github.com/blader/humanizer) (MIT) | Rewrites AI-sounding prose so it reads naturally. The meaning stays the same. | No |
| `clean-user-facing-text` | [guillaumemeyer/watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover) (MIT) | Removes invisible Unicode, odd spaces and similar characters from text. Bundles its own scripts. | No |
| `remove-ai-marks` | same repository | Text cleaning plus metadata removal (C2PA, EXIF, XMP, document properties) from images, PDFs and Office files. | Yes |

## Typical workflow for shop texts

1. Run `/humanizer` on the text to fix the style: em dashes, "not X but Y"
   phrasing, filler, sales clichés.
2. Run `/clean-user-facing-text` on the result to strip invisible characters.
3. Return the final text to the user. If it goes into the theme, edit the
   relevant file under `sections/`, `snippets/`, `templates/` or `locales/`.

For product photos or documents, use `/remove-ai-marks`. That skill needs the
HTTP service below.

## Starting the `remove-ai-marks` service

The skill is a thin client. It calls an HTTP service from the
watermarks-remover repository, and that repository is **not** part of this
project, so clone it first in each new cloud session:

```bash
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/guillaumemeyer/watermarks-remover ~/watermarks-remover
python3 ~/watermarks-remover/service/scripts/server.py --host 127.0.0.1 --port 8765
```

Run the server in the background. Then check it with
`curl -sf http://127.0.0.1:8765/health`. If it runs somewhere else, set
`WATERMARKS_SERVICE_URL`.

## Limits (tell the user when relevant)

- Removing invisible characters and file metadata is reliable.
- Statistical text watermarks (for example SynthID) are only weakened by
  rewriting. They are never guaranteed to be gone.
- Watermarks embedded in image pixels are not removed by stripping metadata.
- Neither tool promises to get past AI detectors. Do not present the output as
  "undetectable".

## Ground rules

- Only process content the shop owner created or owns.
- Do not use these tools to pass off AI-generated content as human-written
  where disclosure is required, or to strip marks from other people's content.

## Updating

Re-copy `SKILL.md` from the humanizer repository. For the watermarks-remover
skills, run
`python3 install_skill.py --skill <name> --target claude-project --project-dir <this repo> --force`.
