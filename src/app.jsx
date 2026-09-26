import React, { useState, useEffect, useRef } from 'react';
import './app.css';

const TYPES = [
  'all', 'grass', 'fire', 'water', 'electric', 
  'fairy', 'psychic', 'dragon', 'dark', 'ghost', 'ice', 'normal'
];

const TYPE_COLORS = {
  grass: '#10b981', fire: '#f97316', water: '#06b6d4', electric: '#eab308',
  poison: '#a855f7', psychic: '#ec4899', ice: '#67e8f9', dragon: '#6366f1',
  dark: '#475569', fairy: '#f472b6', normal: '#94a3b8', fighting: '#e11d48',
  flying: '#38bdf8', ground: '#d97706', rock: '#b45309', bug: '#84cc16',
  ghost: '#7c3aed', steel: '#64748b'
};

const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'attack') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'victory') {
      const now = ctx.currentTime;
      [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        noteOsc.type = 'sine';
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.1);
        noteGain.gain.setValueAtTime(0.2, now + idx * 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.25);
        noteOsc.connect(noteGain);
        noteGain.connect(ctx.destination);
        noteOsc.start(now + idx * 0.1);
        noteOsc.stop(now + idx * 0.1 + 0.25);
      });
    } else if (type === 'defeat') {
      const now = ctx.currentTime;
      [380, 320, 260, 200].forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        noteOsc.type = 'sawtooth';
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.15);
        noteGain.gain.setValueAtTime(0.2, now + idx * 0.15);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.15 + 0.3);
        noteOsc.connect(noteGain);
        noteGain.connect(ctx.destination);
        noteOsc.start(now + idx * 0.15);
        noteOsc.stop(now + idx * 0.15 + 0.3);
      });
    }
  } catch (e) {
    console.error(e);
  }
};

