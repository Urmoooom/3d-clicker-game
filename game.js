// ============================================
// 3D CLICKER GAME - MAIN GAME FILE
// ============================================

const GAME_STATES = {
    CRYSTAL_AREA: 'crystal',
    SHOP: 'shop',
    INCREMENTAL: 'incremental'
};

let gameState = {
    clicks: 0,
    coins: 0,
    collected: 0,
    rebirthLevel: 0,
    rebirthPoints: 0,
    currentLocation: GAME_STATES.CRYSTAL_AREA,
    
    // Click multiplier from upgrades
    clickPower: 1,
    clickMultiplier: 1,
    
    // Shop upgrades
    upgrades: {
        doubleClick: { owned: 0, cost: 50 },
        tripleClick: { owned: 0, cost: 200 },
        autoClicker: { owned: 0, cost: 500 },
        critStrike: { owned: 0, cost: 1000 }
    },
    
    // Incremental area spawners
    spawners: {
        basic: { owned: 0, cost: 100, income: 1 },
        advanced: { owned: 0, cost: 500, income: 10 },
        premium: { owned: 0, cost: 2000, income: 50 },
        legendary: { owned: 0, cost: 10000, income: 500 }
    },
    
    // Auto-collection and spawning
    incrementalIncome: 0,
    autoClickerIncome: 0,
    collectionRate: 0
};

// Three.js setup
let scene, camera, renderer;
let crystal, player, objects = [];
let keys = {};
let lastClickTime = 0;

// Initialize game
function init() {
    // Three.js scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001a00);
    scene.fog = new THREE.Fog(0x001a00, 200, 500);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.set(0, 2, 10);
    camera.lookAt(0, 2, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a00 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Crystal (clickable)
    createCrystal();
    
    // Player (camera follow)
    player = { position: camera.position.clone(), velocity: new THREE.Vector3() };
    
    // Load game state
    loadGameState();
    updateUI();
    
    // Event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    renderer.domElement.addEventListener('click', handleCanvasClick);
    window.addEventListener('resize', handleWindowResize);
    
    // Game loop
    animate();
}

function createCrystal() {
    const geometry = new THREE.OctahedronGeometry(2, 2);
    const material = new THREE.MeshPhongMaterial({
        color: 0x00ff00,
        emissive: 0x00aa00,
        shininess: 100
    });
    crystal = new THREE.Mesh(geometry, material);
    crystal.position.set(0, 3, -5);
    crystal.castShadow = true;
    crystal.receiveShadow = true;
    scene.add(crystal);
}

function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key === 's' || e.key === 'S') {
        if (gameState.currentLocation === GAME_STATES.CRYSTAL_AREA) {
            openShop();
        }
    }
    if (e.key === 'i' || e.key === 'I') {
        if (gameState.currentLocation === GAME_STATES.CRYSTAL_AREA) {
            openIncremental();
        }
    }
    if (e.key === 'r' || e.key === 'R') {
        if (gameState.currentLocation === GAME_STATES.CRYSTAL_AREA && gameState.coins >= 50000) {
            openRebirth();
        }
    }
}

function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

function handleCanvasClick(e) {
    if (gameState.currentLocation !== GAME_STATES.CRYSTAL_AREA) return;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects([crystal]);
    
    if (intersects.length > 0) {
        clickCrystal(e.clientX, e.clientY);
    }
}

function clickCrystal(x, y) {
    let damage = gameState.clickPower * gameState.clickMultiplier;
    
    // Random crit based on upgrades
    if (gameState.upgrades.critStrike.owned > 0) {
        if (Math.random() < gameState.upgrades.critStrike.owned * 0.05) {
            damage *= 2;
        }
    }
    
    gameState.clicks += Math.floor(damage);
    gameState.coins += Math.floor(damage) * 0.5;
    
    // Crystal animation
    crystal.scale.set(1.2, 1.2, 1.2);
    setTimeout(() => {
        crystal.scale.set(1, 1, 1);
    }, 100);
    
    // Floating damage text
    showFloatingText('+' + Math.floor(damage), x, y, '#ffff00');
    
    // Update UI
    document.getElementById('clicks').textContent = formatNumber(gameState.clicks);
    document.getElementById('coins').textContent = formatNumber(gameState.coins);
}

function showFloatingText(text, x, y, color) {
    const div = document.createElement('div');
    div.className = 'click-damage';
    div.textContent = text;
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    div.style.color = color;
    document.body.appendChild(div);
    
    setTimeout(() => div.remove(), 1000);
}

