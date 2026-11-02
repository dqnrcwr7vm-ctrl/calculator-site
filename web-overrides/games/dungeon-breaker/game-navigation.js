/* Keep the fullscreen host and its continuous BGM alive between game screens. */
(() => {
  'use strict';
  const scriptURL = document.currentScript.src;
  const gameRoot = new URL('.', scriptURL);
  const homeURL = new URL('index.html', gameRoot);
  const lobbyPath = new URL('lobby/index.html', gameRoot).pathname;
  const persistent = document.documentElement.dataset.gameShell === 'true';
  let host = window;
  try {
    if (window.parent !== window && window.parent.GameScreen?.ownsFrame(window)) host = window.parent;
  } catch {}
  function internalTarget(href) {
    const target = new URL(href, location.href);
    if (target.origin !== gameRoot.origin || !target.pathname.startsWith(gameRoot.pathname) || !target.pathname.endsWith('.html')) return null;
    // Return links from existing game pages must load the current lobby too.
    if (target.pathname === lobbyPath) target.searchParams.set('v', 'normal-entry-20261027');
    return target;
  }
  function clickedLink(event) {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.download || (link.target && link.target !== '_self')) return null;
    const target = internalTarget(link.href);
    if (!target || (target.pathname === location.pathname && target.hash)) return null;
    return target;
  }
  if (host !== window) {
    window.GameScreen = {
      get fullscreen() { return host.GameScreen.fullscreen; },
      toggleFullscreen: () => host.GameScreen.toggleFullscreen(),
      navigate: href => host.GameScreen.navigate(new URL(href, location.href).href),
      ownsFrame: () => false,
      scriptURL
    };
    const syncButton = () => {
      const button = document.querySelector('[data-game-fullscreen]');
      if (button) {
        button.setAttribute('aria-label', host.GameScreen.fullscreen ? '전체화면 해제' : '전체화면');
        button.setAttribute('aria-pressed', String(host.GameScreen.fullscreen));
      }
    };
    window.addEventListener('gamefullscreenchange', syncButton);
    document.addEventListener('DOMContentLoaded', syncButton);
    document.addEventListener('click', event => {
      if (event.target.closest('[data-game-fullscreen]')) {
        host.GameScreen.toggleFullscreen().catch(() => {});
        return;
      }
      const target = clickedLink(event);
      if (target && host.GameScreen.navigate(target.href)) event.preventDefault();
    });
    return;
  }
  let view = null;
  const originalTitle = document.title;
  function notify() {
    window.dispatchEvent(new Event('gamefullscreenchange'));
    try { view?.contentWindow.dispatchEvent(new Event('gamefullscreenchange')); } catch {}
    const button = document.querySelector('[data-game-fullscreen]');
    if (button) {
      button.setAttribute('aria-label', document.fullscreenElement ? '전체화면 해제' : '전체화면');
      button.setAttribute('aria-pressed', String(!!document.fullscreenElement));
    }
  }
  function navigate(href) {
    const target = internalTarget(href);
    if (!target || (!persistent && !document.fullscreenElement)) return false;
    if (persistent && target.pathname === homeURL.pathname) {
      // Remove the playing screen, including its timers/media. Do not nest a
      // second title page/audio element inside the existing host.
      view?.remove();
      view = null;
      document.title = originalTitle;
      window.dispatchEvent(new Event('gamescreenhome'));
      return true;
    }
    if (!view) {
      view = document.createElement('iframe');
      view.id = 'game-view';
      view.title = 'DUNGEON BREAKER 게임 화면';
      view.allow = 'fullscreen; autoplay';
      view.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483647;background:#000;display:block';
      view.addEventListener('load', () => {
        try { document.title = view.contentDocument.title; } catch {}
        notify();
      });
      (document.fullscreenElement || document.body).append(view);
      document.querySelectorAll('video,audio').forEach(media => {
        if (!persistent || !media.hasAttribute('data-game-persistent')) media.pause();
      });
    }
    view.src = target.href;
    window.dispatchEvent(new Event('gamescreenenter'));
    view.focus();
    return true;
  }
  window.GameScreen = {
    get fullscreen() { return !!document.fullscreenElement; },
    ownsFrame: child => !!view && view.contentWindow === child,
    navigate,
    async toggleFullscreen() {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();try{await screen.orientation?.lock?.("landscape");}catch{}}
      else window.GameMobile?.showInstallHelp();
    },
    scriptURL
  };
  document.addEventListener('fullscreenchange', notify);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-game-fullscreen]');
    if (button) {
      window.GameScreen.toggleFullscreen().catch(() => button.setAttribute('aria-label', '전체화면을 사용할 수 없습니다'));
      return;
    }
    const target = clickedLink(event);
    if (target && navigate(target.href)) event.preventDefault();
  });
})();
