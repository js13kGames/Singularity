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

const Renderer = {};

Renderer.render = (ship) => {
  const $ = window.jQuery;

  Object.keys(ship.layout).forEach((id) => {
    const element = $(`#${id}`);
    element.removeClass('crew');
    element.addClass(ship.layout[id]);
  });
};

Renderer.invalidate = (ship) => {
  requestAnimationFrame(() => Renderer.render(ship));
};

const Rules = {};

Rules.isCenter = (ship, tile) => {
  const file = tile.slice(0, 1);
  const rank = tile.slice(-1);

  const centerFiles = ship.files.slice(1, -1);
  const centerRanks = ship.ranks.slice(1, -1);

  return centerFiles.indexOf(file) > -1 && centerRanks.indexOf(rank) > -1;
};

Rules.isEdge = (ship, tile) => {
  return !Rules.isCenter(ship, tile);
};

Rules.isCorner = (ship, tile) => {
  const file = tile.slice(0, 1);
  const rank = tile.slice(-1);

  const firstFile = ship.files.slice(0, 1)[0];
  const lastFile = ship.files.slice(-1)[0];

  const firstRank = ship.ranks.slice(0, 1)[0];
  const lastRank = ship.ranks.slice(-1)[0];

  return (file === firstFile || file === lastFile) && (rank === firstRank || rank === lastRank);
};

Rules.canAddCrew = (ship, tile) => {
  // Crew can only be added to an empty space on the ship.
  if (ship.layout[tile] !== '') {
    return false;
  }

  // There are a max of four crew on the ship.
  const crew = Object.keys(ship.layout).filter(id => ship.layout[id] === 'crew');
  if (crew.length >= 4) {
    return false;
  }

  // Crew can not go in a corner.
  if (Rules.isCorner(ship, tile)) {
    return false;
  }

  // Crew must go on an edge.
  return Rules.isEdge(ship, tile);
};

Rules.addCrew = (ship, tile) => {
  if (Rules.canAddCrew(ship, tile)) {
    return Ship.set(ship, tile, 'crew');
  }

  return Ship.clone(ship);
};

(function game() {
  let ship = Ship.create();

  function reset() {
    ship = Ship.create();
  }

  function onClick(element) {
    element.toggleClass('picked');
  }

  function play() {
    const $ = window.jQuery;

    for (let i = 1; i <= 5; i += 1) {
      $(`#p${i}`).click(onClick);
    }

    let html = '';

    ship.files.forEach((file) => {
      ship.ranks.forEach((rank) => {
        html += `<div id="${file}${rank}"></div>`;
      });
    });

    $('#ship').html(html);

    ship.files.forEach((file) => {
      ship.ranks.forEach((rank) => {
        $(`#${file}${rank}`).click(onClick);
      });
    });

    reset();
    Renderer.invalidate(ship);
  }

  window.onload = play;
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
      this.element.classList.add(klass);
    }
  };

  Fn.prototype.removeClass = function removeClass(klass) {
    if (this.element && this.element.classList) {
      this.element.classList.remove(klass);
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

  function root(selector) {
    return new Fn(selector);
  }

  window.jQuery = root;
}());
