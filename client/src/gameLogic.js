// --- File: gameLogic.js ---
import {
    isValidWord,
    calculateScore,
    drawTiles,
    createEmptyBoard,
    createTileBag,
    setCookie,
    getCookie,
  } from "./utils";
  import { LETTER_VALUES } from "./constants";
  import io from "socket.io-client";

  export const calculatePotentialScore = (board) => {
    const playedTiles = [];
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        if (board[i][j]?.tile && !board[i][j]?.original) {
          playedTiles.push({ row: i, col: j, tile: board[i][j].tile });
        }
      }
    }

    if (playedTiles.length === 0) {
      return 0;
    }

    let totalScore = 0;
    const newlyPlayedTiles = new Set(
      playedTiles.map((tile) => `${tile.row},${tile.col}`)
    );

    const calculateWordScore = (tiles) => {
      let wordScore = 0;
      let wordMultiplier = 1;
      let hasNewTile = false;

      for (const tile of tiles) {
        const { row, col, tile: letter } = tile;
        const letterValue = LETTER_VALUES[letter] || 0;
        let tileScore = letterValue;

        if (newlyPlayedTiles.has(`${row},${col}`)) {
          hasNewTile = true;
          const bonus = board[row][col]?.bonus;
          if (bonus === "dl") {
            tileScore *= 2;
          } else if (bonus === "tl") {
            tileScore *= 3;
          } else if (bonus === "dw") {
            wordMultiplier *= 2;
          } else if (bonus === "tw") {
            wordMultiplier *= 3;
          }
        }

        wordScore += tileScore;
      }

      return hasNewTile ? wordScore * wordMultiplier : 0;
    };

    const getWordTiles = (startRow, startCol, isHorizontal) => {
      let tiles = [];
      let row = startRow;
      let col = startCol;

      // Move to the beginning of the word
      while (row >= 0 && col >= 0 && board[row][col]?.tile) {
        isHorizontal ? col-- : row--;
      }
      isHorizontal ? col++ : row++;

      // Collect all tiles in the word
      while (row < 15 && col < 15 && board[row][col]?.tile) {
        tiles.push({ row, col, tile: board[row][col].tile });
        isHorizontal ? col++ : row++;
      }

      return tiles;
    };

    // If only one tile is played, consider it horizontal by default
    const isHorizontal =
      playedTiles.length > 1 ? playedTiles[0].row === playedTiles[1].row : true;

    // Score the main word
    if (playedTiles.length > 0) {
      const mainWordTiles = getWordTiles(
        playedTiles[0].row,
        playedTiles[0].col,
        isHorizontal
      );
      totalScore += calculateWordScore(mainWordTiles);
    }

    // Score perpendicular words formed by the played tiles
    for (const tile of playedTiles) {
      const perpendicularWordTiles = getWordTiles(
        tile.row,
        tile.col,
        !isHorizontal
      );
      // Only score if it's a valid word (length > 1) and contains a new tile
      if (
        perpendicularWordTiles.length > 1 &&
        perpendicularWordTiles.some((t) => newlyPlayedTiles.has(`${t.row},${t.col}`))
      ) {
        totalScore += calculateWordScore(perpendicularWordTiles);
      }
    }

    return totalScore;
  };

  export const handleExchange = (
    gameId,
    selectedTile,
    players,
    currentPlayer,
    board,
    setBoard,
    setPlayers,
    setSelectedTile,
    setPotentialScore,
    setCurrentPlayer,
    socket,
    setTurnTimerKey,
  ) => {
    if (selectedTile && selectedTile.from.type === "rack") {
      const tileToExchange = selectedTile.tile;
      const newRack = [...players[currentPlayer].rack];
      const tileIndex = newRack.indexOf(tileToExchange);

      if (tileIndex > -1) {
        // Remove the selected tile from the rack
        newRack.splice(tileIndex, 1);

        // Clear any unplayed tiles from the board and add them back to the player's rack
        const newBoard = [...board];
        for (let i = 0; i < 15; i++) {
          for (let j = 0; j < 15; j++) {
            if (newBoard[i][j].tile && !newBoard[i][j].original) {
              newRack.push(newBoard[i][j].tile);
              newBoard[i][j] = { ...newBoard[i][j], tile: null };
            }
          }
        }

        const updatedPlayers = [...players];
        updatedPlayers[currentPlayer] = {
          ...players[currentPlayer],
          rack: newRack,
        };

        // Update the state for the current player
        setBoard(newBoard);
        setPlayers(updatedPlayers);
        setSelectedTile(null);
        setPotentialScore(0);

        // Reset the turn timer and increment the key
        setTurnTimerKey((prevKey) => prevKey + 1);

        // Switch to the next player
        const nextPlayer = (currentPlayer + 1) % 2;
        //   setCurrentPlayer(nextPlayer);

        // Emit the updated board, rack, and exchange to the server
        socket.emit("updateBoard", newBoard);
        socket.emit("updateRack", {
          gameId: gameId,
          playerId: updatedPlayers[currentPlayer].playerId,
          rack: newRack,
        });
        socket.emit("exchangeTile", {
          gameId: gameId,
          playerId: updatedPlayers[currentPlayer].playerId,
          rack: newRack,
          tileToExchange: tileToExchange,
          currentPlayer: currentPlayer,
        });
        socket.emit("passTurn", {
          gameId: gameId,
          currentPlayer: currentPlayer,
        });

      }
    } else {
      alert("Please select a tile from your rack to exchange.");
    }
  };

  export const checkIsCurrentPlayerTurn = (
    gameStarted,
    socketRef,
    players,
    currentPlayer,
    playerId
  ) => {
    if (!gameStarted || !socketRef.current || players.length < 2) {
      return false;
    }

    // Check if the current player's ID matches the ID of the player whose turn it is
    return players[currentPlayer]?.playerId === playerId;
  };

  export const handleTurnTimeout = (
    gameId,
    board,
    players,
    currentPlayer,
    setBoard,
    setPlayers,
    setSelectedTile,
    setPotentialScore,
    socket,
    setTurnTimerKey,
    gameStarted,
    playerId
) => {
    console.log('handleTurnTimeout called with:', {
        gameId,
        currentPlayer,
        playerId,
        gameStarted
    });

    if (!gameStarted || !socket) {
        console.log('Game not started or socket not available');
        return;
    }

    console.log('Checking if current player turn:', {
        currentPlayerIndex: players[currentPlayer]?.playerId,
        playerId
    });

    if (players[currentPlayer]?.playerId != playerId) {
        console.log('Handling pass for player timeout');
        
        // Create a new board state removing any unplayed tiles
        const newBoard = [...board];
        const newRack = [...players[currentPlayer].rack];
        let tilesReturned = false;

        // Remove unplayed tiles and return them to the player's rack
        for (let i = 0; i < 15; i++) {
            for (let j = 0; j < 15; j++) {
                if (newBoard[i][j].tile && !newBoard[i][j].original) {
                    console.log('Returning unplayed tile to rack:', newBoard[i][j].tile);
                    newRack.push(newBoard[i][j].tile);
                    newBoard[i][j] = { ...newBoard[i][j], tile: null };
                    tilesReturned = true;
                }
            }
        }

        // Update the state for the current player
        const updatedPlayers = [...players];
        updatedPlayers[currentPlayer].rack = newRack;

        console.log('Updating game state and emitting events');
        
        // Update local state
        setBoard(newBoard);
        setPlayers(updatedPlayers);
        setSelectedTile(null);
        setPotentialScore(0);
        setTurnTimerKey(prev => prev + 1);

        // Emit events to server
        socket.emit("updateBoard", newBoard);
        socket.emit("updateRack", {
            gameId: gameId,
            playerId: playerId,
            rack: newRack,
        });
        socket.emit("passTurn", {
            gameId: gameId,
            currentPlayer: currentPlayer,
        });

        console.log('Turn timeout handling complete');
    } else {
        console.log('It is player\'s turn, ignoring timeout');
    }
};

  export const handlePass = (
    gameId,
    board,
    players,
    currentPlayer,
    setBoard,
    setPlayers,
    setSelectedTile,
    setPotentialScore,
    socket,
    setTurnTimerKey,
  ) => {
    // Added socket here
    // Ensure socket is available
    if (!socket) {
      console.error("Socket not initialized");
      return;
    }

    // 1. Remove unplayed tiles from the board and return them to the player's rack
    const newBoard = [...board];
    const newRack = [...players[currentPlayer].rack];

    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
        if (newBoard[i][j].tile && !newBoard[i][j].original) {
          newRack.push(newBoard[i][j].tile);
          newBoard[i][j] = { ...newBoard[i][j], tile: null }; // Remove tile visually
        }
      }
    }

    // 2. Update the state for the current player
    const updatedPlayers = [...players];
    updatedPlayers[currentPlayer].rack = newRack;

    setBoard(newBoard); // Update the board state to visually remove tiles
    setPlayers(updatedPlayers);
    setSelectedTile(null);
    setPotentialScore(0);

    // Emit the necessary events to the server
    socket.emit("updateBoard", newBoard);
    socket.emit("updateRack", {
      gameId: gameId,
      playerId: updatedPlayers[currentPlayer].playerId,
      rack: newRack,
    });
    socket.emit("passTurn", {
      gameId: gameId,
      currentPlayer: currentPlayer, // Send the current player (before the pass)
    });

    setTurnTimerKey((prevKey) => prevKey + 1);
  };

  export const handleShuffle = (players, playerId, socket, gameId, setPlayers) => {
    console.log("handleShuffle - Start");
    if (!socket) {
        console.error("handleShuffle - Socket is not connected");
        return;
    }
    if (!gameId) {
        console.error("handleShuffle - gameId is not defined");
        return;
    }
    if (!playerId) {
        console.error("handleShuffle - playerId is not defined");
        return;
    }

    // Find the player in the players array
    const player = players.find(p => p.playerId === playerId);
    if (!player) {
        console.error("handleShuffle - Could not find player in players array");
        return;
    }

    const currentRack = [...player.rack];
    console.log("handleShuffle - Current Rack Before Shuffle:", currentRack);

    // Shuffle the rack
    for (let i = currentRack.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [currentRack[i], currentRack[j]] = [currentRack[j], currentRack[i]];
    }
    console.log("handleShuffle - Current Rack After Shuffle:", currentRack);

    // Update the local state
    const updatedPlayers = players.map(p => 
        p.playerId === playerId 
            ? { ...p, rack: currentRack }
            : p
    );

    // Update the players state
    setPlayers(updatedPlayers);
    console.log("handleShuffle - Updated Players:", updatedPlayers);

    // Emit the shuffleRack event to the server
    socket.emit('shuffleRack', {
        gameId: gameId,
        playerId: playerId,
        rack: currentRack
    });

    console.log("handleShuffle - Emitted shuffleRack to server");
};

  export const handleSelectBlankTile = (
    letter,
    blankTilePosition,
    board,
    setBoard,
    updatePotentialScore,
    socket,
    setShowBlankTileModal,
    setBlankTilePosition,
    players,
    playerId,
    gameId
  ) => {
    // Added gameId
    if (blankTilePosition) {
      const { row, col } = blankTilePosition;
      const newBoard = [...board];

      // Update the tile on the board with the selected letter and originalTileValue
      newBoard[row][col] = {
        ...newBoard[row][col],
        tile: letter,
        originalTileValue: "_",
        original: false,
      };
      setBoard(newBoard);
      updatePotentialScore();

      // Remove the blank tile from the player's rack
      const updatedPlayers = [...players];
      const player = updatedPlayers.find((p) => p.playerId === playerId);
      if (player) {
        const rackIndex = player.rack.indexOf("_");
        if (rackIndex > -1) {
          player.rack.splice(rackIndex, 1);
        }
      }

      // Emit updateBoard and updateRack events to the server
      socket.emit("updateBoard", newBoard);
      socket.emit("updateRack", {
        gameId: gameId, // Now using the correct gameId
        playerId: playerId,
        rack: player ? player.rack : [],
      });

      // Close the modal and reset blank tile position
      setShowBlankTileModal(false);
      setBlankTilePosition(null);
    }
  };

  export const handleNewGame = (
    gameId,
    setBoard,
    setPlayers,
    setCurrentPlayer,
    setBag,
    setSelectedTile,
    setGameStarted,
    setError,
    setPotentialScore,
    setShowBlankTileModal,
    setBlankTilePosition,
    setTurnEndScore,
    setShowStarEffects,
    setPlayEndTurnAudio,
    setGameOver,
    socketRef,
    setSocket,
    SERVER_URL,
    setLastPlayedTiles,
    setSecondToLastPlayedTiles,
    setIsGameTimerPaused,
    setIsTurnTimerPaused
) => {
    // Set gameStarted to false immediately
    setGameStarted(false);
    setGameOver(false);

    // Emit a signal to the server to remove the current game using the old socket
    if (gameId && socketRef.current) {
        socketRef.current.emit('removeGame', gameId);
    }

    // Expire the player-id cookie immediately
    setCookie('player-id', '', 0);

    if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
    }

    // Reset all game states
    setBoard(createEmptyBoard());
    setPlayers([
        { score: 0, rack: [], socketId: null },
        { score: 0, rack: [], socketId: null }
    ]);
    setCurrentPlayer(0);
    setBag([]);
    setSelectedTile(null);
    setError('');
    setPotentialScore(0);
    setShowBlankTileModal(false);
    setBlankTilePosition(null);
    setTurnEndScore(0);
    setShowStarEffects(false);
    setPlayEndTurnAudio(false);
    setLastPlayedTiles([]);
    setSecondToLastPlayedTiles([]);
    setIsGameTimerPaused(true);
    setIsTurnTimerPaused(true);

    // Create new player ID and reconnect
    const newPlayerId = Math.random().toString(36).substr(2, 9);
    setCookie("player-id", newPlayerId, 365);

    const newSocket = io(SERVER_URL);
    newSocket.on("connect", () => {
        console.log("New socket connected, emitting joinGame for", newPlayerId);
        newSocket.emit("joinGame", newPlayerId);
    });

    setSocket(newSocket);
    socketRef.current = newSocket;
};

