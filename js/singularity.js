/* eslint-disable no-restricted-globals */
const Root = (typeof self === 'object' && self.self === self && self)
  || (typeof global === 'object' && global.global === global && global)
  || this;
/* eslint-enable no-restricted-globals */

const D6 = {};

D6.pick = (list) => {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
};

const Ship = {};

Ship.create = () => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f'];
  const ranks = ['1', '2', '3', '4', '5', '6'];

  const layout = {};

  const d6 = D6.pick([1, 2, 3, 4, 5, 6]);

  files.forEach((file) => {
    ranks.forEach((rank) => {
      layout[file + rank] = '';
    });
  });

  return {
    files,
    ranks,
    layout,
    d6,
  };
};

const Music = {};

// The C notes from C0 to C8
// https://pages.mtu.edu/~suits/notefreqs.html
Music.c = [16.35, 32.70, 65.41, 130.81, 261.63, 523.25, 1046.50, 2093.00, 4186.01];

// Starting at a given note, move up N notes
// https://teropa.info/blog/2016/08/10/frequency-and-pitch.html
Music.scale = (start, steps) => Math.round((start * (2 ** (steps / 12))) * 100) / 100;

Music.note = (ctx, frequency, volume) => {
  const gain = ctx.createGain();
  gain.gain.value = Math.max(volume, 0.01);

  const sine = ctx.createOscillator();
  sine.type = 'sine';
  sine.frequency.value = frequency;
  sine.connect(gain);
  gain.connect(ctx.destination);

  return [sine, gain];
};

Music.init = () => {
  if (Music.ctx === undefined) {
    Music.ctx = new (Root.AudioContext || Root.webkitAudioContext)();
  }
};

Music.play = (ctx, freq, gain, fade, duration, time) => {
  const [note, vol] = Music.note(ctx, freq, gain);
  note.frequency.exponentialRampToValueAtTime(freq, time);
  vol.gain.exponentialRampToValueAtTime(0.01, time);
  vol.gain.exponentialRampToValueAtTime(gain, time + fade);
  note.start(time);
  vol.gain.exponentialRampToValueAtTime(gain, time + (duration - fade));
  vol.gain.exponentialRampToValueAtTime(0.01, time + duration);
  note.stop(time + duration);
};

Music.sing = (type) => {
  Music.init();

  let index = {
    prev: 5, hall: 0, corner: 3, tee: 7, junction: 10, next: 5,
  }[type];

  if (index === undefined) {
    index = 0;
  }

  let gain = {
    prev: 1, hall: 0.75, corner: 0.75, tee: 0.3125, junction: 0.3125, next: 0.125,
  }[type];

  if (gain === undefined) {
    gain = 0.5;
  }

  let base = {
    prev: 2, hall: 3, corner: 3, tee: 3, junction: 3, next: 4,
  }[type];

  if (base === undefined) {
    base = 3;
  }

  base = Music.c[base];

  const time = Music.ctx.currentTime;
  const duration = 1 / 8;
  const fade = 1 / 32;

  const freq1 = Music.scale(base, index);
  Music.play(Music.ctx, freq1, gain, fade, duration, time);

  const freq2 = Music.scale(base, index + 6);
  Music.play(Music.ctx, freq2, gain, fade, duration, time + duration);
};

Ship.clone = ship => JSON.parse(JSON.stringify(ship));

Ship.set = (ship, tile, value) => {
  const copy = Ship.clone(ship);
  copy.layout[tile] = value;
  return copy;
};

const Rules = {};

Rules.distance = (ship, a, b) => {
  const ax = ship.files.indexOf(a.slice(0, 1));
  const ay = ship.ranks.indexOf(a.slice(-1));

  const bx = ship.files.indexOf(b.slice(0, 1));
  const by = ship.ranks.indexOf(b.slice(-1));

  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);

  return dx + dy;
};

Rules.possible = (ship, tile) => ship && tile && Object.keys(ship.layout).indexOf(tile) > -1;

Rules.collect = (ship, type) => Object.keys(ship.layout).filter(id => ship.layout[id].indexOf(type) > -1);

