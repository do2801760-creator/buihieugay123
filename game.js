// ============================================================
// PIXEL DUNGEON - GAME.JS
// ============================================================

"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;


// ============================================================
// SAVE DATA
// ============================================================

const SAVE_KEY = "pixelDungeon_v2";

const defaultPlayer = {
    level: 1,
    exp: 0,
    expNeed: 50,

    hp: 120,
    maxHp: 120,

    damage: 12,
    speed: 2.8,

    crit: 0.05,
    defense: 0,
    lifesteal: 0,

    gold: 100,

    weapon: "Kiếm gỗ",
    weaponType: "sword",
    weaponRarity: "Common",
    weaponEffect: "none",

    character: "warrior",

    potions: 2,

    inventory: [
        {
            name: "Kiếm gỗ",
            icon: "🗡️",
            rarity: "Common",
            type: "weapon"
        }
    ]
};


let player = loadPlayer();


function loadPlayer() {

    try {

        const saved =
            localStorage.getItem(SAVE_KEY);

        if (!saved) {
            return structuredClone(defaultPlayer);
        }

        return {
            ...structuredClone(defaultPlayer),
            ...JSON.parse(saved)
        };

    } catch (error) {

        console.warn("Save lỗi:", error);

        return structuredClone(defaultPlayer);
    }
}


function savePlayer() {

    localStorage.setItem(
        SAVE_KEY,
        JSON.stringify(player)
    );
}


// ============================================================
// GAME STATE
// ============================================================

let gameRunning = false;

let paused = false;

let gameOver = false;

let wave = 1;

let dungeonMap = 1;

let enemies = [];

let projectiles = [];

let particles = [];

let floatingTexts = [];

let drops = [];

let keys = {};

let attackCooldown = 0;

let attackAnimation = 0;

let attackDirection = 1;

let animationTime = 0;

let lastTime = 0;

let bossSpawned = false;

let screenShake = 0;


// ============================================================
// DOM
// ============================================================

const lobby =
    document.getElementById("lobby");

const dungeon =
    document.getElementById("dungeon");

const levelUp =
    document.getElementById("levelUp");

const shop =
    document.getElementById("shop");

const inventory =
    document.getElementById("inventory");

const gameOverScreen =
    document.getElementById("gameOver");


// ============================================================
// LOBBY
// ============================================================

document
    .getElementById("playBtn")
    .addEventListener("click", startDungeon);


document
    .getElementById("backLobbyBtn")
    .addEventListener("click", returnLobby);


document
    .getElementById("shopBtn")
    .addEventListener("click", openShop);


document
    .getElementById("closeShop")
    .addEventListener("click", () => {

        shop.classList.add("hidden");
    });


document
    .getElementById("inventoryBtn")
    .addEventListener("click", openInventory);


document
    .getElementById("closeInventory")
    .addEventListener("click", () => {

        inventory.classList.add("hidden");
    });


document
    .getElementById("restartBtn")
    .addEventListener("click", () => {

        gameOverScreen.classList.add("hidden");

        startDungeon();
    });


document
    .getElementById("gameOverLobby")
    .addEventListener("click", () => {

        gameOverScreen.classList.add("hidden");

        returnLobby();
    });


function updateLobby() {

    document.getElementById("lobbyLevel")
        .textContent = player.level;

    document.getElementById("lobbyGold")
        .textContent = player.gold;

    document.getElementById("lobbyWeapon")
        .textContent =
            `${player.weapon} [${player.weaponRarity}]`;
}


// ============================================================
// DUNGEON START
// ============================================================

function startDungeon() {

    lobby.classList.add("hidden");

    dungeon.classList.remove("hidden");

    levelUp.classList.add("hidden");

    gameOverScreen.classList.add("hidden");

    gameRunning = true;

    paused = false;

    gameOver = false;

    wave = 1;

    dungeonMap =
        Math.floor(
            Math.random() * 3
        ) + 1;

    bossSpawned = false;

    player.hp = player.maxHp;

    player.x = canvas.width / 2;

    player.y = canvas.height / 2;

    enemies = [];

    projectiles = [];

    particles = [];

    floatingTexts = [];

    drops = [];

    spawnWave();

    updateHUD();
}


// ============================================================
// RETURN LOBBY
// ============================================================

function returnLobby() {

    gameRunning = false;

    dungeon.classList.add("hidden");

    lobby.classList.remove("hidden");

    levelUp.classList.add("hidden");

    shop.classList.add("hidden");

    inventory.classList.add("hidden");

    savePlayer();

    updateLobby();
}


// ============================================================
// INPUT
// ============================================================

window.addEventListener("keydown", event => {

    keys[event.key.toLowerCase()] = true;

    if (
        event.code === "Space" ||
        event.key === "Enter"
    ) {

        event.preventDefault();

        attack();
    }
});


window.addEventListener("keyup", event => {

    keys[event.key.toLowerCase()] = false;
});


// ================= MOBILE CONTROLS =================

function setupMobileButton(button, key) {
    if (!button) return;

    const press = (e) => {
        e.preventDefault();
        e.stopPropagation();

        keys[key] = true;

        try {
            button.setPointerCapture(e.pointerId);
        } catch (_) {}
    };

    const release = (e) => {
        e.preventDefault();
        e.stopPropagation();
        keys[key] = false;
    };

    button.addEventListener("pointerdown", press, { passive: false });
    button.addEventListener("pointerup", release, { passive: false });
    button.addEventListener("pointercancel", release, { passive: false });
    button.addEventListener("lostpointercapture", () => {
        keys[key] = false;
    });
}

document.querySelectorAll("#mobileControls [data-key]").forEach(button => {
    setupMobileButton(
        button,
        button.dataset.key.toLowerCase()
    );
});

const attackButton = document.getElementById("attackMobile");