function updatePlayerMovement() {
    const speed = 0.2;
    const direction = new THREE.Vector3();
    
    if (keys['w']) direction.z -= 1;
    if (keys['s']) direction.z += 1;
    if (keys['a']) direction.x -= 1;
    if (keys['d']) direction.x += 1;
    
    if (direction.length() > 0) {
        direction.normalize();
        camera.position.addScaledVector(direction, speed);
    }
    
    // Jump (space)
    if (keys[' '] && Math.abs(player.velocity.y) < 0.01) {
        player.velocity.y = 0.5;
    }
    
    // Gravity
    player.velocity.y -= 0.015;
    camera.position.y += player.velocity.y;
    
    // Ground collision
    if (camera.position.y < 1.5) {
        camera.position.y = 1.5;
        player.velocity.y = 0;
    }
    
    // Camera look at crystal
    camera.lookAt(0, 2, -5);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (gameState.currentLocation === GAME_STATES.CRYSTAL_AREA) {
        updatePlayerMovement();
        
        // Rotate crystal
        crystal.rotation.x += 0.005;
        crystal.rotation.y += 0.01;
        crystal.rotation.z += 0.003;
        
        // Auto-clicker
        gameState.autoClickerIncome = gameState.upgrades.autoClicker.owned * 0.1;
        if (gameState.autoClickerIncome > 0) {
            gameState.coins += gameState.autoClickerIncome / 60; // Per frame (60fps)
            document.getElementById('coins').textContent = formatNumber(gameState.coins);
        }
    }
    
    // Incremental income
    gameState.incrementalIncome = Object.keys(gameState.spawners).reduce((sum, key) => {
        return sum + gameState.spawners[key].owned * gameState.spawners[key].income;
    }, 0);
    
    if (gameState.incrementalIncome > 0) {
        gameState.coins += gameState.incrementalIncome / 60;
        gameState.collected += gameState.incrementalIncome / 60;
        document.getElementById('coins').textContent = formatNumber(gameState.coins);
        document.getElementById('collected').textContent = formatNumber(gameState.collected);
    }
    
    // Apply rebirth multiplier
    const rebirthMultiplier = 1 + gameState.rebirthLevel * 0.1;
    gameState.clickMultiplier = 1 + (gameState.upgrades.doubleClick.owned * 0.5 + gameState.upgrades.tripleClick.owned * 1.5) * rebirthMultiplier;
    gameState.clickPower = 1 + gameState.rebirthLevel * 0.5;
    
    renderer.render(scene, camera);
}

function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// UI Functions
function updateUI() {
    document.getElementById('clicks').textContent = formatNumber(gameState.clicks);
    document.getElementById('coins').textContent = formatNumber(gameState.coins);
    document.getElementById('collected').textContent = formatNumber(gameState.collected);
    document.getElementById('rebirth-level').textContent = gameState.rebirthLevel;
}

function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toString();
}

function openShop() {
    const modal = document.getElementById('shop-modal');
    const shopItems = document.getElementById('shop-items');
    shopItems.innerHTML = '';
    
    // Upgrades
    const upgradesSection = document.createElement('h3');
    upgradesSection.textContent = 'UPGRADES';
    upgradesSection.style.color = '#00ff00';
    upgradesSection.style.gridColumn = '1 / -1';
    shopItems.appendChild(upgradesSection);
    
    Object.keys(gameState.upgrades).forEach(key => {
        const upgrade = gameState.upgrades[key];
        const costMultiplier = Math.pow(1.15, upgrade.owned);
        const actualCost = upgrade.cost * costMultiplier;
        
        const item = document.createElement('div');
        item.className = 'shop-item';
        if (gameState.coins < actualCost) item.classList.add('unavailable');
        
        item.innerHTML = `
            <h3>${formatUpgradeName(key)}</h3>
            <p class="owned">Owned: ${upgrade.owned}</p>
            <p>${formatUpgradeDescription(key)}</p>
            <div class="price">Cost: ${formatNumber(actualCost)} coins</div>
        `;
        
        if (gameState.coins >= actualCost) {
            item.onclick = () => buyUpgrade(key);
        }
        
        shopItems.appendChild(item);
    });
    
    // Rebirth button
    if (gameState.coins >= 50000) {
        const rebirthBtn = document.createElement('div');
        rebirthBtn.className = 'shop-item';
        rebirthBtn.style.cursor = 'pointer';
        rebirthBtn.innerHTML = `
            <h3>Rebirth (R)</h3>
            <p>Reset progress for rebirth points</p>
            <div class="price">Cost: 50,000 coins</div>
        `;
        rebirthBtn.onclick = openRebirth;
        shopItems.appendChild(rebirthBtn);
    }
    
    modal.classList.add('active');
}

function formatUpgradeName(key) {
    return key.replace(/([A-Z])/g, ' $1').toUpperCase().trim();
}

