// dndHandlers.js
export const onDragEnd = (result, board, players, currentPlayer, setBoard, setPlayers, setShowBlankTileModal, setBlankTilePosition, socket, updatePotentialScore, setSelectedTile, gameId, playerId) => {
    const { destination, source } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return;
    }

    if (destination.droppableId === 'rack' && source.droppableId === 'rack') {
        const newRack = [...players.find(p => p.playerId === playerId).rack];
        const [movedTile] = newRack.splice(source.index, 1);
        newRack.splice(destination.index, 0, movedTile);

        const updatedPlayers = [...players];
        updatedPlayers[currentPlayer] = { ...players.find(p => p.playerId === playerId), rack: newRack };
        setPlayers(updatedPlayers);
        socket.emit('updateRack', { gameId: gameId, playerId: playerId, rack: newRack, currentPlayer: currentPlayer });
        return;
    }

    if (source.droppableId === 'rack' && destination.droppableId.startsWith('cell-')) {
        const [row, col] = destination.droppableId.split('-').slice(1).map(Number);
        const tile = players.find(p => p.playerId === playerId).rack[source.index];

        if (tile === '_') {
            setShowBlankTileModal(true);
            setBlankTilePosition({ row, col, from: 'drag' });

            const newRack = [...players.find(p => p.playerId === playerId).rack];
            newRack.splice(source.index, 1);
            const updatedPlayers = [...players];
            updatedPlayers[currentPlayer] = { ...players.find(p => p.playerId === playerId), rack: newRack };
            setPlayers(updatedPlayers);

            setSelectedTile({ tile: tile, from: { type: 'rack', index: source.index } });
            return;
        }

        const newBoard = [...board];
        newBoard[row][col] = { tile, bonus: newBoard[row][col].bonus, original: false };
        setBoard(newBoard);

        const newRack = [...players.find(p => p.playerId === playerId).rack];
        newRack.splice(source.index, 1);

        const updatedPlayers = [...players];
        updatedPlayers[currentPlayer] = { ...players.find(p => p.playerId === playerId), rack: newRack };
        setPlayers(updatedPlayers);

        socket.emit('updateBoard', newBoard);
        socket.emit('updateRack', { gameId: gameId, playerId: playerId, rack: newRack, currentPlayer: currentPlayer });
    }

    if (source.droppableId.startsWith('cell-') && destination.droppableId === 'rack') {
        const [sourceRow, sourceCol] = source.droppableId.split('-').slice(1).map(Number);
        const tile = board[sourceRow][sourceCol].tile;
        const originalTileValue = board[sourceRow][sourceCol].originalTileValue;

        if (originalTileValue === '_') {
            const newBoard = [...board];
            newBoard[sourceRow][sourceCol] = { tile: null, bonus: newBoard[sourceRow][sourceCol].bonus, original: false };
            setBoard(newBoard);

            const newRack = [...players.find(p => p.playerId === playerId).rack];
            newRack.splice(destination.index, 0, '_');

            const updatedPlayers = [...players];
            updatedPlayers[currentPlayer] = { ...players.find(p => p.playerId === playerId), rack: newRack };
            setPlayers(updatedPlayers);

            socket.emit('updateBoard', newBoard);
            socket.emit('updateRack', { gameId: gameId, playerId: playerId, rack: newRack, currentPlayer: currentPlayer });
        } else {
            const newBoard = [...board];
            newBoard[sourceRow][sourceCol] = { tile: null, bonus: newBoard[sourceRow][sourceCol].bonus, original: false };
            setBoard(newBoard);

            const newRack = [...players.find(p => p.playerId === playerId).rack];
            const newTile = originalTileValue ? originalTileValue : tile;
            newRack.splice(destination.index, 0, newTile);

            const updatedPlayers = [...players];
            updatedPlayers[currentPlayer] = { ...players.find(p => p.playerId === playerId), rack: newRack };
            setPlayers(updatedPlayers);

            socket.emit('updateBoard', newBoard);
            socket.emit('updateRack', { gameId: gameId, playerId: playerId, rack: newRack, currentPlayer: currentPlayer });
        }
    }
    updatePotentialScore();
  };