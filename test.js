#!/usr/bin/env node

const fs = require('fs');

const max = 13 * 1024;

fs.stat('singularity.zip', (err, stats) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const bytes = stats.size;
  const percent = Math.round((bytes * 100) / max);
  console.log(`${bytes} bytes (used ${percent}%)`);
  console.log(`${max - bytes} bytes remaining`);

  if (bytes > max) {
    console.error('zip file is too big!');
    process.exit(2);
  }
});