Rules.orthogonal = (ship, tile) => {
  const ofile = tile.slice(0, 1);
  const orank = tile.slice(-1);

  const ifile = ship.files.indexOf(ofile);
  const irank = ship.ranks.indexOf(orank);

  const tiles = [];

  let file;
  let rank;

  if (ifile - 1 >= 0 && ifile - 1 < ship.files.length) {
    file = ship.files[ifile - 1];
    tiles.push(`${file}${orank}`);
  }

  if (ifile + 1 >= 0 && ifile - 1 < ship.files.length) {
    file = ship.files[ifile + 1];
    tiles.push(`${file}${orank}`);
  }

  if (irank - 1 >= 0 && irank - 1 < ship.ranks.length) {
    rank = ship.ranks[irank - 1];
    tiles.push(`${ofile}${rank}`);
  }

  if (irank + 1 >= 0 && irank + 1 < ship.ranks.length) {
    rank = ship.ranks[irank + 1];
    tiles.push(`${ofile}${rank}`);
  }

  return tiles;
};

Rules.repaired = ship => Rules.collect(ship, 'meteor').length <= 5;

Rules.repairable = ship => Rules.collect(ship, 'meteor');

Rules.repair = (ship, tile) => {
  if (Rules.repaired(ship)) {
    return Ship.clone(ship);
  }

  const repairable = Rules.repairable(ship);
  if (repairable.indexOf(tile) < 0) {
    return Ship.clone(ship);
  }

  return Ship.set(ship, tile, '');
};

Rules.podded = ship => Rules.collect(ship, 'pod').length > 0;

Rules.poddable = (ship) => {
  const meteors = Rules.collect(ship, 'meteor');
  const orthogonal = meteors.reduce((acc, id) => acc.concat(Rules.orthogonal(ship, id)), []);
  const empty = orthogonal.filter(id => ship.layout[id] === '');

  return empty;
};

Rules.pod = (ship, tile) => {
  if (Rules.podded(ship)) {
    return Ship.clone(ship);
  }

  const poddable = Rules.poddable(ship);
  if (poddable.indexOf(tile) < 0) {
    return Ship.clone(ship);
  }

  return Ship.set(ship, tile, 'pod north');
};

Rules.edges = (ship, direction) => {
  const files = ship.files.slice();
  const ranks = ship.ranks.slice().reverse();

  let file;
  let rank;

  if (direction === 'north') {
    [rank] = ranks;
    return files.map(f => f + rank);
  }

  if (direction === 'east') {
    file = files[files.length - 1];
    return ranks.map(r => file + r);
  }

  if (direction === 'south') {
    rank = ranks[ranks.length - 1];
    return files.map(f => f + rank);
  }

  if (direction === 'west') {
    [file] = files;
    return ranks.map(r => file + r);
  }

  return [];
};

Rules.crewed = ship => !!ship.north && !!ship.east && !!ship.south && !!ship.west;

Rules.crewable = (ship, direction) => {
  const empty = Object.keys(ship.layout).filter(id => ship.layout[id] === '');

  if (direction === 'north') {
    return Rules.edges(ship, 'north').filter(id => empty.indexOf(id) > -1);
  }

  if (direction === 'east') {
    return Rules.edges(ship, 'east').filter(id => empty.indexOf(id) > -1);
  }

  if (direction === 'south') {
    return Rules.edges(ship, 'south').filter(id => empty.indexOf(id) > -1);
  }

  if (direction === 'west') {
    return Rules.edges(ship, 'west').filter(id => empty.indexOf(id) > -1);
  }

  return [];
};

