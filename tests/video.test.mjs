import test from 'node:test';
import assert from 'node:assert/strict';
import { extractYouTubeId, getVideoEmbedUrl } from '../src/ui.js';
import { PLAN } from '../src/plan.js';
const id = 'uhghy9pFIPY';
const origin = 'https://quantotanto2001-bit.github.io';

test('desktop, mobile, shared, Shorts, Live and existing embed URLs resolve', () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${id}&feature=share`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://youtube.com/live/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
  ]) assert.equal(extractYouTubeId(url), id, url);
});

test('search pages, playlists, malformed IDs, lookalike domains and protocols are rejected', () => {
  for (const url of [
    'https://youtube.com/results?search_query=squats',
    'https://youtube.com/playlist?list=PL123',
    'https://youtube.com/watch?v=invalid',
    `https://youtube.com.evil.example/watch?v=${id}`,
    `https://youtu.be.evil.example/${id}`,
    `ftp://youtube.com/watch?v=${id}`,
    'javascript:alert(1)', 'not-a-url',
  ]) assert.equal(extractYouTubeId(url), null, url);
});

test('iPhone inline player retains workout chapter bounds and origin', () => {
  const url = new URL(getVideoEmbedUrl({ url: `https://youtube.com/watch?v=${id}`, startSec: 82, endSec: 264 }, origin));
  assert.equal(url.hostname, 'www.youtube-nocookie.com');
  assert.equal(url.searchParams.get('playsinline'), '1');
  assert.equal(url.searchParams.get('origin'), origin);
  assert.equal(url.searchParams.get('start'), '82');
  assert.equal(url.searchParams.get('end'), '264');
});

test('timestamps in shared URLs are respected; invalid end bounds are omitted', () => {
  const url = new URL(getVideoEmbedUrl({ url: `https://youtu.be/${id}?t=1m22s`, endSec: 20 }, origin));
  assert.equal(url.searchParams.get('start'), '82');
  assert.equal(url.searchParams.has('end'), false);
  const explicit = new URL(getVideoEmbedUrl({ url: `https://youtu.be/${id}?t=82`, startSec: 0 }, origin));
  assert.equal(explicit.searchParams.has('start'), false);
});

test('all technique references now resolve to individual videos, never a search page', () => {
  const exercises = PLAN.flatMap(d => d.blocks.flatMap(b => b.exercises));
  let count = 0;
  for (const exercise of exercises) {
    if (!exercise.video || exercise.video.kind === 'article') continue;
    assert.ok(getVideoEmbedUrl(exercise.video, origin), exercise.id);
    assert.ok(!exercise.video.label.startsWith('Video-Suche:'), exercise.id);
    count++;
  }
  assert.equal(count, 54);
  const article = exercises.find(e => e.id === 'di-cardio').video;
  assert.equal(article.kind, 'article');
  assert.ok(article.text.includes('60–70'));
});
