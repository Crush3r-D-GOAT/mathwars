import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { saveGameData, fetchHighScore } from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/2048.css';

const Game2048 = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [grid, setGrid] = useState(Array(4).fill().map(() => Array(4).fill(0)));
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const [gameSaved, setGameSaved] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  // Fetch high score when component mounts or user changes
  useEffect(() => {
    const loadHighScore = async () => {
      if (user?.userid) {
        try {
          setLoading(true);
          const savedHighScore = await fetchHighScore(user.userid, 1); // 1 is the game ID for 2048
          setHighScore(parseInt(savedHighScore) || 0);
        } catch (error) {
          console.error('Failed to load high score:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadHighScore();
  }, [user?.userid]);

  // Initialize the game
  const initGame = useCallback(() => {
    const newGrid = Array(4).fill().map(() => Array(4).fill(0));
    addNewTile(newGrid);
    addNewTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
    setIsNewHighScore(false);
  }, []);

  // Add a new tile (2 or 4) to a random empty cell
  const addNewTile = (grid) => {
    const emptyCells = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (grid[i][j] === 0) {
          emptyCells.push({ x: i, y: j });
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const { x, y } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      grid[x][y] = { value: Math.random() < 0.9 ? 2 : 4, merged: false };
    }
  };

  // Update score and check for win
  const updateScore = (points) => {
    setScore(prevScore => {
      const newScore = prevScore + points;
      // Update high score if current score exceeds it
      if (newScore > highScore) {
        setHighScore(newScore);
        setIsNewHighScore(true);
      }
      return newScore;
    });
  };

  // Save game data to the server
  const saveGame = async (finalScore) => {
    console.log('saveGame called with score:', finalScore, 'Current high score:', highScore);
    
    if (!user) {
      console.log('Not saving game: No user logged in');
      return;
    }
    
    if (gameSaved) {
      console.log('Not saving game: Game already saved');
      return;
    }
    
    try {
      // Calculate the new high score
      const newHighScore = Math.max(highScore, finalScore);
      
      const gameData = {
        userid: user.userid,
        gameid: 1, // 1 is the game ID for 2048
        score: finalScore,
        highscore: newHighScore,
        dateplayed: new Date().toISOString()
      };
      
      console.log('Saving game data:', gameData);
      
      // Save the game data
      const result = await saveGameData(gameData);
      console.log('Game data saved successfully:', result);
      
      // Update the local high score state
      setHighScore(newHighScore);
      setGameSaved(true);
      console.log('Game data saved successfully');
    } catch (error) {
      console.error('Failed to save game data:', error);
    }
  };

  // Check if there are any moves left
  const hasNoMovesLeft = (grid) => {
    // Check for any empty cells
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (grid[i][j] === 0) return false;
      }
    }

    // Check for any possible merges
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const current = typeof grid[i][j] === 'object' ? grid[i][j].value : grid[i][j];
        
        // Check right neighbor
        if (j < 3) {
          const right = typeof grid[i][j + 1] === 'object' ? grid[i][j + 1].value : grid[i][j + 1];
          if (current === right) return false;
        }
        
        // Check bottom neighbor
        if (i < 3) {
          const bottom = typeof grid[i + 1][j] === 'object' ? grid[i + 1][j].value : grid[i + 1][j];
          if (current === bottom) return false;
        }
      }
    }

    return true;
  };

  // Move tiles in a direction
  const moveTiles = (direction) => {
    if (gameOver && !keepPlaying) return;

    // Create a deep copy of the grid with proper tile objects
    let newGrid = grid.map(row => 
      row.map(cell => {
        if (cell === 0) return 0;
        return typeof cell === 'object' ? {...cell} : { value: cell, merged: false };
      })
    );
    
    let moved = false;
    let newScore = score;

    // Process the grid based on direction
    const processGrid = (i, j) => {
      if (newGrid[i][j] !== 0) {
        const cell = newGrid[i][j];
        const tileValue = typeof cell === 'object' ? cell.value : cell;
        let newI = i;
        let newJ = j;
        let tile = { value: tileValue, merged: false };

        // Move the tile as far as possible
        while (true) {
          const [nextI, nextJ] = [
            direction === 'up' ? newI - 1 : direction === 'down' ? newI + 1 : newI,
            direction === 'left' ? newJ - 1 : direction === 'right' ? newJ + 1 : newJ
          ];

          if (nextI < 0 || nextI >= 4 || nextJ < 0 || nextJ >= 4) break;
          
          const nextCell = newGrid[nextI][nextJ];
          
          if (nextCell === 0) {
            // Move to empty cell
            newGrid[nextI][nextJ] = tile;
            newGrid[newI][newJ] = 0;
            newI = nextI;
            newJ = nextJ;
            moved = true;
          } else {
            const nextCellValue = typeof nextCell === 'object' ? nextCell.value : nextCell;
            
            if (nextCellValue === tile.value && !(typeof nextCell === 'object' && nextCell.merged)) {
              // Merge with matching tile
              newGrid[nextI][nextJ] = { value: tile.value * 2, merged: true };
              newGrid[newI][newJ] = 0;
              newScore += tile.value * 2;
              moved = true;
              if (tile.value * 2 === 2048 && !won) {
                setWon(true);
              }
            }
            break;
          }
        }
      }
    };

    // Process grid based on direction
    if (direction === 'left') {
      for (let i = 0; i < 4; i++) {
        for (let j = 1; j < 4; j++) {
          if (newGrid[i][j] !== 0) {
            processGrid(i, j);
          }
        }
      }
    } else if (direction === 'right') {
      for (let i = 0; i < 4; i++) {
        for (let j = 2; j >= 0; j--) {
          if (newGrid[i][j] !== 0) {
            processGrid(i, j);
          }
        }
      }
    } else if (direction === 'up') {
      for (let j = 0; j < 4; j++) {
        for (let i = 1; i < 4; i++) {
          if (newGrid[i][j] !== 0) {
            processGrid(i, j);
          }
        }
      }
    } else if (direction === 'down') {
      for (let j = 0; j < 4; j++) {
        for (let i = 2; i >= 0; i--) {
          if (newGrid[i][j] !== 0) {
            processGrid(i, j);
          }
        }
      }
    }

    // If any tile moved, add a new tile and check game over
    if (moved) {
      // Reset merged flags for the next move
      newGrid = newGrid.map(row => 
        row.map(cell => {
          if (cell === 0) return 0;
          return { ...cell, merged: false };
        })
      );
      
      addNewTile(newGrid);
      updateScore(newScore - score);
      
      // Check for game over
      if (hasNoMovesLeft(newGrid)) {
        setGameOver(true);
        saveGame(newScore);
      }
      
      // Update the grid
      setGrid(newGrid);
    }
  };

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    if (gameOver && !keepPlaying) return;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        moveTiles('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveTiles('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveTiles('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        moveTiles('right');
        break;
      default:
        break;
    }
  }, [gameOver, keepPlaying, grid]);

  // Add event listeners for keyboard controls
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Initialize game on component mount
  useEffect(() => {
    initGame();
  }, [initGame]);

  // Get tile color based on value - Math Wars theme
  const getTileColor = (tile) => {
    if (tile === 0) return 'transparent';
    const value = typeof tile === 'object' ? tile.value : tile;
    const colors = {
      2: 'linear-gradient(135deg, #2a2a2a, #333)',
      4: 'linear-gradient(135deg, #333, #3a3a3a)',
      8: 'linear-gradient(135deg, #ff2d2d, #cc0000)',
      16: 'linear-gradient(135deg, #ff5c5c, #ff0000)',
      32: 'linear-gradient(135deg, #ff8a8a, #ff2d2d)',
      64: 'linear-gradient(135deg, #ff0000, #cc0000)',
      128: 'linear-gradient(135deg, #ff2d2d, #cc0000)',
      256: 'linear-gradient(135deg, #ff5c5c, #ff0000)',
      512: 'linear-gradient(135deg, #ff8a8a, #ff2d2d)',
      1024: 'linear-gradient(135deg, #ff0000, #990000)',
      2048: 'linear-gradient(135deg, #ff2d2d, #990000)',
    };
    return colors[value] || 'linear-gradient(135deg, #ff0000, #990000)';
  };

  // Get text color based on tile value - Math Wars theme
  const getTextColor = (tile) => {
    if (tile === 0) return 'transparent';
    const value = typeof tile === 'object' ? tile.value : tile;
    // Always use white text with a dark shadow for better visibility
    return '#ffffff';
  };

  // Get text style with shadow for better visibility
  const getTextStyle = (tile) => {
    if (tile === 0) return { display: 'none' };
    const value = typeof tile === 'object' ? tile.value : tile;
    const size = value >= 100 ? '1.8rem' : value >= 1000 ? '1.6rem' : '2.2rem';
    return {
      color: getTextColor(tile),
      fontSize: size,
      textShadow: '0 1px 3px rgba(0, 0, 0, 0.8), 0 0 5px rgba(0, 0, 0, 0.5)',
      fontWeight: 'bold',
      textAlign: 'center',
      lineHeight: '1',
      padding: '5px',
      boxSizing: 'border-box',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  };

  return (
    <div className="game-container" style={{
      maxWidth: '500px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '"Orbitron", sans-serif',
      position: 'relative',
      color: '#fff'
    }}>
      <div className="game-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div className="header-left" style={{
          padding: '15px 0',
          marginRight: '25px',
          flex: '1 1 auto',
          minWidth: '200px',
          maxWidth: '300px'
        }}>
          <h1 style={{
            fontSize: '3.8rem',
            margin: 0,
            padding: '15px 30px',
            color: '#fff',
            textShadow: '0 0 10px #ff2d2d, 0 0 20px #ff2d2d',
            fontFamily: '"Orbitron", sans-serif',
            letterSpacing: '5px',
            lineHeight: '1.1',
            background: 'rgba(30, 30, 30, 0.7)',
            borderRadius: '10px',
            border: '1px solid rgba(255, 45, 45, 0.4)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3), 0 0 25px rgba(255, 45, 45, 0.2)',
            transform: 'perspective(500px) rotateX(3deg)',
            transformOrigin: 'bottom',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <span style={{
              position: 'relative',
              zIndex: 2,
              display: 'block',
              transform: 'translateZ(0)',
              padding: '5px 0',
              letterSpacing: '6px'
            }}>2048</span>
            <div style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              background: 'linear-gradient(135deg, rgba(255,45,45,0.1) 0%, rgba(255,45,45,0.05) 50%, rgba(255,45,45,0.1) 100%)',
              zIndex: 1,
              borderRadius: '8px'
            }} />
          </h1>
        </div>
        <div className="scores" style={{
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          flex: '0 0 auto',
          marginLeft: 'auto',
          flexWrap: 'nowrap',
          whiteSpace: 'nowrap'
        }}>
          <div className="score-box" style={{
            background: 'rgba(30, 30, 30, 0.7)',
            padding: '12px 18px',
            borderRadius: '10px',
            textAlign: 'center',
            minWidth: '110px',
            border: '1px solid rgba(255, 45, 45, 0.3)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3), 0 0 15px rgba(255, 45, 45, 0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              fontSize: '0.8rem',
              color: '#ddd',
              marginBottom: '4px'
            }}>SCORE</div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#fff'
            }}>{score}</div>
          </div>
          <div className="score-box" style={{
            background: 'rgba(30, 30, 30, 0.7)',
            padding: '12px 18px',
            borderRadius: '10px',
            textAlign: 'center',
            minWidth: '110px',
            border: `1px solid rgba(45, 150, 255, ${score > highScore ? '0.8' : '0.3'})`,
            boxShadow: `0 2px 10px rgba(0, 0, 0, 0.3), 0 0 20px rgba(45, 150, 255, ${score > highScore ? '0.4' : '0.15'})`,
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            transform: score > highScore ? 'scale(1.05)' : 'scale(1)'
          }}>
            <div style={{
              fontSize: '0.8rem',
              color: score > highScore ? '#4af' : '#ddd',
              marginBottom: '4px',
              textShadow: score > highScore ? '0 0 8px rgba(68, 170, 255, 0.7)' : 'none',
              fontWeight: score > highScore ? 'bold' : 'normal'
            }}>BEST</div>
            <div style={{
              fontSize: '1.8rem',
              fontWeight: 'bold',
              color: '#fff',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)'
            }}>
              {highScore}
              {isNewHighScore && score > highScore && (
                <div style={{
                  color: '#4af',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 'bold',
                  textShadow: '0 0 8px rgba(68, 170, 255, 0.7)',
                  marginTop: '4px'
                }}>
                  New High Score!
                </div>
              )}
            </div>
          </div>
          <button 
            className="new-game-btn" 
            onClick={initGame}
            style={{
              padding: '12px 24px',
              fontSize: '0.85rem',
              color: '#fff',
              background: 'linear-gradient(145deg, #ff2d2d, #cc0000)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 0 #990000, 0 0 15px rgba(255, 45, 45, 0.4)',
              position: 'relative',
              overflow: 'hidden',
              zIndex: 1
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 6px 0 #990000, 0 0 20px rgba(255, 45, 45, 0.6)';
              e.currentTarget.style.background = 'linear-gradient(145deg, #ff3d3d, #dd0000)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 0 #990000, 0 0 15px rgba(255, 45, 45, 0.4)';
              e.currentTarget.style.background = 'linear-gradient(145deg, #ff2d2d, #cc0000)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(2px)';
              e.currentTarget.style.boxShadow = '0 2px 0 #990000, 0 0 10px rgba(255, 45, 45, 0.4)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 0 #990000, 0 0 20px rgba(255, 45, 45, 0.6)';
            }}
          >
            <span style={{
              position: 'relative',
              zIndex: 2,
              display: 'inline-block',
              transition: 'transform 0.2s ease',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>New Game</span>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
              zIndex: 1,
              opacity: 0.5,
              transition: 'opacity 0.2s ease'
            }} />
          </button>
        </div>
      </div>

      {(gameOver || (won && !keepPlaying)) && (
        <div className="game-overlay" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          backdropFilter: 'blur(3px)'
        }}>
          <div className="game-message" style={{
            background: 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',
            padding: '2rem',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(255, 45, 45, 0.3)',
            border: '1px solid #ff2d2d',
            maxWidth: '90%',
            width: '400px'
          }}>
            <h2 style={{
              color: '#fff',
              fontSize: '2.5rem',
              marginBottom: '1rem',
              textShadow: '0 0 10px #ff2d2d, 0 0 20px #ff2d2d',
              fontFamily: '"Orbitron", sans-serif',
              letterSpacing: '1px'
            }}>
              {won ? 'You Win!' : 'Game Over!'}
            </h2>
            <div className="score-message" style={{
              color: '#fff',
              fontSize: '1.5rem',
              marginBottom: '2rem',
              fontFamily: '"Orbitron", sans-serif'
            }}>
              Score: <span style={{ color: '#ff2d2d', fontWeight: 'bold' }}>{score}</span>
            </div>
            <div className="button-group" style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              alignItems: 'center'
            }}>
              <button 
                className="action-btn" 
                onClick={initGame}
                style={{
                  padding: '0.8rem 2rem',
                  fontSize: '1.1rem',
                  color: '#fff',
                  background: 'linear-gradient(145deg, #ff2d2d, #cc0000)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: '"Orbitron", sans-serif',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 0 #990000, 0 0 10px rgba(255, 45, 45, 0.5)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 0 #990000, 0 0 15px rgba(255, 45, 45, 0.8)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 0 #990000, 0 0 10px rgba(255, 45, 45, 0.5)';
                }}
              >
                Play Again
              </button>
              {won && !keepPlaying && (
                <button 
                  className="action-btn keep-playing-btn" 
                  onClick={() => setKeepPlaying(true)}
                  style={{
                    padding: '0.8rem 2rem',
                    fontSize: '1.1rem',
                    color: '#fff',
                    background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
                    border: '1px solid #ff2d2d',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: '"Orbitron", sans-serif',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 0 10px rgba(255, 45, 45, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 45, 45, 0.5)';
                    e.currentTarget.style.background = 'linear-gradient(145deg, #333, #222)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 45, 45, 0.3)';
                    e.currentTarget.style.background = 'linear-gradient(145deg, #2a2a2a, #1a1a1a)';
                  }}
                >
                  Keep Going
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      <div className="grid" style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        padding: '15px',
        boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        border: '1px solid #333',
        marginBottom: '20px'
      }}>
        {Array(4).fill().map((_, rowIndex) => (
          <div key={rowIndex} className="grid-row" style={{
            display: 'flex',
            marginBottom: '15px',
            gap: '15px'
          }}>
            {Array(4).fill().map((_, colIndex) => (
              <div key={colIndex} className="grid-cell" style={{
                width: '100px',
                height: '100px',
                backgroundColor: 'rgba(42, 42, 42, 0.8)',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5)'
              }}>
                <div 
                  className="tile" 
                  style={{
                    width: '100%',
                    height: '100%',
                    background: getTileColor(grid[rowIndex][colIndex]),
                    boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                    ...getTextStyle(grid[rowIndex][colIndex])
                  }}
                >
                  {(() => {
                    const cell = grid[rowIndex]?.[colIndex];
                    if (!cell) return null;
                    const value = typeof cell === 'object' ? cell.value : cell !== 0 ? cell : null;
                    return value;
                  })()}
                </div>
              </div>
            ))}
          </div>
        ))}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          background: 'linear-gradient(145deg, rgba(255,45,45,0.1) 0%, rgba(255,45,45,0) 20%, rgba(255,45,45,0) 80%, rgba(255,45,45,0.1) 100%)',
          borderRadius: '8px',
          zIndex: 1
        }} />
      </div>

      <div className="game-instructions" style={{
        textAlign: 'center',
        marginTop: '20px',
        padding: '15px 20px',
        background: 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',
        borderRadius: '8px',
        border: '1px solid #ff2d2d',
        color: '#fff',
        fontSize: '0.9rem',
        boxShadow: '0 0 15px rgba(255, 45, 45, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(45deg, rgba(255,45,45,0.05) 0%, rgba(255,45,45,0) 50%, rgba(255,45,45,0.05) 100%)',
          pointerEvents: 'none'
        }} />
        <p style={{
          margin: 0,
          position: 'relative',
          zIndex: 1,
          fontFamily: '"Orbitron", sans-serif',
          letterSpacing: '0.5px'
        }}>
          Use <span style={{ color: '#ff2d2d', fontWeight: 'bold' }}>arrow keys</span> to move the tiles. 
          Join the numbers and get to the <strong style={{ 
            color: '#ff2d2d', 
            textShadow: '0 0 8px rgba(255, 45, 45, 0.7)',
            position: 'relative',
            display: 'inline-block',
            transform: 'translateZ(0)'
          }}>2048 tile!</strong>
        </p>
      </div>
      
      {/* Add a subtle pulsing effect to the 2048 text */}
      <style>
        {`
          @keyframes pulse {
            0% { text-shadow: 0 0 8px rgba(255, 45, 45, 0.7); }
            50% { text-shadow: 0 0 15px rgba(255, 45, 45, 1), 0 0 25px rgba(255, 45, 45, 0.5); }
            100% { text-shadow: 0 0 8px rgba(255, 45, 45, 0.7); }
          }
          
          strong[style*="#ff2d2d"] {
            animation: pulse 2s infinite;
          }
        `}
      </style>
    </div>
  );
};

export default Game2048;
