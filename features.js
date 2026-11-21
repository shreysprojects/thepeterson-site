/* Interactive layers for the Peterson site: headlines that decode from binary, the question
   deck, the seat-at-the-table view of the gathering format, live city clocks, and the binary
   phrase in the footer. Everything respects prefers-reduced-motion. */
(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const lineBreak = ' ';
  const randomDigit = () => (Math.random() < .5 ? '0' : '1');

  /* Headlines that decode. Screen readers always get the plain text. */
  function prepare(element) {
    const characters = [];
    element.childNodes.forEach(node => {
      if (node.nodeName === 'BR') characters.push(lineBreak);
      else characters.push(...Array.from(node.textContent.replace(/\s+/g, ' ')));
    });
    const readable = document.createElement('span');
    readable.className = 'sr-only';
    readable.textContent = characters.join('').split(lineBreak).join(' ').replace(/\s+/g, ' ').trim();
    const visual = document.createElement('span');
    visual.className = 'decode-visual';
    visual.setAttribute('aria-hidden', 'true');
    const glyphs = [];
    characters.forEach(character => {
      if (character === lineBreak) { visual.append(document.createElement('br')); return; }
      if (character === ' ') { visual.append(document.createTextNode(' ')); return; }
      const glyph = document.createElement('span');
      glyph.className = 'glyph';
      glyph.textContent = character;
      visual.append(glyph);
      glyphs.push(glyph);
    });
    element.replaceChildren(readable, visual);
    element.petersonGlyphs = glyphs;
    return glyphs;
  }

  function glyphsFor(element) {
    const glyphs = element.petersonGlyphs;
    return glyphs && glyphs.length && element.contains(glyphs[0]) ? glyphs : prepare(element);
  }

  function decode(element, { duration = 900 } = {}) {
    if (!element || motion.matches) return;
    const glyphs = glyphsFor(element);
    const count = glyphs.length || 1;
    const reveal = glyphs.map((glyph, index) => (index / count) * duration * .6 + Math.random() * duration * .4);
    glyphs.forEach(glyph => {
      glyph.classList.add('is-encoded');
      glyph.dataset.d = randomDigit();
    });
    const run = (element.petersonRun || 0) + 1;
    element.petersonRun = run;
    const start = performance.now();
    let lastFlip = 0;
    const frame = now => {
      if (element.petersonRun !== run) return;
      const elapsed = now - start;
      const flip = now - lastFlip > 60;
      if (flip) lastFlip = now;
      let pending = false;
      glyphs.forEach((glyph, index) => {
        if (!glyph.classList.contains('is-encoded')) return;
        if (elapsed >= reveal[index]) glyph.classList.remove('is-encoded');
        else {
          pending = true;
          if (flip) glyph.dataset.d = randomDigit();
        }
      });
      if (pending) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
  window.petersonDecode = decode;

  const hero = document.querySelector('.hero h1');
  if (hero && !motion.matches) {
    const start = () => setTimeout(() => decode(hero, { duration: 1100 }), 250);
    if (document.fonts) document.fonts.ready.then(start); else start();
  }

  // In the Meridian layout only the hero line decodes; section headlines stay still.

  /* The question deck: draw questions one at a time, or bring your own. */
  const deck = document.querySelector('#questionDeck');
  if (deck) {
    const list = deck.querySelector('.deck-cards');
    const cards = [...list.querySelectorAll('li')];
    const total = cards.length;
    const counter = deck.querySelector('.deck-count');
    const announcer = deck.querySelector('.deck-live');
    const order = cards.map((card, index) => index);
    cards.forEach((card, index) => { card.dataset.number = String(index + 1).padStart(2, '0'); });
    list.classList.add('is-stacked');

    const place = (card, slot) => {
      card.dataset.pos = slot < 3 ? String(slot) : 'hidden';
      card.setAttribute('aria-hidden', slot === 0 ? 'false' : 'true');
    };
    // Give every card the height of the tallest one so the stack stays tidy.
    const fit = () => {
      cards.forEach(card => { card.style.minHeight = ''; });
      const tallest = Math.max(...cards.map(card => card.offsetHeight));
      cards.forEach(card => { card.style.minHeight = `${tallest}px`; });
      list.style.height = `${tallest + 28}px`;
    };
    const updateCounter = () => {
      const top = cards[order[0]];
      counter.textContent = top.classList.contains('is-yours') ? 'Your question' : `Question ${Number(top.dataset.number)} of ${total}`;
    };
    const layout = () => {
      order.forEach((index, slot) => place(cards[index], slot));
      fit();
      updateCounter();
    };

    deck.querySelector('[data-deck-next]').addEventListener('click', () => {
      const leaving = order.shift();
      order.push(leaving);
      order.forEach((index, slot) => { if (index !== leaving) place(cards[index], slot); });
      const card = cards[leaving];
      card.setAttribute('aria-hidden', 'true');
      if (motion.matches) card.dataset.pos = 'hidden';
      else {
        card.dataset.pos = 'out';
        setTimeout(() => { if (card.dataset.pos === 'out') card.dataset.pos = 'hidden'; }, 520);
      }
      updateCounter();
      announcer.textContent = cards[order[0]].textContent;
    });

    const form = deck.querySelector('#deckForm');
    const input = form.querySelector('input');
    const hint = form.querySelector('.deck-hint');
    form.addEventListener('submit', event => {
      event.preventDefault();
      let question = input.value.trim().replace(/\s+/g, ' ');
      if (question.length < 8) {
        hint.textContent = 'Write your question first, in a few words or more.';
        input.focus();
        return;
      }
      if (!/[?？]$/.test(question)) question += '?';
      question = question.charAt(0).toUpperCase() + question.slice(1);
      const card = document.createElement('li');
      card.className = 'is-yours';
      card.textContent = question;
      list.append(card);
      cards.push(card);
      order.unshift(cards.length - 1);
      layout();
      announcer.textContent = `Added to the deck: ${question}`;
      input.value = '';
      hint.textContent = 'Your question is on the deck, and the membership enquiry has it filled in.';
      if (typeof window.openPetersonEnquiry === 'function') {
        window.openPetersonEnquiry(form.querySelector('button[type="submit"]'), { question });
      }
    });

    layout();
    if (document.fonts) document.fonts.ready.then(fit);
    addEventListener('resize', fit);
  }

  /* A seat at the table: the gathering format, drawn as one evening around a table of ten. */
  const figure = document.querySelector('#gatheringTable');
  if (figure) {
    const svg = figure.querySelector('svg');
    const caption = figure.querySelector('figcaption');
    const chips = figure.querySelector('.seat-chips');
    const formatButtons = [...document.querySelectorAll('[data-format]')];
    const NS = 'http://www.w3.org/2000/svg';
    const CX = 320, CY = 205, SEAT_RX = 200, SEAT_RY = 132;
    const seats = [
      ['Founder', 'has built something from zero and knows what breaks first.'],
      ['Researcher', 'brings the evidence, and the patience to wait for it.'],
      ['Investor', 'has seen the pattern across a hundred companies.'],
      ['Engineer', 'knows what can actually be built this year.'],
      ['Policymaker', 'knows where the rules are about to move.'],
      ['Physician', 'tests every idea against a real patient.'],
      ['Designer', 'turns an idea into something people choose.'],
      ['Economist', 'prices the second-order effects.'],
      ['Operator', 'has scaled a team past the point where heroics work.'],
      ['Writer', 'gives the conversation a shape others can share.']
    ];
    const captions = {
      seated: 'An illustrative table of ten, one guest from each discipline. Hover or tap a seat to see what each brings.',
      expert: 'Expert perspectives. One guest opens with what they know best. Choose a seat to change who speaks.',
      talk: 'Open conversation. Threads form between disciplines that rarely share a table.',
      kept: 'Lasting connections. The threads worth keeping become introductions after the evening.'
    };
    const keptPairs = [[0, 1], [0, 4], [1, 5], [1, 7], [2, 3], [2, 8], [3, 6], [4, 7], [5, 9], [0, 6], [2, 7], [3, 8], [4, 9], [1, 6]];
    const make = (tag, attributes, parent) => {
      const node = document.createElementNS(NS, tag);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
      if (parent) parent.append(node);
      return node;
    };
    make('ellipse', { cx: CX, cy: CY, rx: 132, ry: 70, class: 'gt-table' }, svg);
    make('text', { x: CX, y: CY + 7, 'text-anchor': 'middle', class: 'gt-table-label' }, svg).textContent = 'Peterson';
    const lines = make('g', {}, svg);
    const seatLayer = make('g', {}, svg);
    const points = seats.map((seat, index) => {
      const angle = (-90 + index * 36) * Math.PI / 180;
      return { x: CX + SEAT_RX * Math.cos(angle), y: CY + SEAT_RY * Math.sin(angle), angle };
    });
    const talked = new Set();
    const seatNodes = [];
    const chipNodes = [];
    let mode = 'seated', speaker = 1, talkTimer = 0, autoplay = 0;

    const describe = index => {
      const name = document.createElement('b');
      name.textContent = seats[index][0];
      caption.replaceChildren(name, ` ${seats[index][1]}`);
    };
    const restoreCaption = () => { caption.textContent = captions[mode]; };
    const stopAutoplay = () => { clearTimeout(autoplay); autoplay = 0; };

    seats.forEach(([name, text], index) => {
      const { x, y, angle } = points[index];
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const group = make('g', { class: 'gt-seat', tabindex: '0', role: 'button', 'aria-label': `${name}: ${text}` }, seatLayer);
      make('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 18, class: 'gt-ring' }, group);
      make('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3, class: 'gt-dot' }, group);
      make('text', {
        x: (x + 30 * cos).toFixed(1),
        y: (y + 28 * sin + 4.5).toFixed(1),
        'text-anchor': cos > .35 ? 'start' : cos < -.35 ? 'end' : 'middle',
        class: 'gt-label'
      }, group).textContent = name;
      const choose = () => {
        stopAutoplay();
        if (mode === 'expert') {
          speaker = index;
          setMode('expert');
        }
        describe(index);
      };
      group.addEventListener('mouseenter', () => { group.classList.add('is-hot'); describe(index); });
      group.addEventListener('mouseleave', () => { group.classList.remove('is-hot'); restoreCaption(); });
      group.addEventListener('focus', () => { group.classList.add('is-hot'); describe(index); });
      group.addEventListener('blur', () => { group.classList.remove('is-hot'); restoreCaption(); });
      group.addEventListener('click', choose);
      group.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        choose();
      });
      seatNodes.push(group);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = name;
      chip.addEventListener('click', choose);
      chips.append(chip);
      chipNodes.push(chip);
    });

    const curve = (a, b) => {
      const p = points[a], q = points[b];
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      const cx = mx + (CX - mx) * .35, cy = my + (CY - my) * .35;
      return `M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    };
    const line = (a, b, kind) => make('path', { d: curve(a, b), class: `gt-line ${kind}` }, lines);
    let tableVisible = true;
    const talkRound = () => {
      for (let i = 0; i < 3; i++) {
        const a = Math.floor(Math.random() * seats.length);
        let b = Math.floor(Math.random() * (seats.length - 1));
        if (b >= a) b++;
        talked.add(a < b ? `${a}-${b}` : `${b}-${a}`);
        if (motion.matches) line(a, b, 'still');
        else {
          const node = line(a, b, 'talk');
          setTimeout(() => node.remove(), 1800);
        }
      }
    };

    function setMode(next) {
      mode = next;
      clearInterval(talkTimer);
      talkTimer = 0;
      lines.replaceChildren();
      formatButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.format === next)));
      seatNodes.forEach((node, index) => node.classList.toggle('is-speaker', next === 'expert' && index === speaker));
      chipNodes.forEach((chip, index) => chip.classList.toggle('is-speaker', next === 'expert' && index === speaker));
      if (next === 'expert') {
        seats.forEach((seat, index) => { if (index !== speaker) line(speaker, index, 'expert'); });
      }
      if (next === 'talk') {
        talkRound();
        if (motion.matches) talkRound();
        else if (tableVisible) talkTimer = setInterval(talkRound, 900);
      }
      if (next === 'kept') {
        const pairs = talked.size >= 10 ? [...talked].slice(0, 16).map(key => key.split('-').map(Number)) : keptPairs;
        pairs.forEach(([a, b], index) => {
          const node = line(a, b, 'kept');
          node.style.setProperty('--length', node.getTotalLength().toFixed(1));
          node.style.animationDelay = `${index * 70}ms`;
        });
      }
      restoreCaption();
    }

    const play = (sequence, step = 0) => {
      setMode(sequence[step]);
      if (step + 1 < sequence.length) autoplay = setTimeout(() => play(sequence, step + 1), 3800);
    };

    formatButtons.forEach(button => button.addEventListener('click', () => {
      stopAutoplay();
      setMode(button.dataset.format);
    }));
    figure.classList.add('is-ready');
    setMode('seated');

    // Stop the table's animation while it is off-screen.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        tableVisible = entry.isIntersecting;
        figure.classList.toggle('is-offscreen', !tableVisible);
        if (!tableVisible) {
          clearInterval(talkTimer);
          talkTimer = 0;
        } else if (mode === 'talk' && !talkTimer && !motion.matches) {
          talkTimer = setInterval(talkRound, 900);
        }
      }).observe(figure);
    }

    // Play the evening once when the table first comes into view.
    if ('IntersectionObserver' in window && !motion.matches) {
      const watcher = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        watcher.disconnect();
        play(['expert', 'talk', 'kept']);
      }, { threshold: .5 });
      watcher.observe(svg);
    } else {
      setMode('kept');
    }
  }

  /* Live clocks for the three cities. */
  const clocks = document.querySelectorAll('time[data-tz]');
  const tick = () => clocks.forEach(time => {
    try {
      time.textContent = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: time.dataset.tz }).format(new Date());
    } catch (error) {
      time.textContent = '';
    }
  });
  tick();
  setInterval(tick, 20000);

  /* The footer phrase, written in binary like the globe. */
  const codeButton = document.querySelector('#footerCode');
  if (codeButton) {
    const phrase = 'what comes next';
    const bits = Array.from(phrase).map(ch => ch.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
    const text = codeButton.querySelector('.code-text');
    const action = codeButton.querySelector('.code-action');
    const show = decoded => {
      codeButton.setAttribute('aria-pressed', String(decoded));
      codeButton.setAttribute('aria-label', decoded ? `Decoded: ${phrase}. The globe’s digits come from this phrase.` : 'A phrase written in binary. Decode it.');
      text.textContent = decoded ? phrase : bits;
      action.textContent = decoded ? 'The globe’s digits come from this phrase' : 'Decode';
      if (decoded) decode(text, { duration: 700 });
    };
    show(false);
    codeButton.addEventListener('click', () => show(codeButton.getAttribute('aria-pressed') !== 'true'));
  }
})();
