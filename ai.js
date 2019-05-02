var board,
  game = new Chess();
//  console.log(game.load('8/3qqk2/8/8/8/2Q5/3K4/8 w - - 1 45')); //test endgame
console.log(game.fen())
var dp = {};
// do not pick up pieces if the game is over
// only pick up pieces for White
var onDragStart = function(source, piece, position, orientation) {
  if (game.in_checkmate() === true || game.in_draw() === true ||
    piece.search(/^b/) !== -1) {
    return false;
  }
};

var makeRandomMove = function(game) {
  var possibleMoves = game.moves();

  // game over
  if (possibleMoves.length === 0) return;

  var randomIndex = Math.floor(Math.random() * possibleMoves.length);
  game.move(possibleMoves[randomIndex]);
  board.position(game.fen());
};
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
var makeMove = function() {
  console.log("Thinking");
  var moves = game.moves();

  // game over
  if (moves.length === 0) return;
  shuffle(moves);
  var move = -1, best = -9999999;
  for(var i = 0; i < moves.length; i++){
    game.move(moves[i]);
    var val = minimax(game, 2, false);
    game.undo();
    if(val > best){
      best = val;
      move = i;
    }
  }
  console.log("Branching factor: " + moves.length);
  game.move(moves[move]);
  board.position(game.fen());
};

var realMakeMove = function(){
  var c = 0;
  var url = new URL('https://explorer.lichess.ovh/master'), //opening book
    params = {
      fen: game.fen(),
      moves: 2,
      topGames: 0
    };
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
  fetch(url).then(function(data){
    var json = data.json();
    json.then(function(res){
      //console.log(res.moves);
      if(res.moves.length > 0){
        var move = res.moves[0].san;
        game.move(move);
        board.position(game.fen());
        console.log("Found move in opening book");
      } else{
        c++;
        if(c == 2) makeMove();
      }
    });
  });
  url = new URL('http://tablebase.lichess.ovh/standard'), //closing book
    params = {
      fen: game.fen()
    };
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))
  fetch(url).then(function(data){
    var json = data.json();
    json.then(function(res){
      console.log(res);
      if(res.wdl > 0){
        var move = res.moves[0].san;
        game.move(move);
        board.position(game.fen());
        console.log("Found move in closing book");
      } else{
        c++;
        if(c == 2) makeMove();
      }
    })
  });
}

var minimax = function(game, depth, alpha, beta, maximizingPlayer){
  if(depth == 0 || game.game_over()) return evaluateBoard(game);
  var moves = game.moves();
  shuffle(moves);
  if(maximizingPlayer){
    var val = -99999;
    for(var i = 0; i < moves.length; i++){
      game.move(moves[i]);
      val = Math.max(val, minimax(game, depth - 1, alpha, beta, !maximizingPlayer));
      game.undo();
      alpha = Math.max(alpha, val);
      if(beta <= alpha) break;
    }
    return val;
  } else{
    var val = 99999;
    for(var i = 0; i < moves.length; i++){
      game.move(moves[i]);
      val = Math.min(val, minimax(game, depth - 1, alpha, beta, !maximizingPlayer));
      game.undo();
      beta = Math.min(beta, val);
      if(beta <= alpha) break;
    }
    return val;
  }
}

var evaluateBoard = function (game) {
  var board = game.board();
  if(game.in_draw() || game.in_stalemate()){
    return -50;
  }
  if(game.in_checkmate()) totalEvaluation += 99999;
  if(game.in_check()) totalEvaluation += 1;
  if(game.turn() == 'b') totalEvaluation *= -1;
    var totalEvaluation = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
            totalEvaluation = totalEvaluation + getPieceValue(board[i][j]);
        }
    }
    return totalEvaluation;
};

var getPieceValue = function (piece) {
    if (piece === null) {
        return 0;
    }
    var getAbsoluteValue = function (piece) {
        if (piece.type === 'p') {
            return 10;
        } else if (piece.type === 'r') {
            return 50;
        } else if (piece.type === 'n') {
            return 30;
        } else if (piece.type === 'b') {
            return 30 ;
        } else if (piece.type === 'q') {
            return 90;
        } else if (piece.type === 'k') {
            return 900;
        }
        throw "Unknown piece type: " + piece.type;
    };

    var absoluteValue = getAbsoluteValue(piece, piece.color === 'w');
    return piece.color === 'b' ? absoluteValue : -absoluteValue;
};


var onDrop = function(source, target) {
  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q' // NOTE: always promote to a queen for example simplicity
  });

  // illegal move
  if (move === null) return 'snapback';
  // make  legal move for black
  window.setTimeout(realMakeMove, 250);
};

// update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
  board.position(game.fen());
};

var cfg = {
  draggable: true,
  position: game.fen(),
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};
board = ChessBoard('board', cfg);