function formatUpgradeDescription(key) {
    const descriptions = {
        doubleClick: '+50% click power',
        tripleClick: '+100% click power',
        autoClicker: '+0.1 clicks/sec passive',
        critStrike: '5% crit chance per level (2x damage)'
    };
    return descriptions[key] || '';
}

function buyUpgrade(key) {
    const upgrade = gameState.upgrades[key];
    const costMultiplier = Math.pow(1.15, upgrade.owned);
    const actualCost = upgrade.cost * costMultiplier;
    
    if (gameState.coins >= actualCost) {
        gameState.coins -= actualCost;
        upgrade.owned++;
        
        document.getElementById('coins').textContent = formatNumber(gameState.coins);
        saveGameState();
        openShop(); // Refresh shop
    }
}

function closeShop() {
    document.getElementById('shop-modal').classList.remove('active');
}

function openIncremental() {
    const modal = document.getElementById('incremental-modal');
    const content = document.getElementById('incremental-items');
    const stats = document.getElementById('incremental-stats');
    
    content.innerHTML = '';
    stats.innerHTML = `
        <div>Total Income: ${formatNumber(gameState.incrementalIncome)} coins/sec</div>
        <div>Total Collected: ${formatNumber(gameState.collected)}</div>
        <div>Rebirth Multiplier: ${(1 + gameState.rebirthLevel * 0.1).toFixed(2)}x</div>
    `;
    
    Object.keys(gameState.spawners).forEach(key => {
        const spawner = gameState.spawners[key];
        const costMultiplier = Math.pow(1.2, spawner.owned);
        const actualCost = spawner.cost * costMultiplier;
        
        const item = document.createElement('div');
        item.className = 'incremental-item';
        if (gameState.coins < actualCost) item.classList.add('unavailable');
        
        item.innerHTML = `
            <h3>${formatSpawnerName(key)}</h3>
            <p>Owned: ${spawner.owned}</p>
            <p>Income: ${formatNumber(spawner.income)} coins/sec</p>
            <div class="price">Cost: ${formatNumber(actualCost)}</div>
        `;
        
        if (gameState.coins >= actualCost) {
            item.onclick = () => buySpawner(key);
        }
        
        content.appendChild(item);
    });
    
    modal.classList.add('active');
}

function formatSpawnerName(key) {
    const names = {
        basic: 'Basic Spawner',
        advanced: 'Advanced Spawner',
        premium: 'Premium Spawner',
        legendary: 'Legendary Spawner'
    };
    return names[key] || key;
}

function buySpawner(key) {
    const spawner = gameState.spawners[key];
    const costMultiplier = Math.pow(1.2, spawner.owned);
    const actualCost = spawner.cost * costMultiplier;
    
    if (gameState.coins >= actualCost) {
        gameState.coins -= actualCost;
        spawner.owned++;
        
        document.getElementById('coins').textContent = formatNumber(gameState.coins);
        saveGameState();
        openIncremental(); // Refresh
    }
}

function closeIncremental() {
    document.getElementById('incremental-modal').classList.remove('active');
}

function openRebirth() {
    if (gameState.coins < 50000) return;
    
    const rebirthGain = Math.floor(Math.sqrt(gameState.coins / 1000));
    document.getElementById('rebirth-gain').textContent = rebirthGain;
    document.getElementById('rebirth-modal').classList.add('active');
}

function confirmRebirth() {
    const rebirthGain = Math.floor(Math.sqrt(gameState.coins / 1000));
    
    // Reset game
    gameState.clicks = 0;
    gameState.coins = 0;
    gameState.collected = 0;
    gameState.clickMultiplier = 1;
    gameState.clickPower = 1;
    gameState.upgrades = {
        doubleClick: { owned: 0, cost: 50 },
        tripleClick: { owned: 0, cost: 200 },
        autoClicker: { owned: 0, cost: 500 },
        critStrike: { owned: 0, cost: 1000 }
    };
    gameState.spawners = {
        basic: { owned: 0, cost: 100, income: 1 },
        advanced: { owned: 0, cost: 500, income: 10 },
        premium: { owned: 0, cost: 2000, income: 50 },
        legendary: { owned: 0, cost: 10000, income: 500 }
    };
    
    // Rebirth bonuses
    gameState.rebirthLevel++;
    gameState.rebirthPoints += rebirthGain;
    gameState.coins = 1000; // Starting coins
    
    closeRebirth();
    updateUI();
    saveGameState();
}

function closeRebirth() {
    document.getElementById('rebirth-modal').classList.remove('active');
}

// Save/Load
function saveGameState() {
    localStorage.setItem('gameState', JSON.stringify(gameState));
}

function loadGameState() {
    const saved = localStorage.getItem('gameState');
    if (saved) {
        const loaded = JSON.parse(saved);
        Object.assign(gameState, loaded);
    }
}

// Start game
window.addEventListener('load', init);
