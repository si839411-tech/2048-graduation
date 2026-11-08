/*
 * 2048 AI search worker (challenge levels 61-100)
 * Iterative, time-limited Expectimax.  The real game's first move is simulated
 * on the main thread, so obstacles, bonus points and specials are respected at
 * the root.  The future model uses ordinary tile merges and TWO random spawns
 * after a move; with active special obstacles it searches chance nodes only.
 * This file does not manipulate the DOM and runs off the rendering thread.
 */
'use strict';

const DIRECTIONS = [[0,-1], [0,1], [-1,0], [1,0]];
let expires = 0;
let nodes = 0;
let maxNodes = 0;
let mergeBonus = 0;
const STOP = {};

function guard() {
  if (++nodes > maxNodes || (nodes % 64 === 0 && Date.now() > expires)) throw STOP;
}

function evaluate(board, score) {
  const n = board.length;
  let empty=0, adjacent=0, rough=0, maximum=0;
  for (let i=0;i<n;i++) {
    for (let j=0;j<n;j++) {
      const v=board[i][j];
      if (!v) {empty++;continue;}
      if (v>maximum) maximum=v;
      if (j+1<n && board[i][j+1]) {
        if (v===board[i][j+1]) adjacent++;
        rough+=Math.abs(Math.log2(v)-Math.log2(board[i][j+1]));
      }
      if (i+1<n && board[i+1][j]) {
        if (v===board[i+1][j]) adjacent++;
        rough+=Math.abs(Math.log2(v)-Math.log2(board[i+1][j]));
      }
    }
  }
  const corner=maximum>0 &&
    (board[0][0]===maximum || board[0][n-1]===maximum ||
     board[n-1][0]===maximum || board[n-1][n-1]===maximum);
  // On the 4×4 challenge board two tiles appear after each move.
  // Reserve empty cells and discourage terminal boards; this applies only to 4×4.
  const emptyWeight = n === 4 ? 90 : 65;
  const crowdPenalty = n === 4 ? Math.max(0, 3 - empty) * 90 : 0;
  if(n === 4 && empty === 0 && adjacent === 0) return -10000 + score*0.05;
  return empty*emptyWeight + adjacent*28 + (corner ? 75 : 0) +
    Math.log2(Math.max(2,maximum))*16 - rough*7 - crowdPenalty + score*0.35;
}

// Ordinary board movement is used ONLY for future hypothetical states; the
// exact first move is always simulated by the main game's full rules.
function move(board, dir, score) {
  const n=board.length;
  const result=board.map(row=>row.slice());
  let gained=0, changed=false;
  for(let line=0;line<n;line++) {
    const cells=[];
    for(let k=0;k<n;k++) {
      if(dir[0]===0) cells.push([line, dir[1]<0?k:n-1-k]);
      else cells.push([dir[0]<0?k:n-1-k,line]);
    }
    const numbers=cells.map(([i,j])=>board[i][j]).filter(v=>v!==0);
    const values=[];
    for(let k=0;k<numbers.length;k++) {
      if(k+1<numbers.length && numbers[k]===numbers[k+1]) {
        const v=numbers[k]*2;
        values.push(v); gained+=v + mergeBonus; k++;
      } else values.push(numbers[k]);
    }
    for(let k=0;k<n;k++) {
      const [i,j]=cells[k],v=values[k]||0;
      if(result[i][j]!==v) changed=true;
      result[i][j]=v;
    }
  }
  return changed ? {board:result,score:score+gained} : null;
}

function sampleEmpty(board, limit) {
  const cells=[];
  for(let i=0;i<board.length;i++) for(let j=0;j<board[i].length;j++) {
    if(board[i][j]===0) cells.push([i,j]);
  }
  if(cells.length<=limit) return cells;
  // Stratified, evenly spaced samples approximate the uniform position chance.
  const selected=[];
  for(let k=0;k<limit;k++) {
    selected.push(cells[Math.floor((k+0.5)*cells.length/limit)]);
  }
  return selected;
}

function chance(board, score, remainingSpawns, futureMoves, spawnDist, width) {
  guard();
  if(remainingSpawns===0) {
    return futureMoves<=0 ? evaluate(board,score) : maximum(board,score,futureMoves,spawnDist,width);
  }
  const cells=sampleEmpty(board,width);
  if(!cells.length) return futureMoves<=0 ? evaluate(board,score) : maximum(board,score,futureMoves,spawnDist,width);
  let sum=0;
  for(const [row,col] of cells) {
    for(const [value,probability] of spawnDist) {
      const next=board.map(r=>r.slice());
      next[row][col]=value;
      sum+=(probability/cells.length)*chance(next,score,remainingSpawns-1,futureMoves,spawnDist,width);
    }
  }
  return sum;
}

function maximum(board,score,movesLeft,spawnDist,width) {
  guard();
  let best=-Infinity;
  for(const direction of DIRECTIONS) {
    const next=move(board,direction,score);
    if(!next) continue;
    const value=chance(next.board,next.score,2,movesLeft-1,spawnDist,width);
    if(value>best) best=value;
  }
  return best===-Infinity ? evaluate(board,score)-2000 : best;
}

function search(data) {
  const candidates=data.candidates;
  if(!candidates || !candidates.length) return null;
  const level=Math.min(100,Math.max(61,Number(data.level)||61));
  const budgetMs=Math.min(90,Math.max(10,Number(data.budgetMs)||25));
  expires=Date.now()+budgetMs;
  nodes=0;
  maxNodes=12000;
  mergeBonus = Math.max(0,Number(data.mergeBonus)||0);
  const spawnDist=data.spawn || [[4,0.5],[8,0.3],[16,0.2]];
  // Quick, available fallback even if the time budget is exceeded immediately.
  let best=candidates[0], bestScore=-Infinity;
  for(const candidate of candidates) {
    const v=evaluate(candidate.board,candidate.score);
    if(v>bestScore) {bestScore=v;best=candidate;}
  }
  const smallestEmpty = Math.min(...candidates.map(c => c.board.flat().filter(v=>v===0).length));
  const upperDepth=data.special ? 1 : (level >= 90 && smallestEmpty < 8 ? 3 : level >= 75 ? 2 : 1);
  let completedDepth=0;
  // Only publish a whole, completed search depth; incomplete roots cause bias.
  for(let depth=1;depth<=upperDepth;depth++) {
    let roundBest=null, roundBestValue=-Infinity;
    try {
      // Broad position sampling for shallow search; fewer branches for deeper search.
      const width=depth===1 ? (level>=90 ? 4 : 3) : 2;
      for(const c of candidates) {
        const v=chance(c.board,c.score,2,depth-1,spawnDist,width);
        if(v>roundBestValue) {roundBest=c;roundBestValue=v;}
      }
    } catch(e) {
      if(e!==STOP) throw e;
      break;
    }
    best=roundBest;
    completedDepth=depth;
  }
  return {index:best.index,depth:completedDepth,nodes};
}

self.onmessage=function(event) {
  const data=event.data || {};
  try {
    self.postMessage(Object.assign({id:data.id},search(data)));
  } catch (_) {
    // The main thread independently checks validity and has a heuristic fallback.
    self.postMessage({id:data.id,index:null,depth:0,error:true});
  }
};