if (attackButton) {

    const attackPress = (e) => {
        e.preventDefault();
        e.stopPropagation();

        attack();
    };

    attackButton.addEventListener(
        "pointerdown",
        attackPress,
        { passive: false }
    );

    attackButton.addEventListener(
        "touchstart",
        e => {
            e.preventDefault();
            e.stopPropagation();
        },
        { passive: false }
    );

    attackButton.addEventListener(
        "contextmenu",
        e => e.preventDefault()
    );
}

// Chặn các gesture gây zoom trên khu vực game
document.addEventListener(
    "touchstart",
    e => {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    },
    { passive: false }
);

// Chặn double tap zoom
let lastTouchEnd = 0;

document.addEventListener(
    "touchend",
    e => {
        const now = Date.now();

        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }

        lastTouchEnd = now;
    },
    { passive: false }
);

// Không cho menu chuột phải trên nút game
document.querySelectorAll("button").forEach(button => {
    button.addEventListener("contextmenu", e => {
        e.preventDefault();
    });
});

        const key =
            button.dataset.key.toLowerCase();


        button.addEventListener(
            "pointerdown",
            event => {

                event.preventDefault();

                keys[key] = true;
            }
        );


        button.addEventListener(
            "pointerup",
            event => {

                event.preventDefault();

                keys[key] = false;
            }
        );


        button.addEventListener(
            "pointerleave",
            () => {

                keys[key] = false;
            }
        );
    });


// ============================================================
// PLAYER MOVEMENT
// ============================================================

function updatePlayer(dt) {

    if (!gameRunning || paused)
        return;


    let dx = 0;
    let dy = 0;


    if (
        keys["a"] ||
        keys["arrowleft"]
    ) {
        dx -= 1;
    }


    if (
        keys["d"] ||
        keys["arrowright"]
    ) {
        dx += 1;
    }


    if (
        keys["w"] ||
        keys["arrowup"]
    ) {
        dy -= 1;
    }


    if (
        keys["s"] ||
        keys["arrowdown"]
    ) {
        dy += 1;
    }


    const moving =
        dx !== 0 ||
        dy !== 0;


    if (moving) {

        const length =
            Math.sqrt(
                dx * dx +
                dy * dy
            );

        dx /= length;
        dy /= length;


        player.x +=
            dx *
            player.speed *
            dt *
            60;

        player.y +=
            dy *
            player.speed *
            dt *
            60;


        if (dx !== 0) {

            attackDirection =
                dx > 0
                    ? 1
                    : -1;
        }
    }


    const margin = 30;


    player.x =
        Math.max(
            margin,
            Math.min(
                canvas.width -
                margin,
                player.x
            )
        );


    player.y =
        Math.max(
            margin,
            Math.min(
                canvas.height -
                margin,
                player.y
            )
        );


    player.moving = moving;

    player.walkTime +=
        moving
            ? dt * 15
            : dt * 4;


    if (attackCooldown > 0) {

        attackCooldown -=
            dt * 60;
    }


    if (attackAnimation > 0) {

        attackAnimation -=
            dt * 60;
    }
}


// ============================================================
// ATTACK
// ============================================================

function attack() {

    if (!gameRunning)
        return;

    if (paused)
        return;

    if (attackCooldown > 0)
        return;


    attackCooldown =
        player.weaponType === "bow"
            ? 30
            : 18;


    attackAnimation = 14;


    if (player.weaponType === "sword") {

        swordAttack();

    } else if (
        player.weaponType === "bow"
    ) {

        bowAttack();

    } else if (
        player.weaponType === "magic"
    ) {

        magicAttack();
    }
}


// ============================================================
// SWORD
// ============================================================

function swordAttack() {

    let target = null;

    let closest = 75;


    for (const enemy of enemies) {

        const distance =
            distanceBetween(
                player,
                enemy
            );


        if (
            distance < closest &&
            enemy.hp > 0
        ) {

            closest = distance;

            target = enemy;
        }
    }


    createSlashEffect();


    if (!target)
        return;


    let damage =
        calculateDamage();


    target.hp -= damage;


    floatingDamage(
        target.x,
        target.y,
        damage
    );


    hitParticles(
        target.x,
        target.y,
        "#ffffff"
    );


    healFromAttack(damage);


    if (target.hp <= 0) {

        killEnemy(target);
    }
}


// ============================================================
// BOW
// ============================================================

function bowAttack() {

    projectiles.push({

        x: player.x,

        y: player.y,

        vx:
            attackDirection *
            8,

        vy: 0,

        damage:
            calculateDamage(),

        life: 100,

        type: "arrow"
    });


    createHitParticles(
        player.x +
        attackDirection *
        25,

        player.y,

        "#d7a14a"
    );
}


// ============================================================
// MAGIC
// ============================================================

function magicAttack() {

    projectiles.push({

        x: player.x,

        y: player.y,

        vx:
            attackDirection *
            6,

        vy: 0,

        damage:
            calculateDamage() *
            1.4,

        life: 100,

        type: "magic"
    });


    createHitParticles(
        player.x +
        attackDirection *
        20,

        player.y,

        "#b45cff"
    );
}


// ============================================================
// DAMAGE
// ============================================================

function calculateDamage() {

    let damage =
        player.damage;


    const critical =
        Math.random() <
        player.crit;


    if (critical) {

        damage *= 2;

        floatingTexts.push({

            x: player.x,

            y: player.y - 40,

            text: "CRITICAL!",

            color: "#ffe13b",

            life: 50
        });
    }


    return Math.floor(damage);
}


function healFromAttack(damage) {

    if (
        player.lifesteal <= 0
    )
        return;


    player.hp =
        Math.min(
            player.maxHp,
            player.hp +
            player.lifesteal
        );
}


// ============================================================
// SPAWN WAVES
// ============================================================

