/*
 * V14 7-1 boss selector, run off the UI thread (V6 default).
 * Optional 7,000-episode N-Tuple evaluations are blended into normal/rage
 * afterstates; analysis/charge still use the unchanged Expectimax worker.
 * - Normal/Rage: V5 two-move Monte Carlo rollouts using extracted V26 rules,
 *   including two spawn events, obstacle/item events and heuristic opponent.
 * - Analysis/Charge: delegates to unchanged ai-worker.js Expectimax.
 * - Samples use independent deterministic RNG; NO real future RNG is read.
 * - A failed or expired decision is handled by the main-thread heuristic.
 */
'use strict';
importScripts('ai-worker.js');
const legacyExpectimax = self.onmessage;
importScripts('boss-ai-rules.js?v=14', 'boss-ai-weights.js', 'boss-ntuple.js', 'boss-obstacle-v8.js');
try { importScripts('boss-obstacle-v8-weights.js'); } catch (_) { /* optional V8 model: V6/V7 remains usable */ }
try { importScripts('boss-ntuple-v11.js?v=11'); } catch (_) { self.BossNtupleV11=null; /* keep V6 usable */ }
// V13: do not download a model in the default V6 mode.
// Only the explicitly selected experimental variant may fetch its model.
const BossRules = self.BossRules;

const BOSS_DIRECTIONS = [[0,-1], [0,1], [-1,0], [1,0]];
let BOSS_TARGET = 40000;
const BOSS_HEAD_TYPES = ['locks','shields','curseBombs','bombs','lasers'];
const BOSS_PER_TYPE = 25*16*5;
let hazardWeights = null;
let currentDeadline = 0;
let currentNodes = 0;
const BOSS_MAX_NODES = 10000;
let activeNtuple=self.BossNtuple; // V11 is strictly optional

function loadHead() {
  if (hazardWeights) return hazardWeights;
  const text = atob(self.BossHazardWeightsBase64);
  if (text.length !== 10000*4) throw Error('Invalid V4 head length');
  const buffer = new ArrayBuffer(text.length);
  const bytes = new Uint8Array(buffer);
  for (let i=0;i<text.length;i++) bytes[i]=text.charCodeAt(i);
  const values = new Float32Array(buffer);
  for (const x of values) if (!Number.isFinite(x)) throw Error('Invalid learned weight');
  hazardWeights=values;
  return hazardWeights;
}

