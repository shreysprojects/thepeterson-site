/* The small interactive parts of the Peterson site: the question deck, the gathering table
   and the city clocks. Nothing here moves on its own. */
(() => {
  'use strict';

  /* The question deck: one question at a time, or bring your own. */
  const deck = document.querySelector('#questionDeck');
  if (deck) {
    const list = deck.querySelector('.deck-cards');
    const cards = [...list.querySelectorAll('li')];
    const total = cards.length;
    const counter = deck.querySelector('.deck-count');
    const announcer = deck.querySelector('.deck-live');
    let current = 0;
    cards.forEach((card, index) => { card.dataset.number = String(index + 1).padStart(2, '0'); });
    // Every card sits in the same spot, so the deck is always as tall as its longest question.
    list.classList.add('is-single');

    const show = index => {
      current = index;
      cards.forEach((card, i) => {
        card.classList.toggle('is-current', i === index);
        card.setAttribute('aria-hidden', String(i !== index));
      });
      const card = cards[index];
      counter.textContent = card.classList.contains('is-yours') ? 'Your question' : `Question ${Number(card.dataset.number)} of ${total}`;
    };

    deck.querySelector('[data-deck-next]').addEventListener('click', () => {
      show((current + 1) % cards.length);
      announcer.textContent = cards[current].textContent;
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
      show(cards.length - 1);
      announcer.textContent = `Added to the deck: ${question}`;
      input.value = '';
      hint.textContent = 'Your question is on the deck, and the membership enquiry has it filled in.';
      if (typeof window.openPetersonEnquiry === 'function') {
        window.openPetersonEnquiry(form.querySelector('button[type="submit"]'), { question });
      }
    });

    show(0);
  }

  /* A seat at the table: the three parts of a gathering, drawn around a table of ten. */
  const figure = document.querySelector('#gatheringTable');
  if (figure) {
    const svg = figure.querySelector('svg');
    const caption = figure.querySelector('figcaption');
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
      expert: 'Expert perspectives. One guest opens with what they know best. Choose a seat to change who speaks.',
      talk: 'Open conversation. Threads form between disciplines that rarely share a table.',
      kept: 'Lasting connections. The threads worth keeping become introductions after the evening.'
    };
    // Fixed drawings: in conversation every guest talks with one other; lasting connections form a web.
    const talkPairs = [[0, 3], [1, 8], [2, 5], [4, 7], [6, 9]];
    const keptPairs = [[0, 1], [0, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 7], [5, 8], [6, 9], [7, 9], [8, 0], [9, 2]];
    const make = (tag, attributes, parent) => {
      const node = document.createElementNS(NS, tag);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
      if (parent) parent.append(node);
      return node;
    };
    make('ellipse', { cx: CX, cy: CY, rx: 132, ry: 70, class: 'gt-table' }, svg);
    const lines = make('g', {}, svg);
    // The name sits above the lines, with a halo in the table's colour so lines pass behind it.
    make('text', { x: CX, y: CY, dy: '.35em', 'text-anchor': 'middle', class: 'gt-table-label' }, svg).textContent = 'Peterson';
    const seatLayer = make('g', {}, svg);
    const points = seats.map((seat, index) => {
      const angle = (-90 + index * 36) * Math.PI / 180;
      return { x: CX + SEAT_RX * Math.cos(angle), y: CY + SEAT_RY * Math.sin(angle), angle };
    });
    const seatNodes = [];
    let mode = 'expert', speaker = 0;

    const describe = index => {
      const name = document.createElement('b');
      name.textContent = seats[index][0];
      caption.replaceChildren(name, ` ${seats[index][1]}`);
    };
    const restoreCaption = () => { caption.textContent = captions[mode]; };

    const curve = (a, b) => {
      const p = points[a], q = points[b];
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      const cx = mx + (CX - mx) * .35, cy = my + (CY - my) * .35;
      return `M${p.x.toFixed(1)} ${p.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
    };
    const line = (a, b, kind) => make('path', { d: curve(a, b), class: `gt-line ${kind}` }, lines);

    function draw() {
      lines.replaceChildren();
      formatButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.format === mode)));
      seatNodes.forEach((node, index) => node.classList.toggle('is-speaker', mode === 'expert' && index === speaker));
      if (mode === 'expert') seats.forEach((seat, index) => { if (index !== speaker) line(speaker, index, 'expert'); });
      if (mode === 'talk') talkPairs.forEach(([a, b]) => line(a, b, 'talk'));
      if (mode === 'kept') keptPairs.forEach(([a, b]) => line(a, b, 'kept'));
    }
    const setMode = next => {
      mode = next;
      draw();
      restoreCaption();
    };

    seats.forEach(([name, text], index) => {
      const { x, y, angle } = points[index];
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const group = make('g', { class: 'gt-seat', tabindex: '0', role: 'button', 'aria-label': `${name}: ${text}` }, seatLayer);
      make('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 18, class: 'gt-ring' }, group);
      make('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 3, class: 'gt-dot' }, group);
      make('text', {
        x: (x + 30 * cos).toFixed(1),
        y: (y + 32 * sin).toFixed(1),
        dy: '.35em',
        'text-anchor': cos > .35 ? 'start' : cos < -.35 ? 'end' : 'middle',
        class: 'gt-label'
      }, group).textContent = name;
      const choose = () => {
        if (mode === 'expert') {
          speaker = index;
          draw();
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
    });

    formatButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.format)));

    // Keep the seat names at about 12px on screen, however small the table is drawn.
    const sizeLabels = () => {
      const width = svg.getBoundingClientRect().width;
      if (width) svg.style.setProperty('--gt-label', `${Math.min(24, Math.max(12.5, 12 * 640 / width)).toFixed(1)}px`);
    };
    figure.classList.add('is-ready');
    setMode('expert');
    sizeLabels();
    if ('ResizeObserver' in window) new ResizeObserver(sizeLabels).observe(svg);
    else addEventListener('resize', sizeLabels);
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
})();
