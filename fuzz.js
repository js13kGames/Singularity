#!/usr/bin/env node

const { Ship, Rules, AI } = require('./js/singularity');

const results = {};
let ship;

let max = parseInt(process.argv[2], 10);

if (isNaN(max)) {
  max = 1;
}

for (let i = 0; i < max; i += 1) {
  const ship = AI.create();
  Object.keys(ship.layout).forEach((id) => {
    if (ship.layout[id] === '') {
      ship.layout[id] = 'junction';
    }
  });
  const rescued = AI.rescued(ship).length;
  if (results[rescued] === undefined) {
    results[rescued] = 0;
  }
  results[rescued] += 1;
}

console.log('Rescued', results);