function spawnWave() {

    enemies = [];

    bossSpawned = false;


    const normalCount =
        Math.min(
            3 + wave * 2,
            15
        );


    for (
        let i = 0;
        i < normalCount;
        i++
    ) {

        spawnEnemy(
            randomEnemyType()
        );
    }


    // Boss mỗi 5 wave

    if (
        wave % 5 === 0
    ) {

        spawnBoss();

        bossSpawned = true;
    }


    updateHUD();
}


// ============================================================
// ENEMY TYPES
// ============================================================

function randomEnemyType() {

    const random =
        Math.random();


    if (
        wave >= 4 &&
        random < 0.2
    ) {

        return "orc";
    }


    if (
        wave >= 2 &&
        random < 0.45
    ) {

        return "slime";
    }


    return "goblin";
}


// ============================================================
// SPAWN ENEMY
// ============================================================

function spawnEnemy(type) {

    const position =
        randomEdgePosition();


    const data = {

        goblin: {

            hp: 35,

            damage: 6,

            speed: 1.2,

            size: 28,

            color: "#6eb54a"
        },

        slime: {

            hp: 55,

            damage: 8,

            speed: 0.7,

            size: 34,

            color: "#53b7c9"
        },

        orc: {

            hp: 110,

            damage: 14,

            speed: 0.55,

            size: 42,

            color: "#789d3f"
        }
    };


    const info =
        data[type];


    const multiplier =
        1 +
        wave *
        0.13;


    enemies.push({

        x: position.x,

        y: position.y,

        type,

        width: info.size,

        height: info.size,

        hp:
            info.hp *
            multiplier,

        maxHp:
            info.hp *
            multiplier,

        damage:
            info.damage *
            multiplier,

        speed:
            info.speed,

        color: info.color,

        attackTimer: 0,

        hitFlash: 0,

        anim: Math.random() * 10
    });
}


// ============================================================
// BOSS
// ============================================================

function spawnBoss() {

    enemies.push({

        x: canvas.width / 2,

        y: 70,

        type: "boss",

        width: 75,

        height: 75,

        hp:
            700 +
            wave * 120,

        maxHp:
            700 +
            wave * 120,

        damage:
            20 +
            wave * 3,

        speed: 0.45,

        color: "#8d2947",

        attackTimer: 0,

        hitFlash: 0,

        anim: 0,

        boss: true
    });
}


// ============================================================
// ENEMY UPDATE
// ============================================================

function updateEnemies(dt) {

    for (const enemy of enemies) {

        enemy.anim +=
            dt * 8;


        if (
            enemy.hitFlash > 0
        ) {

            enemy.hitFlash -=
                dt * 60;
        }


        const dx =
            player.x -
            enemy.x;


        const dy =
            player.y -
            enemy.y;


        const distance =
            Math.sqrt(
                dx * dx +
                dy * dy
            );


        if (distance > 38) {

            enemy.x +=
                dx /
                distance *
                enemy.speed *
                dt *
                60;

            enemy.y +=
                dy /
                distance *
                enemy.speed *
                dt *
                60;

        } else {

            enemy.attackTimer -=
                dt * 60;


            if (
                enemy.attackTimer <= 0
            ) {

                damagePlayer(
                    enemy.damage
                );

                enemy.attackTimer =
                    enemy.boss
                        ? 35
                        : 60;
            }
        }
    }
}


// ============================================================
// PROJECTILES
// ============================================================

function updateProjectiles(dt) {

    for (
        let i =
            projectiles.length - 1;
        i >= 0;
        i--
    ) {

        const p =
            projectiles[i];


        p.x +=
            p.vx *
            dt *
            60;

        p.y +=
            p.vy *
            dt *
            60;

        p.life--;


        let hit = false;


        for (const enemy of enemies) {

            if (
                circleCollision(
                    p.x,
                    p.y,
                    8,

                    enemy.x,
                    enemy.y,
                    enemy.width / 2
                )
            ) {

                enemy.hp -=
                    p.damage;

                enemy.hitFlash = 8;


                floatingDamage(
                    enemy.x,
                    enemy.y,
                    p.damage
                );


                hitParticles(
                    enemy.x,
                    enemy.y,
                    p.type === "magic"
                        ? "#b45cff"
                        : "#d7a14a"
                );


                healFromAttack(
                    p.damage
                );


                if (
                    enemy.hp <= 0
                ) {

                    killEnemy(enemy);
                }


                hit = true;

                break;
            }
        }


        if (
            hit ||
            p.life <= 0
        ) {

            projectiles.splice(
                i,
                1
            );
        }
    }
}


// ============================================================
// DAMAGE PLAYER
// ============================================================

function damagePlayer(damage) {

    damage =
        Math.max(
            1,
            Math.floor(
                damage -
                player.defense
            )
        );


    player.hp -= damage;

    screenShake = 5;


    floatingTexts.push({

        x: player.x,

        y: player.y - 30,

        text: "-" + damage,

        color: "#ff4545",

        life: 35
    });


    createHitParticles(
        player.x,
        player.y,
        "#ff4545"
    );


    if (
        player.hp <= 0
    ) {

        player.hp = 0;

        playerDeath();
    }
}


// ============================================================
// PLAYER DEATH
// ============================================================

function playerDeath() {

    gameRunning = false;

    gameOver = true;

    gameOverScreen.classList.remove(
        "hidden"
    );

    player.gold =
        Math.max(
            0,
            player.gold -
            20
        );

    savePlayer();
}


// ============================================================
// KILL ENEMY
// ============================================================

