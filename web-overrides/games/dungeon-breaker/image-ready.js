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
      image.onload = resolve;
      image.onerror = () => reject(new Error('Image load failed: ' + url));
      image.src = url;
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
