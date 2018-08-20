#!/usr/bin/env node

const { Ship, Rules } = require('./js/singularity');

const AI = {};

AI.playable = (ship, type) => {
  const valid = Object.keys(ship.layout).filter(id => ship.layout[id] === '');

  if (type === 'meteor') {
    return valid.filter(id => Rules.canAddMeteor(ship, id));
  }

  if (type === 'crew') {
    return valid.filter(id => Rules.canAddCrew(ship, id));
  }

  if (type === 'pod') {
    return valid.filter(id => Rules.canAddPod(ship, id));
  }

  const corridors = ['hall', 'corner', 'tee', 'junction'];
  if (corridors.indexOf(type) > -1) {
    return valid.filter(id => Rules.canAddCorridor(ship, id, type));
  }

  return valid;
};

AI.play = (ship, tile, type) => {
  if (type === 'meteor') {
    return Rules.addMeteor(ship, tile);
  }

  if (type === 'crew') {
    return Rules.addCrew(ship, tile);
  }

  if (type === 'pod') {
    return Rules.addPod(ship, tile);
  }

  const corridors = ['hall', 'corner', 'tee', 'junction'];
  if (corridors.indexOf(type) > -1) {
    return Rules.addCorridor(ship, type);
  }

  return Ship.clone(ship);
};

let calls = 0;
let checked = {};

AI.hash = (ship) => {
  let hash = '';

  Object.keys(ship.layout).sort().forEach((key) => {
    const value = ship.layout[key];
    if (value) {
      hash += key;
      hash += value;
    }
  });

  return hash;
};

AI.hflip = (ship) => {
  const rfiles = ship.files.slice().reverse();
  const rranks = ship.ranks.slice().reverse();

  let test = Ship.create();

  Object.keys(ship.layout).forEach((key) => {
    const value = ship.layout[key];
    const file = rfiles[ship.files.indexOf(key.slice(0, 1))];
    const rank = key.slice(-1);
    test = Ship.set(test, `${file}${rank}`, value);
  });

  return test;
};

AI.vflip = (ship) => {
  const rfiles = ship.files.slice().reverse();
  const rranks = ship.ranks.slice().reverse();

  let test = Ship.create();

  Object.keys(ship.layout).forEach((key) => {
    const value = ship.layout[key];
    const file = key.slice(0, 1);
    const rank = rranks[ship.ranks.indexOf(key.slice(-1))];
    test = Ship.set(test, `${file}${rank}`, value);
  });

  return test;
};

AI.xflip = ship => AI.vflip(AI.hflip(ship));

AI.rflip = (ship) => {
  const q1 = {
    'a1': 'a6',
    'b1': 'a5',
    'c1': 'a4',
    'a2': 'b6',
    'b2': 'b5',
    'c2': 'b4',
    'a3': 'c6',
    'b3': 'c5',
    'c3': 'c4',
  };

  const q2 = {
    'a4': 'd6',
    'b4': 'd5',
    'c4': 'd4',
    'a5': 'e6',
    'b5': 'e5',
    'c5': 'e4',
    'a6': 'f6',
    'b6': 'f5',
    'c6': 'f4',
  };

  const q3 = {
    'd4': 'd3',
    'e4': 'd2',
    'f4': 'd1',
    'd5': 'e3',
    'e5': 'e2',
    'f5': 'e1',
    'd6': 'f3',
    'e6': 'f2',
    'f6': 'f1',
  };

  const q4 = {
    'd1': 'a3',
    'e1': 'a2',
    'f1': 'a1',
    'd2': 'b3',
    'e2': 'b2',
    'f2': 'b1',
    'd3': 'c3',
    'e3': 'c2',
    'f3': 'c1',
  };

  let test = Ship.create();

  Object.keys(ship.layout).forEach((key) => {
    const value = ship.layout[key];
    let rkey = undefined;
    if (!rkey && q1[key]) {
      rkey = q1[key];
    }
    if (!rkey && q2[key]) {
      rkey = q2[key];
    }
    if (!rkey && q3[key]) {
      rkey = q3[key];
    }
    if (!rkey && q4[key]) {
      rkey = q4[key];
    }
    if (!rkey) {
      console.log('ERROR');
    }
    test = Ship.set(test, rkey, value);
  });

  return test;
};

AI.hashes = (ship) => {
  const hashes = {};
  let hash, test;

  hashes[AI.hash(ship)] = 1;

  test = AI.hflip(ship);
  hashes[AI.hash(test)] = 1;

  test = AI.vflip(ship);
  hashes[AI.hash(test)] = 1;

  test = AI.xflip(ship);
  hashes[AI.hash(test)] = 1;

  test = AI.rflip(ship);
  hashes[AI.hash(test)] = 1;

  test = AI.xflip(AI.rflip(ship));
  hashes[AI.hash(test)] = 1;

  return Object.keys(hashes);
};

AI.tested = (ship) => {
  const hashes = AI.hashes(ship);
  const unset = hashes.filter(id => !!!checked[id]);
  if (unset.length === hashes.length) {
    unset.forEach(id => checked[id] = 1);
    return false;
  }
  return true;
};

AI.fuzz = (ship, tiles) => {
  if (AI.tested(ship)) {
    return;
  }

  calls += 1;

  if (tiles.length < 1) {
    return;
  }

  const type = tiles[0];
  const playable = AI.playable(ship, type);

  if (playable.length < 1) {
    console.log('Unplayable!', ship.layout);
    return;
  }

  playable.forEach((tile) => {
    AI.fuzz(AI.play(ship, tile, type), tiles.slice(1));
  });
};

AI.fuzz(Ship.create(), ['meteor', 'meteor', 'meteor', 'crew', 'crew', 'pod']);
console.log(`Checked ${calls} layouts`);
