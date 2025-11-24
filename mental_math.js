// mental_math.js v0.4.9
// feat: v0.4.9 - 64px square buttons, text-4xl, optimized layout for thumb reach

import React, { useState, useEffect, useRef } from 'react';

const MentalMathGame = () => {
  const VERSION = 'v0.4.9';
  const TOTAL_PROBLEMS = 10;

  // 基本設定
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'finished'
  const [mode, setMode] = useState(null); // '9x9' | '19x19' | '99x9' | '99x99'
  const [currentProblem, setCurrentProblem] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [startTime, setStartTime] = useState(null);
  
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
    setStartTime(Date.now()); // 画面表示と同時に計測開始
  };

  // 数字入力
  const inputNumber = (num) => {
    if (feedback) return; // フィードバック表示中は入力不可
    playSound('button');
    if (userAnswer.length < 5) {
      setUserAnswer(userAnswer + num);
    }
  };

  // クリア
  const clearInput = () => {
    if (feedback) return;
    playSound('clear');
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

    playSound('submit');

    const elapsed = Date.now() - startTime;
    const isCorrect = parseInt(userAnswer) === currentProblem.answer;
    
    // フィードバック表示
    setFeedback({ type: isCorrect ? 'correct' : 'incorrect' });
    playSound(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      // 正解時: 統計更新
      const newTimings = [...timings, {
        problem: `${currentProblem.a}×${currentProblem.b}`,
        time: elapsed,
        answer: currentProblem.answer
      }];
      setTimings(newTimings);
      setCorrectCount(correctCount + 1);

      // 0.3秒後に次の問題へ
      setTimeout(() => {
        setFeedback(null);
        setUserAnswer('');
        
        if (problemIndex + 1 >= TOTAL_PROBLEMS) {
          // 全問終了
          playSound('finish');
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
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-4xl sm:text-5xl font-bold text-center mb-3 sm:mb-4 text-blue-600">
            Mental Math
          </h1>
          <p className="text-center mb-6 sm:mb-8 text-sm sm:text-base text-gray-600">
            暗算練習ツール (10問)
          </p>
          
          <div className="space-y-3 sm:space-y-4">
            <button
              onClick={() => startGame('9x9')}
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white py-5 sm:py-6 rounded-xl font-bold text-xl sm:text-2xl hover:from-green-500 hover:to-emerald-600 transition transform hover:scale-105 shadow-lg"
            >
              9×9 モード
            </button>
            
            <button
              onClick={() => startGame('19x19')}
              className="w-full bg-gradient-to-r from-blue-400 to-indigo-500 text-white py-5 sm:py-6 rounded-xl font-bold text-xl sm:text-2xl hover:from-blue-500 hover:to-indigo-600 transition transform hover:scale-105 shadow-lg"
            >
              19×19 モード
            </button>

            <button
              onClick={() => startGame('99x9')}
              className="w-full bg-gradient-to-r from-orange-400 to-amber-500 text-white py-5 sm:py-6 rounded-xl font-bold text-xl sm:text-2xl hover:from-orange-500 hover:to-amber-600 transition transform hover:scale-105 shadow-lg"
            >
              99×9 モード
            </button>

            <button
              onClick={() => startGame('99x99')}
              className="w-full bg-gradient-to-r from-red-400 to-rose-500 text-white py-5 sm:py-6 rounded-xl font-bold text-xl sm:text-2xl hover:from-red-500 hover:to-rose-600 transition transform hover:scale-105 shadow-lg"
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
      ? timings.reduce((a, b) => a + b.time, 0) / timings.length / 1000 
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-300 to-purple-400 flex items-center justify-center p-2 sm:p-4">
        <div className="max-w-md w-full flex flex-col" style={{ minHeight: '100vh' }}>
          {/* ヘッダー - コンパクト */}
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

          {/* 統計 - ヘッダー直下 */}
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

          {/* 問題表示 - 残り全部を使う */}
          <div className="flex-1 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center mb-2 relative p-4">
            <div className="text-center w-full">
              <div className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-800 mb-2 sm:mb-3">
                {currentProblem.a} × {currentProblem.b}
              </div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-mono text-blue-600 font-bold">
                {userAnswer || '_'}
              </div>
            </div>
            
            {/* フィードバック表示 */}
            {feedback && (
              <div className={`absolute inset-0 flex items-center justify-center rounded-2xl ${
                feedback.type === 'correct' ? 'bg-green-500' : 'bg-red-500'
              } bg-opacity-90`}>
                <div className="text-white text-7xl sm:text-8xl md:text-9xl">
                  {feedback.type === 'correct' ? '✓' : '✗'}
                </div>
              </div>
            )}
          </div>

          {/* 電卓UI - 64px正方形ボタン */}
          <div className="flex-none bg-white rounded-xl p-2 shadow-xl mb-4 sm:mb-6">
            <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(num => (
                <button
                  key={num}
                  onClick={() => inputNumber(num.toString())}
                  disabled={feedback !== null}
                  className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              
              <button
                onClick={clearInput}
                disabled={feedback !== null}
                className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 rounded-xl text-2xl font-bold text-red-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                C
              </button>
              
              <button
                onClick={() => inputNumber('0')}
                disabled={feedback !== null}
                className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-4xl font-bold text-gray-700 shadow-md active:scale-95 transition disabled:opacity-50"
              >
                0
              </button>
              
              <button
                onClick={submitAnswer}
                disabled={!userAnswer || feedback !== null}
                className={`w-16 h-16 rounded-xl text-3xl font-bold shadow-md active:scale-95 transition ${
                  userAnswer && !feedback
                    ? 'bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                ✓
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

          {/* 問題別時間グラフ */}
          <div className="mb-3 sm:mb-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-700 mb-2">問題別タイム</h3>
            <div className="space-y-1 sm:space-y-1.5">
              {sortedTimings.map((item, idx) => {
                const percentage = (item.time / maxTime) * 100;
                const timeText = (item.time / 1000).toFixed(1) + '秒';
                return (
                  <div key={idx} className="flex items-center gap-1 sm:gap-2">
                    <div className="w-12 sm:w-16 text-right font-mono text-gray-600 text-xs">
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