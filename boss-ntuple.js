/*
 * V7 experimental 7-1 N-Tuple scorer: 36 positional 4-tuples from the
 * user's 7,000-episode, 5x5/20,000-point training run.
 * All evaluation executes inside the 7-1 boss Worker, never on the UI thread.
 * Fetch and gzip decode are asynchronous. Until READY, V6 remains in use.
 */
'use strict';
(() => {
  const SIZE=5, PER_TABLE=65536, PATTERN_COUNT=36, EXPECTED_BYTES=PATTERN_COUNT*PER_TABLE*4;
  const patterns=[];
  for(let r=0;r<SIZE;r++)for(let s=0;s<2;s++)patterns.push([5*r+s,5*r+s+1,5*r+s+2,5*r+s+3]);
  for(let c=0;c<SIZE;c++)for(let s=0;s<2;s++)patterns.push([5*s+c,5*(s+1)+c,5*(s+2)+c,5*(s+3)+c]);
  for(let r=0;r<SIZE-1;r++)for(let c=0;c<SIZE-1;c++)patterns.push([5*r+c,5*r+c+1,5*(r+1)+c,5*(r+1)+c+1]);
  let weights=null, startPromise=null, error=null;
  function install(buffer) {
    if(!buffer || buffer.byteLength!==EXPECTED_BYTES)throw Error('Bad N-Tuple model length');
    const data=new Float32Array(buffer);
    // Validate every weight once at load time: protect against bad/corrupt assets.
    for(let i=0;i<data.length;i++)if(!Number.isFinite(data[i]))throw Error('Invalid N-Tuple value');
    weights=data;
    error=null;
    return true;
  }
  async function preload() {
    if(weights)return true;
    if(startPromise)return startPromise;
    startPromise=(async()=>{
      if(typeof fetch!=='function' || typeof DecompressionStream==='undefined')throw Error('gzip Worker support missing');
      const res=await fetch('boss-realrules-7000.f32.gz',{cache:'force-cache'});
      if(!res.ok || !res.body)throw Error('N-Tuple fetch HTTP '+res.status);
      const decoded=await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      return install(decoded);
    })().catch(e=>{error=String(e&&e.message||e);return false;});
    return startPromise;
  }
  function evaluate(board) {
    if(!weights)return null;
    if(!Array.isArray(board)||board.length!==SIZE)return null;
    // Encodes exact 4-bit log2 tile symbols used by train-boss.js.
    const ranks=new Uint8Array(25);
    for(let r=0;r<SIZE;r++){
      const line=board[r];
      if(!line||line.length!==SIZE)return null;
      for(let c=0;c<SIZE;c++){
        const v=line[c];
        if(!Number.isSafeInteger(v)||v<0)return null;
        ranks[r*SIZE+c]=v===0?0:Math.min(15,31-Math.clz32(v));
      }
    }
    let total=0;
    for(let p=0;p<patterns.length;p++){
      const t=patterns[p];
      const key=ranks[t[0]]|(ranks[t[1]]<<4)|(ranks[t[2]]<<8)|(ranks[t[3]]<<12);
      total+=weights[p*PER_TABLE+key];
    }
    return total;
  }
  self.BossNtuple={preload,install,evaluate,status:()=>({ready:!!weights,error}),patterns};
})();