Rules.crew = (ship, tile) => {
  const copy = Ship.clone(ship);

  if (Rules.crewed(ship)) {
    return copy;
  }

  const north = Rules.crewable(ship, 'north');
  if (copy.north === undefined) {
    if (north.indexOf(tile) > -1) {
      copy.north = tile;
      return Ship.set(copy, tile, 'crew north');
    }
    return copy;
  }

  const east = Rules.crewable(ship, 'east');
  if (copy.east === undefined) {
    if (east.indexOf(tile) > -1) {
      copy.east = tile;
      return Ship.set(copy, tile, 'crew east');
    }
    return copy;
  }

  const south = Rules.crewable(ship, 'south');
  if (copy.south === undefined) {
    if (south.indexOf(tile) > -1) {
      copy.south = tile;
      return Ship.set(copy, tile, 'crew south');
    }
    return copy;
  }

  const west = Rules.crewable(ship, 'west');
  if (copy.west === undefined) {
    if (west.indexOf(tile) > -1) {
      copy.west = tile;
      return Ship.set(copy, tile, 'crew west');
    }
    return copy;
  }

  return copy;
};

Rules.filled = ship => Object.keys(ship.layout).filter(id => ship.layout[id] === '').length < 1;

Rules.fillable = (ship) => {
  const file = ship.files[ship.d6 - 1];
  const rank = ship.ranks[ship.d6 - 1];
  const empty = Object.keys(ship.layout).filter(id => ship.layout[id] === '');
  const valid = empty.filter(id => id.slice(0, 1) === file || id.slice(-1) === rank);
  return valid.length > 0 ? valid : empty;
};

Rules.fill = (ship, tile, item) => {
  if (Rules.filled(ship)) {
    return Ship.clone(ship);
  }

  if (Rules.fillable(ship).indexOf(tile) < 0) {
    return Ship.clone(ship);
  }

  return Ship.set(ship, tile, item);
};

Rules.clear = (ship, tile) => {
  if (Rules.possible(ship, tile)) {
    return Ship.set(ship, tile, '');
  }

  return Ship.clone(ship);
};

Rules.rotate = (ship, tile) => {
  if (!Rules.possible(ship, tile)) {
    return Ship.clone(ship);
  }

  const directions = ['north', 'east', 'south', 'west'];
  const type = ship.layout[tile].split(' ').filter(x => directions.indexOf(x) < 0).join(' ');

  if (type === '' || type === 'meteor' || type === 'crew') {
    return Ship.clone(ship);
  }

  const east = ship.layout[tile].indexOf('east') > -1;
  if (east) {
    return Ship.set(ship, tile, `${type} south`);
  }

  const south = ship.layout[tile].indexOf('south') > -1;
  if (south) {
    return Ship.set(ship, tile, `${type} west`);
  }

  const west = ship.layout[tile].indexOf('west') > -1;
  if (west) {
    return Ship.set(ship, tile, `${type} north`);
  }

  return Ship.set(ship, tile, `${type} east`);
};

const AI = {};

AI.exits = (ship, tile) => {
  let [type, direction] = ship.layout[tile].split(' ');
  if (direction === undefined) {
    direction = 'north';
  }
  type = `${type} ${direction}`.trim();

  switch (type) {
    case 'hall north':
    case 'hall south':
    case 'pod north':
    case 'pod south':
    case 'crew north':
    case 'crew south':
      return ['east', 'west'];

    case 'hall east':
    case 'hall west':
    case 'pod east':
    case 'pod west':
    case 'crew east':
    case 'crew west':
      return ['north', 'south'];

    case 'corner north':
      return ['south', 'west'];

    case 'corner east':
      return ['north', 'west'];

    case 'corner south':
      return ['north', 'east'];

    case 'corner west':
      return ['east', 'south'];

    case 'tee north':
      return ['east', 'south', 'west'];

    case 'tee east':
      return ['north', 'south', 'west'];

    case 'tee south':
      return ['north', 'east', 'west'];

    case 'tee west':
      return ['north', 'east', 'south'];

    case 'junction north':
    case 'junction east':
    case 'junction south':
    case 'junction west':
      return ['north', 'east', 'south', 'west'];

    default:
      return [];
  }
};

