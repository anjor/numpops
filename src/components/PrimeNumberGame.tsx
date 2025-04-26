"use client";
import React, { useState, useEffect } from "react";
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
  speed: number;
  color: string;
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

  // Generate a random number between min and max
  const randomNumber = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

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
  const createBubble = (): Bubble => {
    const maxNumber = level * 10;
    const number = randomNumber(1, maxNumber);
    const id = Date.now() + Math.random();
    const size = randomNumber(60, 90);
    const position = {
      left: randomNumber(10, 80) + "%",
      top: randomNumber(10, 80) + "%",
    };
    const speed = randomNumber(3, 7);
    // All bubbles get random colors regardless of whether they contain prime numbers
    const color = `hsla(${randomNumber(0, 360)}, 80%, 70%, 0.8)`;

    return { id, number, size, position, speed, color };
  };

  // Start the game
  const startGame = (): void => {
    setGameStarted(true);
    setScore(0);
    setLevel(1);
    setTimeLeft(60);
    setGameOver(false);
    setMessage("");
    setExplanation(false);

    // Create initial bubbles
    const initialBubbles: Bubble[] = [];
    for (let i = 0; i < 5; i++) {
      initialBubbles.push(createBubble());
    }
    setBubbles(initialBubbles);
  };

  // Handle bubble click
  const handleBubbleClick = (number: number, id: number): void => {
    if (isPrime(number)) {
      setScore(score + 10);
      setMessage(`Good job! ${number} is a prime number!`);

      // Level up when score reaches certain thresholds
      if (score + 10 >= level * 50) {
        setLevel((prevLevel) => prevLevel + 1);
        setMessage(
          `Level up! Now look for prime numbers up to ${(level + 1) * 10}`,
        );
        // No bonus time for level up anymore
      }
    } else {
      setScore(Math.max(0, score - 5));
      setMessage(`Oops! ${number} is not a prime number.`);
    }

    // Remove clicked bubble and add a new one
    setBubbles((prevBubbles) => {
      const filteredBubbles = prevBubbles.filter((bubble) => bubble.id !== id);
      return [...filteredBubbles, createBubble()];
    });
  };

  // Game timer
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    let bubbleTimer: NodeJS.Timeout | undefined;

    if (gameStarted && !gameOver) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            if (timer) clearInterval(timer);
            if (bubbleTimer) clearInterval(bubbleTimer);
            setGameOver(true);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      // Add new bubbles periodically
      bubbleTimer = setInterval(() => {
        if (bubbles.length < 8) {
          setBubbles((prevBubbles) => [...prevBubbles, createBubble()]);
        }
      }, 3000);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (bubbleTimer) clearInterval(bubbleTimer);
    };
  }, [gameStarted, gameOver, bubbles.length]);

  return (
    <div className="h-screen bg-gradient-to-b from-blue-200 to-purple-200 flex flex-col items-center justify-center p-4 overflow-hidden font-sans relative">
      {explanation ? (
        <div className="bg-white rounded-lg p-6 max-w-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center text-purple-600 mb-4">
            Prime Number Popper!
          </h1>
          <div className="mb-4">
            <p className="mb-3">
              <span className="font-bold">What are prime numbers?</span> Prime
              numbers are special numbers that can only be divided by 1 and
              themselves.
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
              <li>Each correct bubble gives you 10 points</li>
              <li>Wrong clicks cost 5 points</li>
              <li>As you level up, you'll see bigger numbers</li>
              <li>Try to get the highest score before time runs out!</li>
            </ul>
          </div>

          <button
            onClick={startGame}
            className="w-full py-3 bg-purple-500 text-white rounded-lg text-lg font-bold hover:bg-purple-600 transition-colors"
          >
            Start Game!
          </button>
        </div>
      ) : gameOver ? (
        <div className="bg-white rounded-lg p-6 max-w-md shadow-lg text-center">
          <h2 className="text-2xl font-bold text-purple-600 mb-2">
            Game Over!
          </h2>
          <p className="text-xl mb-4">Your final score: {score}</p>
          <p className="mb-6">You reached level {level}</p>
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
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <div className="bg-white px-4 py-2 rounded-lg shadow-md">
              <span className="font-bold">Score: {score}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-md">
              <span className="font-bold">Level: {level}</span>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg shadow-md">
              <span className="font-bold">Time: {timeLeft}s</span>
            </div>
          </div>

          {message && (
            <div className="absolute top-16 left-0 right-0 flex justify-center">
              <div className="bg-white px-4 py-2 rounded-lg shadow-md animate-bounce">
                {message}
              </div>
            </div>
          )}

          <div className="relative w-full h-full">
            {bubbles.map((bubble) => (
              <div
                key={bubble.id}
                onClick={() => handleBubbleClick(bubble.number, bubble.id)}
                className="absolute rounded-full flex items-center justify-center cursor-pointer transform transition-all hover:scale-110"
                style={{
                  width: `${bubble.size}px`,
                  height: `${bubble.size}px`,
                  backgroundColor: bubble.color,
                  left: bubble.position.left,
                  top: bubble.position.top,
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  border: "2px solid white",
                }}
              >
                <span className="text-2xl font-bold text-white">
                  {bubble.number}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setGameStarted(false);
              setExplanation(true);
            }}
            className="absolute bottom-4 right-4 bg-white p-2 rounded-full shadow-md"
          >
            <X size={24} />
          </button>
        </>
      )}
    </div>
  );
};

export default PrimeNumberGame;