function checkDeadline() {
  if (++currentNodes > BOSS_MAX_NODES || Date.now() >= currentDeadline) throw Error('BOSS_BUDGET');
}
function boardHash(game, mode) {
  let h=2166136261>>>0;
  const values = [...game.ai.board.flat(), ...game.player.board.flat(),
    game.ai.score,game.player.score,game.ai.turnCount,game.player.turnCount,mode.length];
  for (const value of values) h=Math.imul(h^(value>>>0),16777619)>>>0;
  for (const type of BOSS_HEAD_TYPES) {
    for (const side of [game.ai,game.player]) {
      for (const obs of (side[type]||[])) {
        for (const val of [obs.x,obs.y,obs.turn||0]) h=Math.imul(h^(val>>>0),16777619)>>>0;
      }
    }
  }
  return h||1;
}
function evalHead(side) {
  const weights=loadHead();
  let score=0;
  for(let type=0;type<BOSS_HEAD_TYPES.length;type++) {
    const objects=side[BOSS_HEAD_TYPES[type]]||[];
    for(const obj of objects) {
      const x=obj.x,y=obj.y;
      if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>=5||y<0||y>=5)continue;
      const base=type*BOSS_PER_TYPE+(x*5+y)*80;
      const offsets=[[0,0],[-1,0],[1,0],[0,-1],[0,1]];
      for(let k=0;k<5;k++) {
        const r=x+offsets[k][0],c=y+offsets[k][1];
        if(r<0||c<0||r>=5||c>=5)continue;
        const val=side.board[r][c]||0;
        const rank=val?Math.min(15,Math.floor(Math.log2(val))):0;
        score+=weights[base+k*16+rank];
      }
    }
  }
  return Math.max(-400,Math.min(400,score));
}
function getLegal(side) {
  const results=[];
  for(let index=0;index<4;index++) {
    const copy=BossRules.cloneSide_AI7(side);
    if (BossRules.moveSide_AI7(copy,BOSS_DIRECTIONS[index])) results.push({index,side:copy});
  }
  return results;
}
function chooseHeuristic(side) {
  let selected=null,best=-Infinity;
  for(const c of getLegal(side)) {
    const val=BossRules.rateSide_AI7(c.side);
    if(val>best){selected=c;best=val;}
  }
  return selected;
}
function perform(side, direction) {
  if(!BossRules.moveSide_AI7(side,direction)) return false;
  BossRules.afterMove_AI7(side);
  return true;
}
// Alternative scripted opponent styles are sampled, not assumed to be human data.
function cautiousScore(side) {
  const open=side.board.flat().filter(v=>v===0).length;
  return 1.2*BossRules.rateSide_AI7(side)+open*145+getLegal(side).length*90;
}
function tinyRandom(seed) {
  let x=seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;
  return (x>>>0)/4294967296;
}
function autoUsePlayerItems(player) {
  for(let i=0;i<player.itemSlots.length;i++) {
    const item=player.itemSlots[i];
    if(!item)continue;
    BossRules.useItemImmediately_AI7(player,item);
    player.itemSlots[i]=null;
  }
}
function emergencyPenalty(side){
  const legal=getLegal(side);
  if(!legal.length)return -16000;
  const free=side.board.flat().filter(v=>v===0).length;
  return Math.max(-600,(free-4)*70)+(legal.length-2)*80;
}
function ntupleContribution(side, weight) {
  if(!(weight>0) || !activeNtuple.status().ready)return 0;
  const value=activeNtuple.evaluate(side.board);
  if(!Number.isFinite(value))return 0;
  // Normalized to heuristic scale (~1,000-2,000). Avoid unbounded model values.
  // Damp board-only predictions as obstacles get denser: the model was trained
  // with real rule moves but does not encode special-object locations itself.
  const hazards=(side.locks||[]).length+(side.shields||[]).length+(side.curseBombs||[]).length;
  const reliability=1/(1+hazards*.5);
  return weight*reliability*Math.max(-1500,Math.min(1500,value*.15));
}
function obstacleContribution(side, weight) {
  if(!(weight>0) || !self.BossObstacleV8.status().ready)return 0;
  const raw=self.BossObstacleV8.evaluate(side);
  return Number.isFinite(raw)?weight*Math.max(-550,Math.min(550,raw*1500)):0;
}
function stateValue(boss, player, ntWeight, hazardWeight) {
  const heuristic=BossRules.rateSide_AI7(boss);
  const scoreLead=Math.max(-500,Math.min(500,(boss.score-player.score)*.02));
  return heuristic + .6*evalHead(boss)+scoreLead+emergencyPenalty(boss)+ntupleContribution(boss,ntWeight)+obstacleContribution(boss,hazardWeight)
     +(boss.score>=BOSS_TARGET?12000:0)-(player.score>=BOSS_TARGET?12000:0);
}
function samplePath(candidate, player, seed, opponentMoves, ntWeight, hazardWeight, playerStyle) {
  const R=BossRules;
  R.seedBossRandom(seed);
  R.AI7.ai=R.cloneSide_AI7(candidate.side);
  R.AI7.player=R.cloneSide_AI7(player);
  R.AI7.player.slotDivs=[];
  R.afterMove_AI7(R.AI7.ai); // Actual root post-move: 2 tiles, obstacle and item events.
  if(opponentMoves) {
    // Preserve the V6/V7/V8 heuristic path without unnecessary extra search.
    let opponent;
    if (playerStyle==='heuristic') {
      opponent=chooseHeuristic(R.AI7.player);
    } else {
      const options=getLegal(R.AI7.player);
      opponent=playerStyle==='greedy' ? options.reduce((a,b)=>!a || b.side.score>a.side.score?b:a,null) :
        options.reduce((a,b)=>!a || cautiousScore(b.side)>cautiousScore(a.side)?b:a,null);
    }
    if(opponent){
      perform(R.AI7.player,BOSS_DIRECTIONS[opponent.index]);
      autoUsePlayerItems(R.AI7.player);
    }
  }
  if(R.AI7.ai.score>=BOSS_TARGET || R.AI7.player.score>=BOSS_TARGET)
    return stateValue(R.AI7.ai,R.AI7.player,ntWeight,hazardWeight);
  const follow=chooseHeuristic(R.AI7.ai);
  if(!follow)return stateValue(R.AI7.ai,R.AI7.player,ntWeight,hazardWeight)-16000;
  perform(R.AI7.ai,BOSS_DIRECTIONS[follow.index]);
  return stateValue(R.AI7.ai,R.AI7.player,ntWeight,hazardWeight);
}
function isValidSide(side) {
  return !!side && Array.isArray(side.board) && side.board.length===5 &&
    side.board.every(row=>Array.isArray(row)&&row.length===5&&row.every(v=>Number.isInteger(v)&&v>=0)) &&
    Number.isFinite(side.score) && Number.isFinite(side.turnCount) &&
    BOSS_HEAD_TYPES.every(k=>Array.isArray(side[k])) && Array.isArray(side.itemSlots);
}
function chooseForward(data) {
  const R=BossRules;
  const boss=data.boss, player=data.player;
  const candidates=data.candidates||[];
  if(!isValidSide(boss)||!isValidSide(player)||!Array.isArray(candidates)||!candidates.length)
    throw Error('Invalid boss state');
  if(candidates.length>4 || candidates.some(c=>!Number.isInteger(c.index)||c.index<0||c.index>3||!isValidSide(c.side)))
    throw Error('Invalid root candidates');
  R.setShop(data.shop||{});
  R.AI7.challengeMode=null;
  R.AI7.SIZE=5;
  R.AI7.TARGET=BOSS_TARGET;
  R.AI7.TILES_PER_MOVE=2;
  R.AI7.ai=R.cloneSide_AI7(boss);
  R.AI7.player=R.cloneSide_AI7(player);

  // ntupleWeight is only an experimental benchmark override. In the game,
  // production uses the fixed, evaluated V7 weight below.
  const requestV11=data.modelVariant==='v11';
  activeNtuple=requestV11 ? (self.BossNtupleV11 || {status:()=>({ready:false}),preload:()=>Promise.resolve(false)}) : self.BossNtuple;
  // V13: lazy-load the selected N-Tuple only when its weight is nonzero.
  // V6 uses no N-Tuple model and performs ZERO compressed-model fetches.
  // Until loaded, normal/rage safely uses V6 scores for this decision.
  const ntWeight=Math.min(2,Math.max(0,Number(data.ntupleWeight??0)));
  if(ntWeight>0 && !activeNtuple.status().ready)activeNtuple.preload();
  const modelUsed=ntWeight>0 && activeNtuple.status().ready;
  const hazardWeight=Math.min(2,Math.max(0,Number(data.hazardWeight??0)));
  const hazardUsed=hazardWeight>0 && self.BossObstacleV8.status().ready;
  const immediate=candidates.map(c=>R.rateSide_AI7(c.side)+ntupleContribution(c.side,ntWeight)+obstacleContribution(c.side,hazardWeight));
  let best=0;
  for(let i=1;i<immediate.length;i++)if(immediate[i]>immediate[best])best=i;
  const mode=data.mode==='rage'?'rage':'normal';
  const seed=boardHash(R.AI7,mode);
  const budgetMs=Math.min(100,Math.max(10,Number(data.budgetMs)||40));
  currentDeadline=Date.now()+budgetMs;
  currentNodes=0;
  const samples=Math.min(4,Math.max(1,Number(data.samples)||2));
  let sum=candidates.map(()=>0);
  let completedSamples=0;
  // Only a complete sample round for ALL four roots may affect the result.
  for(let k=0;k<samples;k++) {
    const round=[];
    const sampleSeed=(seed + Math.imul(k+1,0x9e3779b1))>>>0 || 1;
    // V9 optional: estimate the probability of an opponent action before the
    // NEXT boss action, based on observed past player moves. No future state,
    // hidden player input, or game PRNG is inspected. V6/V7/V8 unchanged.
    const pace=Number(data.playerDelayEstimateMs);
    const v9=data.predictPlayerPace===true;
    const expectedBossMs=mode==='rage'?550:1650;
    const playerChance=v9 && Number.isFinite(pace) && pace>=300 && pace<=20000
      ? Math.min(.95,Math.max(.06,expectedBossMs/pace)) : .7;
    const playerEvent=tinyRandom(sampleSeed^0x054623c1)<playerChance;
    const roleRoll=tinyRandom(sampleSeed^0x39221712);
    const playerStyle=v9 ? (roleRoll<.50?'heuristic':roleRoll<.75?'greedy':'cautious') : 'heuristic';
    try {
      for(const candidate of candidates) {
        checkDeadline();
        round.push(samplePath(candidate,player,sampleSeed,playerEvent,ntWeight,hazardWeight,playerStyle));
      }
      checkDeadline();
    } catch(e) {
      if(e && e.message==='BOSS_BUDGET')break;
      throw e;
    }
    for(let i=0;i<round.length;i++)sum[i]+=round[i];
    completedSamples++;
  }
  if(completedSamples) {
    best=0;
    let bestVal=-Infinity;
    for(let i=0;i<candidates.length;i++) {
      const value=.45*(sum[i]/completedSamples)+.55*immediate[i];
      if(value>bestVal){bestVal=value;best=i;}
    }
  }
  return {index:candidates[best].index, completedSamples, nodes:currentNodes, mode:'forward',modelUsed,modelVariant:modelUsed?(requestV11?'v11':'v7'):null,hazardUsed,paceAware:data.predictPlayerPace===true};
}

self.onmessage=function(evt){
  const data=evt.data||{};
  try {
    // The live 7-1 goal is supplied by the game, not guessed by the Worker.
    BOSS_TARGET=Number.isSafeInteger(data.target) && data.target>=2000 && data.target<=200000
      ? data.target : 40000;
    if (data.mode==='analysis' || data.mode==='charge') {
      // The existing Expectimax handles long-thinking boss modes using the boss's fixed bonus.
      legacyExpectimax({data:{
        id:data.id, level:data.mode==='charge'?95:85,
        budgetMs:data.budgetMs, mergeBonus:BossRules.BOSS7_FIXED_MERGE_BONUS,
        spawn:[[16,.5],[32,.3],[64,.2]], special:data.special,
        candidates:(data.candidates||[]).map(c=>({index:c.index,board:c.side.board,score:c.side.score}))
      }});
      return;
    }
    self.postMessage(Object.assign({id:data.id},chooseForward(data)));
  } catch(e) {
    self.postMessage({id:data.id,index:null,error:true,reason:String(e&&e.message||'worker error')});
  }
};