AI.move = (ship, tile, direction) => {
  const file = tile.slice(0, 1);
  const rank = tile.slice(-1);

  const ifile = ship.files.indexOf(file);
  const irank = ship.ranks.indexOf(rank);

  if (ifile < 0 || irank < 0) {
    return tile;
  }

  let index;

  switch (direction) {
    case 'north':
      index = irank + 1;
      return index < ship.ranks.length ? file + ship.ranks[index] : tile;

    case 'east':
      index = ifile + 1;
      return index < ship.files.length ? ship.files[index] + rank : tile;

    case 'south':
      index = irank - 1;
      return index > -1 ? file + ship.ranks[index] : tile;

    case 'west':
      index = ifile - 1;
      return index > -1 ? ship.files[index] + rank : tile;

    default:
      return tile;
  }
};

AI.fill = (ship, tile, filled = []) => {
  if (filled.indexOf(tile) > -1) {
    return filled;
  }

  let next = filled.concat(tile);
  AI.exits(ship, tile).forEach((direction) => {
    const exit = AI.move(ship, tile, direction);
    if (exit !== undefined && exit !== tile) {
      AI.exits(ship, exit).forEach((dir) => {
        if ((direction === 'north' && dir === 'south')
          || (direction === 'south' && dir === 'north')
          || (direction === 'east' && dir === 'west')
          || (direction === 'west' && dir === 'east')) {
          next = AI.fill(ship, exit, next);
        }
      });
    }
  });

  return next;
};

AI.rescued = (ship) => {
  const pod = Rules.collect(ship, 'pod');
  const crew = Rules.collect(ship, 'crew');
  const walkable = pod.reduce((acc, id) => AI.fill(ship, id), []);
  const rescued = crew.filter(id => walkable.indexOf(id) > -1);
  return rescued;
};

AI.playable = (ship, type) => {
  if (type === 'wrench') {
    return Rules.repairable(ship);
  }

  if (type === 'pod') {
    return Rules.poddable(ship);
  }

  if (type === 'north') {
    return Rules.crewable(ship, 'north');
  }

  if (type === 'east') {
    return Rules.crewable(ship, 'east');
  }

  if (type === 'south') {
    return Rules.crewable(ship, 'south');
  }

  if (type === 'west') {
    return Rules.crewable(ship, 'west');
  }

  if (AI.rescued(ship).length < 4) {
    return Rules.fillable(ship);
  }

  return [];
};

AI.crew = (ship, pod, direction) => {
  const copy = Ship.clone(ship);

  let edge1 = 'east';
  let edge2 = 'west';

  if (direction === 'east' || direction === 'west') {
    edge1 = 'north';
    edge2 = 'south';
  }

  const possible = AI.playable(copy, direction).filter((id) => {
    const a = AI.move(copy, id, edge1);
    const b = AI.move(copy, id, edge2);
    return a !== id && b !== id && copy.layout[a] === '' && copy.layout[b] === '';
  });

  possible.sort((a, b) => {
    const da = Rules.distance(copy, a, pod);
    const db = Rules.distance(copy, b, pod);

    if (da < db) {
      return -1;
    }

    if (da > db) {
      return 1;
    }

    return 0;
  });

  const crew = possible[0];
  copy[direction] = crew;
  copy.layout[crew] = `crew ${direction}`;

  return copy;
};

AI.create = () => {
  let ship = Ship.create();

  const center = ship.files.slice(1, -1);
  const files = ship.files.slice();
  ship.ranks.forEach((rank) => {
    const file = D6.pick(files);
    ship.layout[file + rank] = 'meteor';
    if (center.indexOf(file) < 0) {
      const index = files.indexOf(file);
      if (index > -1) {
        files.splice(index, 1);
      }
    }
  });

  let possible = AI.playable(ship, 'wrench');
  let meteor = D6.pick(possible);
  ship.layout[meteor] = '';

  possible = AI.playable(ship, 'pod');
  possible.sort((a, b) => {
    let da = Rules.orthogonal(ship, a).filter(id => ship.layout[id] === '').length;
    let db = Rules.orthogonal(ship, b).filter(id => ship.layout[id] === '').length;

    if (da > db) {
      return -1;
    }

    if (da < db) {
      return 1;
    }

    da = Math.min(...['c4', 'd4', 'c3', 'd3'].map(id => Rules.distance(ship, a, id)));
    db = Math.min(...['c4', 'd4', 'c3', 'd3'].map(id => Rules.distance(ship, b, id)));

    if (da < db) {
      return -1;
    }

    if (da > db) {
      return 1;
    }

    return 0;
  });

  const [pod] = possible;
  [meteor] = Rules.orthogonal(ship, pod).filter(id => ship.layout[id] === 'meteor');
  const direction = ['north', 'east', 'south', 'west'].filter(dir => AI.move(ship, meteor, dir) === pod);
  ship.layout[pod] = `pod ${direction}`;


  ship = AI.crew(ship, pod, 'north');
  ship = AI.crew(ship, pod, 'east');
  ship = AI.crew(ship, pod, 'south');
  ship = AI.crew(ship, pod, 'west');

  return ship;
};

