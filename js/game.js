let game;


// global game options
let gameOptions = {

    // platform speed range, in pixels per second
    platformSpeedRange: [300, 300],

    // spawn range, how far should be the rightmost platform from the right edge
    // before next platform spawns, in pixels
    spawnRange: [80, 300],

    // platform width range, in pixels
    platformSizeRange: [90, 300],

    // a height range between rightmost platform and next platform to be spawned
    platformHeightRange: [-5, 5],

    // a scale to be multiplied by platformHeightRange
    platformHeighScale: 20,

    // platform max and min height, as screen height ratio
    platformVerticalLimit: [0.4, 0.8],

    // player gravity
    playerGravity: 900,

    // player jump force
    jumpForce: 400,

    // player starting X position
    playerStartPosition: 200,

    // consecutive jumps allowed
    jumps: 2,

    // % of probability a bone appears on the platform
    bonePercent: 40
}

window.onload = function() {
    var start = confirm("A Dog's Dream!\nUse The Mouse to Jump and Collect Bones to Earn Points!\nBones Give Bonus Points!\nPress The OK Button to start");

    // object containing configuration options
    if (start) {
    let gameConfig = {
        type: Phaser.AUTO,
        width: 1334,
        height: 750,
        scene: [preloadGame, playGame],
        backgroundColor: 0x0c88c7,

        // physics settings (for use by Phaser)
        physics: {
            default: "arcade"
        }
    }
    game = new Phaser.Game(gameConfig);
    window.focus();
    resize();
    window.addEventListener("resize", resize, false);
    }
}

// preloadGame scene
class preloadGame extends Phaser.Scene{
    constructor(){
        super("PreloadGame");
    }
    preload(){
        this.load.image("platform", "imgs/platform.png");

        // player object
        this.load.spritesheet("player", "imgs/newDogFinal.png", {
            frameWidth:100,
            frameHeight:48
        });

        // the bone object
        this.load.spritesheet("bone", "imgs/bone.png", {
            frameWidth: 20,
            frameHeight: 20
        });
        this.load.image('sky', 'imgs/sky.jpg');
    }
    create(){

        this.add.image(400, 300, 'sky');
        

        // setting bone animation
        this.anims.create({
            key: "rotate",
            frames: this.anims.generateFrameNumbers("bone", {
                start: 0,
                end: 0
            }),
            frameRate: 15,
            yoyo: true,
            repeat: -1
        });

        this.scene.start("PlayGame");
    }
}

// playGame scene
class playGame extends Phaser.Scene{
     

    constructor(){
        super("PlayGame");
    }
    
    create(){
        this.score = 0;

        // keeping track of added platforms
        this.addedPlatforms = 0;

        // group with all active platforms.
        this.platformGroup = this.add.group({

            // once a platform is removed, it's added to the pool
            removeCallback: function(platform){
                platform.scene.platformPool.add(platform)
            }
        });

        // platform pool
        this.platformPool = this.add.group({

            // once a platform is removed from the pool, it's added to the active platforms group
            removeCallback: function(platform){
                platform.scene.platformGroup.add(platform)
            }
        });

        // group with all active bones.
        this.boneGroup = this.add.group({

            // once a bone is removed, it's added to the pool
            removeCallback: function(bone){
                bone.scene.bonePool.add(bone)
            }
        });

        // bone pool
        this.bonePool = this.add.group({

            // once a bone is removed from the pool, it's added to the active bones group
            removeCallback: function(bone){
                bone.scene.boneGroup.add(bone)
            }
        });

        // number of consecutive jumps made by the player so far
        this.playerJumps = 0;

        // adding a platform to the game, the arguments are platform width, x position and y position
        this.addPlatform(game.config.width, game.config.width / 2, game.config.height * gameOptions.platformVerticalLimit[1]);

        // adding the player;
        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height * 0.7, "player");
        this.player.setGravityY(gameOptions.playerGravity);

        // setting collisions between the player and the platform group
        this.physics.add.collider(this.player, this.platformGroup, null, null, this);

        // setting collisions between the player and the bone group
        this.physics.add.overlap(this.player, this.boneGroup, function(player, bone){
            this.tweens.add({
                targets: bone,
                y: bone.y - 100,
                alpha: 0,
                duration: 800,
                ease: "Cubic.easeOut",
                callbackScope: this,
                //Gives bonus score when bone is picked up
                onComplete: function(){
                    this.boneGroup.killAndHide(bone);
                    this.boneGroup.remove(bone);
                    this.score += 1000;
                    
                }
            });
        }, null, this);

