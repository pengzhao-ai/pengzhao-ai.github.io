import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';

import {
  classify,
  copyPostImage,
  decideDraft,
  deriveExcerpt,
  deriveTags,
  deriveTitle,
  humanize,
  main,
  maskFences,
  parseSource,
  planSync,
  renderPost,
  slugifyTitle,
  stripInline,
} from '../sync-posts.mjs';

describe('parseSource', () => {
  test('splits frontmatter from body', () => {
    const { frontmatter, body } = parseSource('---\ntitle: Hello\n---\n\nBody text.\n');
    assert.equal(frontmatter.title, 'Hello');
    assert.equal(body.trim(), 'Body text.');
  });

  test('returns an empty frontmatter object when there is none', () => {
    const { frontmatter, body } = parseSource('# Hi\n\nBody.\n');
    assert.deepEqual(frontmatter, {});
    assert.equal(body.trim(), '# Hi\n\nBody.');
  });

  test('rejects a non-mapping frontmatter block', () => {
    assert.throws(() => parseSource('---\n- just\n- a list\n---\nBody'), /mapping/i);
  });
});

describe('maskFences', () => {
  test('blanks fenced code but preserves length and line count', () => {
    const input = 'before\n```sh\n# not a title\necho hi\n```\nafter';
    const masked = maskFences(input);
    assert.equal(masked.length, input.length);
    assert.equal(masked.split('\n').length, input.split('\n').length);
    assert.ok(!masked.includes('not a title'));
  });

  test('leaves the fence delimiter lines in place', () => {
    const masked = maskFences('```\nx\n```');
    assert.ok(masked.startsWith('```'));
    assert.ok(masked.endsWith('```'));
  });
});

describe('deriveTitle', () => {
  // Review Focus #1: a "#" inside a fenced block must never become the title.
  test('ignores a # line inside a fenced code block', () => {
    const body = 'Intro paragraph.\n\n```python\n# compute the wavefront\nresult = 1\n```\n';
    const { title } = deriveTitle(body, 'wavefront-notes.md');
    assert.equal(title, 'Wavefront Notes');
  });

  test('uses a fenced block title as the title when it is the real H1', () => {
    const body = '# Real Title\n\n```sh\n# still a comment\n```\n';
    const { title } = deriveTitle(body, 'whatever.md');
    assert.equal(title, 'Real Title');
  });

  test('removes the H1 from the body it returns', () => {
    const { body } = deriveTitle('# Real Title\n\nBody text.\n', 'x.md');
    assert.ok(!body.includes('# Real Title'));
    assert.ok(body.includes('Body text.'));
  });

  test('falls back to a humanised filename when there is no H1', () => {
    const { title } = deriveTitle('Just prose.\n', 'my_cool_post.md');
    assert.equal(title, 'My Cool Post');
  });

  test('strips inline markdown from the title', () => {
    const { title } = deriveTitle('# **Bold** and `code`\n\nBody', 'x.md');
    assert.equal(title, 'Bold and code');
  });
});

describe('humanize', () => {
  test('title-cases a kebab-case filename', () => {
    assert.equal(humanize('edge-ai-on-device.md'), 'Edge Ai On Device');
  });
});

describe('stripInline', () => {
  test('unwraps links, code, emphasis, and HTML', () => {
    assert.equal(
      stripInline('a [link](https://x) and `code` and **bold** and <b>tag</b>'),
      'a link and code and bold and tag'
    );
  });
});

describe('deriveExcerpt', () => {
  test('takes the first real paragraph, skipping headings and lists', () => {
    const body = '# Title\n\n- a list item\n\nThis is the actual first paragraph.\n\nSecond.';
    assert.equal(deriveExcerpt(body), 'This is the actual first paragraph.');
  });

  test('never exceeds the character cap', () => {
    const body = 'word '.repeat(100);
    assert.ok(deriveExcerpt(body, 155).length <= 155);
  });

  test('truncates on a word boundary rather than mid-word', () => {
    const body = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet';
    const out = deriveExcerpt(body, 25);
    assert.ok(out.length <= 25);
    assert.ok(!out.endsWith(' '));
    assert.ok(body.startsWith(out), `"${out}" must be a prefix of the source`);
  });

  test('ignores a paragraph that only exists inside a code fence', () => {
    const body = '```\nnot the excerpt\n```\n\nThe real one.';
    assert.equal(deriveExcerpt(body), 'The real one.');
  });
});