function killEnemy(enemy) {

    const index =
        enemies.indexOf(enemy);


    if (index === -1)
        return;


    enemies.splice(
        index,
        1
    );


    const exp =
        enemy.boss
            ? 100
            : 10 +
              wave * 3;


    const gold =
        enemy.boss
            ? 100
            : Math.floor(
                Math.random() *
                10
            ) + 5;


    gainExp(exp);

    player.gold += gold;


    // Drop item

    if (
        Math.random() <
        (enemy.boss
            ? 1
            : 0.22)
    ) {

        createDrop(
            enemy.x,
            enemy.y,
            enemy.boss
        );
    }


    createHitParticles(
        enemy.x,
        enemy.y,
        enemy.boss
            ? "#ff9d22"
            : "#ff4b4b"
    );


    // Wave hoàn thành

    if (
        enemies.length === 0
    ) {

        wave++;


        setTimeout(() => {

            if (
                gameRunning &&
                !paused
            ) {

                spawnWave();
            }

        }, 900);
    }
}


// ============================================================
// EXP
// ============================================================

function gainExp(amount) {

    player.exp += amount;


    while (
        player.exp >=
        player.expNeed
    ) {

        player.exp -=
            player.expNeed;

        player.level++;


        player.expNeed =
            Math.floor(
                player.expNeed *
                1.35
            );


        openLevelUp();
    }


    savePlayer();

    updateHUD();
}


// ============================================================
// LEVEL UP
// ============================================================

function openLevelUp() {

    paused = true;

    levelUp.classList.remove(
        "hidden"
    );


    const container =
        document.getElementById(
            "upgradeChoices"
        );


    container.innerHTML = "";


    const upgrades = [

        {
            icon: "⚔️",

            title: "Sức mạnh",

            text: "+8 sát thương",

            rarity: "Common",

            action() {

                player.damage += 8;
            }
        },

        {
            icon: "❤️",

            title: "Sinh lực",

            text: "+35 máu tối đa",

            rarity: "Common",

            action() {

                player.maxHp += 35;

                player.hp =
                    player.maxHp;
            }
        },

        {
            icon: "🏃",

            title: "Nhanh nhẹn",

            text: "+0.6 tốc độ",

            rarity: "Rare",

            action() {

                player.speed += 0.6;
            }
        },

        {
            icon: "💥",

            title: "Bạo kích",

            text: "+10% chí mạng",

            rarity: "Rare",

            action() {

                player.crit += 0.10;
            }
        },

        {
            icon: "🛡️",

            title: "Phòng thủ",

            text: "+3 giáp",

            rarity: "Rare",

            action() {

                player.defense += 3;
            }
        },

        {
            icon: "🩸",

            title: "Hút máu",

            text: "+3 HP mỗi lần đánh",

            rarity: "Epic",

            action() {

                player.lifesteal += 3;
            }
        },

        {
            icon: "🔥",

            title: "Lửa",

            text: "Vũ khí gây hiệu ứng lửa",

            rarity: "Epic",

            action() {

                player.weaponEffect =
                    "fire";
            }
        },

        {
            icon: "⚡",

            title: "Sấm sét",

            text: "+20% sát thương",

            rarity: "Legendary",

            action() {

                player.damage =
                    Math.floor(
                        player.damage *
                        1.2
                    );
            }
        }
    ];


    upgrades.sort(
        () =>
            Math.random() -
            0.5
    );


    upgrades
        .slice(0, 3)
        .forEach(upgrade => {

            const button =
                document.createElement(
                    "button"
                );


            button.className =
                "upgrade";


            button.innerHTML = `

                <div class="upgrade-icon">
                    ${upgrade.icon}
                </div>

                <div class="upgrade-title">
                    ${upgrade.title}
                </div>

                <div class="upgrade-rarity ${upgrade.rarity.toLowerCase()}">
                    ${upgrade.rarity}
                </div>

                <p>
                    ${upgrade.text}
                </p>
            `;


            button.addEventListener(
                "click",
                () => {

                    upgrade.action();

                    levelUp.classList.add(
                        "hidden"
                    );

                    paused = false;

                    savePlayer();

                    updateHUD();
                }
            );


            container.appendChild(
                button
            );
        });
}


// ============================================================
// DROPS
// ============================================================

function createDrop(
    x,
    y,
    bossDrop = false
) {

    const rarity =
        bossDrop
            ? "Legendary"
            : randomRarity();


    let item;


    if (
        Math.random() < 0.45
    ) {

        item = {

            name:
                rarity +
                " Kiếm",

            icon: "🗡️",

            type: "weapon",

            rarity,

            damage:
                rarityDamage(
                    rarity
                )
        };

    } else {

        item = {

            name:
                rarity +
                " Potion",

            icon: "🧪",

            type: "potion",

            rarity,

            heal:
                rarity === "Legendary"
                    ? 100
                    : rarity === "Epic"
                        ? 75
                        : 50
        };
    }


    drops.push({

        x,
        y,

        item,

        bob:
            Math.random() * 10
    });
}


function randomRarity() {

    const r =
        Math.random();


    if (r < 0.03)
        return "Legendary";

    if (r < 0.13)
        return "Epic";

    if (r < 0.38)
        return "Rare";

    return "Common";
}


function rarityDamage(rarity) {

    if (
        rarity === "Legendary"
    )
        return 25;

    if (
        rarity === "Epic"
    )
        return 18;

    if (
        rarity === "Rare"
    )
        return 13;

    return 7;
}


// ============================================================
// COLLECT DROPS
// ============================================================

function collectDrops() {

    for (
        let i =
            drops.length - 1;
        i >= 0;
        i--
    ) {

        const drop =
            drops[i];


        if (
            distanceBetween(
                player,
                drop
            ) <
            35
        ) {

            const item =
                drop.item;


            if (
                item.type === "potion"
            ) {

                player.hp =
                    Math.min(
                        player.maxHp,
                        player.hp +
                        item.heal
                    );

                floatingTexts.push({

                    x: player.x,

                    y: player.y - 35,

                    text:
                        "+" +
                        item.heal,

                    color:
                        "#55ff77",

                    life: 40
                });

            } else {

                player.inventory.push(
                    item
                );


                if (
                    item.damage >
                    player.damage
                ) {

                    player.damage =
                        item.damage;

                    player.weapon =
                        item.name;

                    player.weaponRarity =
                        item.rarity;

                    player.weaponType =
                        "sword";

                    player.weaponEffect =
                        rarityEffect(
                            item.rarity
                        );
                }
            }


            drops.splice(
                i,
                1
            );


            savePlayer();
        }
    }
}


