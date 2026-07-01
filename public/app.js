const weddingDate = new Date('2026-10-25T17:00:00-04:00');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const lookupForm = document.getElementById('lookupForm');
const lookupMessage = document.getElementById('lookupMessage');
let matchResults = document.getElementById('matchResults');

if (!matchResults && lookupForm) {
  matchResults = document.createElement('div');
  matchResults.id = 'matchResults';
  matchResults.className = 'match-results';
  lookupForm.insertAdjacentElement('afterend', matchResults);
}
const rsvpForm = document.getElementById('rsvpForm');
const invitationIdInput = document.getElementById('invitationId');
const invitationTitle = document.getElementById('invitationTitle');
const guestResponses = document.getElementById('guestResponses');
const submitMessage = document.getElementById('submitMessage');
let selectedInvitation = null;

const firstCourseOptions = [
  {
    value: 'Baby Gem Caesar Salad',
    label: 'Baby Gem Caesar Salad',
    description: 'Shaved parmesan, cracked black pepper, focaccia crouton, creamy Caesar dressing.'
  },
  {
    value: 'Tomato Bisque Soup',
    label: 'Tomato Bisque Soup',
    description: 'Crème fraîche and basil-infused extra virgin olive oil.'
  }
];

const mainCourseOptions = [
  {
    value: 'Grilled Rib-eye',
    label: 'Grilled Rib-eye',
    description: 'Sour cream and chive whipped potatoes, roasted shallot red wine sauce.'
  },
  {
    value: 'Pan Jus and Herb Roasted Chicken',
    label: 'Pan Jus and Herb Roasted Chicken',
    description: 'Farm-raised chicken served with Chateau Elan Merlot demi.'
  }
];

navToggle?.addEventListener('click', () => navLinks.classList.toggle('open'));
document.querySelectorAll('.nav-links a').forEach((link) => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

function updateCountdown() {
  const now = new Date();
  const difference = weddingDate - now;
  const values = difference <= 0 ? { days: 0, hours: 0, minutes: 0, seconds: 0 } : {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60)
  };
  document.getElementById('days').textContent = values.days;
  document.getElementById('hours').textContent = String(values.hours).padStart(2, '0');
  document.getElementById('minutes').textContent = String(values.minutes).padStart(2, '0');
  document.getElementById('seconds').textContent = String(values.seconds).padStart(2, '0');
}
setInterval(updateCountdown, 1000);
updateCountdown();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

lookupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessages();
  rsvpForm.classList.add('hidden');
  const name = document.getElementById('guestSearch').value.trim();
  if (name.length < 2) {
    showMessage(lookupMessage, 'Please enter at least 2 characters.', 'error');
    return;
  }

  showMessage(lookupMessage, 'Searching guest list...', '');
  try {
    const response = await fetch('/api/find-guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not search the guest list.');
    renderMatches(data.matches || []);
  } catch (error) {
  console.error('Guest lookup error:', error);
  showMessage(lookupMessage, error.message || 'Could not search guest list.', 'error');
}
});