describe('deriveTags', () => {
  test('matches whole words only, so "html" does not match "ml"', () => {
    assert.deepEqual(deriveTags('We wrote some html today.'), ['Engineering']);
  });

  test('matches a standalone acronym case-insensitively', () => {
    assert.ok(deriveTags('Trained an ML model.').includes('Edge AI'));
  });

  test('returns multiple tags in vocabulary order', () => {
    const tags = deriveTags('The optical sensor module needed a calibration framework.');
    assert.deepEqual(tags, ['Optics', 'Hardware', 'System Design']);
  });

  test('falls back to Engineering when nothing matches', () => {
    assert.deepEqual(deriveTags('Nothing relevant here at all.'), ['Engineering']);
  });
});

describe('decideDraft', () => {
  test('marks an underscore-prefixed file as a draft', () => {
    assert.equal(decideDraft('_wip.md'), true);
  });

  test('marks a file containing "draft" as a draft', () => {
    assert.equal(decideDraft('my-draft-post.md'), true);
  });

  test('leaves an ordinary file publishable', () => {
    assert.equal(decideDraft('welcome.md'), false);
  });
});

describe('classify', () => {
  // Review Focus #4: a hand-edited target must never be silently clobbered.
  test('conflicts when the target was hand-edited', () => {
    assert.equal(
      classify({
        targetExists: true,
        recordedTargetHash: 'aaa',
        currentTargetHash: 'bbb',
        sourceChanged: true,
        force: false,
      }),
      'conflict'
    );
  });

  test('overwrites a hand-edited target when forced', () => {
    assert.equal(
      classify({
        targetExists: true,
        recordedTargetHash: 'aaa',
        currentTargetHash: 'bbb',
        sourceChanged: true,
        force: true,
      }),
      'update'
    );
  });

  // The CLI's own conflict hint says "--force ... will overwrite"; it must
  // not depend on the source having changed, or the conflict never clears.
  test('overwrites a hand-edited target when forced even if the source is unchanged', () => {
    assert.equal(
      classify({
        targetExists: true,
        recordedTargetHash: 'aaa',
        currentTargetHash: 'bbb',
        sourceChanged: false,
        force: true,
      }),
      'update'
    );
  });

  test('skips when nothing changed', () => {
    assert.equal(
      classify({
        targetExists: true,
        recordedTargetHash: 'aaa',
        currentTargetHash: 'aaa',
        sourceChanged: false,
        force: false,
      }),
      'skip'
    );
  });

  test('updates when the source changed and the target is untouched', () => {
    assert.equal(
      classify({
        targetExists: true,
        recordedTargetHash: 'aaa',
        currentTargetHash: 'aaa',
        sourceChanged: true,
        force: false,
      }),
      'update'
    );
  });

  test('creates when the target does not exist', () => {
    assert.equal(classify({ targetExists: false, sourceChanged: true, force: false }), 'create');
  });

  test('treats an untracked existing target as hand-edited', () => {
    assert.equal(
      classify({
        targetExists: true,
        recordedTargetHash: undefined,
        currentTargetHash: 'bbb',
        sourceChanged: true,
        force: false,
      }),
      'conflict'
    );
  });
});

