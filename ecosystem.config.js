// PM2 process definitions for the VM deployment.
//
// One-time setup on the VM (see also the "Full Startup Procedure" in README):
//   npm install -g pm2
//   npm run build                 # frontend must be built before `next start`
//   pm2 start ecosystem.config.js
//   pm2 save                      # snapshot the process list
//   pm2 startup                   # then run the `sudo ...` line it prints
//
// After a code change:
//   git pull && npm run build && pm2 restart all
//
// Notes:
// - NEXT_PUBLIC_API_URL is baked in at BUILD time, so set it before `npm run build`.
// - Backend PORT must match the nginx upstream (5001 per README prod setup).
// - server/.env (DATABASE_URL, JWT secret) still loads via dotenv since cwd is ./server.
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './server',
      script: 'src/server.js', // run node directly for clean restarts
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
    },
    {
      name: 'frontend',
      cwd: './',
      script: 'node_modules/next/dist/bin/next', // point at the binary, not `npm`
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
