/* Load image bytes before revealing a screen. SVG decode() is not reliable in
   every WebKit version, so a successful load remains authoritative for SVG. */
(() => {
 const pending = new Map();
 async function ready(src) {
  const url = new URL(src, document.baseURI).href;
  if (pending.has(url)) return pending.get(url);
  const task = (async () => {
   for (let attempt = 0; attempt < 3; attempt++) {
    try {
     const image = new Image();
     await new Promise((resolve, reject) => {
      let timer;
      const settle=(error)=>{clearTimeout(timer);image.onload=image.onerror=null;error?reject(error):resolve();};
      image.onload=()=>settle();
      image.onerror=()=>settle(new Error('Image load failed: '+url));
      timer=setTimeout(()=>{settle(new Error('Image load timed out: '+url));image.src='';},20000);
      const attemptURL=new URL(url);if(attempt)attemptURL.searchParams.set('retry',String(attempt));
      image.src=attemptURL.href;
     });
     if (image.decode) {
      try { await image.decode(); }
      catch (error) {
       if (!/\.svg(?:[?#]|$)/i.test(url)) throw new Error('Image decode failed: ' + url);
      }
     }
     return image;
    } catch (error) {
     if (attempt === 2) throw error;
     await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
    }
   }
  })();
  pending.set(url, task);
  task.catch(() => pending.delete(url));
  return task;
 }
 window.GameImages = {ready};
})();