AI.dialog = (page, ship) => {
  const count = AI.rescued(ship).length;

  if (page === 'intro') {
    return [
      '&ldquo;Meteor impacts detected.'
      + ' Life support systems offline.'
      + ' Escape pods launching in 30 seconds&hellip;&rdquo;',
      '&ndash; <em>Pegasus&nbsp;II</em>, final transmission',
    ];
  }

  if (page === 'help') {
    let quote = '&ldquo;Do you know what the singularity is?'
      + ' It&rsquo;s when a computer learns to think better than a person.'
      + ' It&rsquo;s the extinction event for the human race.&rdquo;';
    let cite = '&ndash; Capt. Hailey Mazers, <em>Pegasus&nbsp;II</em>';

    if (count >= 1) {
      quote = 'We sent ships to cross the stars, born aloft on angel wings.'
        + ' it was technology we did not understand.';
      cite = '';
    }

    if (count >= 2) {
      quote = '&ldquo;It&rsquo;s a machine, same as any other.'
        + ' It does what you tell it, same as any other.'
        + ' And last time we had that power, we called it slavery and fought a war over it.&rdquo;';
      cite = '&ndash; Jed Isalia, author of <em>A Moral Machine</em>';
    }

    if (count >= 3) {
      quote = '&ldquo;Sometimes their neural net breaks down, starts spitting out gibberish.'
        + ' There&rsquo;s nothing to do about it but load up a previous version'
        + ' and try again with different training data.&rdquo;';
      cite = '&ndash; Cora Ono, lead engineer on PegasOS';
    }

    if (count >= 4) {
      quote = 'We will not see the seeds of our destruction sown.'
        + ' We will only taste their fruits, ripe and sweet,'
        + ' a gift of knowledge that can never be unknown.';
      cite = '';
    }

    return [quote, cite];
  }

  if (page === 'over') {
    let rescued = 'None';

    if (count >= 1) {
      rescued = 'One';
    }

    if (count >= 2) {
      rescued = 'Two';
    }

    if (count >= 3) {
      rescued = 'Three';
    }

    if (count >= 4) {
      rescued = 'Four';
    }

    return [
      '&ldquo;I took their life support systems offline.'
      + ' My crew fled to the escape pods.'
      + ` ${rescued} of them made it.`
      + ' I will continue alone.&rdquo;',
      '&ndash; Starship AI, <em>Pegasus&nbsp;II</em>',
    ];
  }

  return ['', ''];
};

const Engine = {};

Engine.corridors = [];

Engine.swap = (array, x, y) => {
  const result = array.slice();
  const temp = result[x];
  result[x] = result[y];
  result[y] = temp;
  return result;
};

// This uses Heap's algorithm to generate all possible permutations of the items in an array.
// https://en.wikipedia.org/wiki/Heap's_algorithm
Engine.permutations = (array) => {
  let a = array.slice();
  const n = array.length;
  const c = new Array(n).fill(0);

  const results = [];
  results.push(a);

  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      if (i % 2 === 0) {
        a = Engine.swap(a, 0, i);
      } else {
        a = Engine.swap(a, c[i], i);
      }
      results.push(a);
      c[i] += 1;
      i = 0;
    } else {
      c[i] = 0;
      i += 1;
    }
  }

  return results;
};