export default function App() {
  const [pokemon, setPokemon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [theme, setTheme] = useState('light');
  const [squad, setSquad] = useState(() => JSON.parse(localStorage.getItem('pokedex_squad')) || []);
  const [showSquadOnly, setShowSquadOnly] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  const [arenaOpen, setArenaOpen] = useState(false);
  const [rivalPickerOpen, setRivalPickerOpen] = useState(false);
  const [playerPoke, setPlayerPoke] = useState(null);
  const [enemyPoke, setEnemyPoke] = useState(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [turn, setTurn] = useState('player');
  const [playerAnim, setPlayerAnim] = useState('');
  const [enemyAnim, setEnemyAnim] = useState('');
  const [battleResult, setBattleResult] = useState(null);

  const timerRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    async function fetchPokemon() {
      try {
        const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
        const data = await res.json();
        const fetches = data.results.map(p => fetch(p.url).then(r => r.json()));
        const results = await Promise.all(fetches);
        setPokemon(results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPokemon();
  }, []);

  useEffect(() => {
    if (arenaOpen && turn === 'enemy' && !battleResult) {
      timerRef.current = setTimeout(() => {
        executeEnemyTurn();
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [turn, arenaOpen, battleResult]);

  const toggleSquad = (e, id) => {
    e?.stopPropagation();
    let updated = squad.includes(id) ? squad.filter(i => i !== id) : [...squad, id];
    setSquad(updated);
    localStorage.setItem('pokedex_squad', JSON.stringify(updated));
  };

  const playCry = (p) => {
    if (p?.cries?.latest) new Audio(p.cries.latest).play();
  };

  const initBattle = (p1, rival = null) => {
    const selectedEnemy = rival || pokemon[Math.floor(Math.random() * pokemon.length)];
    setPlayerPoke(p1);
    setEnemyPoke(selectedEnemy);
    setPlayerHp(100);
    setEnemyHp(100);
    setTurn('player');
    setBattleResult(null);
    setRivalPickerOpen(false);
    setActiveModal(null);
    setArenaOpen(true);
  };

  const handlePlayerAttack = () => {
    if (turn !== 'player' || battleResult) return;

    playSound('attack');
    setPlayerAnim('lunge-right');
    setTimeout(() => setPlayerAnim(''), 350);

    const damage = Math.floor(Math.random() * 22) + 15;
    const newEnemyHp = Math.max(0, enemyHp - damage);

    setTimeout(() => {
      playSound('hit');
      setEnemyAnim('hit');
      setTimeout(() => setEnemyAnim(''), 350);
      setEnemyHp(newEnemyHp);

      if (newEnemyHp <= 0) {
        setBattleResult('VICTORY');
        playSound('victory');
      } else {
        setTurn('enemy');
      }
    }, 200);
  };

  const executeEnemyTurn = () => {
    if (battleResult) return;

    playSound('attack');
    setEnemyAnim('lunge-left');
    setTimeout(() => setEnemyAnim(''), 350);

    const damage = Math.floor(Math.random() * 20) + 12;
    const newPlayerHp = Math.max(0, playerHp - damage);

    setTimeout(() => {
      playSound('hit');
      setPlayerAnim('hit');
      setTimeout(() => setPlayerAnim(''), 350);
      setPlayerHp(newPlayerHp);

      if (newPlayerHp <= 0) {
        setBattleResult('DEFEAT');
        playSound('defeat');
      } else {
        setTurn('player');
      }
    }, 200);
  };

  const filteredPokemon = pokemon.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || String(p.id) === search;
    const matchesType = selectedType === 'all' || p.types.some(t => t.type.name === selectedType);
    const matchesSquad = !showSquadOnly || squad.includes(p.id);
    return matchesSearch && matchesType && matchesSquad;
  });

  const getHpColor = (hp) => {
    if (hp > 50) return '#34d399';
    if (hp > 25) return '#fbbf24';
    return '#f87171';
  };

  return (
    <div className="app-container">
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>

      <header className="header">
        <div className="top-bar">
          <span className="brand-badge">Pokédex ✨</span>
          <button 
            className="theme-toggle-btn" 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        <h1 className="brand-title">Pokédex Arena</h1>

        <div className="quick-actions">
          <button className="action-btn" onClick={() => {
            const random = pokemon[Math.floor(Math.random() * pokemon.length)];
            if (random) setActiveModal(random);
          }}>Random Select 🎲</button>

          <button className={`action-btn ${showSquadOnly ? 'active' : ''}`} onClick={() => setShowSquadOnly(!showSquadOnly)}>
            Saved Squad 💖 ({squad.length})
          </button>
        </div>

        <div className="search-box">
          <input 
            type="text" 
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-pills">
          {TYPES.map(type => (
            <button 
              key={type} 
              className={`pill ${selectedType === type ? 'active' : ''}`}
              onClick={() => { setSelectedType(type); setShowSquadOnly(false); }}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="loading-state">Loading Database... 🍃</div>
      ) : (
        <main className="pokemon-grid">
          {filteredPokemon.map(p => {
            const isFav = squad.includes(p.id);
            const img = p.sprites.other['official-artwork'].front_default || p.sprites.front_default;

            return (
              <div key={p.id} className="poke-card-3d" onClick={() => setActiveModal(p)}>
                <span className="poke-id">#{String(p.id).padStart(3, '0')}</span>
                <button className="card-fav-btn" onClick={(e) => toggleSquad(e, p.id)}>
                  {isFav ? '💖' : '🤍'}
                </button>
                <div className="poke-img-wrap">
                  <img className="poke-img" src={img} alt={p.name} />
                </div>
                <h3 className="poke-name">{p.name}</h3>
                <div className="types-row">
                  {p.types.map(t => (
                    <span 
                      key={t.type.name} 
                      className="type-badge" 
                      style={{ background: TYPE_COLORS[t.type.name] || '#64748b' }}
                    >
                      {t.type.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </main>
      )}

      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setActiveModal(null)}>✕</button>

            <div className="modal-header">
              <div className="poke-img-wrap modal-img-wrap">
                <img 
                  className="poke-img" 
                  src={activeModal.sprites.other['official-artwork'].front_default || activeModal.sprites.front_default} 
                  alt={activeModal.name} 
                />
              </div>
              <h2 className="modal-title">{activeModal.name}</h2>
              
              <div className="quick-actions" style={{ marginTop: '16px' }}>
                <button className="action-btn" onClick={() => playCry(activeModal)}>Audio Cry 🔊</button>
                <button className="action-btn" onClick={() => initBattle(activeModal)}>Random Battle ⚔️</button>
                <button className="action-btn" onClick={() => setRivalPickerOpen(!rivalPickerOpen)}>
                  {rivalPickerOpen ? 'Hide Rivals' : 'Select Rival 🎯'}
                </button>
              </div>
            </div>

            {rivalPickerOpen && (
              <div className="rival-select-container">
                <h4>Choose Target Opponent</h4>
                <div className="rival-grid">
                  {pokemon.slice(0, 40).map(r => (
                    <div key={r.id} className="rival-card-option" onClick={() => initBattle(activeModal, r)}>
                      <img src={r.sprites.front_default} alt={r.name} />
                      <span>{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="stats-section">
              <h4>Base Statistics</h4>
              {activeModal.stats.map(s => (
                <div key={s.stat.name} className="stat-item">
                  <span className="stat-name">{s.stat.name}</span>
                  <span className="stat-val">{s.base_stat}</span>
                  <div className="stat-track">
                    <div className="stat-fill" style={{ width: `${(s.base_stat / 255) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {arenaOpen && playerPoke && enemyPoke && (
        <div className="arena-overlay">
          <div className="arena-card">
            <button className="close-btn" onClick={() => setArenaOpen(false)}>✕</button>

            <div className="arena-header">
              <h2>Battle Arena</h2>
              <span className="turn-badge">
                {turn === 'player' ? `${playerPoke.name.toUpperCase()} TURN` : `${enemyPoke.name.toUpperCase()} TURN...`}
              </span>
            </div>

            <div className="arena-stage">
              <div className="arena-grid-bg"></div>

              <div className={`fighter-box ${playerAnim}`}>
                <img className="fighter-img" src={playerPoke.sprites.front_default} alt={playerPoke.name} />
                <div className="fighter-platform"></div>
                <h4 className="fighter-name">{playerPoke.name}</h4>
                <div className="hp-bar-container">
                  <div 
                    className="hp-bar-fill" 
                    style={{ width: `${playerHp}%`, backgroundColor: getHpColor(playerHp) }}
                  ></div>
                </div>
                <span className="hp-text">{playerHp} HP</span>
              </div>

              <div className="vs-badge">VS</div>

              <div className={`fighter-box ${enemyAnim}`}>
                <img className="fighter-img" src={enemyPoke.sprites.front_default} alt={enemyPoke.name} />
                <div className="fighter-platform"></div>
                <h4 className="fighter-name">{enemyPoke.name}</h4>
                <div className="hp-bar-container">
                  <div 
                    className="hp-bar-fill" 
                    style={{ width: `${enemyHp}%`, backgroundColor: getHpColor(enemyHp) }}
                  ></div>
                </div>
                <span className="hp-text">{enemyHp} HP</span>
              </div>
            </div>

            <div className="move-grid">
              {playerPoke.moves.slice(0, 4).map((m, idx) => (
                <button 
                  key={idx} 
                  className="move-btn" 
                  onClick={handlePlayerAttack}
                  disabled={turn !== 'player' || battleResult !== null}
                >
                  {m.move.name.toUpperCase()}
                </button>
              ))}
            </div>

            {battleResult && (
              <div className="banner-overlay">
                <div className="banner-card">
                  <div className={`banner-title ${battleResult.toLowerCase()}`}>
                    {battleResult}
                  </div>
                  <p className="banner-desc">
                    {battleResult === 'VICTORY' 
                      ? `${playerPoke.name.toUpperCase()} defeated ${enemyPoke.name.toUpperCase()}!`
                      : `${playerPoke.name.toUpperCase()} was defeated.`}
                  </p>
                  
                  <div className="banner-actions">
                    <button className="banner-btn primary" onClick={() => initBattle(playerPoke)}>
                      Rematch
                    </button>
                    <button className="banner-btn secondary" onClick={() => setArenaOpen(false)}>
                      Exit Arena
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}