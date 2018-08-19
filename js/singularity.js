const Ship = {};

Ship.create = () => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

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

(function game() {
  let ship = Ship.create();

  function reset() {
    ship = Ship.create();
  }

  function play() {
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
      if (selector.indexOf(0) === '#') {
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

  function root(selector) {
    return new Fn(selector);
  }

  window.jQuery = root;
}());
