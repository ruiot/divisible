import React, { useState, useEffect, useRef } from 'react';

  // v0.3.3 - Right edge fix, accurate targeting, gameover sound, 9TET Shepard tone
// feat: v0.3.3 - Right edge fix, accurate targeting, gameover sound, 9TET Shepard tone

const DivisionMonsterGame = () => {
  const [gameState, setGameState] = useState('menu');
  const [monsters, setMonsters] = useState([]);
  const [balls, setBalls] = useState({});
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [animations, setAnimations] = useState([]);
  const [nextMonsterId, setNextMonsterId] = useState(1);
  const [boomerang, setBoomerang] = useState(null);
  const [monstersDefeated, setMonstersDefeated] = useState(0);
  const [invaderDirection, setInvaderDirection] = useState(1);
  const [invaderMoveCount, setInvaderMoveCount] = useState(0);
  const [activeButton, setActiveButton] = useState(null);
  
  const audioContextRef = useRef(null);
  const boomerangIntervalRef = useRef(null);
  const processedMonstersRef = useRef(new Set());
  const buttonRefs = useRef({});
  const monstersRef = useRef([]);

  const VERSION = 'v0.3.3';

  const validNumbers = [
    4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 27, 28, 30, 32, 35, 36, 
    40, 42, 45, 48, 49, 50, 54, 56, 60, 63, 64, 70, 72, 80, 81, 90, 100
  ];

  useEffect(() => {
    monstersRef.current = monsters;
  }, [monsters]);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const gaussian = (x, center, width) => {
    return Math.exp(-Math.pow(x - center, 2) / (2 * Math.pow(width, 2)));
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
    } else if (type === 'gameover') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  };

  const playShepardTone = (baseFreq) => {
    if (!audioContextRef.current) return;
    
    const octaves = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
    const center = 3;
    const width = 2.5;
    
    const ctx = audioContextRef.current;
    
    octaves.forEach((octave, index) => {
      const freq = baseFreq * Math.pow(2, octave);
      
      if (freq < 20 || freq > 20000) return;
      
      const volume = gaussian(index, center, width) * 0.15;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    });
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

  const getGeometricPattern = (count) => {
    const patterns = {
      2: [{x: -1, y: -1}, {x: 1, y: -1}],
      3: [{x: 0, y: -1}, {x: -1, y: 1}, {x: 1, y: 1}],
      4: [{x: -1, y: -1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: 1, y: 1}],
      5: [{x: -1, y: -1}, {x: 1, y: -1}, {x: 0, y: 0}, {x: -1, y: 1}, {x: 1, y: 1}],
      6: [{x: -1, y: -1.5}, {x: -1, y: 0}, {x: -1, y: 1.5}, {x: 1, y: -1.5}, {x: 1, y: 0}, {x: 1, y: 1.5}],
      7: [{x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: 0, y: 1}, {x: 1, y: 1}, {x: 0, y: 0}],
      8: [{x: -1, y: -1.5}, {x: -1, y: -0.5}, {x: -1, y: 0.5}, {x: -1, y: 1.5}, {x: 1, y: -1.5}, {x: 1, y: -0.5}, {x: 1, y: 0.5}, {x: 1, y: 1.5}],
      9: [{x: -1, y: -1}, {x: 0, y: -1}, {x: 1, y: -1}, {x: -1, y: 0}, {x: 0, y: 0}, {x: 1, y: 0}, {x: -1, y: 1}, {x: 0, y: 1}, {x: 1, y: 1}]
    };
    return patterns[count] || [];
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

  const getMonsterColor = (num) => {
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

  const getWaveMonsters = (waveNum) => {
    if (waveNum === 10) {
      return [362880];
    }
    
    if (waveNum >= 11) {
      const shuffled = [...validNumbers].sort(() => Math.random() - 0.5);
      const count = 16 + Math.floor(Math.random() * 9);
      return shuffled.slice(0, count).sort((a, b) => b - a);
    }
    
    const baseCount = 13;
    const increment = 3;
    const count = baseCount + (waveNum - 1) * increment;
    
    return validNumbers.slice(0, count).sort((a, b) => b - a);
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
    setActiveButton(null);
    setGameState('playing');
    
    startWave(1);
  };

  const startWave = (waveNum) => {
    setAnimations([]);
    setMonsters([]);
    setBoomerang(null);
    setActiveButton(null);
    processedMonstersRef.current = new Set();
    
    const waveMonsters = getWaveMonsters(waveNum);
    const cols = 8;
    
    const moveRange = 2 * 9;
    const maxRightX = 95;
    const maxStartX = maxRightX - moveRange;
    
    const leftMargin = 5;
    const usableWidth = maxStartX - leftMargin;
    const colSpacing = usableWidth / (cols - 1);
    
    const rows = Math.ceil(waveMonsters.length / cols);
    
    const newMonsters = waveMonsters.map((num, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      
      const monstersInThisRow = row === rows - 1 ? waveMonsters.length - row * cols : Math.min(cols, waveMonsters.length - row * cols);
      const offsetX = monstersInThisRow < cols ? (cols - monstersInThisRow) * colSpacing / 2 : 0;
      
      return {
        id: nextMonsterId + idx,
        number: num,
        x: leftMargin + offsetX + col * colSpacing,
        y: 5 + row * 10,
        baseX: leftMargin + offsetX + col * colSpacing,
        baseY: 5 + row * 10
      };
    });
    
    setMonsters(newMonsters);
    setNextMonsterId(nextMonsterId + waveMonsters.length);
    setInvaderDirection(1);
    setInvaderMoveCount(0);
  };

  useEffect(() => {
    if (gameState !== 'playing' || monsters.length === 0) return;

    const interval = setInterval(() => {
      setMonsters(prev => {
        if (prev.length === 0) return prev;
        
        const newMonsters = prev.map(m => ({
          ...m,
          x: m.x + invaderDirection * 2
        }));
        
        return newMonsters;
      });
      
      setInvaderMoveCount(c => c + 1);
      
      const baseFreq = 520;
      const ratio = Math.pow(2, -1/9);
      const frequencies = Array.from({length: 9}, (_, i) => 
        Math.round(baseFreq * Math.pow(ratio, i))
      );
      playShepardTone(frequencies[invaderMoveCount % 9]);
      
      if (invaderMoveCount > 0 && invaderMoveCount % 9 === 0) {
        if (wave !== 10) {
          setMonsters(prev => prev.map(m => ({
            ...m,
            y: m.y + 5
          })));
        }
        setInvaderDirection(d => -d);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [gameState, invaderMoveCount, invaderDirection, wave]);

  useEffect(() => {
    if (gameState === 'playing') {
      const anyTooLow = monsters.some(m => m.y > 100);
      if (anyTooLow) {
        playSound('gameover');
        setGameState('gameOver');
        setAnimations([]);
        setBoomerang(null);
        setActiveButton(null);
        if (boomerangIntervalRef.current) {
          clearInterval(boomerangIntervalRef.current);
        }
      }
    }
  }, [monsters, gameState]);

  useEffect(() => {
    if (gameState === 'playing' && monsters.length === 0 && !boomerang) {
      setTimeout(() => {
        setWave(w => {
          const nextWave = w + 1;
          startWave(nextWave);
          return nextWave;
        });
      }, 1500);
    }
  }, [monsters.length, gameState, boomerang]);

  const getButtonPosition = (num) => {
    const button = buttonRefs.current[num];
    if (!button) return null;

    const rect = button.getBoundingClientRect();
    const parent = button.closest('.play-area-container');
    if (!parent) return null;

    const parentRect = parent.getBoundingClientRect();

    return {
      x: ((rect.left + rect.width / 2 - parentRect.left) / parentRect.width) * 100,
      y: ((rect.top + rect.height / 2 - parentRect.top) / parentRect.height) * 100
    };
  };

  const throwBall = (ballNum) => {
    if (!balls[ballNum] || balls[ballNum] <= 0) return;
    if (boomerang) return;
    if (gameState !== 'playing') return;

    setActiveButton(ballNum);

    const newBalls = {...balls, [ballNum]: balls[ballNum] - 1};
    if (newBalls[ballNum] === 0) delete newBalls[ballNum];
    setBalls(newBalls);

    playSound('throw');
    processedMonstersRef.current = new Set();
    
    const targets = monsters
      .filter(m => m.number % ballNum === 0)
      .sort((a, b) => b.y - a.y);
    
    if (targets.length === 0) {
      setBoomerang({ number: ballNum, x: -10, y: 50 });
      let x = -10;
      boomerangIntervalRef.current = setInterval(() => {
        x += 4;
        setBoomerang(prev => prev ? { ...prev, x } : null);
        
        if (x >= 110) {
          clearInterval(boomerangIntervalRef.current);
          setBoomerang(null);
          setActiveButton(null);
        }
      }, 16);
    } else {
      let currentTargetIndex = 0;
      setBoomerang({ number: ballNum, x: -10, y: 50, targets });
      
      const moveToNextTarget = () => {
        if (currentTargetIndex >= targets.length) {
          setTimeout(() => {
            setBoomerang(null);
            setActiveButton(null);
          }, 300);
          return;
        }
        
        const targetId = targets[currentTargetIndex].id;
        const currentMonster = monstersRef.current.find(m => m.id === targetId);
        
        if (!currentMonster) {
          currentTargetIndex++;
          setTimeout(moveToNextTarget, 0);
          return;
        }
        
        const targetX = currentMonster.x;
        const targetY = currentMonster.y;
        
        const startX = currentTargetIndex === 0 ? -10 : (monstersRef.current.find(m => m.id === targets[currentTargetIndex - 1].id)?.x || -10);
        const startY = currentTargetIndex === 0 ? 50 : (monstersRef.current.find(m => m.id === targets[currentTargetIndex - 1].id)?.y || 50);
        
        let step = 0;
        const totalSteps = 30;
        const arcDirection = currentTargetIndex % 2 === 0 ? 1 : -1;
        
        boomerangIntervalRef.current = setInterval(() => {
          step++;
          const progress = step / totalSteps;
          
          const t = progress * Math.PI;
          const x = startX + (targetX - startX) * progress;
          const y = startY + (targetY - startY) * progress + Math.sin(t) * 12 * arcDirection;
          
          setBoomerang(prev => prev ? { ...prev, x, y } : null);
          
          if (step >= totalSteps) {
            clearInterval(boomerangIntervalRef.current);
            if (!processedMonstersRef.current.has(targetId)) {
              processedMonstersRef.current.add(targetId);
              processHit(currentMonster, ballNum);
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
    if (gameState !== 'playing') return;
    
    const result = targetMonster.number / ballNum;
    const count = ballNum;

    playSound('hit');
    addAnimation('explode', targetMonster.x, targetMonster.y);

    setTimeout(() => {
      if (gameState !== 'playing') return;
      
      if (result >= 2 && result <= 9) {
        const buttonPos = getButtonPosition(result);
        const pattern = getGeometricPattern(count);
        const spacing = 15;
        
        const newFragments = [];
        for (let i = 0; i < count; i++) {
          const pos = pattern[i] || {x: 0, y: 0};
          const midX = targetMonster.x + pos.x * spacing;
          const midY = targetMonster.y + pos.y * spacing;
          
          newFragments.push({
            id: `fragment-${Date.now()}-${i}`,
            type: 'fragment',
            x: targetMonster.x,
            y: targetMonster.y,
            number: result,
            midX: midX,
            midY: midY,
            targetX: buttonPos ? buttonPos.x : 12.5 + (result - 2) * 12.5,
            targetY: buttonPos ? buttonPos.y : 95
          });
        }
        
        setAnimations(prev => [...prev, ...newFragments]);
        setMonsters(prev => prev.filter(m => m.id !== targetMonster.id));
        
        setTimeout(() => {
          if (gameState !== 'playing') return;
          const fragmentIds = newFragments.map(f => f.id);
          setAnimations(prev => prev.filter(a => !fragmentIds.includes(a.id)));
        }, 1200);

        setTimeout(() => {
          if (gameState !== 'playing') return;
          playSound('catch');
          setBalls(prev => ({
            ...prev,
            [result]: (prev[result] || 0) + count
          }));
          setScore(s => s + targetMonster.number);
          setMonstersDefeated(d => d + 1);
        }, 800);
        
      } else if (result === 1) {
        setMonsters(prev => prev.filter(m => m.id !== targetMonster.id));
        playSound('vanish');
        addAnimation('vanish', targetMonster.x, targetMonster.y);
        setScore(s => s + targetMonster.number);
        setMonstersDefeated(d => d + 1);
        
      } else if (result > 9 && result <= 100) {
        setNextMonsterId(n => {
          const newId = n;
          
          setMonsters(prev => {
            const filtered = prev.filter(m => m.id !== targetMonster.id);
            
            const newMonsters = [];
            for (let i = 0; i < count; i++) {
              const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
              const distance = 10 + Math.random() * 6;
              const newX = Math.max(10, Math.min(90, targetMonster.x + Math.cos(angle) * distance));
              const newY = targetMonster.y + Math.sin(angle) * distance;
              
              newMonsters.push({
                id: newId + i,
                number: result,
                x: newX,
                y: newY,
                baseX: newX,
                baseY: newY
              });
            }
            
            return [...filtered, ...newMonsters];
          });
          
          return n + count;
        });
        setScore(s => s + targetMonster.number);
        
      } else {
        for (let i = 0; i < count - 1; i++) {
          setTimeout(() => {
            const angle = (Math.PI * 2 * i) / (count - 1);
            const distance = 30;
            const escapeX = targetMonster.x + Math.cos(angle) * distance;
            const escapeY = targetMonster.y + Math.sin(angle) * distance;
            
            const escapeId = `escape-${Date.now()}-${i}`;
            setAnimations(prev => [...prev, {
              id: escapeId,
              type: 'escape',
              x: targetMonster.x,
              y: targetMonster.y,
              targetX: escapeX,
              targetY: escapeY
            }]);
            
            setTimeout(() => {
              setAnimations(prev => prev.filter(a => a.id !== escapeId));
            }, 600);
          }, i * 50);
        }
        
        setNextMonsterId(n => {
          const newMonster = {
            id: n,
            number: result,
            x: targetMonster.x,
            y: targetMonster.y,
            baseX: targetMonster.x,
            baseY: targetMonster.y
          };
          
          setMonsters(prev => [...prev.filter(m => m.id !== targetMonster.id), newMonster]);
          return n + 1;
        });
        
        setScore(s => s + targetMonster.number);
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
      <div className="min-h-screen bg-gradient-to-b from-blue-400 to-purple-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-5xl font-bold text-center mb-4 text-purple-600">
            Divisible
          </h1>
          <p className="text-center mb-8 text-gray-600">
            Divide the Conqueror
          </p>
          
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
          <h2 className="text-4xl font-bold mb-4 text-gray-700">Game Over</h2>
          <p className="text-2xl mb-2">Wave: {wave}</p>
          <p className="text-2xl mb-2">Score: {score}</p>
          <p className="text-xl mb-6">Defeated: {monstersDefeated}</p>
          
          <div className="space-y-3">
            <button
              onClick={startGame}
              className="w-full bg-gradient-to-r from-blue-400 to-purple-500 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-500 hover:to-purple-600 transition"
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

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-blue-300 to-purple-400 flex flex-col play-area-container"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex-none bg-white rounded-b-xl p-2 mx-2 shadow-lg">
        <div className="flex justify-between items-center text-xs sm:text-sm">
          <div className="font-bold text-purple-600">Wave {wave}</div>
          <div className="text-blue-600 font-bold">Score: {score}</div>
        </div>
      </div>

      <div className="flex-1 bg-gradient-to-b from-sky-100 to-sky-200 m-2 rounded-xl shadow-lg relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-red-400 to-transparent opacity-40"></div>
        
        {monsters.map(monster => {
          const baseSize = monster.number <= 100 
            ? Math.sqrt(monster.number) * 10
            : 100 + Math.log10(monster.number / 100) * 50;
          const size = Math.min(baseSize, 300);
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
                  fontSize: `${Math.min(size / 2.5, 40)}px`,
                  background: color.rgb,
                  backgroundImage: color.pattern,
                  backgroundSize: color.pattern.includes('radial') ? '6px 6px' : 
                                 color.pattern.includes('conic') ? '6px 6px' : 'auto'
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
              <div className="absolute inset-0 bg-yellow-300 rounded-full blur-2xl opacity-80 animate-pulse"></div>
              <div className="relative rounded-full flex items-center justify-center text-white font-bold shadow-2xl"
                style={{ 
                  width: '40px',
                  height: '40px',
                  fontSize: '20px',
                  animation: 'spin 0.3s linear infinite',
                  background: getMonsterColor(boomerang.number).rgb,
                  backgroundImage: getMonsterColor(boomerang.number).pattern,
                  backgroundSize: getMonsterColor(boomerang.number).pattern.includes('radial') ? '6px 6px' : 
                                 getMonsterColor(boomerang.number).pattern.includes('conic') ? '6px 6px' : 'auto'
                }}
              >
                {boomerang.number}
              </div>
            </div>
          </div>
        )}

        {animations.map(anim => {
          if (anim.type === 'fragment') {
            const fragmentColor = getMonsterColor(anim.number);
            return (
              <div
                key={anim.id}
                className="absolute pointer-events-none z-20 rounded-full flex items-center justify-center text-white font-bold shadow-xl"
                style={{
                  left: `${anim.x}%`,
                  top: `${anim.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '30px',
                  height: '30px',
                  fontSize: '16px',
                  animation: 'cell-division 1.2s ease-in-out forwards',
                  '--start-x': `${anim.x}%`,
                  '--start-y': `${anim.y}%`,
                  '--mid-x': `${anim.midX}%`,
                  '--mid-y': `${anim.midY}%`,
                  '--target-x': `${anim.targetX}%`,
                  '--target-y': `${anim.targetY}%`,
                  background: fragmentColor.rgb,
                  backgroundImage: fragmentColor.pattern,
                  backgroundSize: fragmentColor.pattern.includes('radial') ? '6px 6px' : 
                                 fragmentColor.pattern.includes('conic') ? '6px 6px' : 'auto'
                }}
              >
                {anim.number}
              </div>
            );
          } else if (anim.type === 'escape') {
            return (
              <div
                key={anim.id}
                className="absolute pointer-events-none z-20"
                style={{
                  left: `${anim.x}%`,
                  top: `${anim.y}%`,
                  transform: 'translate(-50%, -50%)',
                  animation: 'escape 0.6s ease-out forwards',
                  '--escape-target-x': `${anim.targetX}%`,
                  '--escape-target-y': `${anim.targetY}%`
                }}
              >
                <div className="text-2xl">💨</div>
              </div>
            );
          } else {
            return (
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
                  <div className="text-3xl sm:text-5xl" style={{animation: 'explode 0.8s ease-out'}}>
                    💥
                  </div>
                )}
                {anim.type === 'vanish' && (
                  <div className="text-2xl sm:text-4xl" style={{animation: 'vanish 0.8s ease-out'}}>
                    ✨
                  </div>
                )}
              </div>
            );
          }
        })}
        
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 opacity-50">
          {VERSION}
        </div>
      </div>

      <div className="flex-none bg-white rounded-t-xl mx-2 mb-2 p-2 shadow-lg">
        <div className="grid grid-cols-8 gap-1">
          {[2, 3, 4, 5, 6, 7, 8, 9].map(num => {
            const count = balls[num] || 0;
            const color = getMonsterColor(num);
            return (
              <button 
                key={num}
                ref={el => buttonRefs.current[num] = el}
                className={`relative aspect-square rounded-xl font-bold text-base sm:text-xl transition-all duration-300 ${
                  count > 0 
                    ? 'shadow-lg hover:scale-110 active:scale-95 text-white' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                } ${activeButton === num ? 'scale-110 z-50' : 'z-10'}`}
                style={count > 0 ? {
                  background: color.rgb,
                  backgroundImage: color.pattern,
                  backgroundSize: color.pattern.includes('radial') ? '6px 6px' : 
                                 color.pattern.includes('conic') ? '6px 6px' : 'auto'
                } : {}}
                onClick={() => throwBall(num)}
                disabled={count === 0}
              >
                {num}
                {count > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold shadow-lg">
                    {count}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cell-division {
          0% {
            left: var(--start-x);
            top: var(--start-y);
            transform: translate(-50%, -50%) scale(1) rotate(0deg);
            opacity: 1;
          }
          25% {
            left: var(--mid-x);
            top: var(--mid-y);
            transform: translate(-50%, -50%) scale(0.95) rotate(90deg);
            opacity: 1;
          }
          50% {
            left: var(--mid-x);
            top: var(--mid-y);
            transform: translate(-50%, -50%) scale(0.9) rotate(180deg);
            opacity: 1;
          }
          100% {
            left: var(--target-x);
            top: var(--target-y);
            transform: translate(-50%, -50%) scale(0.3) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes explode {
          0% { transform: scale(0.5); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes vanish {
          0% { transform: scale(1) rotate(0deg); opacity: 1; }
          100% { transform: scale(2) rotate(360deg); opacity: 0; }
        }
        @keyframes escape {
          0% {
            left: var(--escape-target-x);
            top: var(--escape-target-y);
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            left: var(--escape-target-x);
            top: var(--escape-target-y);
            transform: translate(-50%, -50%) scale(0) translateX(100px) translateY(-50px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default DivisionMonsterGame;