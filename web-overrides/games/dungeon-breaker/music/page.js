(() => {
 // Pages serves the same game screens at extensionless paths and directory indexes.
 const path=location.pathname.replace(/\/$/,'/index.html').replace(/\/([^/.]+)$/,'/$1.html');
 const preparation=path.endsWith('/battle/normal-entry.html')||document.documentElement.classList.contains('initial-draft');
 if(!path.includes('/battle/')||preparation)DungeonMusic.setPaused(false);
 if(path.endsWith('/lobby/index.html')||preparation){DungeonMusic.select('lobby');DungeonMusic.resume();}
 else if(path.endsWith('/lobby/town.html')||path.endsWith('/lobby/forge.html'))DungeonMusic.select('town');
 document.addEventListener('pointerdown',()=>DungeonMusic.resume(),{capture:true});
 document.addEventListener('keydown',()=>DungeonMusic.resume(),{capture:true});
})();
