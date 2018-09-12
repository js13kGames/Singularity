# Singularity #

> "Meteor impacts detected. Life support systems offline. Escape pods launching
> in 30 seconds..."
>
> &ndash; _Pegasus II_, final transmission

Singularity is [an offline game][offline]. Press the print button. Read the rules. Cut out
the board and tiles. Set a timer, and get ready to save the crew of the
_Pegasus II_.

Singularity is [an online game][online]. Press the play button. Place a corridor
on the ship. Tap the corridor to rotate it. Press the play button to get the
next corridor. Can you rescue the crew of the _Pegasus II_?

Singularity is a story. Press the play button. Place corridors on the ship.
Rescue the crew one at a time. After each rescue, press the help button to
reveal the fate of the _Pegasus II_.

Singularity was built for [js13kGames 2018][js13k].

## Inspiration ##

Singularity started out as a digital version of [Escape Pod One][pod] by
[Stephanie Bryant][stephanie]. The sound effects are based on
[tritone paradoxes][tritone], something I learned about from [Primrose][] by
Jason Rohrer.

The game mechanics started as a riff on [30 Rails][rails] by Julian Anstey. But
I couldn't fit an 8x8 grid comfortably on a phone screen. Putting the crew
quarters on the edges &mdash; and limiting their connection points &mdash; gave
me board that fit on small screens without giving up playable space. Designing
the set of corridors as a random draw from a fixed collection, allows for some
strategy and planning.

I've always liked the story telling LambdaMu Games did in [4Towers][towers]. A
handful of quotations combine to form an arc and build a world. I tried to do
something similar with Singularity.

## Graphics ##

The background graphic is [Starry Night][night] by [Lea Verou][lea]. The printer
graphic was inspired by [a SVG printer icon][printer] by Tomas Knopp. Graphics
for the meteors, escape pods, crew quarters, and corridors are my designs.

## Development ##

```bash
npm install
npm run watch
open ./public/index.html
```

## License ##

Singularity is protected under a [Creative Commons Attribution 4.0 International
License][cc].


[offline]: https://github.com/onefrankguy/singularity/blob/master/singularity.pdf "Frank Mitchell: Singularity - an offline game for js13kGames 2018"
[online]: https://www.frankmitchell.org/singularity/ "Frank Mitchell: Singularity - an online game for js13kGames 2018"
[js13k]: http://2018.js13kgames.com/ "Andrzej Mazur (js13kGames): HTML5 and JavaScript Game Development Competition in just 13 kilobytes"
[rails]: https://boardgamegeek.com/boardgame/200551/30-rails "Julian Anstey (Board Game Geek): 30 Rails"
[towers]: https://lambdamugames.com/portfolio/4towers/ "LambdaMu Games: 4Towers"
[night]: http://lea.verou.me/css3patterns/#starry-night "Lea Verou (CSS Patterns Gallery): Starry Night"
[lea]: http://lea.verou.me/ "Lea Verou: Life on the bleeding edge (of web standards)"
[printer]: https://thenounproject.com/search/?q=printer&i=1182512 "Tomas Knopp (The Noun Project): Printer"
[pod]: https://200wordrpg.github.io/2015/rpg/winner/2015/04/01/EscapePodOne.html "Stephanie Bryant (200 Word RPG): Escape Pod One"
[stephanie]: http://www.mortaine.com/blog/ "Stephanie Bryant: Mortaine's Blog"
[tritone]: http://www.philomel.com/musical_illusions/tritone.php "Philomel Records: Diana Deutsch's Audio Illusions"
[Primrose]: http://primrose.sourceforge.net/description.php "Jason Rohrer (SourceForge): Primrose"
[cc]: https://creativecommons.org/licenses/by/4.0/ "Creative Commons Attribution 4.0 International"