export const handlePlayWord = async (
  gameId,
  board,
  players,
  currentPlayer,
  bag,
  socket,
  setTurnEndScore,
  setShowStarEffects,
  setPlayEndTurnAudio,
  setCurrentPlayer,
  setSelectedTile,
  setPotentialScore,
  setBag,
  setBoard,
  setPlayers,
  setLastPlayedTiles,
  setSecondToLastPlayedTiles,
  lastPlayedTiles,
  setTurnTimerKey,
  setGameOver
) => {
  const playedTiles = [];
  for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 15; j++) {
          if (board[i][j].tile && !board[i][j].original) {
              playedTiles.push({ row: i, col: j, tile: board[i][j].tile });
          }
      }
  }

  if (playedTiles.length === 0) {
      alert("No tiles have been played.");
      return;
  }

  const isHorizontal = playedTiles.length === 1 || playedTiles.every((tile) => tile.row === playedTiles[0].row);
  const isVertical = playedTiles.length === 1 || playedTiles.every((tile) => tile.col === playedTiles[0].col);

  if (!isHorizontal && !isVertical) {
      alert("Invalid word placement. Tiles must be in a straight line.");
      return;
  }

  const isFirstPlay = !board.some(row => row.some(cell => cell.tile && cell.original));
  const wordPassesThroughCenter = playedTiles.some(tile => tile.row === 7 && tile.col === 7);
  const isConnectedToExistingWord = playedTiles.some(tile => {
      const { row, col } = tile;
      return (
          (row > 0 && board[row-1][col].tile && board[row-1][col].original) ||
          (row < 14 && board[row+1][col].tile && board[row+1][col].original) ||
          (col > 0 && board[row][col-1].tile && board[row][col-1].original) ||
          (col < 14 && board[row][col+1].tile && board[row][col+1].original)
      );
  });

  if (isFirstPlay) {
      if (!wordPassesThroughCenter) {
          alert("Invalid word placement - First word needs to connect to the center of the board");
          return;
      }
  } else if (!isConnectedToExistingWord) {
      alert("Invalid word placement - must connect to existing words");
      return;
  }

  playedTiles.sort((a, b) => (isHorizontal ? a.col - b.col : a.row - b.row));

  let allWords = [];
  let totalScore = 0;

  const addWordAndScore = (newWord, tiles) => {
      if (newWord.length > 1) {
          allWords.push(newWord);
          totalScore += calculateScore(tiles, board);
      }
  };

  const processWord = (currentRow, currentCol, isMainWord = false) => {
      let tempWord = "";
      let tempTiles = [];
      let i = currentRow;
      let j = currentCol;

      if (isMainWord) {
          if (isHorizontal) {
              while (j >= 0 && board[i][j].tile) {
                  j--;
              }
              j++;
              while (j < 15 && board[i][j].tile) {
                  tempWord += board[i][j].tile;
                  tempTiles.push({ row: i, col: j, tile: board[i][j].tile });
                  j++;
              }
          } else {
              while (i >= 0 && board[i][j].tile) {
                  i--;
              }
              i++;
              while (i < 15 && board[i][j].tile) {
                  tempWord += board[i][j].tile;
                  tempTiles.push({ row: i, col: j, tile: board[i][j].tile });
                  i++;
              }
          }
      } else {
          if (!isHorizontal) {
              while (j >= 0 && board[i][j].tile) {
                  j--;
              }
              j++;
              while (j < 15 && board[i][j].tile) {
                  tempWord += board[i][j].tile;
                  tempTiles.push({ row: i, col: j, tile: board[i][j].tile });
                  j++;
              }
          } else {
              while (i >= 0 && board[i][j].tile) {
                  i--;
              }
              i++;
              while (i < 15 && board[i][j].tile) {
                  tempWord += board[i][j].tile;
                  tempTiles.push({ row: i, col: j, tile: board[i][j].tile });
                  i++;
              }
          }
      }

      if (tempWord.length > 1) {
          addWordAndScore(tempWord, tempTiles);
      }
  };

  let [startRow, startCol] = [playedTiles[0].row, playedTiles[0].col];
  processWord(startRow, startCol, true);

  for (let tile of playedTiles) {
      if (isHorizontal) {
          processWord(tile.row, tile.col, false);
      } else {
          processWord(tile.row, tile.col, false);
      }
  }

  for (let word of allWords) {
      if (!(await isValidWord(word, board))) {
          alert(`Invalid word: "${word}"`);
          return;
      }
  }

  if (totalScore === 0) {
      alert("Invalid word placement - must create at least one scoring word");
      return;
  }

  const newBoard = board.map((row) =>
      row.map((cell) => ({
          ...cell,
          original: cell.original || cell.tile !== null,
      }))
  );

  // Set the turn end score
  setTurnEndScore(totalScore);

  // Trigger star effects and audio
  setShowStarEffects(true);
  setPlayEndTurnAudio(true);

  // Store the previous last played tiles before updating
  setSecondToLastPlayedTiles(lastPlayedTiles);
  setLastPlayedTiles(playedTiles);

  // Reset the turn timer and increment the key
  setTurnTimerKey((prevKey) => prevKey + 1);

  setTimeout(() => {
      setShowStarEffects(false);
      const nextPlayer = (currentPlayer + 1) % 2;
      setSelectedTile(null);
      setPotentialScore(0);

      let updatedPlayers = [...players];
      const tilesToDraw = Math.max(0, 7 - updatedPlayers[currentPlayer].rack.length);
      const newTiles = drawTiles(bag, tilesToDraw);

      updatedPlayers[currentPlayer].rack = [...updatedPlayers[currentPlayer].rack, ...newTiles];
      updatedPlayers[currentPlayer].score += totalScore;

      // Check for game end condition and calculate final scores
      if (bag.length === 0 && (updatedPlayers[0].rack.length === 0 || updatedPlayers[1].rack.length === 0)) {
          // Calculate and apply deductions for remaining tiles
          updatedPlayers = updatedPlayers.map(player => {
              const deduction = player.rack.reduce((sum, tile) => sum + LETTER_VALUES[tile], 0);
              return {
                  ...player,
                  score: player.score - deduction
              };
          });
          setGameOver(true);
      }

      setPlayers(updatedPlayers);
      setBag(bag.filter((tile) => !newTiles.includes(tile)));
      setBoard(newBoard);

      socket.emit("playWord", {
          gameId: gameId,
          board: newBoard,
          players: updatedPlayers,
          currentPlayer: currentPlayer,
          bag: bag.filter((tile) => !newTiles.includes(tile)),
          newTiles: newTiles,
          lastPlayedTiles: playedTiles,
          secondToLastPlayedTiles: lastPlayedTiles
      });
  }, 1500);
};