function rarityEffect(rarity) {

    if (
        rarity === "Legendary"
    )
        return "lightning";

    if (
        rarity === "Epic"
    )
        return "fire";

    if (
        rarity === "Rare"
    )
        return "ice";

    return "none";
}


// ============================================================
// SHOP
// ============================================================

const shopItems = [

    {
        name: "Kiếm sắt",
        icon: "🗡️",
        rarity: "Rare",
        price: 120,
        damage: 20
    },

    {
        name: "Cung bạc",
        icon: "🏹",
        rarity: "Epic",
        price: 250,
        damage: 32,
        type: "bow"
    },

    {
        name: "Gậy phép",
        icon: "🔮",
        rarity: "Epic",
        price: 300,
        damage: 38,
        type: "magic"
    },

    {
        name: "Kiếm rồng",
        icon: "🐉",
        rarity: "Legendary",
        price: 800,
        damage: 70
    }
];


function openShop() {

    shop.classList.remove(
        "hidden"
    );

    renderShop();
}


function renderShop() {

    document.getElementById(
        "shopGold"
    ).textContent =
        player.gold;


    const container =
        document.getElementById(
            "shopItems"
        );


    container.innerHTML = "";


    shopItems.forEach(item => {

        const div =
            document.createElement(
                "div"
            );


        div.className =
            "shop-item";


        div.innerHTML = `

            <div class="shop-icon">
                ${item.icon}
            </div>

            <h3 class="${item.rarity.toLowerCase()}">
                ${item.name}
            </h3>

            <p>
                Rarity:
                ${item.rarity}
            </p>

            <p>
                ⚔️ Damage:
                ${item.damage}
            </p>

            <b>
                💰 ${item.price}
            </b>

            <button>
                MUA
            </button>
        `;


        div
            .querySelector("button")
            .addEventListener(
                "click",
                () => {

                    buyItem(item);
                }
            );


        container.appendChild(div);
    });
}


function buyItem(item) {

    if (
        player.gold <
        item.price
    ) {

        alert(
            "Không đủ vàng!"
        );

        return;
    }


    player.gold -=
        item.price;


    player.inventory.push({

        name: item.name,

        icon: item.icon,

        rarity: item.rarity,

        type:
            item.type ||
            "weapon",

        damage: item.damage
    });


    if (
        item.damage >
        player.damage
    ) {

        player.damage =
            item.damage;

        player.weapon =
            item.name;

        player.weaponRarity =
            item.rarity;

        player.weaponType =
            item.type ||
            "sword";

        player.weaponEffect =
            rarityEffect(
                item.rarity
            );
    }


    savePlayer();

    renderShop();

    updateLobby();
}


// ============================================================
// INVENTORY
// ============================================================

function openInventory() {

    inventory.classList.remove(
        "hidden"
    );

    renderInventory();
}


function renderInventory() {

    const container =
        document.getElementById(
            "inventoryItems"
        );


    container.innerHTML = "";


    player.inventory.forEach(
        (item, index) => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "inventory-item";


            div.innerHTML = `

                <div class="inventory-icon">
                    ${item.icon}
                </div>

                <b class="${item.rarity.toLowerCase()}">
                    ${item.name}
                </b>

                <p>
                    ${item.type === "weapon"
                        ? "⚔️ " + item.damage
                        : "🧪 " + item.heal}
                </p>
            `;


            container.appendChild(div);
        }
    );
}


// ============================================================
// DRAW BACKGROUND
// ============================================================

function drawBackground() {

    let colors;


    if (
        dungeonMap === 1
    ) {

        colors = [
            "#263d29",
            "#304a31"
        ];

    } else if (
        dungeonMap === 2
    ) {

        colors = [
            "#282e48",
            "#343b5a"
        ];

    } else {

        colors = [
            "#3c2424",
            "#4a2b2b"
        ];
    }


    ctx.fillStyle =
        colors[0];


    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const tile = 48;


    for (
        let x = 0;
        x < canvas.width;
        x += tile
    ) {

        for (
            let y = 0;
            y < canvas.height;
            y += tile
        ) {

            ctx.fillStyle =
                (
                    x / tile +
                    y / tile
                ) % 2 === 0
                    ? colors[0]
                    : colors[1];


            ctx.fillRect(
                x,
                y,
                tile - 2,
                tile - 2
            );
        }
    }


    // Đá trang trí

    for (
        let i = 0;
        i < 25;
        i++
    ) {

        const x =
            (i * 137) %
            canvas.width;

        const y =
            (i * 71) %
            canvas.height;


        ctx.fillStyle =
            "#171b18";


        ctx.fillRect(
            x,
            y,
            8,
            8
        );
    }


    // Tường

    ctx.fillStyle =
        "#151515";


    ctx.fillRect(
        0,
        0,
        canvas.width,
        18
    );


    ctx.fillRect(
        0,
        canvas.height - 18,
        canvas.width,
        18
    );


    ctx.fillRect(
        0,
        0,
        18,
        canvas.height
    );


    ctx.fillRect(
        canvas.width - 18,
        0,
        18,
        canvas.height
    );


    // Wave

    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "bold 18px Arial";


    ctx.fillText(
        "DUNGEON " +
        dungeonMap,
        35,
        45
    );
}


// ============================================================
// DRAW PLAYER
// ============================================================

