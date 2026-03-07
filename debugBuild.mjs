import { build } from 'vite';

process.on('exit', (code) => {
  console.log('Process exiting with code:', code);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

async function runBuild() {
  try {
    console.log('Starting Vite build programmatically...');
    await build({
      configFile: './vite.config.ts', // or use default
      mode: 'production',
      logLevel: 'error', // To reduce noise, or info to see exactly where it stops
    });
    console.log('Build completed!');
  } catch (error) {
    console.error('VITE BUILD CRASHED WITH ERROR:');
    console.error(error);
  }
}

runBuild();
