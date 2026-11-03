import { boardView } from './view.js';

const marker = document.querySelector('[data-facility="board"]');
const host = document.createElement('div');
document.body.append(host);
const root = host.attachShadow({mode: 'open'});
root.innerHTML = boardView;
const $ = selector => root.querySelector(selector);
const board = $('#board');
const compose = $('#compose');
const reply = $('#reply');
const base = '/api/dungeon-breaker/board';
const labels = {party:'파티 모집',tip:'공략',free:'자유'};
const dateFormat = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit'});
let category = 'all', cursors = [0], page = 0, nextPage = null;
let postId = null, nextReplies = null, expanded = false;
let screen = 'list', version = 0, readNumber = 0, previousData = '', lastOpened = null;
let toastTimer, refreshTimer, busy = false, nickname = '';
try { nickname = localStorage.getItem('db-board-author') || ''; } catch {}

function element(tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}
function stamp(time, value) {
  const date = dateFormat.format(value);
  time.dateTime = date;
  time.textContent = date.replaceAll('-', '.');
}
async function api(path, payload) {
  let response;
  try {
    response = await fetch(base + path, {
      method: payload ? 'POST' : 'GET', cache:'no-store', signal: AbortSignal.timeout(15000),
      headers: payload ? {'Content-Type':'application/json'} : {},
      body: payload ? JSON.stringify(payload) : undefined
    });
  } catch { throw new Error('서버와 연결이 끊겼습니다. 다시 시도해 주세요.'); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !Object.keys(result).length) throw new Error(result.error || '게시판을 불러올 수 없습니다. 다시 시도해 주세요.');
  return result;
}
function notice(message, retry = true) {
  $('#notice').hidden = !message;
  $('#notice span').textContent = message;
  $('.retry').hidden = !retry;
}
function toast(message) {
  $('#status').textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#status').textContent = ''; }, 2200);
}
function emptyRow(message) {
  const cell = $('#posts').insertRow().insertCell();
  cell.colSpan = 3;
  cell.className = 'empty-row';
  cell.textContent = message;
}
function renderPosts(result) {
  const tbody = $('#posts');
  const focusedId = root.activeElement?.dataset.id;
  tbody.replaceChildren();
  $('#total').textContent = result.total + '건';
  for (const post of result.posts) {
    const row = tbody.insertRow();
    const link = element('a', '', 'subject');
    link.href = '#board/' + post.id;
    link.dataset.id = String(post.id);
    const badge = element('span', labels[post.cat], 'category');
    badge.dataset.type = post.cat;
    const subject = element('span', post.title, 'subject-text');
    if (post.replyCount) {
      const count = element('span', '[' + post.replyCount + ']', 'comments-count');
      count.setAttribute('aria-label', '답글 ' + post.replyCount + '개');
      subject.append(count);
    }
    link.append(badge, subject);
    row.insertCell().append(link);
    row.insertCell().textContent = post.author;
    const time = document.createElement('time');
    stamp(time, post.when);
    row.insertCell().append(time);
    row.onclick = event => { if (!event.target.closest('a')) link.click(); };
    if (focusedId === link.dataset.id) link.focus({preventScroll:true});
  }
  if (!result.posts.length) emptyRow('아직 등록된 글이 없습니다. 첫 글을 남겨 보세요.');
  nextPage = result.next;
  $('#prev').disabled = page === 0;
  $('#next').disabled = !nextPage;
  $('#list-pager').hidden = !page && !nextPage;
  $('#page-number').textContent = String(page + 1);
}
function showReplies(result, append) {
  const list = $('#replies');
  if (!append) list.replaceChildren();
  for (const comment of result.replies) {
    const entry = element('div', '', 'reply-entry');
    entry.append(element('b', comment.author), element('p', comment.body, 'reply-body'));
    list.append(entry);
  }
  nextReplies = result.next;
  $('#older').hidden = !nextReplies;
  $('#reply-count').textContent = String(result.replyCount);
}
async function refresh(older = false) {
  if (!board.open || screen === 'editor') return;
  const read = ++readNumber;
  const state = version;
  try {
    if (older) $('#older').disabled = true;
    const url = screen === 'list' ? '?category='+category+'&cursor='+cursors[page] : '/'+postId+'?cursor='+(older ? nextReplies : 0);
    const data = await api(url);
    if (read !== readNumber || version !== state || !board.open) return;
    notice('');
    if (!older && previousData === JSON.stringify(data)) return;
    previousData = older ? '' : JSON.stringify(data);
    if (screen === 'list') renderPosts(data);
    else {
      $('#detail-category').textContent = labels[data.cat];
      $('#detail-category').dataset.type = data.cat;
      $('#post-title').textContent = data.title;
      $('#post-author').textContent = data.author;
      stamp($('#post-date'), data.when);
      $('#post-body').textContent = data.body;
      showReplies(data, older);
      if (older) expanded = true;
      reply.hidden = false;
    }
  } catch (error) {
    if (read === readNumber && state === version) {
      notice(error.message);
      if (screen === 'list' && !previousData) { $('#posts').replaceChildren(); emptyRow('목록을 불러오지 못했습니다.'); }
      if (screen === 'detail' && reply.hidden) $('#post-title').textContent = '글을 불러오지 못했습니다.';
    }
  } finally {
    if (read === readNumber) $('#older').disabled = false;
  }
}
function backgroundRefresh() {
  if (board.open && !document.hidden && !busy && !expanded && !$('#older').disabled) refresh();
}
function resetPage() { cursors = [0]; page = 0; nextPage = null; }
function route() {
  const match = /^#board(?:\/(write|[1-9]\d{0,14}))?$/.exec(location.hash);
  version++;
  previousData = '';
  expanded = false;
  clearInterval(refreshTimer);
  if (!match) { if (board.open) board.close(); return; }
  if (!board.open) board.showModal();
  screen = match[1] === 'write' ? 'editor' : match[1] ? 'detail' : 'list';
  postId = screen === 'detail' ? Number(match[1]) : null;
  for (const name of ['list','detail','editor']) $('#'+name).hidden = name !== screen;
  notice('');
  board.scrollTop = 0;
  if (screen === 'editor') {
    compose.reset();
    compose.elements.author.value = nickname;
    compose.elements.category.value = category === 'all' ? 'free' : category;
    $('#editor h2').focus({preventScroll:true});
  } else if (screen === 'detail') {
    lastOpened = postId;
    $('#post-title').textContent = '불러오는 중…';
    for (const id of ['detail-category','post-author','post-date','post-body','reply-count','replies']) $('#'+id).replaceChildren();
    $('#older').hidden = true;
    $('#older').disabled = false;
    reply.hidden = true;
    reply.reset();
    reply.elements.author.value = nickname;
    $('#post-title').focus({preventScroll:true});
  } else {
    $('#total').textContent = '';
    $('#posts').replaceChildren(); emptyRow('목록을 불러오는 중…');
    $('#list-pager').hidden = true;
  }
  for (const button of $('#filters').children) button.setAttribute('aria-pressed', String(button.dataset.category === category));
  const state = version;
  refresh().then(() => {
    if (state === version && screen === 'list' && lastOpened) $('.subject[data-id="'+lastOpened+'"]')?.focus({preventScroll:true});
  });
  refreshTimer = setInterval(backgroundRefresh, 15000);
}
for (const link of root.querySelectorAll('[data-go]')) link.href = link.dataset.go === 'editor' ? '#board/write' : '#board';
for (const button of $('#filters').children) button.onclick = () => { category = button.dataset.category; resetPage(); lastOpened = null; route(); };
$('#prev').onclick = () => { if (page) { page--; route(); } };
$('#next').onclick = () => { if (nextPage) { cursors[++page] = nextPage; route(); } };
$('#older').onclick = () => refresh(true);
$('.retry').onclick = () => { expanded = false; refresh(); };

