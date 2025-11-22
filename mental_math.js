// mental_math.js v0.1.0
import React, { useState, useEffect, useRef } from 'react';

const MentalMathGame = () => {
  // 基本設定
  const [gameState, setGameState] = useState('menu'); // 'menu' | 'playing' | 'result'
  const [mode, setMode] = useState(null); // '9x9' | '20x20'
  const [currentProblem, setCurrentProblem] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [startTime, setStartTime] = useState(null);
  
  // セッション統計
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [timings, setTimings] = useState([]);
  
  // 結果表示用
  const [lastResult, setLastResult] = useState(null);
  
  // localStorage記録
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('mentalMathStats');
    return saved ? JSON.parse(saved) : {
      '9x9': { total: 0, correct: 0, avgTime: 0 },
      '20x20': { total: 0, correct: 0, avgTime: 0 }
    };
  });

  // 問題生成
  const generateProblem = (selectedMode) => {
    const max = selectedMode === '9x9' ? 9 : 20;
    const a = Math.floor(Math.random() * max) + 1;
    const b = Math.floor(Math.random() * max) + 1;
    return { a, b, answer: a * b };
  };

  // ゲーム開始
  const startGame = (selectedMode) => {
    setMode(selectedMode);
    setGameState('playing');
    setCorrectCount(0);
    setTotalCount(0);
    setTimings([]);
    setUserAnswer('');
    const problem = generateProblem(selectedMode);
    setCurrentProblem(problem);
    setStartTime(Date.now());
  };

  // 数字入力
  const inputNumber = (num) => {
    if (userAnswer.length < 5) { // 最大5桁
      setUserAnswer(userAnswer + num);
    }
  };

  // クリア
  const clearInput = () => {
    setUserAnswer('');
  };

  // 回答送信
  const submitAnswer = () => {
    if (!userAnswer || !currentProblem) return;

    const elapsed = Date.now() - startTime;
    const isCorrect = parseInt(userAnswer) === currentProblem.answer;
    
    // 統計更新
    const newCorrect = isCorrect ? correctCount + 1 : correctCount;
    const newTotal = totalCount + 1;
    const newTimings = [...timings, elapsed];
    
    setCorrectCount(newCorrect);
    setTotalCount(newTotal);
    setTimings(newTimings);
    
    // 結果保存
    setLastResult({
      isCorrect,
      userAnswer: parseInt(userAnswer),
      correctAnswer: currentProblem.answer,
      time: elapsed,
      problem: currentProblem
    });
    
    // localStorage更新
    const avgTime = newTimings.reduce((a, b) => a + b, 0) / newTimings.length;
    const newStats = {
      ...stats,
      [mode]: {
        total: stats[mode].total + 1,
        correct: stats[mode].correct + (isCorrect ? 1 : 0),
        avgTime: ((stats[mode].avgTime * stats[mode].total) + elapsed) / (stats[mode].total + 1)
      }
    };
    setStats(newStats);
    localStorage.setItem('mentalMathStats', JSON.stringify(newStats));
    
    setGameState('result');
  };

  // 次の問題へ
  const nextProblem = () => {
    setUserAnswer('');
    const problem = generateProblem(mode);
    setCurrentProblem(problem);
    setStartTime(Date.now());
    setGameState('playing');
  };

  // メニューに戻る
  const backToMenu = () => {
    setGameState('menu');
    setMode(null);
    setCurrentProblem(null);
    setUserAnswer('');
  };

  // キーボード入力対応
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameState !== 'playing') return;
      
      if (e.key >= '0' && e.key <= '9') {
        inputNumber(e.key);
      } else if (e.key === 'Enter') {
        submitAnswer();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        setUserAnswer(userAnswer.slice(0, -1));
      } else if (e.key === 'Escape') {
        clearInput();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, userAnswer]);

  // メニュー画面
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-400 to-blue-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-5xl font-bold text-center mb-4 text-blue-600">
            Mental Math
          </h1>
          <p className="text-center mb-8 text-gray-600">
            暗算練習ツール
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => startGame('9x9')}
              className="w-full bg-gradient-to-r from-purple-400 to-pink-500 text-white py-6 rounded-xl font-bold text-2xl hover:from-purple-500 hover:to-pink-600 transition transform hover:scale-105 shadow-lg"
            >
              9×9 モード
            </button>
            
            <button
              onClick={() => startGame('20x20')}
              className="w-full bg-gradient-to-r from-orange-400 to-red-500 text-white py-6 rounded-xl font-bold text-2xl hover:from-orange-500 hover:to-red-600 transition transform hover:scale-105 shadow-lg"
            >
              20×20 モード
            </button>
          </div>

          {/* 統計表示 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-bold text-gray-700 mb-3">過去の記録</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">9×9:</span>
                <span className="font-mono">
                  {stats['9x9'].total > 0 
                    ? `${((stats['9x9'].correct / stats['9x9'].total) * 100).toFixed(1)}% (${stats['9x9'].correct}/${stats['9x9'].total}) - ${(stats['9x9'].avgTime / 1000).toFixed(1)}秒`
                    : '未プレイ'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">20×20:</span>
                <span className="font-mono">
                  {stats['20x20'].total > 0 
                    ? `${((stats['20x20'].correct / stats['20x20'].total) * 100).toFixed(1)}% (${stats['20x20'].correct}/${stats['20x20'].total}) - ${(stats['20x20'].avgTime / 1000).toFixed(1)}秒`
                    : '未プレイ'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-gray-400">
            v0.1.0
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
      <div className="min-h-screen bg-gradient-to-b from-blue-300 to-purple-400 flex flex-col p-4">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
          {/* ヘッダー */}
          <div className="bg-white rounded-xl p-3 mb-4 shadow-lg">
            <div className="flex justify-between items-center text-sm">
              <button 
                onClick={backToMenu}
                className="text-gray-500 hover:text-gray-700"
              >
                ← メニュー
              </button>
              <div className="font-bold text-purple-600">{mode} モード</div>
              <div className="text-blue-600 font-mono">
                {totalCount > 0 ? `${((correctCount / totalCount) * 100).toFixed(0)}%` : '0%'}
              </div>
            </div>
          </div>

          {/* 問題表示 */}
          <div className="bg-white rounded-xl p-8 mb-4 shadow-lg">
            <div className="text-center">
              <div className="text-6xl font-bold text-gray-800 mb-4">
                {currentProblem.a} × {currentProblem.b}
              </div>
              <div className="text-4xl font-mono text-blue-600 min-h-[3rem] flex items-center justify-center">
                {userAnswer || '_'}
              </div>
            </div>
          </div>

          {/* 統計 */}
          <div className="bg-white rounded-xl p-3 mb-4 shadow-lg">
            <div className="flex justify-around text-sm">
              <div className="text-center">
                <div className="text-gray-500">正解</div>
                <div className="font-bold text-green-600">{correctCount}/{totalCount}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">平均</div>
                <div className="font-bold text-blue-600">{avgTime.toFixed(1)}秒</div>
              </div>
            </div>
          </div>

          {/* 電卓UI */}
          <div className="bg-white rounded-xl p-4 shadow-lg">
            <div className="grid grid-cols-3 gap-3">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(num => (
                <button
                  key={num}
                  onClick={() => inputNumber(num.toString())}
                  className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl font-bold text-gray-700 shadow-md active:scale-95 transition"
                >
                  {num}
                </button>
              ))}
              
              <button
                onClick={clearInput}
                className="aspect-square bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 rounded-xl text-2xl font-bold text-red-700 shadow-md active:scale-95 transition"
              >
                C
              </button>
              
              <button
                onClick={() => inputNumber('0')}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl text-3xl font-bold text-gray-700 shadow-md active:scale-95 transition"
              >
                0
              </button>
              
              <button
                onClick={submitAnswer}
                disabled={!userAnswer}
                className={`aspect-square rounded-xl text-2xl font-bold shadow-md active:scale-95 transition ${
                  userAnswer 
                    ? 'bg-gradient-to-br from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                ✓
              </button>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-gray-600">
            キーボード: 数字キー、Enter、Esc(クリア)
          </div>
        </div>
      </div>
    );
  }

  // 結果画面
  if (gameState === 'result') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-300 to-purple-400 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
          <div className={`text-7xl mb-4 ${lastResult.isCorrect ? '😊' : '😢'}`}>
            {lastResult.isCorrect ? '⭕' : '❌'}
          </div>
          
          <h2 className={`text-4xl font-bold mb-4 ${lastResult.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {lastResult.isCorrect ? '正解!' : '不正解'}
          </h2>
          
          <div className="text-2xl mb-6 text-gray-700">
            <div className="mb-2">
              {lastResult.problem.a} × {lastResult.problem.b} = <span className="font-bold text-blue-600">{lastResult.correctAnswer}</span>
            </div>
            {!lastResult.isCorrect && (
              <div className="text-red-500">
                あなたの答え: {lastResult.userAnswer}
              </div>
            )}
            <div className="text-lg text-gray-500 mt-2">
              ⏱️ {(lastResult.time / 1000).toFixed(1)}秒
            </div>
          </div>

          <div className="bg-gray-100 rounded-xl p-4 mb-6">
            <div className="text-sm text-gray-600 mb-1">今回のセッション</div>
            <div className="text-xl font-bold text-gray-800">
              {correctCount}/{totalCount} 問正解 ({((correctCount / totalCount) * 100).toFixed(1)}%)
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={nextProblem}
              className="w-full bg-gradient-to-r from-blue-400 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-500 hover:to-purple-600 transition transform hover:scale-105"
            >
              次の問題
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
