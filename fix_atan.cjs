const fs = require('fs');

function fix(file) {
    let c = fs.readFileSync(file, 'utf8');
    
    // First, let's normalize everything back to the ORIGINAL state so we know where we stand.
    c = c.replace(/Math\.atan2\(-moveDir\.x, -moveDir\.z\)/g, 'Math.atan2(moveDir.x, moveDir.z)');
    c = c.replace(/Math\.atan2\(-dx, -dz\)/g, 'Math.atan2(dx, dz)');
    c = c.replace(/Math\.atan2\(-vx, -vz\)/g, 'Math.atan2(vx, vz)');
    c = c.replace(/Math\.atan2\(-\(tx - this\.x\), -\(tz - this\.z\)\)/g, 'Math.atan2(tx - this.x, tz - this.z)');

    // Now, apply the -A, -B inversion.
    // Replace all Math.atan2(A, B) where A, B are dx, dz, vx, vz etc.
    c = c.replace(/Math\.atan2\(dx, dz\)/g, 'Math.atan2(-dx, -dz)');
    c = c.replace(/Math\.atan2\(vx, vz\)/g, 'Math.atan2(-vx, -vz)');
    c = c.replace(/Math\.atan2\(moveDir\.x, moveDir\.z\)/g, 'Math.atan2(-moveDir.x, -moveDir.z)');
    c = c.replace(/Math\.atan2\(tx - this\.x, tz - this\.z\)/g, 'Math.atan2(-(tx - this.x), -(tz - this.z))');
    
    // At line 1611 (retreating), the original code was Math.atan2(-dx, -dz).
    // The normalization step above turned it into Math.atan2(dx, dz).
    // Then the inversion step turned it into Math.atan2(-dx, -dz).
    // Let's explicitly fix line 1611.
    // The retreating line looks like this:
    // let dir = _tmpVec3A.set(-dx, 0, -dz).normalize();
    // this.lastVelocity.set(dir.x * this.speed * 0.7, 0, dir.z * this.speed * 0.7);
    // this.lastTargetAngle = Math.atan2(-dx, -dz);
    
    // If we want them to face where they are running (away from enemy), we use dx, dz.
    // Let's replace the retreating atan2 block exactly:
    c = c.replace(
        /this\.lastVelocity\.set\(dir\.x \* this\.speed \* 0\.7, 0, dir\.z \* this\.speed \* 0\.7\);\s*this\.lastTargetAngle = Math\.atan2\(-dx, -dz\);/g,
        'this.lastVelocity.set(dir.x * this.speed * 0.7, 0, dir.z * this.speed * 0.7);\n                this.lastTargetAngle = Math.atan2(dx, dz);'
    );
    
    fs.writeFileSync(file, c);
}

fix('public/js/warrior.js');

function fixCatapult() {
    let c = fs.readFileSync('public/js/catapult.js', 'utf8');
    c = c.replace(/Math\.atan2\(moveDirX, moveDirZ\)/g, 'Math.atan2(-moveDirX, -moveDirZ)');
    fs.writeFileSync('public/js/catapult.js', c);
}
fixCatapult();

function fixAiCommander() {
    let c = fs.readFileSync('public/js/ai-commander.js', 'utf8');
    c = c.replace(/Math\.atan2\(dirX, dirZ\)/g, 'Math.atan2(-dirX, -dirZ)');
    fs.writeFileSync('public/js/ai-commander.js', c);
}
fixAiCommander();

console.log("Fixed all!");