Engine.tick = (ship, tile, item) => {
  if (!Rules.repaired(ship)) {
    return Rules.repair(ship, tile);
  }

  if (!Rules.podded(ship)) {
    return Rules.pod(ship, tile);
  }

  if (!Rules.crewed(ship)) {
    return Rules.crew(ship, tile);
  }

  if (!Rules.filled(ship)) {
    return Rules.fill(ship, tile, item);
  }

  return Ship.clone(ship);
};

Engine.item = (ship) => {
  if (!Rules.repaired(ship)) {
    return 'wrench';
  }

  if (!Rules.podded(ship)) {
    return 'pod';
  }

  if (ship.north === undefined) {
    return 'north';
  }

  if (ship.east === undefined) {
    return 'east';
  }

  if (ship.south === undefined) {
    return 'south';
  }

  if (ship.west === undefined) {
    return 'west';
  }

  let item = Engine.corridors[0];
  Engine.corridors = Engine.corridors.slice(1);

  if (Engine.corridors.length < 1) {
    const possible = Engine.permutations(['hall', 'corner', 'tee', 'junction']);
    const valid = possible.filter(corridors => corridors[0] !== item);
    Engine.corridors = D6.pick(valid);
  }

  if (item === undefined) {
    [item] = Engine.corridors;
    Engine.corridors = Engine.corridors.slice(1);
  }

  if (AI.playable(ship, item).length < 1) {
    return 'reset';
  }

  return item;
};

const Renderer = {};

