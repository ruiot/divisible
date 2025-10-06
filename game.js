// Divisible Game v0.0.1
const { useState, useEffect, useRef } = React;

const DivisionMonsterGame = () => {
  const [gameState, setGameState] = useState('menu');
  const [monsters, setMonsters] = useState([]);
  const [balls, setBalls] = useState({});
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [animations, setAnimations] = useState([]);
  const [nextMonsterId, setNextMonsterId] = useState(1);
  const [boomerang, setBoomerang] = useState(null);
  const [turnsLeft, setTurnsLeft] = useState(10);
  const [monstersDefeated, setMonstersDefeated] = useState(0);
  const [invaderDirection, setInvaderDirection] = useState(1);
  const [invaderMoveCount, setInvaderMoveCount] = useState(0);
  
  const audioContextRef = useRef(null);
  const boomerangIntervalRef = useRef(null);
  const processedMonstersRef = useRef(new Set());

  const validNumbers = [
    4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 28, 30, 32, 35, 36, 40, 42, 45, 48, 49, 50, 54, 56, 60, 63, 64, 70, 72, 75, 80, 81, 84, 90, 96, 98, 100
  ];

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const playSound = (type, frequency = 440) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'invader') {
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'hit') {
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'catch') {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'vanish') {
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'throw') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    }
  };

  const getMonsterColor = (num) => {
    let n = num;
    const factors = { 2: 0, 3: 0, 5: 0, 7: 0 };
    
    [2, 3, 5, 7].forEach(prime => {
      while (n % prime === 0) {
        factors[prime]++;
        n /= prime;
      }
    });
    
    const total = factors[2] + factors[3] + factors[5] + factors[7];
    if (total === 0) return { rgb: 'rgb(250, 150, 150)' };
    
    const r = Math.floor(150 + (factors[2] / total) * 100);
    const g = Math.floor(100 + (factors[5] / total) * 120);
    const b = Math.floor(120 + (factors[3] / total) * 130);
    
    return { rgb: `rgb(${r}, ${g}, ${b})` };
  };

  const getWaveMonsters = (waveNum) => {
    const baseCount = Math.min(4 + waveNum, 8);
    const startIdx = (waveNum - 1) * 3;
    
    return validNumbers
      .slice(startIdx % validNumbers.length, (startIdx + baseCount) % validNumbers.length)
      .concat(validNumbers.slice(0, Math.max(0, baseCount - validNumbers.length + startIdx)))
      .slice(0, baseCount);
  };

  const startGame = () => {
    initAudio();
    setBalls({2: 2, 3: 2, 4: 2});
    setScore(0);
    setWave(1);
    setAnimations([]);
    setNextMonsterId(1);
    setBoomerang(null);
    setMonstersDefeated(0);
    setInvaderDirection(1);
    setInvaderMoveCount(0);
    setGameState('playing');
    
    startWave(1);
  };

  const startWave = (waveNum) => {
    setAnimations([]);
    
    const waveMonsters = getWaveMonsters(waveNum);
    const cols = Math.min(4, waveMonsters.length);
    const rows = Math.ceil(waveMonsters.length / cols);
    
    const newMonsters = waveMonsters.map((num, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      
      return {
        id: nextMonsterId + idx,
        number: num,
        x: 20 + col * (60 / cols),
        y: 10 + row * 15,
        baseX: 20 + col * (60 / cols),
        baseY: 10 + row * 15
      };
    });
    
    setMonsters(newMonsters);
    setNextMonsterId(nextMonsterId + waveMonsters.length);
    setTurnsLeft(8 + Math.floor(waveNum / 2));
    setInvaderDirection(1);
    setInvaderMoveCount(0);
  };

  useEffect(() => {
    if (gameState !== 'playing' || monsters.length === 0) return;

    const interval = setInterval(() => {
      setMonsters(prev => {
        const newMonsters = prev.map(m => ({
          ...m,
          x: m.x + invaderDirection * 2
        }));
        
        return newMonsters;
      });
      
      setInvaderMoveCount(c => c + 1);
      
      const frequencies = [520, 490, 460, 430, 400, 370, 340, 310, 280];
      playSound('invader', frequencies[invaderMoveCount % 9]);
      
      if (invaderMoveCount > 0 && invaderMoveCount % 9 === 0) {
        setMonsters(prev => prev.map(m => ({
          ...m,
          y: m.y + 5
        })));
        setInvaderDirection(d => -d);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gameState, monsters.length, invaderMoveCount, invaderDirection]);

  useEffect(() => {
    if (gameState === 'playing') {
      const anyTooLow = monsters.some(m => m.y > 80);
      if (anyTooLow || (turnsLeft <= 0 && monsters.length > 0 && !boomerang)) {
        setGameState('gameOver');
      }
    }
  }, [monsters, turnsLeft, gameState, boomerang]);

  useEffect(() => {
    if (gameState === 'playing' && monsters.length === 0 && !boomerang) {
      setTimeout(() => {
        setWave(w => w + 1);
        startWave(wave + 1);
      }, 1500);
    }
  }, [monsters.length, gameState, boomerang]);

  const throwBall = (ballNum) => {
    if (!balls[ballNum] || balls[ballNum] <= 0) return;
    if (boomerang) return;

    const newBalls = {...balls, [ballNum]: balls[ballNum] - 1};
    if (newBalls[ballNum] === 0) delete newBalls[ballNum];
    setBalls(newBalls);
    setTurnsLeft(t => t - 1);

    playSound('throw');
    processedMonstersRef.current = new Set();
    
    const targets = monsters.filter(m => m.number % ballNum === 0);
    
    if (targets.length === 0) {
      setBoomerang({ number: ballNum, x: -10, y: 50 });
      let x = -10;
      boomerangIntervalRef.current = setInterval(() => {
        x += 4;
        setBoomerang(prev => prev ? { ...prev, x } : null);
        
        if (x >= 110) {
          clearInterval(boomerangIntervalRef.current);
          setBoomerang(null);
        }
      }, 16);
    } else {
      let currentTargetIndex = 0;
      setBoomerang({ number: ballNum, x: -10, y: 50, targets });
      
      const moveToNextTarget = () => {
        if (currentTargetIndex >= targets.length) {
          setTimeout(() => {
            setBoomerang(null);
          }, 300);
          return;
        }
        
        const target = targets[currentTargetIndex];
        const startX = currentTargetIndex === 0 ? -10 : targets[currentTargetIndex - 1].x;
        const startY = currentTargetIndex === 0 ? 50 : targets[currentTargetIndex - 1].y;
        
        let step = 0;
        const totalSteps = 30;
        const arcDirection = currentTargetIndex % 2 === 0 ? 1 : -1;
        
        boomerangIntervalRef.current = setInterval(() => {
          step++;
          const progress = step / totalSteps;
          
          const t = progress * Math.PI;
          const x = startX + (target.x - startX) * progress;
          const y = startY + (target.y - startY) * progress + Math.sin(t) * 12 * arcDirection;
          
          setBoomerang(prev => prev ? { ...prev, x, y } : null);
          
          if (step >= totalSteps) {
            clearInterval(boomerangIntervalRef.current);
            if (!processedMonstersRef.current.has(target.id)) {
              processedMonstersRef.current.add(target.id);
              processHit(target, ballNum);
            }
            currentTargetIndex++;
            setTimeout(moveToNextTarget, 200);
          }
        }, 16);
      };
      
      moveToNextTarget();
    }
  };

  const processHit = (targetMonster, ballNum) => {
    const result = targetMonster.number / ballNum;
    const count = ballNum;
    const multiplier = Math.max(1, Math.floor(ballNum / 3));

    setMonsters(prev => prev.filter(m => m.id !== targetMonster.id));
    playSound('hit');
    addAnimation('explode', targetMonster.x, targetMonster.y);

    setTimeout(() => {
      if (result >= 2 && result <= 9) {
        const pocketX = 12.5 + (result - 2) * 12.5;
        
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
          const distance = 8 + Math.random() * 6;
          const midX = targetMonster.x + Math.cos(angle) * distance;
          const midY = targetMonster.y + Math.sin(angle) * distance;
          
          setTimeout(() => {
            const animId = Date.now() + Math.random() + i;
            setAnimations(prev => [...prev, {
              id: animId,
              type: 'fragment',
              x: targetMonster.x,
              y: targetMonster.y,
              number: result,
              midX: midX,
              midY: midY,
              targetX: pocketX,
              targetY: 95
            }]);
            
            setTimeout(() => {
              setAnimations(prev => prev.filter(a => a.id !== animId));
            }, 1600);
          }, i * 80);
        }

        setTimeout(() => {
          playSound('catch');
          setBalls(prev => ({
            ...prev,
            [result]: (prev[result] || 0) + count
          }));
          setScore(s => s + 20 * multiplier);
          setMonstersDefeated(d => d + 1);
        }, 1200);
        
      } else if (result === 1) {
        playSound('vanish');
        addAnimation('vanish', targetMonster.x, targetMonster.y);
        setScore(s => s + 50 * multiplier);
        setMonstersDefeated(d => d + 1);
      } else {
        const newMonsters = [];
        
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
          const distance = 10 + Math.random() * 6;
          const newX = Math.max(10, Math.min(90, targetMonster.x + Math.cos(angle) * distance));
          const newY = targetMonster.y + Math.sin(angle) * distance;
          
          newMonsters.push({
            id: nextMonsterId + i,
            number: result,
            x: newX,
            y: newY,
            baseX: newX,
            baseY: newY
          });
        }
        
        setMonsters(prev => [...prev, ...newMonsters]);
        setNextMonsterId(n => n + count);
        setScore(s => s + 10 * multiplier);
      }
    }, 200);
  };

  const addAnimation = (type, x, y, number = 0) => {
    const id = Date.now() + Math.random();
    setAnimations(prev => [...prev, { id, type, x, y, number }]);
    setTimeout(() => {
      setAnimations(prev => prev.filter(a => a.id !== id));
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (boomerangIntervalRef.current) {
        clearInterval(boomerangIntervalRef.current);
      }
    };
  }, []);

  if (gameState === 'menu') {
    return (
      <div className="h-screen bg-gradient-to-b from-blue-400 to-purple-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-5xl font-bold text-center mb-4 text-purple-600">
            Divisible
          </h1>
          <p className="text-center mb-8 text-gray-600">
            迫る敵を因数分解！<br/>
            大きい数で割るほど高得点！
          </p>
          
          <button
            onClick={startGame}
            className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white py-6 rounded-xl font-bold text-2xl hover:from-green-500 hover:to-blue-600 transition transform hover:scale-105 shadow-lg"
          >
            スタート
          </button>
          <div className="mt-4 text-center text-xs text-gray-400">
            v0.0.1
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-400 to-gray-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
          <h2 className="text-4xl font-bold mb-4 text-gray-700">ゲームオーバー</h2>
          <p className="text-2xl mb-2">ウェーブ: {wave}</p>
          <p className="text-2xl mb-2">スコア: {score}</p>
          <p className="text-xl mb-6">たおした数: {monstersDefeated}</p>
          
          <div className="space-y-3">
            <button
              onClick={startGame}
              className="w-full bg-gradient-to-r from-blue-400 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-500 hover:to-purple-600 transition"
            >
              もういちど
            </button>
            <button
              onClick={() => setGameState('menu')}
              className="w-full bg-gray-300 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-400 transition"
            >
              メニューにもどる
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-b from-blue-300 to-purple-400 p-2 flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <div className="bg-white rounded-xl p-3 mb-2 shadow-lg">
          <div className="flex justify-between items-center text-sm">
            <div className="font-bold text-purple-600">Wave {wave}</div>
            <div className="flex gap-4">
              <div className="text-blue-600 font-bold">スコア: {score}</div>
              <div className={`font-bold ${turnsLeft <= 3 ? 'text-red-600' : 'text-green-600'}`}>
                ターン: {turnsLeft}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-b from-sky-100 to-sky-200 rounded-xl mb-2 shadow-lg relative flex-1 overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-red-400 to-transparent opacity-40"></div>
          
          {monsters.map(monster => {
            const size = Math.sqrt(monster.number) * 10;
            const color = getMonsterColor(monster.number);
            return (
              <div
                key={monster.id}
                className="absolute transition-none"
                style={{
                  left: `${monster.x}%`,
                  top: `${monster.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div 
                  className="rounded-full flex items-center justify-center text-white font-bold shadow-2xl"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    fontSize: `${size / 2.5}px`,
                    background: color.rgb
                  }}
                >
                  {monster.number}
                </div>
              </div>
            );
          })}

          {boomerang && (
            <div
              className="absolute z-10"
              style={{
                left: `${boomerang.x}%`,
                top: `${boomerang.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-yellow-300 rounded-full blur-xl opacity-60 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold shadow-2xl"
                  style={{ 
                    width: '50px', 
                    height: '50px', 
                    fontSize: '24px',
                    animation: 'spin 0.3s linear infinite'
                  }}
                >
                  {boomerang.number}
                </div>
              </div>
            </div>
          )}

          {animations.map(anim => (
            <div
              key={anim.id}
              className="absolute pointer-events-none z-20"
              style={{
                left: `${anim.x}%`,
                top: `${anim.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {anim.type === 'explode' && (
                <div className="text-5xl" style={{animation: 'explode 0.8s ease-out'}}>
                  💥
                </div>
              )}
              {anim.type === 'vanish' && (
                <div className="text-4xl" style={{animation: 'vanish 0.8s ease-out'}}>
                  ✨
                </div>
              )}
              {anim.type === 'fragment' && (
                <div 
                  className="bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold shadow-xl"
                  style={{
                    width: '35px',
                    height: '35px',
                    fontSize: '18px',
                    animation: 'fragment-bounce 1.6s ease-out forwards',
                    '--start-x': `${anim.x}%`,
                    '--start-y': `${anim.y}%`,
                    '--mid-x': `${anim.midX}%`,
                    '--mid-y': `${anim.midY}%`,
                    '--target-x': `${anim.targetX}%`,
                    '--target-y': `${anim.targetY}%`
                  }}
                >
                  {anim.number}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-3 shadow-lg">
          <div className="grid grid-cols-8 gap-2">
            {[2, 3, 4, 5, 6, 7, 8, 9].map(num => {
              const count = balls[num] || 0;
              return (
                <button 
                  key={num}
                  className={`relative aspect-square rounded-xl font-bold text-xl transition transform ${
                    count > 0 
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg hover:scale-110 active:scale-95' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={() => throwBall(num)}
                  disabled={count === 0}
                >
                  {num}
                  {count > 0 && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg">
                      {count}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<DivisionMonsterGame />, document.getElementById('root'));
