// Mounted only at /api/dungeon-breaker/board by the platform worker.
const boardRoot = '/api/dungeon-breaker/board';
const boardCategories = ['party', 'tip', 'free'];
const boardSchema = [
  `CREATE TABLE IF NOT EXISTS db_board_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL UNIQUE,
    cat TEXT NOT NULL, author TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
    created INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS db_board_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL UNIQUE,
    post_id INTEGER NOT NULL REFERENCES db_board_posts(id) ON DELETE CASCADE,
    author TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS db_board_by_category ON db_board_posts(cat,id)',
  'CREATE INDEX IF NOT EXISTS db_board_by_post ON db_board_replies(post_id,id)',
  'CREATE TABLE IF NOT EXISTS db_board_limits (client TEXT PRIMARY KEY, expires INTEGER NOT NULL, n INTEGER NOT NULL)',
  'CREATE INDEX IF NOT EXISTS db_board_by_expiry ON db_board_limits(expires)'
];
let boardReady;
function initBoard(db) {
  if (!boardReady) boardReady = db.batch(boardSchema.map(sql => db.prepare(sql))).catch(error => {
    boardReady = null;
    throw error;
  });
  return boardReady;
}

class BoardError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function boardResponse(status, data) {
  return Response.json(data, {status, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
}
function boardField(input, key, max) {
  const value = typeof input?.[key] === 'string' ? input[key].trim() : '';
  if (!value || value.length > max) throw new BoardError(400, '입력한 내용과 글자 수를 확인해 주세요.');
  return value;
}
async function boardInput(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new BoardError(415, 'JSON으로 전송해 주세요.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new BoardError(400, '요청이 비어 있습니다.');
  const buffer = new Uint8Array(8192);
  let size = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    if (size + value.length > buffer.length) {
      await reader.cancel();
      throw new BoardError(413, '입력한 내용이 너무 깁니다.');
    }
    buffer.set(value, size);
    size += value.length;
  }
  try { return JSON.parse(new TextDecoder().decode(buffer.subarray(0, size))); }
  catch { throw new BoardError(400, '요청을 읽을 수 없습니다.'); }
}
function boardCursor(params) {
  const value = params.get('cursor') || '0';
  if (!/^\d{1,15}$/.test(value)) throw new BoardError(400, '잘못된 페이지입니다.');
  return Number(value);
}
async function boardList(db, params) {
  const cursor = boardCursor(params);
  const category = params.get('category') || 'all';
  if (category !== 'all' && !boardCategories.includes(category)) throw new BoardError(400, '잘못된 분류입니다.');
  const where = category === 'all' ? 'WHERE 1=1' : 'WHERE cat=?';
  const args = category === 'all' ? [] : [category];
  const list = db.prepare(`SELECT id, cat, author, title, created AS "when",
    (SELECT count(*) FROM db_board_replies WHERE post_id=p.id) AS replyCount
    FROM db_board_posts p ${where} AND id < ? ORDER BY id DESC LIMIT 21`)
    .bind(...args, cursor || Number.MAX_SAFE_INTEGER);
  const [rows, count] = await db.batch([list, db.prepare('SELECT count(*) AS total FROM db_board_posts '+where).bind(...args)]);
  const posts = rows.results.slice(0, 20);
  return {posts, total: count.results[0].total, next: rows.results.length > 20 ? posts.at(-1).id : null};
}
async function boardDetail(db, id, params) {
  const cursor = boardCursor(params);
  const [postRows, replyRows, count] = await db.batch([
    db.prepare('SELECT id, cat, author, title, body, created AS "when" FROM db_board_posts WHERE id=?').bind(id),
    db.prepare('SELECT id, author, body FROM db_board_replies WHERE post_id=? AND id < ? ORDER BY id DESC LIMIT 31')
      .bind(id, cursor || Number.MAX_SAFE_INTEGER),
    db.prepare('SELECT count(*) AS n FROM db_board_replies WHERE post_id=?').bind(id)
  ]);
  const post = postRows.results[0];
  if (!post) throw new BoardError(404, '글을 찾을 수 없습니다.');
  const replies = replyRows.results.slice(0, 30);
  return {...post, replies, replyCount: count.results[0].n, next: replyRows.results.length > 30 ? replies.at(-1).id : null};
}
async function boardWrite(request, db, parentId) {
  const input = await boardInput(request);
  const requestId = boardField(input, 'requestId', 36);
  if (!/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(requestId)) throw new BoardError(400, '등록 번호가 올바르지 않습니다.');
  const author = boardField(input, 'author', 16);
  const body = boardField(input, 'body', parentId ? 300 : 1200);
  const columns = parentId ? ['post_id','author','body'] : ['cat','author','title','body'];
  const values = parentId ? [parentId, author, body] : [input.category, author, boardField(input, 'title', 50), body];
  if (!parentId && !boardCategories.includes(input.category)) throw new BoardError(400, '분류를 선택해 주세요.');
  const table = parentId ? 'db_board_replies' : 'db_board_posts';
  const lookup = db.prepare('SELECT id,'+columns.join(',')+' FROM '+table+' WHERE request_id=?').bind(requestId);
  const result = (row, status) => {
    if (columns.some((key, i) => row[key] !== values[i])) throw new BoardError(409, '등록 정보가 변경되었습니다. 다시 시도해 주세요.');
    return boardResponse(status, {id: row.id});
  };
  const existing = await lookup.first();
  if (existing) return result(existing, 200);
  if (parentId && !await db.prepare('SELECT id FROM db_board_posts WHERE id=?').bind(parentId).first()) {
    throw new BoardError(404, '글을 찾을 수 없습니다.');
  }
  const now = Date.now(), windowEnd = (Math.floor(now / 60000) + 1) * 60000;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(windowEnd + '/' + (request.headers.get('cf-connecting-ip') || 'local')));
  const client = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
  // Use one D1 transaction so parallel writes cannot bypass the minute limit.
  const [, , inserted, found] = await db.batch([
    db.prepare('DELETE FROM db_board_limits WHERE expires<=?').bind(now),
    db.prepare('INSERT INTO db_board_limits(client, expires, n) VALUES (?,?,1) ON CONFLICT(client) DO UPDATE SET n=n+1').bind(client, windowEnd),
    db.prepare(`INSERT INTO ${table}(request_id,created,${columns.join(',')})
      SELECT ${Array(values.length+2).fill('?').join(',')} WHERE (SELECT n FROM db_board_limits WHERE client=?)<=12
      ON CONFLICT(request_id) DO NOTHING`).bind(requestId, now, ...values, client),
    lookup
  ]);
  if (!found.results[0]) throw new BoardError(429, '글과 답글은 1분에 12개까지 등록할 수 있습니다. 잠시 후 다시 시도해 주세요.');
  return result(found.results[0], inserted.meta.changes ? 201 : 200);
}
async function serveTownBoard(request, env) {
  try {
    const url = new URL(request.url);
    const suffix = url.pathname.slice(boardRoot.length);
    const route = /^\/(\d{1,15})(\/replies)?$/.exec(suffix);
    if (suffix && !route) throw new BoardError(404, '주소를 찾을 수 없습니다.');
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) throw new BoardError(403, '접속 주소를 확인해 주세요.');
    if (!env.GAME_DB) throw new BoardError(503, '게시판을 준비 중입니다.');
    await initBoard(env.GAME_DB);
    const id = route ? Number(route[1]) : null;
    if (request.method === 'GET' && !route?.[2]) {
      return boardResponse(200, route ? await boardDetail(env.GAME_DB,id,url.searchParams) : await boardList(env.GAME_DB,url.searchParams));
    }
    if (request.method === 'POST' && (!route || route[2]) && id !== 0) return await boardWrite(request,env.GAME_DB,id);
    throw new BoardError(405, '지원하지 않는 요청입니다.');
  } catch (error) {
    if (!(error instanceof BoardError)) console.error('town-board', error.message);
    return boardResponse(error.status || 500, {error: error instanceof BoardError ? error.message : '게시판에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'});
  }
}