function drawPlayer() {

    const x =
        Math.round(player.x);

    const y =
        Math.round(player.y);


    const walk =
        player.moving
            ? Math.sin(
                player.walkTime
            )
            : 0;


    const legLeft =
        walk * 6;

    const legRight =
        -walk * 6;


    const bob =
        player.moving
            ? Math.abs(
                Math.sin(
                    player.walkTime
                )
            ) * -2
            : Math.sin(
                animationTime * 3
            ) * -1;


    ctx.save();


    ctx.translate(
        x,
        y + bob
    );


    if (
        attackDirection < 0
    ) {

        ctx.scale(
            -1,
            1
        );
    }


    // =================
    // Bóng
    // =================

    ctx.fillStyle =
        "#1118";


    ctx.fillRect(
        -19,
        23,
        38,
        8
    );


    // =================
    // Chân
    // =================

    ctx.fillStyle =
        "#242424";


    // chân trái

    ctx.fillRect(
        -12 + legLeft,
        7,
        9,
        20
    );


    // chân phải

    ctx.fillRect(
        4 + legRight,
        7,
        9,
        20
    );


    // giày trái

    ctx.fillStyle =
        "#111";


    ctx.fillRect(
        -14 + legLeft,
        23,
        12,
        6
    );


    // giày phải

    ctx.fillRect(
        3 + legRight,
        23,
        12,
        6
    );


    // =================
    // Body
    // =================

    ctx.fillStyle =
        "#285db9";


    ctx.fillRect(
        -15,
        -10,
        30,
        25
    );


    // áo giáp

    ctx.fillStyle =
        "#3d79df";


    ctx.fillRect(
        -12,
        -7,
        24,
        16
    );


    // =================
    // Tay
    // =================

    const armSwing =
        player.moving
            ? walk * 4
            : 0;


    ctx.fillStyle =
        "#d99b68";


    // tay sau

    ctx.fillRect(
        11,
        -6 + armSwing,
        8,
        19
    );


    // tay trước

    ctx.fillRect(
        -19,
        -6 - armSwing,
        8,
        19
    );


    // =================
    // Head
    // =================

    ctx.fillStyle =
        "#dfa06e";


    ctx.fillRect(
        -13,
        -30,
        26,
        23
    );


    // tóc

    ctx.fillStyle =
        "#30221c";


    ctx.fillRect(
        -14,
        -32,
        28,
        8
    );


    ctx.fillRect(
        -13,
        -26,
        5,
        6
    );


    // mắt

    ctx.fillStyle =
        "#111";


    ctx.fillRect(
        5,
        -21,
        4,
        4
    );


    // =================
    // Kiếm
    // =================

    drawWeapon();


    ctx.restore();
}


// ============================================================
// DRAW WEAPON
// ============================================================

function drawWeapon() {

    let rotation = 0;


    if (
        attackAnimation > 0
    ) {

        const progress =
            1 -
            attackAnimation /
            14;


        rotation =
            -1.7 +
            progress *
            3.2;
    }


    ctx.save();


    ctx.translate(
        18,
        -3
    );


    ctx.rotate(
        rotation
    );


    if (
        player.weaponType === "bow"
    ) {

        // Cung

        ctx.strokeStyle =
            "#d39b48";

        ctx.lineWidth = 4;

        ctx.beginPath();

        ctx.arc(
            0,
            0,
            18,
            -1.1,
            1.1
        );

        ctx.stroke();


        ctx.strokeStyle =
            "#eee";

        ctx.lineWidth = 1;

        ctx.beginPath();

        ctx.moveTo(
            -7,
            -16
        );

        ctx.lineTo(
            -7,
            16
        );

        ctx.stroke();


    } else if (
        player.weaponType === "magic"
    ) {

        // Gậy phép

        ctx.fillStyle =
            "#70432c";


        ctx.fillRect(
            0,
            -2,
            35,
            5
        );


        ctx.fillStyle =
            "#b65cff";


        ctx.fillRect(
            29,
            -7,
            11,
            11
        );


    } else {

        // Kiếm

        ctx.fillStyle =
            "#e7e7e7";


        ctx.fillRect(
            0,
            -3,
            34,
            7
        );


        ctx.fillStyle =
            "#8a5b2d";


        ctx.fillRect(
            -2,
            5,
            12,
            5
        );


        if (
            player.weaponEffect ===
            "fire"
        ) {

            ctx.fillStyle =
                "#ff7118";


            ctx.fillRect(
                30,
                -8,
                8,
                8
            );


            ctx.fillStyle =
                "#ffe229";


            ctx.fillRect(
                36,
                -12,
                5,
                8
            );

        } else if (
            player.weaponEffect ===
            "ice"
        ) {

            ctx.fillStyle =
                "#72ddff";


            ctx.fillRect(
                30,
                -8,
                10,
                10
            );

        } else if (
            player.weaponEffect ===
            "lightning"
        ) {

            ctx.fillStyle =
                "#ffff42";


            ctx.fillRect(
                28,
                -10,
                6,
                6
            );

            ctx.fillRect(
                35,
                -3,
                6,
                6
            );
        }
    }


    ctx.restore();
}


// ============================================================
// SWORD SLASH EFFECT
// ============================================================

function createSlashEffect() {

    for (
        let i = 0;
        i < 7;
        i++
    ) {

        particles.push({

            x:
                player.x +
                attackDirection *
                25,

            y:
                player.y +
                (Math.random() - 0.5) *
                40,

            vx:
                attackDirection *
                (Math.random() * 3),

            vy:
                (Math.random() - 0.5) *
                3,

            life: 15,

            color:
                player.weaponEffect ===
                "fire"
                    ? "#ff7b18"
                    : "#ffffff",

            size: 4
        });
    }
}


// ============================================================
// DRAW ENEMIES
// ============================================================