function renderMatches(matches) {
  matchResults.innerHTML = '';
  if (!matches.length) {
    showMessage(lookupMessage, 'No invitation found. Check the spelling or contact the couple.', 'error');
    return;
  }
  showMessage(lookupMessage, `${matches.length} invitation${matches.length === 1 ? '' : 's'} found.`, 'success');
  matches.forEach((match) => {
    const card = document.createElement('div');
    card.className = 'match-card';
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(match.displayName)}</strong>
        <p>${Number(match.partySize || match.guests?.length || 1)} guest${Number(match.partySize || match.guests?.length || 1) === 1 ? '' : 's'} on this invitation</p>
      </div>
      <button type="button" class="button">Select</button>
    `;
    card.querySelector('button').addEventListener('click', () => selectInvitation(match));
    matchResults.appendChild(card);
  });
}

function selectInvitation(invitation) {
  selectedInvitation = invitation;
  invitationIdInput.value = invitation.id;
  invitationTitle.textContent = invitation.displayName;
  document.getElementById('contactName').value = invitation.displayName;
  document.getElementById('phone').value = invitation.phone || '';
  renderGuestResponses(invitation.guests || [invitation.displayName]);
  rsvpForm.classList.remove('hidden');
  submitMessage.textContent = '';
  rsvpForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderGuestResponses(names) {
  guestResponses.innerHTML = '';
  const heading = document.createElement('h3');
  heading.textContent = 'Guests on this invitation';
  guestResponses.appendChild(heading);

  names.forEach((name, index) => {
    const row = document.createElement('div');
    row.className = 'guest-row';
    row.dataset.guestName = name;
    row.innerHTML = `
      <input type="checkbox" id="guest-${index}" class="guest-attending" checked />
      <label class="guest-name" for="guest-${index}">${escapeHtml(name)}</label>
      <label>First course
        <select class="first-course" aria-label="First course for ${escapeAttribute(name)}" required>
          <option value="">Select soup or salad</option>
          ${firstCourseOptions.map((option) => `<option value="${escapeAttribute(option.value)}">${escapeHtml(option.label)} — ${escapeHtml(option.description)}</option>`).join('')}
        </select>
        <span class="choice-detail first-detail">Select an option to view details.</span>
      </label>
      <label>Main course
        <select class="main-course" aria-label="Main course for ${escapeAttribute(name)}" required>
          <option value="">Select entrée</option>
          ${mainCourseOptions.map((option) => `<option value="${escapeAttribute(option.value)}">${escapeHtml(option.label)} — ${escapeHtml(option.description)}</option>`).join('')}
        </select>
        <span class="choice-detail main-detail">Select an option to view details.</span>
      </label>
    `;

    const checkbox = row.querySelector('.guest-attending');
    const firstSelect = row.querySelector('.first-course');
    const mainSelect = row.querySelector('.main-course');
    firstSelect.addEventListener('change', () => updateChoiceDetail(row, 'first'));
    mainSelect.addEventListener('change', () => updateChoiceDetail(row, 'main'));
    checkbox.addEventListener('change', () => toggleGuestCourseFields(row, checkbox.checked));
    guestResponses.appendChild(row);
  });
}

function updateChoiceDetail(row, type) {
  const select = row.querySelector(type === 'first' ? '.first-course' : '.main-course');
  const detail = row.querySelector(type === 'first' ? '.first-detail' : '.main-detail');
  const options = type === 'first' ? firstCourseOptions : mainCourseOptions;
  const selected = options.find((option) => option.value === select.value);
  detail.textContent = selected ? selected.description : 'Select an option to view details.';
}

function toggleGuestCourseFields(row, enabled) {
  row.querySelectorAll('select').forEach((select) => {
    select.disabled = !enabled;
    select.required = enabled;
    if (!enabled) select.value = '';
  });
  row.querySelectorAll('.choice-detail').forEach((detail) => {
    detail.textContent = enabled ? 'Select an option to view details.' : 'Not attending.';
  });
}

document.querySelectorAll('input[name="attendanceStatus"]').forEach((radio) => {
  radio.addEventListener('change', (event) => {
    const isDecline = event.target.value === 'declines';
    document.querySelectorAll('#guestResponses input[type="checkbox"]').forEach((input) => {
      input.disabled = isDecline;
      input.checked = !isDecline;
    });
    document.querySelectorAll('#guestResponses .guest-row').forEach((row) => {
      toggleGuestCourseFields(row, !isDecline);
    });
  });
});

rsvpForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitMessage.textContent = '';
  const status = document.querySelector('input[name="attendanceStatus"]:checked')?.value;
  if (!selectedInvitation || !status) {
    showMessage(submitMessage, 'Please select your invitation and attendance status.', 'error');
    return;
  }

  const responses = Array.from(document.querySelectorAll('#guestResponses .guest-row')).map((row) => {
    const checkbox = row.querySelector('.guest-attending');
    const firstCourse = row.querySelector('.first-course')?.value || '';
    const mainCourse = row.querySelector('.main-course')?.value || '';
    return {
      name: row.dataset.guestName,
      attending: checkbox.checked,
      firstCourse: checkbox.checked ? firstCourse : '',
      mainCourse: checkbox.checked ? mainCourse : ''
    };
  }).filter((guest) => status === 'declines' || guest.attending);

  if (status === 'accepts') {
    if (!responses.length) {
      showMessage(submitMessage, 'Please select at least one attending guest.', 'error');
      return;
    }
    const missingCourses = responses.find((guest) => !guest.firstCourse || !guest.mainCourse);
    if (missingCourses) {
      showMessage(submitMessage, `Please choose a first course and main course for ${missingCourses.name}.`, 'error');
      return;
    }
  }

  const payload = {
    invitationId: selectedInvitation.id,
    contactName: document.getElementById('contactName').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    attendanceStatus: status,
    responses,
    dietaryRestrictions: document.getElementById('dietaryRestrictions').value.trim(),
    songRequest: document.getElementById('songRequest').value.trim(),
    message: document.getElementById('message').value.trim()
  };

  showMessage(submitMessage, 'Saving RSVP...', '');
  try {
    const response = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not save RSVP.');

    rsvpForm.classList.add('hidden');
matchResults.innerHTML = '';

const confirmationCard = document.getElementById('confirmationCard');
confirmationCard.classList.remove('hidden');

confirmationCard.innerHTML = `
  <div class="confirmation-card">
    <p class="script">With gratitude</p>
    <h2>Your RSVP Has Been Received</h2>

    <p>Thank you, ${escapeHtml(payload.contactName || selectedInvitation.displayName)}.</p>
    <p>
      We're so excited to celebrate with you at <strong>Chateau Elan Winery & Resort</strong>.
      Your RSVP has been successfully received.
    </p>

    <hr>

    <h3>RSVP Summary</h3>
    <p><strong>Status:</strong> ${status === 'accepts' ? 'Joyfully Accepted' : 'Regretfully Declined'}</p>
    <p><strong>Guests:</strong> ${responses.map(g => escapeHtml(g.name)).join(', ')}</p>

    <hr>

    <h3>Before the Big Day</h3>
    <p>📅 <strong>Wedding Date:</strong> October 25, 2026</p>
    <p>🕓 <strong>Ceremony Begins:</strong> 4:30 PM</p>
    <p>📍 <strong>Venue:</strong> Chateau Elan Winery & Resort</p>
    <p>🤵 <strong>Dress Code:</strong> Black Attire Rquired</p>
    <p>❓ <strong>Need to make changes?</strong> You may return before the RSVP deadline to update your response.</p>

    <button type="button" class="button primary" id="doneConfirmation">Done</button>
  </div>
`;
submitMessage.textContent = '';

document.getElementById('doneConfirmation').addEventListener('click', () => {
  rsvpForm.reset();
  confirmationCard.classList.add('hidden');
confirmationCard.innerHTML = '';
  selectedInvitation = null;
});
  } catch (error) {
    showMessage(submitMessage, error.message, 'error');
  }
});

function clearMessages() {
  [lookupMessage, submitMessage].forEach((message) => {
    message.textContent = '';
    message.className = 'form-message';
  });
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `form-message ${type || ''}`.trim();
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[char]));
}
function escapeAttribute(value = '') { return escapeHtml(value).replace(/`/g, '&#096;'); }

// Make party grid items selectable with hover + click/keyboard
document.querySelectorAll('.party-grid .person').forEach((el) => {
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');

  el.addEventListener('click', () => {
    el.classList.toggle('selected');
  });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.classList.toggle('selected');
    }
  });
});

// Envelope opening video
const envelopeClick = document.getElementById('envelopeClick');
const openEnvelopeVideo = document.getElementById('openEnvelopeVideo');

if (envelopeClick && openEnvelopeVideo) {
  let isOpening = false;

  envelopeClick.addEventListener('click', async () => {
    if (isOpening) return;

    isOpening = true;
    openEnvelopeVideo.classList.remove('hidden');
    openEnvelopeVideo.currentTime = 0;

    try {
      await openEnvelopeVideo.play();
    } catch (error) {
      console.error('Envelope opening video could not play:', error);
      openEnvelopeVideo.classList.add('hidden');
      isOpening = false;
    }
  });

  openEnvelopeVideo.addEventListener('ended', () => {
    openEnvelopeVideo.pause();
    openEnvelopeVideo.currentTime = 0;
    openEnvelopeVideo.classList.add('hidden');
    isOpening = false;
  });
}