const attempts = new WeakMap();
function requestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
  return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
async function submit(event) {
  event.preventDefault();
  const form = event.target;
  if (busy) return;
  for (const field of form.querySelectorAll('input,textarea')) field.value = field.value.trim();
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form));
  const path = form === compose ? '' : '/'+postId+'/replies';
  const signature = path + JSON.stringify(values);
  if (attempts.get(form)?.signature !== signature) attempts.set(form, {signature, id:requestId()});
  busy = true;
  const state = version;
  const button = form.querySelector('button');
  button.disabled = true;
  notice('');
  try {
    const result = await api(path, {...values, requestId:attempts.get(form).id});
    nickname = values.author;
    try { localStorage.setItem('db-board-author',nickname); } catch {}
    attempts.delete(form);
    if (state !== version) return;
    if (form === compose) {
      if (category !== 'all') category = values.category;
      resetPage(); lastOpened = result.id;
      location.replace('#board');
      toast('글을 등록했습니다.');
    } else {
      reply.elements.body.value = '';
      expanded = false;
      await refresh();
      toast('답글을 등록했습니다.');
    }
  } catch (error) {
    if (state === version) notice(error.message, false);
  } finally {
    busy = false;
    button.disabled = false;
  }
}
compose.onsubmit = submit;
reply.onsubmit = submit;
marker.onclick = () => { location.hash = 'board'; };
$('#leave').onclick = () => {
  history.replaceState(null,'',location.pathname + location.search);
  route(); marker.focus();
};
board.oncancel = event => {
  event.preventDefault();
  if (screen === 'list') $('#leave').click(); else location.hash = 'board';
};
window.addEventListener('hashchange', route);
window.addEventListener('focus', backgroundRefresh);
document.addEventListener('visibilitychange', backgroundRefresh);
route();
