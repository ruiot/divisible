import React, { useState, useEffect, useRef } from 'react';

// v0.1.3 - Fix pattern visibility by using backgroundColor instead of background
// fix: v0.1.3 - backgroundColor/backgroundImage separation, ensure 2x2 grid layout

// Generate all valid products from 1x1 to 9x9 (outside component to avoid re-calculation)
const generateAllProducts = () => {
  const products = new Set();
  for (let i = 1; i <= 9; i++) {
    for (let j = 1; j <= 9; j++) {
      products.add(i * j);
    }
  }
  return Array.from(products).sort((a, b) => a - b);
};

const allProducts = generateAllProducts();

const MultiplyMatch = () => {
  const [gameState, setGameState] = useState('menu');
  const [targetNumber, setTargetNumber] = useState(null);
  const [choices, setChoices] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [selectedChoice, setSelectedChoice] = useState(null);
  
  const audioContextRef = useRef(null);
  const timerRef = useRef(null);

  const VERSION = 'v0.1.3';

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const playSound = (type) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'correct') {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'wrong') {
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'tick') {
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    }
  };

  const getFactors = (num) => {
    let n = num;
    const factors = { 2: 0, 3: 0, 5: 0, 7: 0 };
    
    [2, 3, 5, 7].forEach(prime => {
      while (n % prime === 0) {
        factors[prime]++;
        n /= prime;
      }
    });
    
    return factors;
  };

  const getPattern = (factors) => {
    const patterns = [];
    
    if (factors[2] > 0) {
      patterns.push('repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)');
    }
    if (factors[3] > 0) {
      patterns.push('repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)');
    }
    if (factors[5] > 0) {
      patterns.push('radial-gradient(circle, rgba(255,255,255,0.2) 25%, transparent 25%)');
    }
    if (factors[7] > 0) {
      patterns.push('repeating-conic-gradient(rgba(255,255,255,0.15) 0% 25%, transparent 25% 50%)');
    }
    
    return patterns.length > 0 ? patterns.join(', ') : 'none';
  };

  const getNumberColor = (num) => {
    const factors = getFactors(num);
    const total = factors[2] + factors[3] + factors[5] + factors[7];
    
    if (total === 0) return { rgb: 'rgb(250, 150, 150)', pattern: 'none' };
    
    const r = Math.floor(150 + (factors[2] / total) * 100);
    const g = Math.floor(100 + (factors[5] / total) * 120);
    const b = Math.floor(120 + (factors[3] / total) * 130);
    
    return { 
      rgb: `rgb(${r}, ${g}, ${b})`,
      pattern: getPattern(factors)
    };
  };

  // Get all valid factor pairs for a number
  const getFactorPairs = (num) => {
    const pairs = [];
    for (let i = 1; i <= 9; i++) {
      for (let j = 1; j <= 9; j++) {
        if (i * j === num) {
          pairs.push([i, j]);
        }
      }
    }
    return pairs;
  };

  // Generate wrong choices (near numbers or similar factors)
  const generateWrongChoices = (correctNum, correctPairs, count) => {
    const wrong = [];
    const used = new Set();
    
    // Add correct products to used set
    correctPairs.forEach(([a, b]) => used.add(`${a}×${b}`));
    
    while (wrong.length < count) {
      const strategy = Math.random();
      
      if (strategy < 0.5) {
        // Strategy 1: Near numbers (±1, ±2)
        const offset = Math.random() < 0.5 ? 
          (Math.random() < 0.5 ? 1 : 2) : 
          (Math.random() < 0.5 ? -1 : -2);
        const nearNum = correctNum + offset;
        
        if (nearNum >= 1 && nearNum <= 81) {
          const pairs = getFactorPairs(nearNum);
          if (pairs.length > 0) {
            const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
            const key = `${a}×${b}`;
            if (!used.has(key)) {
              wrong.push({ a, b, product: a * b });
              used.add(key);
            }
          }
        }
      } else {
        // Strategy 2: Similar factors
        const randomCorrect = correctPairs[Math.floor(Math.random() * correctPairs.length)];
        const [ca, cb] = randomCorrect;
        
        // Modify one factor
        const modifyFirst = Math.random() < 0.5;
        const delta = Math.random() < 0.5 ? 1 : -1;
        
        const a = modifyFirst ? Math.max(1, Math.min(9, ca + delta)) : ca;
        const b = modifyFirst ? cb : Math.max(1, Math.min(9, cb + delta));
        
        const key = `${a}×${b}`;
        const product = a * b;
        
        if (!used.has(key) && product !== correctNum) {
          wrong.push({ a, b, product });
          used.add(key);
        }
      }
    }
    
    return wrong;
  };

  const generateQuestion = () => {
    // Pick random product
    const product = allProducts[Math.floor(Math.random() * allProducts.length)];
    const correctPairs = getFactorPairs(product);
    
    // Pick one correct answer
    const correctPair = correctPairs[Math.floor(Math.random() * correctPairs.length)];
    
    // Always generate 3 wrong choices for total of 4 options
    const wrongChoices = generateWrongChoices(product, correctPairs, 3);
    
    // Combine and shuffle
    const allChoices = [
      { a: correctPair[0], b: correctPair[1], product, isCorrect: true },
      ...wrongChoices.map(w => ({ ...w, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);
    
    setTargetNumber(product);
    setChoices(allChoices);
    setFeedback(null);
    setSelectedChoice(null);
  };

  const startGame = () => {
    // Clear existing timer to prevent accumulation
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    initAudio();
    setScore(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setTimeLeft(60);
    setGameState('playing');
    generateQuestion();
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameState('gameOver');
          return 0;
        }
        if (prev <= 10) {
          playSound('tick');
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleChoice = (choice) => {
    if (feedback) return; // Prevent multiple clicks
    
    setSelectedChoice(choice);
    
    if (choice.isCorrect) {
      playSound('correct');
      setScore(s => s + 100);
      setCorrectAnswers(c => c + 1);
      setFeedback('correct');
      
      setTimeout(() => {
        generateQuestion();
      }, 800);
    } else {
      playSound('wrong');
      setScore(s => Math.max(0, s - 20));
      setWrongAnswers(w => w + 1);
      setFeedback('wrong');
      
      setTimeout(() => {
        setFeedback(null);
        setSelectedChoice(null);
      }, 800);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-400 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-5xl font-bold text-center mb-4 text-green-600">
            Multiply Match
          </h1>
          <p className="text-center mb-8 text-gray-600">
            Find the Right Expression!
          </p>
          
          <div className="bg-gray-100 rounded-xl p-4 mb-6 text-sm text-gray-700">
            <p className="mb-2">📋 <strong>How to Play:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>A number will be shown</li>
              <li>Pick the correct expression</li>
              <li>Answer as many as you can in 60 seconds!</li>
            </ul>
          </div>
          
          <button
            onClick={startGame}
            className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white py-6 rounded-xl font-bold text-2xl hover:from-green-500 hover:to-blue-600 transition transform hover:scale-105 shadow-lg"
          >
            Start
          </button>
          <div className="mt-4 text-center text-xs text-gray-400">
            {VERSION}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-400 to-gray-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
          <h2 className="text-4xl font-bold mb-4 text-gray-700">Time's Up!</h2>
          <p className="text-3xl mb-2 text-green-600 font-bold">{score} points</p>
          <p className="text-xl mb-2">Correct: {correctAnswers}</p>
          <p className="text-xl mb-6">Wrong: {wrongAnswers}</p>
          
          <div className="space-y-3">
            <button
              onClick={startGame}
              className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white py-4 rounded-xl font-bold text-lg hover:from-green-500 hover:to-blue-600 transition"
            >
              Play Again
            </button>
            <button
              onClick={() => setGameState('menu')}
              className="w-full bg-gray-300 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-400 transition"
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing state
  const targetColor = getNumberColor(targetNumber);
  const size = Math.sqrt(targetNumber) * 30;
  const displaySize = Math.min(Math.max(size, 100), 250);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-300 to-purple-400 p-4 flex flex-col">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white rounded-xl p-3 mb-4 shadow-lg">
          <div className="flex justify-between items-center text-sm sm:text-base">
            <div className="text-blue-600 font-bold">Score: {score}</div>
            <div className={`font-bold ${timeLeft <= 10 ? 'text-red-600 text-xl' : 'text-green-600'}`}>
              Time: {timeLeft}s
            </div>
          </div>
        </div>

        {/* Target Number Display */}
        <div className="bg-white rounded-xl p-8 mb-4 shadow-lg flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4 text-lg">Which expression equals:</p>
            <div 
              className="rounded-full flex items-center justify-center text-white font-bold shadow-2xl mx-auto"
              style={{
                width: `${displaySize}px`,
                height: `${displaySize}px`,
                fontSize: `${displaySize / 2.5}px`,
                backgroundColor: targetColor.rgb,
                backgroundImage: targetColor.pattern,
                backgroundSize: '6px 6px'
              }}
            >
              {targetNumber}
            </div>
          </div>
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {choices.map((choice, idx) => {
            const color = getNumberColor(choice.product);
            const isCorrectChoice = choice.isCorrect;
            const showResult = feedback !== null;
            const wasSelected = selectedChoice === choice;
            
            let buttonStyle = 'bg-white hover:bg-gray-50';
            if (showResult && isCorrectChoice) {
              buttonStyle = 'bg-green-200 border-4 border-green-500';
            } else if (showResult && wasSelected && !isCorrectChoice) {
              buttonStyle = 'bg-red-100 border-4 border-red-500';
            } else if (showResult) {
              buttonStyle = 'bg-gray-100';
            }
            
            // Show actual number only after selection if it was the selected choice
            const showAnswer = wasSelected && showResult;
            
            return (
              <button
                key={idx}
                onClick={() => handleChoice(choice)}
                disabled={feedback !== null}
                className={`${buttonStyle} rounded-xl p-6 shadow-lg transition transform hover:scale-105 active:scale-95 disabled:transform-none disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-center gap-3">
                  <div 
                    className="rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-2xl shadow-md"
                    style={{
                      backgroundColor: getNumberColor(choice.a).rgb,
                      backgroundImage: getNumberColor(choice.a).pattern,
                      backgroundSize: '6px 6px'
                    }}
                  >
                    {choice.a}
                  </div>
                  <span className="text-3xl font-bold text-gray-700">×</span>
                  <div 
                    className="rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-2xl shadow-md"
                    style={{
                      backgroundColor: getNumberColor(choice.b).rgb,
                      backgroundImage: getNumberColor(choice.b).pattern,
                      backgroundSize: '6px 6px'
                    }}
                  >
                    {choice.b}
                  </div>
                  <span className="text-3xl font-bold text-gray-500">=</span>
                  <div 
                    className="rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-2xl shadow-md"
                    style={{
                      backgroundColor: color.rgb,
                      backgroundImage: color.pattern,
                      backgroundSize: '6px 6px'
                    }}
                  >
                    {showAnswer ? choice.product : '?'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl p-3 shadow-lg text-center">
          <div className="flex justify-around text-sm">
            <div>
              <span className="text-green-600 font-bold">✓ {correctAnswers}</span>
            </div>
            <div>
              <span className="text-red-600 font-bold">✗ {wrongAnswers}</span>
            </div>
          </div>
        </div>

        <div className="mt-2 text-center text-xs text-gray-100 opacity-70">
          {VERSION}
        </div>
      </div>
    </div>
  );
};

export default MultiplyMatch;