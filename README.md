# Scrabble Game

This is a real-time, multiplayer Scrabble game built using React, Node.js, and Socket.IO. It allows two players to compete against each other, taking turns to place words on a virtual Scrabble board.

## Features

-   **Real-time Gameplay:**  Uses Socket.IO for instant communication between players, allowing for a seamless and interactive experience.
-   **Drag and Drop Interface:** Players can drag and drop tiles from their rack onto the board, making it intuitive to form words.
-   **Word Validation:**  The game automatically validates words played against a dictionary to ensure they are legitimate Scrabble words.
-   **Score Calculation:**  Calculates scores accurately based on tile values and bonus squares (double letter, triple letter, double word, triple word).
-   **Turn-Based System:**  Implements a clear turn-based system, letting players know whose turn it is.
-   **Tile Bag:**  Simulates a Scrabble tile bag, randomly drawing tiles for each player.
-   **Exchange Tiles:** Allows players to exchange tiles from their rack with the bag
-   **Pass Turn:** Allows players to pass their turn
-   **Shuffle Rack:** Allows players to shuffle their rack
-   **Game End:** The game ends when one of the players has no tiles left, or when the bag is empty.
-   **Waiting Lobby:** Players are automatically placed into a waiting lobby and matched with an opponent as soon as one is available.
-   **New Game:** Players can start a new game once the current game has ended, and are automatically assigned a unique player ID.

## Technology Stack

-   **Frontend:**
    -   React
    -   `react-beautiful-dnd` (for drag and drop)
    -   `react-dnd-touch-backend` (for touch support on mobile devices)
    -   Socket.IO client
    -   Tailwind CSS (for styling)
    -   `lucide-react` (for the star animation)
-   **Backend:**
    -   Node.js
    -   Express.js
    -   Socket.IO
-   **Dictionary:** A `words.txt` file is used for word validation.

## Project Structure

-   `client/`: Contains the React frontend code.
    -   `src/`:
        -   `components/`: React components for the game (Board, Rack, Tile, etc.).
        -   `utils.js`: Utility functions (e.g., creating the board, tile bag, calculating scores, cookie management).
        -   `gameLogic.js`: Functions for game logic (handling player turns, word validation, etc.).
        -   `dndHandlers.js`: Functions for handling drag and drop events.
        -   `audioUtils.js`: Functions and hooks for playing game sounds
        -   `App.js`: The main application component.
        -   `index.js`: Entry point for the React app.
-   `server/`: Contains the Node.js backend code.
    -   `gameManager.js`:  Handles game creation, player matching, and game state management.
    -   `server-utils.js`: Utility functions for the server-side logic.
    -   `server.js`: The main server file.
-   `words.txt`: A dictionary file containing valid Scrabble words.

## Setup and Installation

1. **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2. **Install dependencies:**

    ```bash
    # Install client dependencies
    cd client
    npm install

    # Install server dependencies
    cd ../server
    npm install
    ```

3. **Run the application:**

    ```bash
    # Start the server
    cd ../server
    npm run server

    # Start the client (in a separate terminal)
    cd ../client
    npm start
    ```

    The application should open in your browser at `http://localhost:3000`.

## How to Play

1. Open the application in two separate browser windows or tabs (to simulate two players).
2. Each player will be automatically assigned a unique player ID and placed in a waiting lobby.
3. Once two players are in the lobby, a game will start automatically.
4. Players take turns dragging and dropping tiles from their rack onto the board to form words.
5. Click "Play Word" to submit a word.
6. The game will validate the word and calculate the score.
7. If a word is invalid, the player can retry or remove their tiles from the board.
8. The game continues until one of the players uses up all of their tiles or the tile bag is empty.
9. The player with the highest score at the end of the game wins.
10. Click "New Game" to start a fresh game.

## Contributing

Contributions are welcome! If you find any bugs or have suggestions for improvements, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.