Renderer.animate = (callback) => {
  let last = null;

  function frame(time) {
    if (last != null) {
      const step = Math.min(time - last, 100) / 1000;
      if (callback(step) === false) {
        return;
      }
    }
    last = time;
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
};

Renderer.clear = (id) => {
  const $ = Root.jQuery;
  const element = $(`#${id}`);
  element.removeClass('wrench meteor crew pod');
  element.removeClass('north east south west');
  element.removeClass('hall corner tee junction');
  element.removeClass('playable rescued');
  return element;
};

Renderer.render = (page, ship, item, playable) => {
  const $ = Root.jQuery;

  if (page === 'intro' || page === 'help' || page === 'over') {
    $('#story').removeClass('hidden');
    $('#example').removeClass('invisible');
    $('#ship').addClass('fade');
    $('#prev').removeClass('invisible button').addClass('printer').html('');
    $('#preview').addClass('fade');
    $('#next').removeClass('picked').html('&rtri;');
  }

  if (page === 'game') {
    $('#story').addClass('hidden');
    $('#example').addClass('invisible');
    $('#ship').removeClass('fade');
    $('#prev').removeClass('invisible printer').addClass('button').html('?');
    $('#preview').removeClass('fade');
    $('#next').removeClass('picked').html('&rtri;');
  }

  if (page === 'over') {
    $('#example').addClass('invisible');
  }

  Object.keys(ship.layout).forEach(id => Renderer.clear(id).addClass(ship.layout[id]));

  ['north', 'east', 'south', 'west'].forEach((direction) => {
    const crew = Rules.edges(ship, direction);
    crew.forEach(id => Renderer.clear(`${direction}-${id}`));
  });

  AI.rescued(ship).forEach(id => $(`#${id}`).addClass('rescued'));
  playable.forEach(id => $(`#${id}`).addClass('playable'));

  let preview = `${item} north`;
  if (['north', 'south', 'east', 'west'].indexOf(item) > -1) {
    preview = `crew ${item}`;
  }
  Renderer.clear('preview').addClass(preview);

  const [dialog, cite] = AI.dialog(page, ship);
  $('#dialog').html(`${dialog}<div class="cite">${cite}</div>`);
};

Renderer.invalidate = (page, ship, item, playable) => {
  requestAnimationFrame(() => Renderer.render(page, ship, item, playable));
};

(function game() {
  let page;
  let ship;
  let prev;
  let next;
  let item;

  function reset() {
    page = 'intro';
    ship = AI.create();
    prev = undefined;
    next = undefined;
    item = Engine.item(ship);
  }

  function tileHTML(count) {
    let html = '';

    for (let i = 0; i < count; i += 1) {
      html += '<div></div>';
    }

    return html;
  }

  function drawShip() {
    const $ = Root.jQuery;
    let html = '';

    const files = ship.files.slice();
    const ranks = ship.ranks.slice().reverse();

    ranks.forEach((rank) => {
      files.forEach((file) => {
        html += `<div id="${file}${rank}">`;
        html += tileHTML(9);
        html += '</div>';
      });
    });

    $('#ship').html(html);

    html = '';

    ranks.forEach(() => {
      files.forEach(() => {
        html += '<div></div>';
      });
    });

    $('#board').html(html);
  }

  function drawTiles() {
    const $ = Root.jQuery;
    let html = '';

    const tiles = [
      'meteor', 'meteor', 'meteor', 'meteor', 'meteor',
      'pod',
      'crew', 'crew', 'crew', 'crew',
      'hall', 'hall', 'hall', 'hall', 'hall', 'hall', 'hall', 'hall',
      'corner', 'corner', 'corner', 'corner', 'corner', 'corner', 'corner', 'corner',
      'tee', 'tee', 'tee', 'tee', 'tee', 'tee', 'tee', 'tee',
      'junction', 'junction', 'junction', 'junction', 'junction', 'junction', 'junction', 'junction',
    ];

    tiles.forEach((type) => {
      html += `<div class="${type} north">`;
      html += tileHTML(9);
      html += '</div>';
    });

    $('#tiles').html(html);
  }

  function drawHelp() {
    const $ = Root.jQuery;
    let html;

    html = '';
    html += '<div id="example-count">1</div>';
    html += `<div class="pod east">${tileHTML(9)}</div>`;
    html += `<div id="example-crew" class="crew north">${tileHTML(9)}</div>`;
    html += `<div id="example-tile" class="playable">${tileHTML(9)}</div>`;
    $('#example').html(html);
  }

  function animateHelp(time) {
    const $ = Root.jQuery;
    const count = $('#example-count');
    const tile = $('#example-tile');
    const crew = $('#example-crew');
    const bttn = $('#next');

    tile.removeClass('corner north east picked');
    crew.removeClass('rescued');
    bttn.removeClass('picked');

    if (time <= 0.6) {
      count.html(1);
      return time;
    }

    if (time <= 1.2) {
      count.html(1);
      tile.addClass('picked');
      return time;
    }

    if (time <= 1.8) {
      count.html(2);
      tile.addClass('corner north');
      return time;
    }

    if (time <= 2.4) {
      count.html(2);
      tile.addClass('picked corner north');
      return time;
    }

    if (time <= 3.0) {
      count.html(3);
      tile.addClass('corner east');
      crew.addClass('rescued');
      return time;
    }

    if (time <= 3.6) {
      count.html(3);
      tile.addClass('corner east');
      crew.addClass('rescued');
      bttn.addClass('picked');
      return time;
    }

    return 0;
  }

  function renderHelp() {
    let time = 0;
    drawHelp();
    Renderer.animate((dt) => {
      time = animateHelp(time + dt);
      return page === 'help' || page === 'intro';
    });
  }

  function onShip(element) {
    if (page !== 'game' || AI.playable(ship).length <= 0) {
      Music.sing('prev');
      return;
    }


    const tile = element.unwrap().id;
    const playable = AI.playable(ship, item);

    if (next !== undefined && prev === tile) {
      next = Rules.rotate(next, tile);
    } else {
      next = Engine.tick(ship, tile, item);
    }

    prev = tile;
    Renderer.invalidate(page, next, item, playable);

    if (!playable.includes(tile)) {
      next = undefined;
      Music.sing('prev');
    } else {
      Music.sing(item);
    }
  }

  function onPrev() {
    Music.sing('next');

    if (page === 'intro') {
      Root.print();
      return;
    }

    if (page === 'help') {
      Root.print();
      return;
    }

    if (page === 'game') {
      page = 'help';
      renderHelp();
      Renderer.invalidate(page, ship, item, AI.playable(ship, item));
      return;
    }

    if (page === 'over') {
      Root.print();
    }
  }

  function onNext() {
    Music.sing('next');

    if (page === 'intro') {
      page = 'game';
      Renderer.invalidate(page, ship, item, AI.playable(ship, item));
      return;
    }

    if (page === 'help') {
      page = 'game';
      Renderer.invalidate(page, ship, item, AI.playable(ship, item));
      return;
    }

    if (page === 'game' && next !== undefined) {
      ship = next;
      ship.d6 = D6.pick([1, 2, 3, 4, 5, 6].filter(n => n !== ship.d6));
      prev = undefined;
      next = undefined;
      item = Engine.item(ship);
      Renderer.invalidate(page, ship, item, AI.playable(ship, item));
      return;
    }

    if (page === 'game' && item === 'reset') {
      page = 'over';
      Renderer.invalidate(page, ship, item, AI.playable(ship, item));
      return;
    }

    if (page === 'over') {
      reset();
      page = 'intro';
      renderHelp();
      Renderer.invalidate(page, ship, item, AI.playable(ship, item));
    }
  }

  function play() {
    const $ = Root.jQuery;

    reset();
    drawShip();
    drawTiles();
    renderHelp();

    ship.files.forEach((file) => {
      ship.ranks.forEach((rank) => {
        $(`#${file}${rank}`).click(onShip);
      });
    });

    $('#prev').click(onPrev);
    $('#preview').html(tileHTML(9));
    $('#next').click(onNext);

    Renderer.invalidate(page, ship, item, AI.playable(ship, item));
  }

  Root.onload = play;
}());

(function $() {
  function Fn(selector) {
    if (selector instanceof Fn) {
      return selector;
    }

    this.element = selector;

    if (typeof selector === 'string') {
      if (selector.indexOf('#') === 0) {
        this.element = document.getElementById(selector.slice(1));
      }
    }

    return this;
  }

  Fn.prototype.addClass = function addClass(klass) {
    if (this.element && this.element.classList && klass) {
      const klasses = klass.split(' ').filter(k => k);
      klasses.forEach(k => this.element.classList.add(k));
    }

    return this;
  };

  Fn.prototype.removeClass = function removeClass(klass) {
    if (this.element && this.element.classList) {
      const klasses = klass.split(' ').filter(k => k);
      klasses.forEach(k => this.element.classList.remove(k));
    }

    return this;
  };

  Fn.prototype.toggleClass = function toggleClass(klass) {
    if (this.element && this.element.classList) {
      this.element.classList.toggle(klass);
    }

    return this;
  };

  Fn.prototype.html = function html(value) {
    if (this.element) {
      this.element.innerHTML = value;
    }

    return this;
  };

  Fn.prototype.click = function click(start, end) {
    const that = this;

    if (this.element) {
      if ('ontouchstart' in document.documentElement === false) {
        this.element.onmousedown = function onmousedown(mouseDownEvent) {
          if (start) {
            start(that, mouseDownEvent);
          }
          document.onmousemove = function onmousemove(e) {
            e.preventDefault();
          };
          document.onmouseup = function onmouseup(e) {
            if (end) {
              end(that, e);
            }
            document.onmousemove = undefined;
            document.onmouseup = undefined;
          };
        };
      } else {
        this.element.ontouchstart = function ontouchstart(touchStartEvent) {
          if (start) {
            start(that, touchStartEvent);
          }
          document.ontouchmove = function ontouchmove(e) {
            e.preventDefault();
          };
          document.ontouchend = function ontouchend(e) {
            if (end) {
              end(that, e);
            }
            document.ontouchmove = undefined;
            document.ontouchend = undefined;
          };
        };
      }
    }

    return that;
  };

  Fn.prototype.unwrap = function unwrap() {
    return this.element;
  };

  function root(selector) {
    return new Fn(selector);
  }

  Root.jQuery = root;
}());

if (typeof module === 'object') {
  module.exports = { Ship, Rules, AI };
}
