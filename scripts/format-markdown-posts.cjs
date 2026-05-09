/**
 * 仅整理标题行：去掉开头的「一、」「二、」…「十、」等中文序号
 * - 不删除、不修改任何图片语法（![...](...)），包括 CSDN 占位图也不动
 * - 不改动「1. 」「(1)」「①」等正文/非「中文顿号章节」标题（若需再单独说）
 * - 不改 front matter
 */
'use strict';

const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'source', '_posts');

function splitFrontMatter(raw) {
  if (!raw.startsWith('---')) {
    return { front: '', body: raw };
  }
  const endFm = raw.indexOf('\n---\n', 3);
  if (endFm === -1) {
    const endFm2 = raw.indexOf('\r\n---\r\n', 3);
    if (endFm2 === -1) return { front: '', body: raw };
    return { front: raw.slice(0, endFm2 + 7), body: raw.slice(endFm2 + 7) };
  }
  return { front: raw.slice(0, endFm + 5), body: raw.slice(endFm + 5) };
}

function formatBody(body) {
  const lines = body.split(/\r?\n/);
  const out = [];

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith('#')) {
      out.push(line);
      continue;
    }

    let h = line.replace(/^(#{1,6})[ \t]{2,}/, '$1 ');
    h = h.replace(/^(#{1,6})\s*[一二三四五六七八九十百千]+、\s*(.*)$/, '$1 $2');
    out.push(h);
  }

  return out.join('\n');
}

function run() {
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith('.md'));
  for (const f of files) {
    const fp = path.join(postsDir, f);
    const raw = fs.readFileSync(fp, 'utf8');
    const { front, body } = splitFrontMatter(raw);
    const newBody = formatBody(body);
    const next = front + newBody;
    if (next !== raw) {
      fs.writeFileSync(fp, next, 'utf8');
      console.log('updated:', f);
    } else {
      console.log('skip (no change):', f);
    }
  }
}

run();