function drawEnemy(enemy) {

    const x =
        Math.round(enemy.x);

    const y =
        Math.round(enemy.y);


    const bob =
        Math.sin(
            enemy.anim
        ) *
        2;


    ctx.save();

    ctx.translate(
        x,
        y + bob
    );


    // bóng

    ctx.fillStyle =
        "#1118";


    ctx.fillRect(
        -enemy.width / 2,
        enemy.height / 2,
        enemy.width,
        7
    );


    if (
        enemy.boss
    ) {

        drawBoss(enemy);

    } else if (
        enemy.type === "slime"
    ) {

        drawSlime(enemy);

    } else if (
        enemy.type === "orc"
    ) {

        drawOrc(enemy);

    } else {

        drawGoblin(enemy);
    }


    ctx.restore();


    // HP

    const barWidth =
        enemy.boss
            ? 90
            : enemy.width;


    ctx.fillStyle =
        "#111";


    ctx.fillRect(
        x -
            barWidth / 2,
        y -
            enemy.height / 2 -
            12,
        barWidth,
        6
    );


    ctx.fillStyle =
        enemy.boss
            ? "#d52e55"
            : "#e43b3b";


    ctx.fillRect(
        x -
            barWidth / 2,
        y -
            enemy.height / 2 -
            12,
        barWidth *
            (
                enemy.hp /
                enemy.maxHp
            ),
        6
    );
}


// ============================================================
// GOBLIN
// ============================================================

function drawGoblin() {

    ctx.fillStyle =
        "#6eb54a";


    ctx.fillRect(
        -14,
        -12,
        28,
        28
    );


    ctx.fillStyle =
        "#85ca59";


    ctx.fillRect(
        -11,
        -21,
        22,
        18
    );


    // tai

    ctx.fillStyle =
        "#5d9d3e";


    ctx.fillRect(
        -20,
        -18,
        8,
        8
    );


    ctx.fillRect(
        12,
        -18,
        8,
        8
    );


    // mắt

    ctx.fillStyle =
        "#ffe33d";


    ctx.fillRect(
        -7,
        -15,
        5,
        5
    );


    ctx.fillRect(
        3,
        -15,
        5,
        5
    );
}


// ============================================================
// SLIME
// ============================================================

function drawSlime() {

    ctx.fillStyle =
        "#53b7c9";


    ctx.fillRect(
        -18,
        -12,
        36,
        25
    );


    ctx.fillRect(
        -13,
        -18,
        26,
        10
    );


    ctx.fillStyle =
        "#102c32";


    ctx.fillRect(
        -9,
        -8,
        5,
        5
    );


    ctx.fillRect(
        5,
        -8,
        5,
        5
    );
}


// ============================================================
// ORC
// ============================================================

function drawOrc() {

    ctx.fillStyle =
        "#789d3f";


    ctx.fillRect(
        -21,
        -14,
        42,
        36
    );


    ctx.fillStyle =
        "#91b64e";


    ctx.fillRect(
        -17,
        -25,
        34,
        22
    );


    ctx.fillStyle =
        "#252525";


    ctx.fillRect(
        -13,
        -17,
        7,
        6
    );


    ctx.fillRect(
        6,
        -17,
        7,
        6
    );
}


// ============================================================
// BOSS
// ============================================================

function drawBoss() {

    const pulse =
        Math.sin(
            animationTime * 4
        ) * 2;


    ctx.fillStyle =
        "#76243c";


    ctx.fillRect(
        -38 - pulse,
        -38 - pulse,
        76 + pulse * 2,
        70 + pulse
    );


    // đầu

    ctx.fillStyle =
        "#9b3150";


    ctx.fillRect(
        -28,
        -50,
        56,
        38
    );


    // sừng

    ctx.fillStyle =
        "#e5d5b8";


    ctx.fillRect(
        -35,
        -60,
        10,
        20
    );


    ctx.fillRect(
        25,
        -60,
        10,
        20
    );


    // mắt

    ctx.fillStyle =
        "#ffff35";


    ctx.fillRect(
        -17,
        -35,
        9,
        7
    );


    ctx.fillRect(
        8,
        -35,
        9,
        7
    );


    // áo giáp

    ctx.fillStyle =
        "#33323d";


    ctx.fillRect(
        -30,
        -5,
        60,
        35
    );
}


// ============================================================
// DROPS DRAW
// ============================================================

function drawDrops() {

    for (const drop of drops) {

        drop.bob +=
            0.08;


        const bob =
            Math.sin(
                drop.bob
            ) * 4;


        ctx.font =
            "24px Arial";


        ctx.textAlign =
            "center";


        ctx.fillText(
            drop.item.icon,
            drop.x,
            drop.y + bob
        );


        ctx.textAlign =
            "left";
    }
}


// ============================================================
// PROJECTILE DRAW
// ============================================================

function drawProjectiles() {

    for (const p of projectiles) {

        if (
            p.type === "arrow"
        ) {

            ctx.fillStyle =
                "#e5bd68";


            ctx.fillRect(
                p.x - 12,
                p.y - 2,
                24,
                4
            );


            ctx.fillStyle =
                "#eee";


            ctx.fillRect(
                p.x + 8,
                p.y - 4,
                5,
                8
            );

        } else {

            ctx.fillStyle =
                "#b85cff";


            ctx.fillRect(
                p.x - 7,
                p.y - 7,
                14,
                14
            );


            ctx.fillStyle =
                "#efb3ff";


            ctx.fillRect(
                p.x - 3,
                p.y - 3,
                6,
                6
            );
        }
    }
}


// ============================================================
// PARTICLES
// ============================================================

function createHitParticles(
    x,
    y,
    color
) {

    for (
        let i = 0;
        i < 12;
        i++
    ) {

        particles.push({

            x,

            y,

            vx:
                (
                    Math.random() -
                    0.5
                ) * 5,

            vy:
                (
                    Math.random() -
                    0.5
                ) * 5,

            life:
                20 +
                Math.random() *
                20,

            color,

            size:
                Math.random() *
                4 +
                2
        });
    }
}


