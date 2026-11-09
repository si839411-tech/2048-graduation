/* V8 experimental learned obstacle evaluator: explicit type/position/remaining turns/local tile ranks.
 * Tensor is small (< 10KiB), versioned and cross-validated offline. No UI or network access.
 */
'use strict';
(function(root){
 const TYPES=['locks','shields','curseBombs','bombs','lasers'];
 const SIZE=5, KINDPOS=0, KINDTTL=125, KINDTILE=500, KINDNEAR=1125, KINDCOUNT=1625, TURN=1645, LENGTH=1650;
 let weights=null;
 function bucket(v){return v===0?0:v<=32?1:v<=128?2:v<=512?3:4;}
 function ttl(v){return !Number.isInteger(v)?0:v<=2?0:v<=4?1:2;}
 function features(side){
  if(!side || !Array.isArray(side.board)||side.board.length!==5)return [];
  const out=[];
  for(let t=0;t<5;t++){
   const all=Array.isArray(side[TYPES[t]])?side[TYPES[t]]:[];
   let count=0;
   for(const ob of all){
    const x=ob.x,y=ob.y;
    if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=5||y>=5)continue;
    count++;
    const pos=x*5+y,cur=side.board[x]?.[y]||0;
    out.push(KINDPOS+t*25+pos);
    out.push(KINDTTL+t*75+pos*3+ttl(ob.turn));
    out.push(KINDTILE+t*125+pos*5+bucket(cur));
    let neighbors=0,matching=0;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
     const nx=x+dx,ny=y+dy;
     if(nx>=0&&nx<5&&ny>=0&&ny<5){const v=side.board[nx]?.[ny]||0;if(v>0)neighbors++;if(v===cur&&cur>0)matching++;}
    }
    const group=matching>=2?3:matching===1?2:neighbors>=3?1:0;
    out.push(KINDNEAR+t*100+pos*4+group);
   }
   if(count)out.push(KINDCOUNT+t*4+Math.min(3,count-1));
  }
  if(out.length)out.push(TURN+Math.min(4,Math.max(0,Number(side.turnCount||1)-1)));
  return out;
 }
 function evaluateFeatures(feats,arr=weights){
   if(!arr)return 0;
   let v=0;for(const ix of feats) v+=arr[ix]||0;
   return v/Math.sqrt(Math.max(1,feats.length));
 }
 function install(src){
   if(!src||src.length!==LENGTH)throw Error('V8 model length mismatch');
   const buffer=Float32Array.from(src);
   for(const v of buffer)if(!Number.isFinite(v)||Math.abs(v)>10)throw Error('V8 invalid weight');
   weights=buffer;return true;
 }
 function evaluate(side){return evaluateFeatures(features(side));}
 function status(){return {ready:!!weights};}
 const exports={TYPES,LENGTH,features,evaluateFeatures,evaluate,install,status};
 root.BossObstacleV8=exports;
 if(typeof module!=='undefined'&&module.exports)module.exports=exports;
 })(typeof self!=='undefined'?self:globalThis);
