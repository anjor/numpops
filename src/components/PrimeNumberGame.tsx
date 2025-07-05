"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";

// Define types for bubbles
interface Bubble {
  id: number;
  number: number;
  size: number;
  position: {
    left: string;
    top: string;
  };
  speed: {
    x: number;
    y: number;
  };
  color: string;
  isPopping?: boolean;
  isPrimePopping?: boolean;
  isNonPrimePopping?: boolean;
}

const PrimeNumberGame: React.FC = () => {
  const [score, setScore] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [message, setMessage] = useState<string>("");
  const [level, setLevel] = useState<number>(1);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<boolean>(true);
  const [highScore, setHighScore] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [powerUps, setPowerUps] = useState<{slowTime: boolean, highlightPrimes: boolean}>({slowTime: false, highlightPrimes: false});
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load high score and sound preference from localStorage on component mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem('primePopperHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
    
    const savedSoundEnabled = localStorage.getItem('primePopperSoundEnabled');
    if (savedSoundEnabled !== null) {
      setSoundEnabled(JSON.parse(savedSoundEnabled));
    }
  }, []);

  // Save sound preference to localStorage
  useEffect(() => {
    localStorage.setItem('primePopperSoundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  // Save high score to localStorage whenever it changes
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('primePopperHighScore', score.toString());
    }
  }, [score, highScore]);

  // Generate a random number between min and max
  const randomNumber = useCallback((min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }, []);

  // Get difficulty settings
  const getDifficultySettings = useCallback(() => {
    switch (difficulty) {
      case 'easy':
        return { timeLimit: 90, bubbleSpeed: 0.5, maxBubbles: 6 };
      case 'hard':
        return { timeLimit: 45, bubbleSpeed: 2, maxBubbles: 10 };
      default: // medium
        return { timeLimit: 60, bubbleSpeed: 1, maxBubbles: 8 };
    }
  }, [difficulty]);

  // Calculate prime factorization
  const getPrimeFactors = useCallback((num: number): number[] => {
    const factors: number[] = [];
    let divisor = 2;
    
    while (divisor * divisor <= num) {
      while (num % divisor === 0) {
        factors.push(divisor);
        num /= divisor;
      }
      divisor++;
    }
    
    if (num > 1) {
      factors.push(num);
    }
    
    return factors;
  }, []);

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!audioContextRef.current && soundEnabled) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Audio context not supported');
      }
    }
  }, [soundEnabled]);

  // Play sound using Web Audio API
  const playSound = useCallback((frequency: number, duration: number = 0.1, type: OscillatorType = 'sine') => {
    if (!soundEnabled || !audioContextRef.current) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContextRef.current.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }, [soundEnabled]);

  // Sound effects
  const playCorrectSound = useCallback(() => {
    playSound(523.25, 0.2, 'sine'); // C5
    setTimeout(() => playSound(659.25, 0.2, 'sine'), 100); // E5
    setTimeout(() => playSound(783.99, 0.3, 'sine'), 200); // G5
  }, [playSound]);

  const playWrongSound = useCallback(() => {
    playSound(200, 0.3, 'sawtooth');
  }, [playSound]);

  const playLevelUpSound = useCallback(() => {
    playSound(523.25, 0.15, 'sine'); // C5
    setTimeout(() => playSound(659.25, 0.15, 'sine'), 150); // E5
    setTimeout(() => playSound(783.99, 0.15, 'sine'), 300); // G5
    setTimeout(() => playSound(1046.5, 0.4, 'sine'), 450); // C6
  }, [playSound]);

  const playPowerUpSound = useCallback(() => {
    playSound(440, 0.1, 'sine'); // A4
    setTimeout(() => playSound(554.37, 0.1, 'sine'), 100); // C#5
    setTimeout(() => playSound(659.25, 0.1, 'sine'), 200); // E5
    setTimeout(() => playSound(880, 0.2, 'sine'), 300); // A5
  }, [playSound]);

  const playComboSound = useCallback((comboLevel: number) => {
    const baseFreq = 523.25;
    const freq = baseFreq * Math.pow(1.2, Math.min(comboLevel, 8));
    playSound(freq, 0.15, 'triangle');
  }, [playSound]);

  // Check if a number is prime
  const isPrime = (num: number): boolean => {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;

    let i = 5;
    while (i * i <= num) {
      if (num % i === 0 || num % (i + 2) === 0) return false;
      i += 6;
    }
    return true;
  };

  // Create a new bubble
  const createBubble = useCallback((): Bubble => {
    const maxNumber = level * 10;
    const number = randomNumber(1, maxNumber);
    const id = Date.now() + Math.random();
    const size = randomNumber(60, 90);
    const position = {
      left: randomNumber(10, 80) + "%",
      top: randomNumber(10, 80) + "%",
    };

    const difficultySettings = getDifficultySettings();
    const speedMultiplier = powerUps.slowTime ? 0.3 : difficultySettings.bubbleSpeed;
    
    // Create random but gentle speed for X and Y directions
    const speed = {
      x: (Math.random() - 0.5) * 1.5 * speedMultiplier,
      y: (Math.random() - 0.5) * 1.5 * speedMultiplier,
    };

    // Highlight primes if power-up is active
    const isNumberPrime = isPrime(number);
    const color = powerUps.highlightPrimes && isNumberPrime 
      ? `hsla(120, 80%, 70%, 0.9)` // Green for primes
      : `hsla(${randomNumber(0, 360)}, 80%, 70%, 0.8)`;

    return { id, number, size, position, speed, color };
  }, [level, randomNumber, getDifficultySettings, powerUps, isPrime]);

  // Start the game
  const startGame = (): void => {
    setGameStarted(true);
    setScore(0);
    setLevel(1);
    const difficultySettings = getDifficultySettings();
    setTimeLeft(difficultySettings.timeLimit);
    setGameOver(false);
    setMessage("");
    setExplanation(false);
    setIsPaused(false);
    setCombo(0);
    setMaxCombo(0);
    setPowerUps({slowTime: false, highlightPrimes: false});

    // Create initial bubbles
    const initialBubbles: Bubble[] = [];
    for (let i = 0; i < 5; i++) {
      initialBubbles.push(createBubble());
    }
    setBubbles(initialBubbles);

    // Start animation loop
    startAnimationLoop();
  };

  // Toggle pause
  const togglePause = (): void => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      pauseTimeRef.current = Date.now();
    }
  };

  // Handle bubble click/touch
  const handleBubbleClick = (number: number, id: number): void => {
    if (isPaused) return;
    
    // Initialize audio on first interaction
    initAudio();
    
    // Add haptic feedback for mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    const isPrimeNumber = isPrime(number);

    // First, mark the bubble as popping with the correct animation type
    setBubbles((prevBubbles) =>
      prevBubbles.map((bubble) =>
        bubble.id === id
          ? {
              ...bubble,
              isPopping: true,
              isPrimePopping: isPrimeNumber,
              isNonPrimePopping: !isPrimeNumber,
            }
          : bubble,
      ),
    );

    // Wait a short time for the animation to play before removing the bubble
    setTimeout(() => {
      if (isPrimeNumber) {
        const comboMultiplier = Math.floor(combo / 3) + 1;
        const basePoints = 10;
        const pointsEarned = basePoints * comboMultiplier;
        
        setScore(score + pointsEarned);
        setCombo(combo + 1);
        setMaxCombo(Math.max(maxCombo, combo + 1));
        
        // Play sound effects
        playCorrectSound();
        if (combo + 1 > 1) {
          setTimeout(() => playComboSound(combo + 1), 300);
        }
        
        if (comboMultiplier > 1) {
          setMessage(`Excellent! ${number} is prime! Combo x${comboMultiplier} = ${pointsEarned} points!`);
        } else {
          setMessage(`Good job! ${number} is a prime number!`);
        }

        // Level up when score reaches certain thresholds
        if (score + pointsEarned >= level * 50) {
          setLevel((prevLevel) => prevLevel + 1);
          setMessage(
            `Level up! Now look for prime numbers up to ${(level + 1) * 10}`,
          );
          playLevelUpSound();
        }
        
        // Activate power-ups at certain combo levels
        if (combo + 1 === 5) {
          setPowerUps(prev => ({...prev, slowTime: true}));
          setMessage(`Power-up activated: Slow Time!`);
          playPowerUpSound();
          setTimeout(() => setPowerUps(prev => ({...prev, slowTime: false})), 10000);
        } else if (combo + 1 === 10) {
          setPowerUps(prev => ({...prev, highlightPrimes: true}));
          setMessage(`Power-up activated: Highlight Primes!`);
          playPowerUpSound();
          setTimeout(() => setPowerUps(prev => ({...prev, highlightPrimes: false})), 15000);
        }
      } else {
        setScore(Math.max(0, score - 5));
        setCombo(0);
        const factors = getPrimeFactors(number);
        setMessage(`Oops! ${number} is not prime. Factors: ${factors.join(' × ')} = ${number}`);
        playWrongSound();
      }

      // Remove clicked bubble and add a new one
      setBubbles((prevBubbles) => {
        const filteredBubbles = prevBubbles.filter(
          (bubble) => bubble.id !== id,
        );
        return [...filteredBubbles, createBubble()];
      });
    }, 500); // Wait 500ms for the animation to play
  };

  // Animation loop for moving bubbles
  const animateBubbles = useCallback(() => {
    if (!gameAreaRef.current || gameOver || !gameStarted || isPaused) return;

    const gameArea = gameAreaRef.current;
    const gameAreaRect = gameArea.getBoundingClientRect();
    const gameWidth = gameAreaRect.width;
    const gameHeight = gameAreaRect.height;

    setBubbles((prevBubbles) =>
      prevBubbles.map((bubble) => {
        // Skip animation for popping bubbles
        if (bubble.isPopping) return bubble;

        // Get current position in pixels
        const bubbleElement = document.getElementById(`bubble-${bubble.id}`);
        if (!bubbleElement) return bubble;

        const bubbleRect = bubbleElement.getBoundingClientRect();

        // Current position as percentage
        let leftPercent = parseFloat(bubble.position.left);
        let topPercent = parseFloat(bubble.position.top);

        // Convert percentage to pixels
        let leftPx = (leftPercent / 100) * gameWidth;
        let topPx = (topPercent / 100) * gameHeight;

        // Update position in pixels
        leftPx += bubble.speed.x;
        topPx += bubble.speed.y;

        // Handle boundary collisions
        if (leftPx <= 0 || leftPx >= gameWidth - bubbleRect.width) {
          // Reverse x direction
          return {
            ...bubble,
            speed: {
              ...bubble.speed,
              x: -bubble.speed.x,
            },
            position: {
              left:
                Math.max(0, Math.min(100, (leftPx / gameWidth) * 100)) + "%",
              top: bubble.position.top,
            },
          };
        }

        if (topPx <= 0 || topPx >= gameHeight - bubbleRect.height) {
          // Reverse y direction
          return {
            ...bubble,
            speed: {
              ...bubble.speed,
              y: -bubble.speed.y,
            },
            position: {
              left: bubble.position.left,
              top: Math.max(0, Math.min(100, (topPx / gameHeight) * 100)) + "%",
            },
          };
        }

        // Convert back to percentage
        leftPercent = (leftPx / gameWidth) * 100;
        topPercent = (topPx / gameHeight) * 100;

        return {
          ...bubble,
          position: {
            left: leftPercent + "%",
            top: topPercent + "%",
          },
        };
      }),
    );

    animationFrameRef.current = requestAnimationFrame(animateBubbles);
  }, [gameStarted, gameOver, isPaused]);

  const startAnimationLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animateBubbles);
  }, [animateBubbles]);

  // Game timer
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    let bubbleTimer: NodeJS.Timeout | undefined;

    if (gameStarted && !gameOver && !isPaused) {
      // Start animation
      startAnimationLoop();

      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            if (timer) clearInterval(timer);
            if (bubbleTimer) clearInterval(bubbleTimer);
            setGameOver(true);
            // Stop animation when game is over
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      // Add new bubbles periodically
      const difficultySettings = getDifficultySettings();
      bubbleTimer = setInterval(() => {
        if (bubbles.length < difficultySettings.maxBubbles) {
          setBubbles((prevBubbles) => [...prevBubbles, createBubble()]);
        }
      }, 3000);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (bubbleTimer) clearInterval(bubbleTimer);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameStarted, gameOver, isPaused, bubbles.length, createBubble, startAnimationLoop, getDifficultySettings]);

  return (
    <div className="h-screen bg-gradient-to-b from-blue-200 to-purple-200 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden font-sans relative touch-manipulation">
      {explanation ? (
        <div className="bg-white rounded-lg p-4 sm:p-6 max-w-xs sm:max-w-lg shadow-lg mx-2">
          <h1 className="text-2xl font-bold text-center text-purple-600 mb-4">
            Prime Number Popper!
          </h1>
          
          {highScore > 0 && (
            <div className="text-center mb-4 p-2 bg-yellow-100 rounded-lg">
              <span className="font-bold text-yellow-800">High Score: {highScore}</span>
            </div>
          )}
          
          <div className="mb-4">
            <p className="mb-3">
              <span className="font-bold">What are prime numbers?</span> Prime
              numbers are special numbers that can only be divided by 1 and
              themselves. 1 is not a prime number.
            </p>

            <p className="mb-3">For example:</p>
            <ul className="ml-6 mb-3 list-disc">
              <li>2 is a prime number (it can only be divided by 1 and 2)</li>
              <li>3 is a prime number (it can only be divided by 1 and 3)</li>
              <li>
                4 is NOT a prime number (it can be divided by 1, 2, and 4)
              </li>
              <li>5 is a prime number (it can only be divided by 1 and 5)</li>
              <li>
                6 is NOT a prime number (it can be divided by 1, 2, 3, and 6)
              </li>
              <li>7 is a prime number (it can only be divided by 1 and 7)</li>
            </ul>

            <p className="mb-3">
              <span className="font-bold">How to play:</span>
            </p>
            <ul className="ml-6 mb-3 list-disc">
              <li>Click on the bubbles with prime numbers</li>
              <li>Each correct bubble gives you 10 points (combo multiplier!)</li>
              <li>Wrong clicks cost 5 points and break your combo</li>
              <li>Power-ups unlock at 5 and 10 combo streak!</li>
              <li>Choose your difficulty level below</li>
            </ul>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold mb-2">Difficulty:</label>
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              className="w-full p-2 border rounded-lg"
            >
              <option value="easy">Easy (90s, slow bubbles)</option>
              <option value="medium">Medium (60s, normal speed)</option>
              <option value="hard">Hard (45s, fast bubbles)</option>
            </select>
          </div>

          <button
            onClick={startGame}
            className="w-full py-3 bg-purple-500 text-white rounded-lg text-lg font-bold hover:bg-purple-600 transition-colors"
          >
            Start Game!
          </button>
        </div>
      ) : gameOver ? (
        <div className="bg-white rounded-lg p-4 sm:p-6 max-w-xs sm:max-w-md shadow-lg text-center mx-2">
          <h2 className="text-2xl font-bold text-purple-600 mb-2">
            Game Over!
          </h2>
          <p className="text-xl mb-2">Your final score: {score}</p>
          {score === highScore && score > 0 && (
            <p className="text-lg mb-2 text-yellow-600 font-bold">🎉 New High Score!</p>
          )}
          <p className="mb-2">You reached level {level}</p>
          <p className="mb-4">Max combo: {maxCombo}</p>
          <button
            onClick={startGame}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg text-lg font-bold hover:bg-purple-600 transition-colors mr-4"
          >
            Play Again
          </button>
          <button
            onClick={() => setExplanation(true)}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg text-lg font-bold hover:bg-blue-600 transition-colors"
          >
            Instructions
          </button>
        </div>
      ) : (
        <>
          <div className="absolute top-2 left-2 right-2 sm:top-4 sm:left-4 sm:right-4">
            <div className="flex justify-between items-center flex-wrap gap-1 sm:gap-2">
              <div className="bg-white px-2 py-1 rounded-lg shadow-md">
                <span className="font-bold text-xs sm:text-sm">Score: {score}</span>
              </div>
              <div className="bg-white px-2 py-1 rounded-lg shadow-md">
                <span className="font-bold text-xs sm:text-sm">Level: {level}</span>
              </div>
              <div className="bg-white px-2 py-1 rounded-lg shadow-md">
                <span className="font-bold text-xs sm:text-sm">Time: {timeLeft}s</span>
              </div>
            </div>
            <div className="flex justify-center items-center gap-1 sm:gap-2 mt-1">
              <div className="bg-white px-2 py-1 rounded-lg shadow-md">
                <span className="font-bold text-xs sm:text-sm">Combo: {combo}</span>
              </div>
              <div className="bg-white px-2 py-1 rounded-lg shadow-md">
                <span className="font-bold text-xs sm:text-sm">High: {highScore}</span>
              </div>
            </div>
          </div>

          {(powerUps.slowTime || powerUps.highlightPrimes) && (
            <div className="absolute top-16 sm:top-20 left-2 right-2 sm:left-4 sm:right-4 flex justify-center gap-1 sm:gap-2">
              {powerUps.slowTime && (
                <div className="bg-blue-500 text-white px-2 py-1 rounded-lg shadow-md animate-pulse">
                  <span className="font-bold text-xs sm:text-sm">⏰ Slow Time</span>
                </div>
              )}
              {powerUps.highlightPrimes && (
                <div className="bg-green-500 text-white px-2 py-1 rounded-lg shadow-md animate-pulse">
                  <span className="font-bold text-xs sm:text-sm">✨ Highlight Primes</span>
                </div>
              )}
            </div>
          )}

          {message && (
            <div className="absolute top-20 sm:top-16 left-2 right-2 sm:left-4 sm:right-4 flex justify-center">
              <div className="bg-white px-3 py-2 rounded-lg shadow-md animate-bounce max-w-xs sm:max-w-md text-center">
                <span className="text-xs sm:text-sm font-medium">{message}</span>
              </div>
            </div>
          )}

          <div ref={gameAreaRef} className="relative w-full h-full">
            {bubbles.map((bubble) => (
              <div
                id={`bubble-${bubble.id}`}
                key={bubble.id}
                onClick={() =>
                  !bubble.isPopping &&
                  handleBubbleClick(bubble.number, bubble.id)
                }
                onTouchStart={(e) => {
                  e.preventDefault();
                  if (!bubble.isPopping) {
                    handleBubbleClick(bubble.number, bubble.id);
                  }
                }}
                className={`absolute rounded-full flex items-center justify-center cursor-pointer select-none touch-manipulation
                  ${bubble.isPopping ? "pointer-events-none" : "transform transition-transform hover:scale-110 active:scale-95"}
                  ${bubble.isPrimePopping ? "animate-correct-pop" : ""}
                  ${bubble.isNonPrimePopping ? "animate-wrong-pop" : ""}
                `}
                style={{
                  width: `${Math.max(50, bubble.size * 0.8)}px`,
                  height: `${Math.max(50, bubble.size * 0.8)}px`,
                  backgroundColor: bubble.color,
                  left: bubble.position.left,
                  top: bubble.position.top,
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  border: "2px solid white",
                  transition: "transform 0.2s",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  WebkitTouchCallout: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span className="text-lg sm:text-2xl font-bold text-white">
                  {bubble.number}
                </span>
              </div>
            ))}
          </div>

          <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={togglePause}
                className="bg-white px-3 py-2 rounded-lg shadow-md font-bold hover:bg-gray-100 transition-colors text-xs sm:text-sm touch-manipulation"
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="bg-white px-2 py-2 rounded-lg shadow-md hover:bg-gray-100 transition-colors touch-manipulation"
                title={soundEnabled ? 'Disable sound' : 'Enable sound'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
            </div>
            <button
              onClick={() => {
                setGameStarted(false);
                setExplanation(true);
                if (animationFrameRef.current) {
                  cancelAnimationFrame(animationFrameRef.current);
                }
              }}
              className="bg-white p-2 rounded-full shadow-md hover:bg-gray-100 transition-colors touch-manipulation"
            >
              <X size={20} />
            </button>
          </div>

          {isPaused && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 text-center shadow-lg">
                <h3 className="text-2xl font-bold text-purple-600 mb-4">Game Paused</h3>
                <p className="mb-4">Click Resume to continue playing!</p>
                <button
                  onClick={togglePause}
                  className="px-6 py-2 bg-purple-500 text-white rounded-lg text-lg font-bold hover:bg-purple-600 transition-colors"
                >
                  Resume Game
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PrimeNumberGame;
