(() => {
  'use strict';

  // Both forms post to their data-endpoint when one is set (a form service or a
  // serverless function). Until then they open a prefilled email to data-email.
  async function post(endpoint, data) {
    const response = await fetch(endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: data });
    if (!response.ok) throw new Error(`Form endpoint answered ${response.status}`);
  }
  const mailto = (address, subject, body) =>
    `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const isEmail = input => input.value.trim() !== '' && input.checkValidity();

  /* Membership enquiry: three short steps, then send. */
  const dialog = document.querySelector('#applicationDialog');
  const form = document.querySelector('#applicationForm');
  const field = name => form.elements.namedItem(name);
  const steps = [...form.querySelectorAll('.application-step')];
  const progressList = form.querySelector('.application-progress');
  const progressItems = [...progressList.querySelectorAll('li')];
  const backButton = form.querySelector('[data-back]');
  const nextButton = form.querySelector('[data-next]');
  const submitButton = form.querySelector('[data-submit]');
  const actions = form.querySelector('.application-actions');
  const status = form.querySelector('#applicationStatus');
  const done = form.querySelector('#applicationDone');
  const copyBox = done.querySelector('.copy-fallback');
  const copyButton = done.querySelector('[data-copy]');
  let current = 0;
  let finished = false;
  let applicationOpener = null;

  function showStep(index, moveFocus = true) {
    current = index;
    steps.forEach((step, i) => { step.hidden = i !== index; });
    progressItems.forEach((item, i) => {
      item.classList.toggle('is-complete', i < index);
      if (i === index) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    });
    backButton.hidden = index === 0;
    nextButton.hidden = index === steps.length - 1;
    submitButton.hidden = index !== steps.length - 1;
    status.textContent = '';
    if (moveFocus) steps[index].querySelector('input, textarea')?.focus();
  }

  function problem(index) {
    if (index === 0 && !field('name').value.trim()) return [field('name'), 'Please add your name.'];
    if (index === 0 && !isEmail(field('email'))) return [field('email'), 'Please add an email address Peterson can reply to.'];
    if (index === 1 && field('work').value.trim().length < 10) return [field('work'), 'Please add a sentence or two about your work.'];
    return null;
  }

  function stepIsValid(index) {
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    const found = problem(index);
    if (!found) return true;
    const [input, message] = found;
    input.setAttribute('aria-invalid', 'true');
    status.textContent = message;
    input.focus();
    return false;
  }

  function enquiryText() {
    const value = name => field(name).value.trim();
    const city = form.querySelector('input[name="city"]:checked')?.value || 'Not given';
    const ways = [...form.querySelectorAll('input[name="contribute"]:checked')].map(input => input.value);
    const lines = [`Name: ${value('name')}`, `Email: ${value('email')}`];
    if (value('link')) lines.push(`LinkedIn or website: ${value('link')}`);
    lines.push(`Closest city: ${city}`, '', 'What I am working on:', value('work'), '',
      `How I would like to contribute: ${ways.length ? ways.join(', ') : 'Open to discussing'}`);
    if (value('note')) lines.push('', value('note'));
    return lines.join('\n');
  }

  function finish(heading, message, offerCopy) {
    finished = true;
    steps.forEach(step => { step.hidden = true; });
    progressList.hidden = true;
    actions.hidden = true;
    status.textContent = '';
    done.querySelector('h3').textContent = heading;
    done.querySelector('p').textContent = message;
    copyBox.hidden = !offerCopy;
    if (offerCopy) copyBox.querySelector('textarea').value = enquiryText();
    done.hidden = false;
    done.focus();
  }

  async function send() {
    const endpoint = (form.dataset.endpoint || '').trim();
    const address = form.dataset.email;
    if (endpoint) {
      submitButton.disabled = true;
      status.textContent = 'Sending…';
      try {
        await post(endpoint, new FormData(form));
        finish('Thank you.', 'Your enquiry has been sent to Peterson.', false);
        return;
      } catch (error) {
        console.warn(error);
      } finally {
        submitButton.disabled = false;
      }
    }
    window.location.href = mailto(address, `Membership enquiry: ${field('name').value.trim()}`, enquiryText());
    finish('One last step.', `Your email app should open with your enquiry ready to send to ${address}. If it doesn't, copy the text below and send it yourself.`, true);
  }

  function resetEnquiry() {
    form.reset();
    finished = false;
    done.hidden = true;
    copyBox.hidden = true;
    copyButton.textContent = 'Copy text';
    progressList.hidden = false;
    actions.hidden = false;
    showStep(0, false);
  }

  nextButton.addEventListener('click', () => { if (stepIsValid(current)) showStep(current + 1); });
  backButton.addEventListener('click', () => showStep(current - 1));
  form.addEventListener('submit', event => {
    event.preventDefault();
    // Enter in a text field submits the form, so treat it as Continue until the last step.
    if (current < steps.length - 1) {
      if (stepIsValid(current)) showStep(current + 1);
      return;
    }
    for (const index of [0, 1]) {
      if (problem(index)) { showStep(index, false); stepIsValid(index); return; }
    }
    send();
  });
  copyButton.addEventListener('click', async () => {
    const text = copyBox.querySelector('textarea');
    try {
      await navigator.clipboard.writeText(text.value);
      copyButton.textContent = 'Copied';
    } catch (error) {
      text.focus();
      text.select();
      copyButton.textContent = 'Press Ctrl+C or ⌘C to copy';
    }
  });

  document.querySelectorAll('[data-apply]').forEach(button => button.addEventListener('click', () => {
    applicationOpener = button;
    dialog.showModal();
  }));
  document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => {
    if (finished) resetEnquiry();
    applicationOpener?.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });

  /* Letters sign-up under Gatherings. */
  const letters = document.querySelector('#lettersForm');
  if (letters) {
    const input = letters.querySelector('input[type="email"]');
    const note = letters.querySelector('.letters-status');
    letters.addEventListener('submit', async event => {
      event.preventDefault();
      input.removeAttribute('aria-invalid');
      if (!isEmail(input)) {
        input.setAttribute('aria-invalid', 'true');
        note.textContent = 'Please enter a valid email address.';
        input.focus();
        return;
      }
      const endpoint = (letters.dataset.endpoint || '').trim();
      if (endpoint) {
        note.textContent = 'Adding you…';
        try {
          await post(endpoint, new FormData(letters));
          note.textContent = 'Thank you. You will hear from Peterson when gatherings are announced.';
          letters.reset();
          return;
        } catch (error) {
          console.warn(error);
        }
      }
      const address = letters.dataset.email;
      window.location.href = mailto(address, 'Letters from Peterson', `Please add ${input.value.trim()} to Letters from Peterson.`);
      note.textContent = `Your email app should open with a short note to ${address}. Send it to join the list.`;
    });
  }
})();
