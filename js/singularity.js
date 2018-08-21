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

  files.forEach((file) => {
    ranks.forEach((rank) => {
      layout[file + rank] = '';
    });
  });

  ranks.forEach((rank) => {
    const file = D6.pick(files);
    layout[file + rank] = 'meteor';
  });

  return {
    files,
    ranks,
    layout,
  };
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

  return dx > dy ? dx : dy;
};

Rules.possible = (ship, tile) => ship && tile && Object.keys(ship.layout).indexOf(tile) > -1;

Rules.playable = (ship, tile) => Rules.possible(ship, tile) && ship.layout[tile] === '';

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
  const orthogonal = [].concat.apply([], meteors.map(id => Rules.orthogonal(ship, id)));
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

  return Ship.set(ship, tile, 'pod');
};

Rules.crewed = ship => Rules.collect(ship, 'crew').length >= 4;

Rules.crewable = (ship) => {
  const empty = Object.keys(ship.layout).filter(id => ship.layout[id] === '');

  return empty;
};

Rules.crew = (ship, tile) => {
  if (Rules.crewed(ship)) {
    return Ship.clone(ship);
  }

  const crewable = Rules.crewable(ship);
  if (crewable.indexOf(tile) < 0) {
    return Ship.clone(ship);
  }

  return Ship.set(ship, tile, 'crew');
};

Rules.isCenter = (ship, tile) => {
  const file = tile.slice(0, 1);
  const rank = tile.slice(-1);

  const centerFiles = ship.files.slice(1, -1);
  const centerRanks = ship.ranks.slice(1, -1);

  return centerFiles.indexOf(file) > -1 && centerRanks.indexOf(rank) > -1;
};

Rules.isEdge = (ship, tile) => !Rules.isCenter(ship, tile);

Rules.needsMeteor = ship => Rules.collect(ship, 'meteor').length < 3;

Rules.canAddMeteor = (ship, tile) => {
  if (!Rules.playable(ship, tile)) {
    return false;
  }

  if (!Rules.needsMeteor(ship)) {
    return false;
  }

  const meteors = Rules.collect(ship, 'meteor');
  const close = meteors.filter(id => Rules.distance(ship, tile, id) < 2);
  return close.length < 1;
};

Rules.addMeteor = (ship, tile) => {
  if (Rules.canAddMeteor(ship, tile)) {
    return Ship.set(ship, tile, 'meteor');
  }

  return Ship.clone(ship);
};

Rules.needsCrew = ship => Rules.collect(ship, 'crew').length < 2;

Rules.canAddCrew = (ship, tile) => {
  if (!Rules.playable(ship, tile)) {
    return false;
  }

  if (!Rules.needsCrew(ship)) {
    return false;
  }

  if (!Rules.isCenter(ship, tile)) {
    return false;
  }

  const crew = Rules.collect(ship, 'crew');
  const close = crew.filter(id => Rules.distance(ship, tile, id) < 2);
  return close.length < 1;
};

Rules.addCrew = (ship, tile) => {
  if (Rules.canAddCrew(ship, tile)) {
    return Ship.set(ship, tile, 'crew');
  }

  return Ship.clone(ship);
};

Rules.needsPod = ship => Rules.collect(ship, 'pod').length < 1;

Rules.canAddPod = (ship, tile) => {
  if (!Rules.playable(ship, tile)) {
    return false;
  }

  if (!Rules.needsPod(ship)) {
    return false;
  }

  if (!Rules.isEdge(ship, tile)) {
    return false;
  }

  const crew = Rules.collect(ship, 'crew');
  const close = crew.filter(id => Rules.distance(ship, tile, id) < 3);
  return close.length < 1;
};

Rules.addPod = (ship, tile) => {
  if (Rules.canAddPod(ship, tile)) {
    return Ship.set(ship, tile, 'pod');
  }

  return Ship.clone(ship);
};

Rules.needsCorridor = (ship) => {
  const halls = Rules.collect(ship, 'hall').length;
  const corners = Rules.collect(ship, 'corner').length;
  const tees = Rules.collect(ship, 'tee').length;
  const junctions = Rules.collect(ship, 'junction').length;
  return halls + corners + tees + junctions < 30;
};

Rules.canAddCorridor = (ship, tile, corridor) => {
  if (!Rules.playable(ship, tile)) {
    return false;
  }

  const corridors = ['hall', 'corner', 'tee', 'junction'];
  if (corridors.indexOf(corridor) < 0) {
    return false;
  }

  return Rules.needsCorridor(ship);
};

