#!/usr/bin/env node
import('../server/dist/cli.js').then(({ main }) => {
  main(process.argv).catch((err) => {
    console.error('Failed to start:', err);
    process.exit(1);
  });
});
