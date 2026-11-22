/* The small interactive parts of the Peterson site: the question deck and the city clocks.
   Nothing here moves on its own. */
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

  /* Live clocks for the member cities. */
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