        // checking for input
        this.input.on("pointerdown", this.jump, this);
    }

    // the core of the script: platform are added from the pool or created on the fly
    addPlatform(platformWidth, posX, posY){
        this.addedPlatforms ++;
        let platform;
        if(this.platformPool.getLength()){
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.y = posY;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
            let newRatio =  platformWidth / platform.displayWidth;
            platform.displayWidth = platformWidth;
            platform.tileScaleX = 1 / platform.scaleX;
        }
        else{
            platform = this.add.tileSprite(posX, posY, platformWidth, 32, "platform");
            this.physics.add.existing(platform);
            platform.body.setImmovable(true);
            platform.body.setVelocityX(Phaser.Math.Between(gameOptions.platformSpeedRange[0], gameOptions.platformSpeedRange[1]) * -1);
            this.platformGroup.add(platform);
        }
        this.nextPlatformDistance = Phaser.Math.Between(gameOptions.spawnRange[0], gameOptions.spawnRange[1]);

        // is there a bone over the platform?
        if(this.addedPlatforms > 1){
            if(Phaser.Math.Between(1, 100) <= gameOptions.bonePercent){
                if(this.bonePool.getLength()){
                    let bone = this.bonePool.getFirst();
                    bone.x = posX;
                    bone.y = posY - 96;
                    bone.alpha = 1;
                    bone.active = true;
                    bone.visible = true;
                    this.bonePool.remove(bone);
                }
                else{
                    let bone = this.physics.add.sprite(posX, posY - 96, "bone");
                    bone.setImmovable(true);
                    bone.setVelocityX(platform.body.velocity.x);
                    bone.anims.play("rotate");
                    this.boneGroup.add(bone);
                }
            }
        }
    }

    // the player jumps when on the ground, or once in the air as long as there are jumps left and the first jump was on the ground
    jump(){
        if(this.player.body.touching.down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps)){
            if(this.player.body.touching.down){
                this.playerJumps = 0;
            }
            this.player.setVelocityY(gameOptions.jumpForce * -1);
            this.playerJumps ++;

            // stops animation
            this.player.anims.stop();
        }
    }
    update(){
        
        //earn points as the game goes on
        
        setInterval(this.score++, 1000);
        
        // game over
        if(this.player.y > game.config.height){
            var restart = confirm("You Lost :(\nYour Score was: " + this.score +"\nPress Okay to Play Again or Exit the Window");
            if (restart) {
            this.scene.start("PlayGame");
            }
        }
        this.player.x = gameOptions.playerStartPosition;

        // pooling for platforms
        let minDistance = game.config.width;
        let rightmostPlatformHeight = 0;
        this.platformGroup.getChildren().forEach(function(platform){
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            if(platformDistance < minDistance){
                minDistance = platformDistance;
                rightmostPlatformHeight = platform.y;
            }
            if(platform.x < - platform.displayWidth / 2){
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        // pooling for bones
        this.boneGroup.getChildren().forEach(function(bone){
            if(bone.x < - bone.displayWidth / 2){
                this.boneGroup.killAndHide(bone);
                this.boneGroup.remove(bone);
            }
        }, this);

        // adding new platforms
        if(minDistance > this.nextPlatformDistance){
            let nextPlatformWidth = Phaser.Math.Between(gameOptions.platformSizeRange[0], gameOptions.platformSizeRange[1]);
            let platformRandomHeight = gameOptions.platformHeighScale * Phaser.Math.Between(gameOptions.platformHeightRange[0], gameOptions.platformHeightRange[1]);
            let nextPlatformGap = rightmostPlatformHeight + platformRandomHeight;
            let minPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[0];
            let maxPlatformHeight = game.config.height * gameOptions.platformVerticalLimit[1];
            let nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2, nextPlatformHeight);
        }
    }
    
};
function resize(){
    let canvas = document.querySelector("canvas");
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let windowRatio = windowWidth / windowHeight;
    let gameRatio = game.config.width / game.config.height;
    if(windowRatio < gameRatio){
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    }
    else{
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}
