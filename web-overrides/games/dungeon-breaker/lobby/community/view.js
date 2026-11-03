export const boardView = `<link rel="stylesheet" href="community/forum.css?v=2">
<dialog id="board" aria-labelledby="heading">
  <div class="board-wrap">
    <header class="head">
      <img class="banner" src="assets/badges/town-board-shaded-v3.svg" alt="">
      <div class="titles"><small>광장 <i>◆</i> 모험가 길드</small><h1 id="heading">마을 게시판</h1></div>
      <button class="leave" id="leave" aria-label="게시판 닫고 광장으로"><span>광장으로</span> ×</button>
    </header>
    <div class="frame">
      <div class="notice" id="notice" role="status" hidden><span></span><button class="retry" type="button">다시 불러오기</button></div>
      <section id="list" class="sheet" aria-label="게시글 목록">
        <div class="section-head">
          <h2>글 목록 <span id="total"></span></h2>
          <a class="gold" href="#write" data-go="editor"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 13l1-4L11 1h2v2h2v2l-8 8-5 1zm3-3 2 1 5-6-1-1z"/></svg>글쓰기</a>
        </div>
        <div class="filterbar">
          <nav aria-label="게시글 분류" id="filters">
            <button data-category="all" aria-pressed="true">전체</button><button data-category="party" aria-pressed="false">파티 모집</button><button data-category="tip" aria-pressed="false">공략</button><button data-category="free" aria-pressed="false">자유</button>
          </nav>
          <span class="order">최신순 ↓</span>
        </div>
        <table aria-label="게시글 목록">
          <colgroup><col><col class="writer-col"><col class="date-col"></colgroup>
          <thead><tr><th scope="col">제목</th><th scope="col">글쓴이</th><th scope="col">작성일</th></tr></thead>
          <tbody id="posts"></tbody>
        </table>
        <div class="pager" id="list-pager" hidden><button id="prev">← 이전</button><span id="page-number"></span><button id="next">다음 →</button></div>
      </section>
      <section id="detail" class="sheet inner-sheet" hidden>
        <a class="list-link" href="#list" data-go="list">← 글 목록</a>
        <div id="detail-category" class="category"></div>
        <h2 id="post-title" tabindex="-1"></h2>
        <div class="meta"><span>글쓴이 <b id="post-author"></b></span><span>작성일 <time id="post-date"></time></span></div>
        <p id="post-body"></p>
        <h3>답글 <span id="reply-count"></span></h3>
        <div id="replies"></div><div class="pager"><button id="older" hidden>이전 답글 더 보기</button></div>
        <form id="reply" class="reply-form">
          <label class="field">글쓴이<input name="author" required maxlength="16" placeholder="닉네임"></label>
          <label class="field">답글<textarea name="body" required maxlength="300" rows="2" placeholder="답글을 입력하세요."></textarea></label>
          <div class="form-end"><button class="gold">답글 등록</button></div>
        </form>
      </section>
      <section id="editor" class="sheet inner-sheet" hidden>
        <a class="list-link" href="#list" data-go="list">← 글 목록</a><h2 tabindex="-1">글쓰기</h2>
        <form id="compose">
          <div class="field-row">
            <label class="field">분류<select name="category"><option value="free">자유</option><option value="party">파티 모집</option><option value="tip">공략</option></select></label>
            <label class="field">글쓴이<input name="author" required maxlength="16" placeholder="닉네임"></label>
          </div>
          <label class="field">제목<input name="title" required maxlength="50" placeholder="제목을 입력하세요."></label>
          <label class="field">내용<textarea name="body" rows="5" required maxlength="1200" placeholder="내용을 입력하세요."></textarea></label>
          <div class="form-end"><a href="#list" data-go="list" class="cancel">취소</a><button class="gold">등록</button></div>
        </form>
      </section>
    </div>
    <footer><span><b>◆</b> 마을 광장</span><span>모험가들의 글과 답글</span></footer>
  </div>
  <div id="status" role="status"></div>
</dialog>
`;
