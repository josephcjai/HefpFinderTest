const { spawn } = require('child_process');
const path = require('path');

const dest = path.resolve(__dirname, '../../temp_analysis');

console.log('=============================================');
console.log('SYNCING TEST ENVIRONMENT FROM REMOTE GIT');
console.log(`Target: ${dest}`);
console.log('=============================================');

function runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd, stdio: 'inherit', shell: true });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command "${command} ${args.join(' ')}" failed with code ${code}`));
        });
    });
}

(async () => {
    try {
        // 1. Stash any local changes (like debug logs) so pull succeeds
        console.log('\n[1/3] Stashing local changes...');
        await runCommand('git', ['stash'], dest);

        // 2. Pull latest code
        console.log('\n[2/3] Pulling latest code from origin/main...');
        await runCommand('git', ['pull', 'origin', 'main'], dest);

        // 3. Install dependencies (in case package.json changed)
        console.log('\n[3/3] Checking for dependency updates...');
        await runCommand('npm', ['install'], dest);

        console.log('\n=============================================');
        console.log('SUCCESS: Test environment updated from remote.');
        console.log('Please RESTART any running test servers (Port 4001/3001).');
        console.log('=============================================');
    } catch (error) {
        console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('FAILURE:', error.message);
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        process.exit(1);
    }
})();
