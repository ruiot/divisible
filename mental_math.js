// mental_math.js v0.8.1
// fix: v0.8.1 - Fix remainder validation, improve button layout and UI consistency

import React, { useState, useEffect, useRef } from 'react';

const MentalMathGame = () => {
  const VERSION = 'v0.8.1';
  const TOTAL_PROBLEMS = 10;

  // 基本設定
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'finished'
  const [mode, setMode] = useState(null);
  const [currentProblem, setCurrentProblem] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [problemStartTime, setProblemStartTime] = useState(null);
  
  // セッション統計
  const [correctCount, setCorrectCount] = useState(0);
  const [problemIndex, setProblemIndex] = useState(0);
  const [timings, setTimings] = useState([]); // { problem: '12×16', time: 8500, answer: 192 }
  const [mistakeCount, setMistakeCount] = useState(0);
  
  // 重複防止用: 使用済み問題のセット
  const [usedProblems, setUsedProblems] = useState(new Set());
  
  // フィードバック表示
  const [feedback, setFeedback] = useState(null); // { type: 'correct' | 'incorrect' }

  const audioContextRef = useRef(null);

  // Web Audio初期化
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  // 効果音再生
  const playSound = (type) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'correct') {
      // ピンポン♪ (C→E)
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.32);
    } else if (type === 'incorrect') {
      // ブー (低音)
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'finish') {
      // 完了音 (上昇)
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.42);
    } else if (type === 'button') {
      // クリック音 (短く軽い)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } else if (type === 'submit') {
      // 送信音 (確認音)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(700, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'clear') {
      // クリア音 (短いクリック)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    }
  };

  // 問題生成
  const getRandomYearNormal = (centerYear, minYear, maxYear, stdDev) => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    const year = Math.round(centerYear + z * stdDev);
    return Math.max(minYear, Math.min(maxYear, year));
  };

  const generateProblem = (selectedMode) => {
    const currentMode = selectedMode || mode;
    let a, b;
    
    if (currentMode === 'doomsday-easy') {
      const currentYear = new Date().getFullYear();
      const years = [currentYear, currentYear + 1];
      const year = years[Math.floor(Math.random() * 2)];
      
      const month = Math.floor(Math.random() * 12) + 1;
      const daysInMonth = new Date(year, month, 0).getDate();
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      
      const date = new Date(year, month - 1, day);
      const correctDay = date.getDay();
      
      return { 
        year, 
        month, 
        day, 
        answer: correctDay, 
        operator: 'doomsday',
        displayText: `${year}/${month}/${day}`
      };
    }
    
    if (currentMode === 'doomsday-hard') {
      const year = getRandomYearNormal(2000, 1900, 2099, 33);
      
      const month = Math.floor(Math.random() * 12) + 1;
      const daysInMonth = new Date(year, month, 0).getDate();
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      
      const date = new Date(year, month - 1, day);
      const correctDay = date.getDay();
      
      return { 
        year, 
        month, 
        day, 
        answer: correctDay, 
        operator: 'doomsday',
        displayText: `${year}/${month}/${day}`
      };
    }
    
    if (currentMode === '9+9') {
      a = Math.floor(Math.random() * 9) + 1;
      b = Math.floor(Math.random() * 9) + 1;
      return { a, b, answer: a + b, operator: '+' };
    } else if (currentMode === '99+9') {
      a = Math.floor(Math.random() * 89) + 11;
      b = Math.floor(Math.random() * 9) + 1;
      return { a, b, answer: a + b, operator: '+' };
    } else if (currentMode === '99+99') {
      a = Math.floor(Math.random() * 89) + 11;
      b = Math.floor(Math.random() * 89) + 11;
      return { a, b, answer: a + b, operator: '+' };
    } else if (currentMode === '999+999') {
      a = Math.floor(Math.random() * 900) + 100;
      b = Math.floor(Math.random() * 900) + 100;
      return { a, b, answer: a + b, operator: '+' };
    }
    
    if (currentMode === '99-99') {
      a = Math.floor(Math.random() * 90) + 10;
      b = Math.floor(Math.random() * a);
      return { a, b, answer: a - b, operator: '-' };
    } else if (currentMode === '999-999') {
      a = Math.floor(Math.random() * 900) + 100;
      b = Math.floor(Math.random() * a);
      return { a, b, answer: a - b, operator: '-' };
    }
    
    if (currentMode === '81÷9') {
      const divisor = Math.floor(Math.random() * 8) + 2;
      const quotient = Math.floor(Math.random() * 8) + 2;
      const dividend = divisor * quotient;
      return { a: dividend, b: divisor, answer: quotient, operator: '÷' };
    } else if (currentMode === '99÷9') {
      const divisor = Math.floor(Math.random() * 8) + 2;
      const dividend = Math.floor(Math.random() * 90) + 10;
      const quotient = Math.floor(dividend / divisor);
      const remainder = dividend % divisor;
      
      return { 
        a: dividend, 
        b: divisor, 
        answer: { quotient, remainder },
        operator: '÷',
        displayFormat: 'remainder'
      };
    }
    
    if (currentMode === '9x9') {
      a = Math.floor(Math.random() * 8) + 2;
      b = Math.floor(Math.random() * 8) + 2;
    } else if (currentMode === '19x19') {
      a = Math.floor(Math.random() * 9) + 11;
      b = Math.floor(Math.random() * 9) + 11;
    } else if (currentMode === '99x9') {
      a = Math.floor(Math.random() * 90) + 10;
      b = Math.floor(Math.random() * 8) + 2;
    } else if (currentMode === '99^2') {
      a = Math.floor(Math.random() * 89) + 11;
      b = a;
      return { a, b, answer: a * b, operator: '²' };
    } else if (currentMode === '99x99') {
      a = Math.floor(Math.random() * 90) + 10;
      b = Math.floor(Math.random() * 90) + 10;
    }
    
    return { a, b, answer: a * b, operator: '×' };
  };

  const generateUniqueProblem = (selectedMode, usedSet) => {
    let problem;
    let attempts = 0;
    
    do {
      problem = generateProblem(selectedMode);
      attempts++;
      if (attempts > 100) break;
      
      const key = problem.operator === 'doomsday' 
        ? `${problem.year}-${problem.month}-${problem.day}`
        : `${problem.a}${problem.operator}${problem.b}`;
      
      if (!usedSet.has(key)) break;
    } while (true);
    
    return problem;
  };

  const startGame = (selectedMode) => {
    initAudio();
    setMode(selectedMode);
    setGameState('playing');
    setCorrectCount(0);
    setProblemIndex(0);
    setTimings([]);
    setMistakeCount(0);
    setUserAnswer('');
    setFeedback(null);
    
    const newUsedProblems = new Set();
    setUsedProblems(newUsedProblems);
    
    const problem = generateUniqueProblem(selectedMode, newUsedProblems);
    
    const key = problem.operator === 'doomsday' 
      ? `${problem.year}-${problem.month}-${problem.day}`
      : `${problem.a}${problem.operator}${problem.b}`;
    
    newUsedProblems.add(key);
    setUsedProblems(new Set(newUsedProblems));
    
    setCurrentProblem(problem);
    setProblemStartTime(Date.now());
  };

  const inputNumber = (num) => {
    if (feedback) return;
    playSound('button');
    if (userAnswer.length < 10) {
      setUserAnswer(userAnswer + num);
    }
  };

  const inputEllipsis = () => {
    if (feedback) return;
    if (userAnswer.includes('⋯')) return;
    if (userAnswer === '') return;
    playSound('button');
    setUserAnswer(userAnswer + '⋯');
  };

  const clearInput = () => {
    if (feedback) return;
    playSound('clear');
    setUserAnswer('');
  };

  const backspace = () => {
    if (feedback) return;
    setUserAnswer(userAnswer.slice(0, -1));
  };

  const submitAnswer = () => {
    if (!userAnswer || !currentProblem || feedback) return;

    playSound('submit');

    const elapsed = Date.now() - problemStartTime;
    let isCorrect = false;
    
    if (currentProblem.displayFormat === 'remainder') {
      // 余りモード
      if (userAnswer.includes('⋯')) {
        const [q, r] = userAnswer.split('⋯').map(s => parseInt(s));
        isCorrect = !isNaN(q) && !isNaN(r) && 
                    q === currentProblem.answer.quotient && 
                    r === currentProblem.answer.remainder;
      } else {
        // 余り記号なし: 余りがゼロの場合のみ正解
        const q = parseInt(userAnswer);
        isCorrect = !isNaN(q) && 
                    q === currentProblem.answer.quotient && 
                    currentProblem.answer.remainder === 0;
      }
    } else if (currentProblem.operator === 'doomsday') {
      // 曜日計算: 余り記号があれば不正解
      if (userAnswer.includes('⋯')) {
        isCorrect = false;
      } else {
        isCorrect = parseInt(userAnswer) === currentProblem.answer;
      }
    } else {
      // 通常モード: 余り記号があれば不正解
      if (userAnswer.includes('⋯')) {
        isCorrect = false;
      } else {
        isCorrect = parseInt(userAnswer) === currentProblem.answer;
      }
    }
    
    if (isCorrect) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      setFeedback({ 
        type: 'correct', 
        dayName: currentProblem.operator === 'doomsday' ? dayNames[currentProblem.answer] : null 
      });
    } else {
      setFeedback({ type: 'incorrect' });
    }
    
    playSound(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      const problemStr = currentProblem.operator === 'doomsday'
        ? currentProblem.displayText
        : currentProblem.operator === '²' 
          ? `${currentProblem.a}²`
          : currentProblem.displayFormat === 'remainder'
            ? `${currentProblem.a}÷${currentProblem.b}`
            : `${currentProblem.a}${currentProblem.operator}${currentProblem.b}`;
      
      const newTimings = [...timings, {
        problem: problemStr,
        time: elapsed,
        answer: currentProblem.displayFormat === 'remainder' 
          ? `${currentProblem.answer.quotient}⋯${currentProblem.answer.remainder}`
          : currentProblem.answer
      }];
      setTimings(newTimings);
      setCorrectCount(correctCount + 1);

      setTimeout(() => {
        setFeedback(null);
        setUserAnswer('');
        
        if (problemIndex + 1 >= TOTAL_PROBLEMS) {
          playSound('finish');
          setGameState('finished');
        } else {
          setProblemIndex(problemIndex + 1);
          
          setUsedProblems(currentUsed => {
            const newUsed = new Set(currentUsed);
            const problem = generateUniqueProblem(mode, newUsed);
            
            const key = problem.operator === 'doomsday' 
              ? `${problem.year}-${problem.month}-${problem.day}`
              : `${problem.a}${problem.operator}${problem.b}`;
            
            newUsed.add(key);
            
            setCurrentProblem(problem);
            setProblemStartTime(Date.now());
            
            return newUsed;
          });
        }
      }, 300);
    } else {
      setMistakeCount(mistakeCount + 1);
      
      setTimeout(() => {
        setFeedback(null);
        setUserAnswer('');
      }, 800);
    }
  };

  const backToMenu = () => {
    setGameState('menu');
    setMode(null);
    setCurrentProblem(null);
    setUserAnswer('');
    setFeedback(null);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameState !== 'playing' || feedback) return;
      
      if (e.key >= '0' && e.key <= '9') {
        inputNumber(e.key);
      } else if (e.key === 'Enter') {
        submitAnswer();
      } else if (e.key === 'Backspace') {
        backspace();
      } else if (e.key === 'Escape') {
        clearInput();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, userAnswer, feedback]);

  // 曜日名を取得（0-6の入力に対応）
  const getWeekdayName = () => {
    if (!currentProblem || currentProblem.operator !== 'doomsday') return null;
    
    const num = parseInt(userAnswer);
    if (isNaN(num) || num < 0 || num > 6) return null;
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNames[num];
  };

  if (gameState === 'menu') {
    const currentYear = new Date().getFullYear();
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-400 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-center mb-4 text-blue-600">
            Mental Math
          </h1>

          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
              ➕ 足し算
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => startGame('9+9')}
                className="bg-gradient-to-r from-green-400 to-emerald-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-green-500 hover:to-emerald-600 transition transform hover:scale-105 shadow-lg"
              >
                9+9
              </button>
              <button
                onClick={() => startGame('99+9')}
                className="bg-gradient-to-r from-green-400 to-emerald-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-green-500 hover:to-emerald-600 transition transform hover:scale-105 shadow-lg"
              >
                99+9
              </button>
              <button
                onClick={() => startGame('99+99')}
                className="bg-gradient-to-r from-green-400 to-emerald-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-green-500 hover:to-emerald-600 transition transform hover:scale-105 shadow-lg"
              >
                99+99
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                onClick={() => startGame('999+999')}
                className="bg-gradient-to-r from-green-400 to-emerald-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-green-500 hover:to-emerald-600 transition transform hover:scale-105 shadow-lg"
              >
                999+999
              </button>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
              ➖ 引き算
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => startGame('99-99')}
                className="bg-gradient-to-r from-teal-400 to-cyan-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-teal-500 hover:to-cyan-600 transition transform hover:scale-105 shadow-lg"
              >
                99-99
              </button>
              <button
                onClick={() => startGame('999-999')}
                className="bg-gradient-to-r from-teal-400 to-cyan-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-teal-500 hover:to-cyan-600 transition transform hover:scale-105 shadow-lg"
              >
                999-999
              </button>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
              ✕ 掛け算
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => startGame('9x9')}
                className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-blue-500 hover:to-indigo-600 transition transform hover:scale-105 shadow-lg"
              >
                9×9
              </button>
              <button
                onClick={() => startGame('99x9')}
                className="bg-gradient-to-r from-orange-400 to-amber-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-orange-500 hover:to-amber-600 transition transform hover:scale-105 shadow-lg"
              >
                99×9
              </button>
              <button
                onClick={() => startGame('99x99')}
                className="bg-gradient-to-r from-red-400 to-rose-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-red-500 hover:to-rose-600 transition transform hover:scale-105 shadow-lg"
              >
                99×99
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                onClick={() => startGame('19x19')}
                className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-blue-500 hover:to-indigo-600 transition transform hover:scale-105 shadow-lg"
              >
                19×19
              </button>
              <button
                onClick={() => startGame('99^2')}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-orange-600 hover:to-red-600 transition transform hover:scale-105 shadow-lg"
              >
                99²
              </button>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
              ➗ 割り算
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => startGame('81÷9')}
                className="bg-gradient-to-r from-purple-400 to-pink-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-purple-500 hover:to-pink-600 transition transform hover:scale-105 shadow-lg"
              >
                81÷9
              </button>
              <button
                onClick={() => startGame('99÷9')}
                className="bg-gradient-to-r from-pink-400 to-rose-500 text-white py-3 rounded-xl font-bold text-base sm:text-lg hover:from-pink-500 hover:to-rose-600 transition transform hover:scale-105 shadow-lg"
              >
                99÷9
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
              📅 曜日計算
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => startGame('doomsday-easy')}
                className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white py-3 rounded-xl font-bold text-sm hover:from-cyan-500 hover:to-blue-600 transition transform hover:scale-105 shadow-lg"
              >
                {currentYear}-<br/>{currentYear + 1}
              </button>
              <button
                onClick={() => startGame('doomsday-hard')}
                className="bg-gradient-to-r from-purple-400 to-pink-500 text-white py-3 rounded-xl font-bold text-sm hover:from-purple-500 hover:to-pink-600 transition transform hover:scale-105 shadow-lg"
              >
                1900-<br/>2099
              </button>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-gray-400">
            {VERSION}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    const avgTime = timings.length > 0 
      ? timings.reduce((a, b) => a + b.time, 0) / timings.length / 1000 
      : 0;

    const weekdayName = getWeekdayName();

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-300 to-purple-400 flex items-center justify-center p-2 sm:p-4">
        <div className="max-w-md w-full flex flex-col" style={{ minHeight: '100vh' }}>
          <div className="flex justify-between items-center mb-1 flex-none">
            <button 
              onClick={backToMenu}
              className="text-white text-xs sm:text-sm hover:text-gray-200"
            >
              ← メニュー
            </button>
            <div className="font-bold text-white text-xs sm:text-sm">{mode}</div>
            <div className="text-white font-mono text-xs sm:text-sm">
              {problemIndex + 1}/{TOTAL_PROBLEMS}
            </div>
          </div>

          <div className="bg-white rounded-lg px-2 sm:px-3 py-1 mb-2 flex-none">
            <div className="flex justify-around text-xs sm:text-sm">
              <div className="text-center">
                <span className="text-gray-500">正解 </span>
                <span className="font-bold text-green-600">{correctCount}</span>
              </div>
              <div className="text-center">
                <span className="text-gray-500">平均 </span>
                <span className="font-bold text-blue-600">
                  {avgTime > 0 ? `${avgTime.toFixed(1)}秒` : '-'}
                </span>
              </div>
              <div className="text-center">
                <span className="text-gray-500">ミス </span>
                <span className="font-bold text-red-600">{mistakeCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center mb-2 relative p-4 overflow-hidden" style={{ minHeight: '280px' }}>
            <div className="text-center w-full">
              {currentProblem.operator === 'doomsday' ? (
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800 mb-2 sm:mb-3">
                  {currentProblem.displayText}
                </div>
              ) : mode === '99^2' ? (
                <div className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-800 mb-2 sm:mb-3 whitespace-nowrap">
                  {currentProblem.a}²
                </div>
              ) : (
                <div className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-800 mb-2 sm:mb-3 whitespace-nowrap">
                  {currentProblem.a} {currentProblem.operator} {currentProblem.b}
                </div>
              )}
              <div className="text-5xl sm:text-6xl md:text-7xl font-mono text-blue-600 font-bold">
                {userAnswer || '_'}
              </div>
              {weekdayName && (
                <div className="text-2xl sm:text-3xl text-gray-600 mt-2">
                  {weekdayName}
                </div>
              )}
            </div>
            
            {feedback && (
              <div className={`absolute inset-0 flex flex-col items-center justify-center rounded-2xl ${
                feedback.type === 'correct' ? 'bg-green-500' : 'bg-red-500'
              } bg-opacity-90`}>
                <div className="text-white text-7xl sm:text-8xl md:text-9xl mb-2">
                  {feedback.type === 'correct' ? '✓' : '✗'}
                </div>
                {feedback.type === 'correct' && feedback.dayName && (
                  <div className="text-white text-2xl sm:text-3xl font-bold">
                    {feedback.dayName} ({currentProblem.answer})
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-none bg-white rounded-xl p-2 shadow-xl mb-4 sm:mb-6">
            <div className="grid grid-cols-4 gap-2">
              {/* Row 1 */}
              <button
                onClick={() => inputNumber('7')}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl sm:text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                7
              </button>
              <button
                onClick={() => inputNumber('8')}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl sm:text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                8
              </button>
              <button
                onClick={() => inputNumber('9')}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl sm:text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                9
              </button>
              <button
                onClick={backspace}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-yellow-100 to-yellow-200 hover:from-yellow-200 hover:to-yellow-300 rounded-xl text-2xl sm:text-3xl font-bold text-yellow-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                ⌫
              </button>
              
              {/* Row 2 */}
              <button
                onClick={() => inputNumber('4')}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl sm:text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                4
              </button>
              <button
                onClick={() => inputNumber('5')}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl sm:text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                5
              </button>
              <button
                onClick={() => inputNumber('6')}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl sm:text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                6
              </button>
              <button
                onClick={clearInput}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-yellow-100 to-yellow-200 hover:from-yellow-200 hover:to-yellow-300 rounded-xl text-3xl sm:text-4xl font-bold text-yellow-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                C
              </button>
              
              {/* Row 3 */}
              <button
                onClick={() => inputNumber('1')}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl sm:text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                1
              </button>
              <button
                onClick={() => inputNumber('2')}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl sm:text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                2
              </button>
              <button
                onClick={() => inputNumber('3')}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl sm:text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                3
              </button>
              <button
                onClick={submitAnswer}
                disabled={!userAnswer || feedback !== null}
                className={`row-span-2 rounded-xl text-3xl sm:text-4xl font-bold shadow-md active:scale-95 transition ${
                  userAnswer && !feedback
                    ? 'bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                ✓
              </button>
              
              {/* Row 4 */}
              <button
                onClick={() => inputNumber('0')}
                disabled={feedback !== null}
                className="col-span-2 aspect-[2/1] bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl sm:text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                0
              </button>
              <button
                onClick={inputEllipsis}
                disabled={feedback !== null}
                className="aspect-square bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 rounded-xl text-3xl sm:text-4xl font-bold text-blue-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                ⋯
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-white opacity-70 flex-none mb-2">
            {VERSION}
          </div>
        </div>
      </div>
    );
  }

  // 終了画面
  if (gameState === 'finished') {
    const totalTime = timings.reduce((a, b) => a + b.time, 0) / 1000;
    const avgTime = totalTime / TOTAL_PROBLEMS;
    
    // 時間順にソート
    const sortedTimings = [...timings].sort((a, b) => b.time - a.time);
    const maxTime = sortedTimings[0]?.time || 1;

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-300 to-purple-400 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-4 sm:p-6 max-w-md w-full shadow-2xl">
          <div className="text-5xl sm:text-6xl mb-2 sm:mb-3 text-center">🎉</div>
          
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 text-green-600 text-center">
            完了!
          </h2>
          
          <div className="bg-gray-100 rounded-xl p-3 mb-3 sm:mb-4 space-y-1 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">合計時間:</span>
              <span className="font-mono font-bold">{totalTime.toFixed(1)}秒</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">平均時間:</span>
              <span className="font-mono font-bold">{avgTime.toFixed(1)}秒/問</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">総ミス回数:</span>
              <span className="font-mono font-bold text-red-600">{mistakeCount}回</span>
            </div>
          </div>

          <div className="mb-3 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-700 mb-2">問題別タイム</h3>
            <div className="space-y-1 sm:space-y-1.5">
              {sortedTimings.map((item, idx) => {
                const percentage = (item.time / maxTime) * 100;
                const timeText = (item.time / 1000).toFixed(1) + '秒';
                return (
                  <div key={idx} className="flex items-center gap-1 sm:gap-2">
                    <div className="w-16 sm:w-20 text-right font-mono text-gray-600 text-xs">
                      {item.problem}
                    </div>
                    <div className="flex-1 flex items-center gap-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-5 sm:h-6 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-400 to-purple-500 h-full transition-all"
                          style={{ width: `${percentage}%` }}
                        >
                        </div>
                      </div>
                      <div className="w-12 sm:w-14 text-xs font-bold text-gray-700 font-mono">
                        {timeText}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => startGame(mode)}
              className="w-full bg-gradient-to-r from-blue-400 to-purple-500 text-white py-3 rounded-xl font-bold text-sm sm:text-base hover:from-blue-500 hover:to-purple-600 transition transform hover:scale-105"
            >
              もう一度
            </button>
            <button
              onClick={backToMenu}
              className="w-full bg-gray-300 text-gray-700 py-3 rounded-xl font-bold text-sm sm:text-base hover:bg-gray-400 transition"
            >
              メニューに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MentalMathGame;