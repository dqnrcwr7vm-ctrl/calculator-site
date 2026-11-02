/* Runtime palette swap: preserve authored animation, alpha and bright cores. */
(function(root){
 'use strict';
 function redPixels(pixels){for(let i=0;i<pixels.length;i+=4){const low=Math.min(pixels[i],pixels[i+1],pixels[i+2]),high=Math.max(pixels[i],pixels[i+1],pixels[i+2]);pixels[i]=high;pixels[i+1]=low;pixels[i+2]=low;}return pixels;}
 if(typeof module==='object'&&module.exports)module.exports={redPixels};
 if(!root.document)return;
 const cache=new WeakMap();
 root.BossChargeColor={red(image){if(!image)return image;if(cache.has(image))return cache.get(image);const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const g=canvas.getContext('2d');g.drawImage(image,0,0);const rgba=g.getImageData(0,0,canvas.width,canvas.height);redPixels(rgba.data);g.putImageData(rgba,0,0);cache.set(image,canvas);return canvas;}};
})(typeof window!=='undefined'?window:globalThis);