Rules.addCorridor = (ship, tile, corridor) => {
  if (Rules.canAddCorridor(ship, tile, corridor)) {
    return Ship.set(ship, tile, corridor);
  }

  return Ship.clone(ship);
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

AI.playable = (ship, type) => {
  const valid = Object.keys(ship.layout).filter(id => ship.layout[id] === '');

  if (type === 'wrench') {
    return Rules.repairable(ship);
  }

  if (type === 'meteor') {
    return valid.filter(id => Rules.canAddMeteor(ship, id));
  }

  if (type === 'crew') {
    return Rules.crewable(ship);
  }

  if (type === 'pod') {
    return Rules.poddable(ship);
  }

  const corridors = ['hall', 'corner', 'tee', 'junction'];
  if (corridors.indexOf(type) > -1) {
    return valid.filter(id => Rules.canAddCorridor(ship, id, type));
  }

  return valid;
};

const Engine = {};

Engine.tick = (ship, tile) => {
  if (!Rules.repaired(ship)) {
    return Rules.repair(ship, tile);
  }

  if (!Rules.podded(ship)) {
    return Rules.pod(ship, tile);
  }

  if (!Rules.crewed(ship)) {
    return Rules.crew(ship, tile);
  }

  return Ship.clone(ship);

  /*
  let next = Rules.clear(ship, prev);

  if (prev === tile && Rules.possible(ship, tile)) {
    next = Rules.rotate(ship, tile);
    return [next, prev];
  }

  if (Rules.needsMeteor(next)) {
    if (Rules.canAddMeteor(next, tile)) {
      next = Rules.addMeteor(next, tile);
      return [next, tile];
    }

    return [ship, prev];
  }

  if (Rules.needsCrew(next)) {
    if (Rules.canAddCrew(next, tile)) {
      next = Rules.addCrew(next, tile);
      return [next, tile];
    }

    return [ship, prev];
  }

  if (Rules.needsPod(next)) {
    if (Rules.canAddPod(next, tile)) {
      next = Rules.addPod(next, tile);
      return [next, tile];
    }

    return [ship, prev];
  }

  if (Rules.needsCorridor(next)) {
    if (Rules.canAddCorridor(next, tile, item)) {
      next = Rules.addCorridor(next, tile, item);
      return [next, tile];
    }

    return [ship, prev];
  }
  */
};

Engine.item = (ship, item) => {
  if (!Rules.repaired(ship)) {
    return 'wrench';
  }

  if (!Rules.podded(ship)) {
    return 'pod';
  }

  if (!Rules.crewed(ship)) {
    return 'crew';
  }

  const corridors = ['hall', 'corner', 'tee', 'junction'];
  if (corridors.indexOf(item) < 0) {
    return D6.pick(corridors);
  }

  return item;
};

const Renderer = {};

Renderer.render = (ship, item) => {
  const $ = Root.jQuery;

  Object.keys(ship.layout).forEach((id) => {
    const element = $(`#${id}`);
    element.removeClass('meteor crew pod');
    element.removeClass('north east south west');
    element.removeClass('hall corner tee junction');
    element.removeClass('playable');
    element.addClass(ship.layout[id]);
  });

  const playable = AI.playable(ship, item);
  playable.forEach(id => $(`#${id}`).addClass('playable'));

  $('#scan').removeClass('meteor crew pod');
  $('#scan').removeClass('hall corner tee junction');
  $('#scan').addClass(item);
};

Renderer.invalidate = (ship, item) => {
  requestAnimationFrame(() => Renderer.render(ship, item));
};

(function game() {
  let ship;
  let prev;
  let next;
  let item;

  function reset() {
    ship = Ship.create();
    prev = undefined;
    next = undefined;
    item = Engine.item(ship, item);
  }

  function onShip(element) {
    const tile = element.unwrap().id;

    if (next !== undefined && prev === tile) {
      next = Rules.rotate(next, tile);
    } else {
      next = Engine.tick(ship, tile);
    }

    prev = tile;
    Renderer.invalidate(next, item);
  }

  function onScan() {
    ship = next;
    prev = undefined;
    next = undefined;
    item = Engine.item(ship, item);
    Renderer.invalidate(ship, item);
  }

  function tileHTML() {
    let html = '';

    for (let i = 0; i < 9; i += 1) {
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
        html += tileHTML();
        html += '</div>';
      });
    });

    $('#ship').html(html);
  }

  function play() {
    const $ = Root.jQuery;

    reset();
    drawShip();

    ship.files.forEach((file) => {
      ship.ranks.forEach((rank) => {
        $(`#${file}${rank}`).click(onShip);
      });
    });

    $('#scan').html(tileHTML());
    $('#scan').click(onScan);

    Renderer.invalidate(ship, item);
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
  };

  Fn.prototype.removeClass = function removeClass(klass) {
    if (this.element && this.element.classList) {
      const klasses = klass.split(' ').filter(k => k);
      klasses.forEach(k => this.element.classList.remove(k));
    }
  };

  Fn.prototype.toggleClass = function toggleClass(klass) {
    if (this.element && this.element.classList) {
      this.element.classList.toggle(klass);
    }
  };

  Fn.prototype.html = function html(value) {
    if (this.element) {
      this.element.innerHTML = value;
    }
  };

  Fn.prototype.click = function click(start, end) {
    const self = this;

    if (this.element) {
      if ('ontouchstart' in document.documentElement === false) {
        this.element.onmousedown = function onmousedown(mouseDownEvent) {
          if (start) {
            start(self, mouseDownEvent);
          }
          document.onmousemove = function onmousemove(e) {
            e.preventDefault();
          };
          document.onmouseup = function onmouseup(e) {
            if (end) {
              end(self, e);
            }
            document.onmousemove = undefined;
            document.onmouseup = undefined;
          };
        };
      } else {
        this.element.ontouchstart = function ontouchstart(touchStartEvent) {
          if (start) {
            start(self, touchStartEvent);
          }
          document.ontouchmove = function ontouchmove(e) {
            e.preventDefault();
          };
          document.ontouchend = function ontouchend(e) {
            if (end) {
              end(self, e);
            }
            document.ontouchmove = undefined;
            document.ontouchend = undefined;
          };
        };
      }
    }
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