function hitParticles(
    x,
    y,
    color
) {

    createHitParticles(
        x,
        y,
        color
    );
}


function updateParticles(dt) {

    for (
        let i =
            particles.length - 1;
        i >= 0;
        i--
    ) {

        const p =
            particles[i];


        p.x +=
            p.vx *
            dt *
            60;

        p.y +=
            p.vy *
            dt *
            60;


        p.vy +=
            0.04;


        p.life -=
            dt * 60;


        if (
            p.life <= 0
        ) {

            particles.splice(
                i,
                1
            );
        }
    }
}


function drawParticles() {

    for (const p of particles) {

        ctx.globalAlpha =
            Math.max(
                0,
                p.life / 30
            );


        ctx.fillStyle =
            p.color;


        ctx.fillRect(
            p.x,
            p.y,
            p.size || 4,
            p.size || 4
        );
    }


    ctx.globalAlpha = 1;
}


// ============================================================
// FLOATING TEXT
// ============================================================

function floatingDamage(
    x,
    y,
    damage
) {

    floatingTexts.push({

        x,

        y,

        text:
            Math.floor(
                damage
            ),

        color:
            "#ffffff",

        life: 35
    });
}


function updateFloatingTexts(dt) {

    for (
        let i =
            floatingTexts.length - 1;
        i >= 0;
        i--
    ) {

        const text =
            floatingTexts[i];


        text.y -=
            25 *
            dt;


        text.life -=
            dt * 60;


        if (
            text.life <= 0
        ) {

            floatingTexts.splice(
                i,
                1
            );
        }
    }
}


function drawFloatingTexts() {

    ctx.textAlign =
        "center";


    ctx.font =
        "bold 16px Arial";


    for (
        const text of floatingTexts
    ) {

        ctx.globalAlpha =
            Math.max(
                0,
                text.life / 35
            );


        ctx.fillStyle =
            text.color;


        ctx.fillText(
            text.text,
            text.x,
            text.y
        );
    }


    ctx.globalAlpha = 1;

    ctx.textAlign =
        "left";
}


// ============================================================
// HUD
// ============================================================

function updateHUD() {

    const hp =
        Math.max(
            0,
            Math.min(
                player.hp,
                player.maxHp
            )
        );


    document.getElementById(
        "levelText"
    ).textContent =
        player.level;


    document.getElementById(
        "hpText"
    ).textContent =
        Math.ceil(hp);


    document.getElementById(
        "damageText"
    ).textContent =
        Math.floor(
            player.damage
        );


    document.getElementById(
        "goldText"
    ).textContent =
        player.gold;


    document.getElementById(
        "waveText"
    ).textContent =
        wave;


    document.getElementById(
        "hpBar"
    ).style.width =
        (
            hp /
            player.maxHp *
            100
        ) + "%";


    document.getElementById(
        "expBar"
    ).style.width =
        (
            player.exp /
            player.expNeed *
            100
        ) + "%";
}


// ============================================================
// COLLISION
// ============================================================

function distanceBetween(a, b) {

    const dx =
        a.x - b.x;

    const dy =
        a.y - b.y;


    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}


function circleCollision(
    x1,
    y1,
    r1,
    x2,
    y2,
    r2
) {

    const dx =
        x1 - x2;

    const dy =
        y1 - y2;


    return (
        dx * dx +
        dy * dy
    ) <
    (
        r1 + r2
    ) *
    (
        r1 + r2
    );
}


// ============================================================
// RANDOM SPAWN
// ============================================================

function randomEdgePosition() {

    const side =
        Math.floor(
            Math.random() * 4
        );


    if (
        side === 0
    ) {

        return {
            x: 35,
            y:
                Math.random() *
                (
                    canvas.height -
                    70
                ) + 35
        };

    }


    if (
        side === 1
    ) {

        return {
            x:
                canvas.width -
                35,

            y:
                Math.random() *
                (
                    canvas.height -
                    70
                ) + 35
        };

    }


    if (
        side === 2
    ) {

        return {
            x:
                Math.random() *
                (
                    canvas.width -
                    70
                ) + 35,

            y: 35
        };

    }


    return {

        x:
            Math.random() *
            (
                canvas.width -
                70
            ) + 35,

        y:
            canvas.height -
            35
    };
}


// ============================================================
// MAIN DRAW
// ============================================================

function drawGame() {

    ctx.save();


    if (
        screenShake > 0
    ) {

        ctx.translate(
            (
                Math.random() -
                0.5
            ) *
            screenShake,

            (
                Math.random() -
                0.5
            ) *
            screenShake
        );


        screenShake -=
            0.4;
    }


    drawBackground();

    drawDrops();

    drawProjectiles();

    for (
        const enemy of enemies
    ) {

        drawEnemy(enemy);
    }


    drawPlayer();

    drawParticles();

    drawFloatingTexts();


    ctx.restore();
}


// ============================================================
// GAME LOOP
// ============================================================

function gameLoop(timestamp) {

    const dt =
        Math.min(
            (
                timestamp -
                lastTime
            ) / 1000,

            0.033
        );


    lastTime =
        timestamp;


    animationTime += dt;


    if (
        gameRunning &&
        !paused
    ) {

        updatePlayer(dt);

        updateEnemies(dt);

        updateProjectiles(dt);

        updateParticles(dt);

        updateFloatingTexts(dt);

        collectDrops();

        updateHUD();

        drawGame();
    }


    requestAnimationFrame(
        gameLoop
    );
}


// ============================================================
// INITIALIZE
// ============================================================

player.moving = false;

player.walkTime = 0;

updateLobby();

updateHUD();

requestAnimationFrame(
    gameLoop
);
