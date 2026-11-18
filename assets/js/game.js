(() => {
'use strict';
const SIZE=8, HUMAN='w', CPU='b';
const boardEl=document.getElementById('board');
const hintEl=document.getElementById('hint');
const turnEl=document.getElementById('turn-label');
const stateEl=document.getElementById('game-state');
const $=id=>document.getElementById(id);
let board=[],turn=HUMAN,selected=null,legalMoves=[],history=[],lastMove=null,locked=false,gameOver=false;
const inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const clone=b=>b.map(row=>row.map(p=>p?{...p}:null));
const enemy=color=>color===HUMAN?CPU:HUMAN;
const dirs=[[-1,-1],[-1,1],[1,-1],[1,1]];
function initial(){return Array.from({length:8},(_,r)=>Array.from({length:8},(_,c)=>((r+c)%2===1&&r<3)?{color:CPU,king:false}:((r+c)%2===1&&r>4)?{color:HUMAN,king:false}:null));}
function count(color){return board.flat().filter(p=>p&&p.color===color).length;}
function capturesFrom(b,r,c,p){
 const found=[];
 if(!p.king){
  for(const [dr,dc] of dirs){let mr=r+dr,mc=c+dc,tr=r+2*dr,tc=c+2*dc;if(inside(tr,tc)&&b[mr]?.[mc]?.color===enemy(p.color)&&!b[tr][tc])found.push({from:[r,c],to:[tr,tc],captures:[[mr,mc]]});}
 }else{
  for(const [dr,dc] of dirs){let nr=r+dr,nc=c+dc,victim=null;
   while(inside(nr,nc)){
    const q=b[nr][nc];
    if(q){if(q.color===p.color||victim)break;victim=[nr,nc];}
    else if(victim)found.push({from:[r,c],to:[nr,nc],captures:[victim]});
    nr+=dr;nc+=dc;
   }
  }
 }
 return found;
}
function quietFrom(b,r,c,p){
 const found=[];
 if(!p.king){const dr=p.color===HUMAN?-1:1;for(const dc of [-1,1]){const nr=r+dr,nc=c+dc;if(inside(nr,nc)&&!b[nr][nc])found.push({from:[r,c],to:[nr,nc],captures:[]});}}
 else for(const [dr,dc] of dirs){let nr=r+dr,nc=c+dc;while(inside(nr,nc)&&!b[nr][nc]){found.push({from:[r,c],to:[nr,nc],captures:[]});nr+=dr;nc+=dc;}}
 return found;
}
function captureSequences(b,r,c,p,path=[],taken=[]){
 const options=capturesFrom(b,r,c,p).filter(m=>!taken.some(([x,y])=>x===m.captures[0][0]&&y===m.captures[0][1]));
 if(!options.length)return path.length?[{from:path[0].from,to:path[path.length-1].to,captures:path.flatMap(x=>x.captures),steps:path}]:[];
 let all=[];
 for(const m of options){
  const next=clone(b);next[r][c]=null;for(const [x,y] of m.captures)next[x][y]=null;
  const [nr,nc]=m.to;next[nr][nc]=p;
  const reaches=p.color===HUMAN?nr===0:nr===7;
  if(!p.king&&reaches){all.push({from:path.length?path[0].from:m.from,to:m.to,captures:[...path.flatMap(x=>x.captures),...m.captures],steps:[...path,m]});continue;}
  all.push(...captureSequences(next,nr,nc,p,[...path,m],[...taken,...m.captures]));
 }
 return all;
}
function allMoves(b,color){
 let caps=[];
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];if(p&&p.color===color)caps.push(...captureSequences(b,r,c,p));}
 if(caps.length){const max=Math.max(...caps.map(m=>m.captures.length));return caps.filter(m=>m.captures.length===max);}
 const moves=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];if(p&&p.color===color)moves.push(...quietFrom(b,r,c,p));}
 return moves;
}
function execute(b,move){
 const next=clone(b),p=next[move.from[0]][move.from[1]];next[move.from[0]][move.from[1]]=null;
 for(const [r,c] of move.captures)next[r][c]=null;
 const [r,c]=move.to;const promoted=!p.king&&((p.color===HUMAN&&r===0)||(p.color===CPU&&r===7));
 next[r][c]={...p,king:p.king||promoted};return next;
}
function render(){
 boardEl.innerHTML='';
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const sq=document.createElement('button');sq.type='button';sq.className='square '+((r+c)%2?'dark':'light');sq.setAttribute('role','gridcell');sq.setAttribute('aria-label',String.fromCharCode(65+c)+(8-r));
  if(lastMove&&([lastMove.from,lastMove.to].some(([x,y])=>x===r&&y===c)))sq.classList.add('last-move');
  if(selected&&selected[0]===r&&selected[1]===c)sq.classList.add('selected');
  const target=legalMoves.find(m=>m.from[0]===selected?.[0]&&m.from[1]===selected?.[1]&&m.to[0]===r&&m.to[1]===c);
  if(target)sq.classList.add(target.captures.length?'capture-target':'legal');
  const p=board[r][c];if(p){const piece=document.createElement('span');piece.className='piece-on-board '+(p.color===HUMAN?'white':'black')+(p.king?' king':'');sq.appendChild(piece);}
  sq.addEventListener('click',()=>clickSquare(r,c));boardEl.appendChild(sq);
 }
 $('white-count').textContent=count(HUMAN);$('black-count').textContent=count(CPU);
 turnEl.textContent=gameOver?'PARTIDA ENCERRADA':turn===HUMAN?'SUA VEZ':'VEZ DO ROYAL BOT';
 stateEl.textContent=gameOver?'FIM DE JOGO':turn===HUMAN?'AGUARDANDO SEU MOVIMENTO':'IA PENSANDO';
}
function clickSquare(r,c){
 if(locked||gameOver||turn!==HUMAN)return;
 const p=board[r][c];
 if(selected){
  const move=legalMoves.find(m=>m.from[0]===selected[0]&&m.from[1]===selected[1]&&m.to[0]===r&&m.to[1]===c);
  if(move){history.push({board:clone(board),turn,lastMove});board=execute(board,move);lastMove=move;selected=null;legalMoves=[];render();finishTurn();return;}
 }
 if(p&&p.color===HUMAN){selected=[r,c];legalMoves=allMoves(board,HUMAN).filter(m=>m.from[0]===r&&m.from[1]===c);hintEl.textContent=legalMoves.some(m=>m.captures.length)?'Captura obrigatória: escolha uma casa destacada.':'Escolha uma casa destacada para mover.';}
 else {selected=null;legalMoves=[];hintEl.textContent='Selecione uma peça sua.';}
 render();
}
function finishTurn(){
 turn=enemy(turn);selected=null;legalMoves=[];
 const moves=allMoves(board,turn);
 if(count(turn)===0||moves.length===0){gameOver=true;render();showResult(turn===CPU?'Você venceu!':'O Royal Bot venceu!',turn===CPU?'Excelente estratégia. Você dominou o tabuleiro.':'Dessa vez o bot levou a melhor. Tente novamente e ajuste sua estratégia.');return;}
 render();
 if(turn===CPU){locked=true;hintEl.textContent='O Royal Bot está calculando...';setTimeout(cpuTurn,450);}
 else hintEl.textContent='Sua vez. Boa partida!';
}
function evaluate(b){
 let score=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];if(!p)continue;let v=p.king?3.2:1+(p.color===HUMAN?(6-r)*.035:(r-1)*.035);score+=p.color===CPU?v:-v;}return score;
}
function chooseCpuMove(){
 const moves=allMoves(board,CPU),level=$('difficulty').value;
 if(level==='easy')return moves[Math.floor(Math.random()*moves.length)];
 let scored=moves.map(m=>({m,score:evaluate(execute(board,m))+(m.captures.length*1.8)}));
 scored.sort((a,b)=>b.score-a.score);
 if(level==='medium'){const top=scored.slice(0,Math.min(3,scored.length));return top[Math.floor(Math.random()*top.length)].m;}
 let best=-Infinity,chosen=scored[0].m;
 for(const item of scored){const after=execute(board,item.m),reply=allMoves(after,HUMAN);let worst=Infinity;
  for(const response of reply){const score=evaluate(execute(after,response));if(score<worst)worst=score;}
  const total=reply.length?worst:evaluate(after);if(total>best){best=total;chosen=item.m;}
 }
 return chosen;
}
function cpuTurn(){
 if(gameOver)return;const move=chooseCpuMove();if(!move){locked=false;gameOver=true;showResult('Você venceu!','O Royal Bot não tem movimentos disponíveis.');render();return;}
 history.push({board:clone(board),turn,lastMove});board=execute(board,move);lastMove=move;locked=false;render();finishTurn();
}
function showResult(title,message){$('modal-title').textContent=title;$('modal-text').textContent=message;$('message-dialog').showModal();}
function newGame(){board=initial();turn=HUMAN;selected=null;legalMoves=[];history=[];lastMove=null;locked=false;gameOver=false;hintEl.textContent='Selecione uma peça para ver os movimentos possíveis.';$('undo').disabled=true;render();}
$('new-game').addEventListener('click',newGame);
$('undo').addEventListener('click',()=>{if(!history.length||locked)return;const prev=history.pop();board=prev.board;turn=prev.turn;lastMove=prev.lastMove;selected=null;legalMoves=[];gameOver=false;locked=false;render();$('undo').disabled=history.length===0;hintEl.textContent='Último movimento desfeito.';});
$('difficulty').addEventListener('change',()=>{$('cpu-level').textContent={easy:'Inteligência iniciante',medium:'Inteligência intermediária',hard:'Inteligência avançada'}[$('difficulty').value];});
$('modal-close').addEventListener('click',()=>$('message-dialog').close());
$('rules').addEventListener('click',()=>$('rules-dialog').showModal());
$('rules-close').addEventListener('click',()=>$('rules-dialog').close());
newGame();
})();