describe('copyPostImage', () => {
  // The inferred `image:` frontmatter points into src/assets/images/posts/,
  // so the companion file beside the draft has to actually land there.
  test('copies a companion image into the destination directory', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'post-image-'));
    try {
      const src = path.join(dir, 'shot.jpg');
      await writeFile(src, 'fake-jpeg-bytes');

      const dest = await copyPostImage(src, path.join(dir, 'out'));

      assert.equal(path.basename(dest), 'shot.jpg');
      assert.equal(await readFile(dest, 'utf8'), 'fake-jpeg-bytes');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('renderPost', () => {
  test('is deterministic for identical input', () => {
    const post = {
      title: 'Hi',
      publishDate: new Date('2026-10-09T00:00:00.000Z'),
      excerpt: 'Short.',
      tags: ['Optics'],
      category: 'Optics',
      author: 'Peng Zhao',
      draft: false,
      body: 'Body.',
    };
    assert.equal(renderPost(post), renderPost(post));
  });

  test('emits frontmatter Astro can parse, with the body after it', () => {
    const out = renderPost({
      title: 'Hi',
      publishDate: new Date('2026-10-09T00:00:00.000Z'),
      excerpt: 'Short.',
      tags: ['Optics'],
      category: 'Optics',
      author: 'Peng Zhao',
      draft: false,
      body: 'Body.',
    });
    assert.ok(out.startsWith('---\n'));
    const [fm] = out.split('\n---\n');
    assert.ok(fm.includes('title: Hi'));
    assert.ok(out.endsWith('Body.\n'));
  });
});

describe('slugifyTitle', () => {
  // Spec §6.3: kebab-case via limax with pinyin tone disabled.
  test('transliterates CJK titles without tone numbers', () => {
    assert.equal(slugifyTitle('荷花'), 'he-hua');
  });

  test('falls back to "post" when nothing sluggable remains', () => {
    assert.equal(slugifyTitle('🌸'), 'post');
  });
});

describe('planSync slug collisions', () => {
  // Spec §6.3: collisions within one run are suffixed -2, -3. Skipping the
  // second post would drop it from the site silently.
  test('suffixes a colliding slug instead of dropping the post', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'sync-slug-'));
    try {
      const sourcesDir = path.join(dir, 'blog');
      await mkdir(sourcesDir);
      await writeFile(path.join(sourcesDir, 'a-first.md'), '# Same Title\n\nFirst.\n');
      await writeFile(path.join(sourcesDir, 'b-second.md'), '# Same Title\n\nSecond.\n');
      await writeFile(path.join(sourcesDir, 'c-third.md'), '# Same Title\n\nThird.\n');

      const actions = await planSync({
        sourcesDir,
        targetDir: path.join(dir, 'post'),
        stateFile: path.join(dir, 'state.json'),
      });

      assert.deepEqual(
        actions.map((a) => a.slug),
        ['same-title', 'same-title-2', 'same-title-3']
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('main exit code', () => {
  // Spec §6.1: exits 0 on success, 1 on conflict (unless --force), 2 on a
  // malformed source file. The conflict case is what makes the CLI usable
  // from a pre-commit hook or CI: a hand-edited post must fail the run, not
  // merely print a warning.
  async function conflictedFixture() {
    const dir = await mkdtemp(path.join(tmpdir(), 'sync-exit-'));
    const sourcesDir = path.join(dir, 'blog');
    const targetDir = path.join(dir, 'post');
    const stateFile = path.join(dir, 'state.json');
    await mkdir(sourcesDir);
    await mkdir(targetDir);
    await writeFile(path.join(sourcesDir, 'hello.md'), '# Hello\n\nBody.\n');
    // The target was edited by hand after the last sync: its current hash
    // no longer matches the hash recorded in the state file.
    await writeFile(path.join(targetDir, 'hello.md'), '---\ntitle: Hello\n---\n\nHand-edited.\n');
    await writeFile(
      stateFile,
      JSON.stringify({
        hello: {
          source: 'blog/hello.md',
          sourceHash: 'stale',
          target: 'post/hello.md',
          targetHash: 'stale',
        },
      })
    );
    return { dir, sourcesDir, targetDir, stateFile };
  }

  test('sets exit code 1 when the plan contains a conflict', async () => {
    const { dir, sourcesDir, targetDir, stateFile } = await conflictedFixture();
    const saved = process.exitCode;
    try {
      await main({ argv: [], sourcesDir, targetDir, stateFile });
      assert.equal(process.exitCode, 1);
    } finally {
      process.exitCode = saved === undefined ? undefined : saved;
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('leaves the exit code alone and overwrites when a conflict is forced through', async () => {
    const { dir, sourcesDir, targetDir, stateFile } = await conflictedFixture();
    const saved = process.exitCode;
    try {
      process.exitCode = undefined;
      await main({ argv: ['--force', '--write'], sourcesDir, targetDir, stateFile });
      assert.equal(process.exitCode, undefined);
      const target = await readFile(path.join(targetDir, 'hello.md'), 'utf8');
      assert.ok(!target.includes('Hand-edited.'));
      assert.ok(target.includes('Body.'));
    } finally {
      process.exitCode = saved;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
