// mental_math.js v0.4.1
// feat: v0.4.1 - Huge problem display, smaller balanced buttons

import React, { useState, useEffect, useRef } from 'react';

const MentalMathGame = () => {
  const VERSION = 'v0.4.1';
  const TOTAL_PROBLEMS = 20;

  // 基本設定
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'finished'
  const [mode, setMode] = useState(null); // '9x9' | '19x19' | '99x9' | '99x99'
  const [currentProblem, setCurrentProblem] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [startTime, setStartTime] = useState(null);
  
  // セッション統計
  const [correctCount, setCorrectCount] = useState(0);
  const [problemIndex, setProblemIndex] = useState(0);
  const [timings, setTimings] = useState([]);
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
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'incorrect') {
      // ブー (低音)
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'finish') {
      // 完了音 (上昇)
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    }
  };

  // 問題生成
  const generateProblem = (selectedMode) => {
    let a, b;
    if (selectedMode === '9x9') {
      a = Math.floor(Math.random() * 8) + 2;  // 2-9
      b = Math.floor(Math.random() * 8) + 2;  // 2-9
    } else if (selectedMode === '19x19') {
      a = Math.floor(Math.random() * 9) + 11; // 11-19
      b = Math.floor(Math.random() * 9) + 11; // 11-19
    } else if (selectedMode === '99x9') {
      a = Math.floor(Math.random() * 90) + 10; // 10-99
      b = Math.floor(Math.random() * 8) + 2;   // 2-9
    } else if (selectedMode === '99x99') {
      a = Math.floor(Math.random() * 90) + 10; // 10-99
      b = Math.floor(Math.random() * 90) + 10; // 10-99
    }
    return { a, b, answer: a * b };
  };

  // 重複のない問題生成
  const generateUniqueProblem = (selectedMode, usedSet) => {
    let problem;
    let attempts = 0;
    
    do {
      problem = generateProblem(selectedMode);
      attempts++;
      // 100回試行しても見つからない場合は重複を許可
      if (attempts > 100) break;
    } while (usedSet.has(`${problem.a}×${problem.b}`));
    
    return problem;
  };

  // ゲーム開始
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
    newUsedProblems.add(`${problem.a}×${problem.b}`);
    setUsedProblems(new Set(newUsedProblems));
    
    setCurrentProblem(problem);
    setStartTime(Date.now());
  };

  // 数字入力
  const inputNumber = (num) => {
    if (feedback) return; // フィードバック表示中は入力不可
    if (userAnswer.length < 5) {
      setUserAnswer(userAnswer + num);
    }
  };

  // クリア
  const clearInput = () => {
    if (feedback) return;
    setUserAnswer('');
  };

  // Backspace
  const backspace = () => {
    if (feedback) return;
    setUserAnswer(userAnswer.slice(0, -1));
  };

  // 回答送信
  const submitAnswer = () => {
    if (!userAnswer || !currentProblem || feedback) return;

    const elapsed = Date.now() - startTime;
    const isCorrect = parseInt(userAnswer) === currentProblem.answer;
    
    // フィードバック表示
    setFeedback({ type: isCorrect ? 'correct' : 'incorrect' });
    playSound(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      // 正解時: 統計更新
      const newTimings = [...timings, elapsed];
      setTimings(newTimings);
      setCorrectCount(correctCount + 1);

      // 0.3秒後に次の問題へ
      setTimeout(() => {
        setFeedback(null);
        setUserAnswer('');
        
        if (problemIndex + 1 >= TOTAL_PROBLEMS) {
          // 全問終了
          const totalTime = newTimings.reduce((a, b) => a + b, 0) / 1000;
          setGameState('finished');
        } else {
          // 次の問題
          setProblemIndex(problemIndex + 1);
          
          setUsedProblems(currentUsed => {
            const newUsed = new Set(currentUsed);
            const problem = generateUniqueProblem(mode, newUsed);
            newUsed.add(`${problem.a}×${problem.b}`);
            
            setCurrentProblem(problem);
            setStartTime(Date.now());
            
            return newUsed;
          });
        }
      }, 300);
    } else {
      // 不正解時: ミス回数増加、同じ問題を再出題
      setMistakeCount(mistakeCount + 1);
      
      setTimeout(() => {
        setFeedback(null);
        setUserAnswer('');
        setStartTime(Date.now()); // タイマーリセット
      }, 300);
    }
  };

  // メニューに戻る
  const backToMenu = () => {
    setGameState('menu');
    setMode(null);
    setCurrentProblem(null);
    setUserAnswer('');
    setFeedback(null);
  };

  // キーボード入力対応
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

  // メニュー画面
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-400 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-5xl font-bold text-center mb-4 text-blue-600">
            Mental Math
          </h1>
          <p className="text-center mb-8 text-gray-600">
            暗算練習ツール (20問)
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => startGame('9x9')}
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white py-6 rounded-xl font-bold text-2xl hover:from-green-500 hover:to-emerald-600 transition transform hover:scale-105 shadow-lg"
            >
              9×9 モード
            </button>
            
            <button
              onClick={() => startGame('19x19')}
              className="w-full bg-gradient-to-r from-blue-400 to-indigo-500 text-white py-6 rounded-xl font-bold text-2xl hover:from-blue-500 hover:to-indigo-600 transition transform hover:scale-105 shadow-lg"
            >
              19×19 モード
            </button>

            <button
              onClick={() => startGame('99x9')}
              className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-white py-6 rounded-xl font-bold text-2xl hover:from-orange-500 hover:to-amber-600 transition transform hover:scale-105 shadow-lg"
            >
              99×9 モード
            </button>

            <button
              onClick={() => startGame('99x99')}
              className="w-full bg-gradient-to-r from-red-400 to-rose-500 text-white py-6 rounded-xl font-bold text-2xl hover:from-red-500 hover:to-rose-600 transition transform hover:scale-105 shadow-lg"
            >
              99×99 モード
            </button>
          </div>

          <div className="mt-4 text-center text-xs text-gray-400">
            {VERSION}
          </div>
        </div>
      </div>
    );
  }

  // プレイ画面
  if (gameState === 'playing') {
    const avgTime = timings.length > 0 
      ? timings.reduce((a, b) => a + b, 0) / timings.length / 1000 
      : 0;

    return (
      <div className="fixed inset-0 bg-gradient-to-b from-blue-300 to-purple-400 flex flex-col"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex-1 flex flex-col p-2">
          {/* ヘッダー - 最小限 */}
          <div className="bg-white rounded-lg px-3 py-1.5 mb-2 shadow-lg">
            <div className="flex justify-between items-center text-xs">
              <button 
                onClick={backToMenu}
                className="text-gray-500"
              >
                ← メニュー
              </button>
              <div className="font-bold text-purple-600">{mode}</div>
              <div className="text-blue-600 font-mono">
                {problemIndex + 1}/{TOTAL_PROBLEMS}
              </div>
            </div>
          </div>

          {/* 問題表示 - 超巨大 */}
          <div className="bg-white rounded-lg p-6 mb-2 shadow-lg relative flex-1 flex items-center justify-center">
            <div className="text-center w-full">
              <div className="text-6xl sm:text-7xl font-bold text-gray-800 mb-4">
                {currentProblem.a} × {currentProblem.b}
              </div>
              <div className="text-5xl sm:text-6xl font-mono text-blue-600 font-bold">
                {userAnswer || '_'}
              </div>
            </div>
            
            {/* フィードバック表示 */}
            {feedback && (
              <div className={`absolute inset-0 flex items-center justify-center rounded-lg ${
                feedback.type === 'correct' ? 'bg-green-500' : 'bg-red-500'
              } bg-opacity-90`}>
                <div className="text-white text-8xl">
                  {feedback.type === 'correct' ? '✓' : '✗'}
                </div>
              </div>
            )}
          </div>

          {/* 統計 - コンパクト */}
          <div className="bg-white rounded-lg px-3 py-1.5 mb-2 shadow-lg">
            <div className="flex justify-around text-xs">
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

          {/* 電卓UI - 小さく・バランス良く */}
          <div className="bg-white rounded-lg p-2 shadow-lg">
            <div className="grid grid-cols-3 gap-1">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(num => (
                <button
                  key={num}
                  onClick={() => inputNumber(num.toString())}
                  disabled={feedback !== null}
                  className="h-12 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-md text-xl font-bold text-gray-700 shadow-sm active:scale-95 transition disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              
              <button
                onClick={clearInput}
                disabled={feedback !== null}
                className="h-12 bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 rounded-md text-lg font-bold text-red-700 shadow-sm active:scale-95 transition disabled:opacity-50"
              >
                C
              </button>
              
              <button
                onClick={() => inputNumber('0')}
                disabled={feedback !== null}
                className="h-12 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-md text-xl font-bold text-gray-700 shadow-sm active:scale-95 transition disabled:opacity-50"
              >
                0
              </button>
              
              <button
                onClick={submitAnswer}
                disabled={!userAnswer || feedback !== null}
                className={`h-12 rounded-md text-lg font-bold shadow-sm active:scale-95 transition ${
                  userAnswer && !feedback
                    ? 'bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 終了画面
  if (gameState === 'finished') {
    const totalTime = timings.reduce((a, b) => a + b, 0) / 1000;
    const avgTime = totalTime / TOTAL_PROBLEMS;

    return (
      <div className="fixed inset-0 bg-gradient-to-b from-blue-300 to-purple-400 flex items-center justify-center p-4"
           style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}>
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-4">🎉</div>
          
          <h2 className="text-4xl font-bold mb-4 text-green-600">
            完了!
          </h2>
          
          <div className="text-xl mb-6 text-gray-700">
            <div className="mb-4">
              <div className="text-3xl font-bold text-blue-600 mb-2">{TOTAL_PROBLEMS}問</div>
              <div className="text-gray-500">全問正解まで頑張りました!</div>
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl p-4 mb-6 space-y-2">
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

          <div className="space-y-3">
            <button
              onClick={() => startGame(mode)}
              className="w-full bg-gradient-to-r from-blue-400 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-500 hover:to-purple-600 transition transform hover:scale-105"
            >
              もう一度
            </button>
            <button
              onClick={backToMenu}
              className="w-full bg-gray-300 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-400 transition"
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