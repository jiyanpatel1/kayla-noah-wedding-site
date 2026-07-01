const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'kayla-noah-2026';

const GOOGLE_SHEETS_WEBHOOK =
  'https://script.google.com/macros/s/AKfycbxPx9O4VaeC1BGji1HqPIwb2zBk1Zax2SCEAdo1bK8maCnOXd93TvtzLmX3xfvzVM1X/exec';

const DATA_DIR = path.join(__dirname, 'data');
const GUESTS_FILE = path.join(DATA_DIR, 'guest-list.json');
const RSVPS_FILE = path.join(DATA_DIR, 'rsvps.json');
const RSVPS_CSV = path.join(DATA_DIR, 'rsvps.csv');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(GUESTS_FILE)) fs.writeFileSync(GUESTS_FILE, '[]');
  if (!fs.existsSync(RSVPS_FILE)) fs.writeFileSync(RSVPS_FILE, '[]');
}

function readJson(filePath, fallback) {
  ensureFiles();
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Could not read ${filePath}:`, err);
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureFiles();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function normalize(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function csvEscape(value) {
  const str = value === undefined || value === null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function writeCsv(rsvps) {
  ensureFiles();

  const headers = [
    'submittedAt',
    'invitationId',
    'invitationName',
    'contactName',
    'email',
    'phone',
    'attendanceStatus',
    'guestName',
    'guestAttending',
    'firstCourse',
    'mainCourse',
    'dietaryRestrictions',
    'songRequest',
    'message'
  ];

  const rows = [headers.join(',')];

  for (const rsvp of rsvps) {
    const responses =
      Array.isArray(rsvp.responses) && rsvp.responses.length
        ? rsvp.responses
        : [{}];

    for (const response of responses) {
      rows.push(
        headers
          .map((h) => {
            if (h === 'guestName') return csvEscape(response.name);
            if (h === 'guestAttending') return csvEscape(response.attending);
            if (h === 'firstCourse') return csvEscape(response.firstCourse);
            if (h === 'mainCourse') return csvEscape(response.mainCourse);
            return csvEscape(rsvp[h]);
          })
          .join(',')
      );
    }
  }

  fs.writeFileSync(RSVPS_CSV, rows.join('\n'));
}

async function sendToGoogleSheets(submission) {
  try {
    for (const guest of submission.responses) {
      await fetch(GOOGLE_SHEETS_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId: submission.invitationId,
          guestName: guest.name,
          attending: guest.attending,
          firstCourse: guest.firstCourse,
          mainCourse: guest.mainCourse,
          dietaryRestrictions: submission.dietaryRestrictions,
          songRequest: submission.songRequest,
          message: submission.message
        })
      });
    }

    console.log('RSVP backed up to Google Sheets.');
  } catch (error) {
    console.error('Google Sheets backup failed:', error);
  }
}

app.post('/api/find-guest', (req, res) => {
  const query = normalize(req.body?.name);

  if (!query || query.length < 2) {
    return res.status(400).json({
      error: 'Please enter at least 2 characters.'
    });
  }

  const guests = readJson(GUESTS_FILE, []);

  const matches = guests
    .filter((party) => {
      const partyName = normalize(party.displayName);
      const individualNames = (party.guests || []).map(normalize);

      return (
        partyName.includes(query) ||
        individualNames.some((name) => name.includes(query))
      );
    })
    .slice(0, 8);

  res.json({ matches });
});

app.post('/api/rsvp', async (req, res) => {
  const body = req.body || {};

  const invitationId = String(body.invitationId || '').trim();
  const contactName = String(body.contactName || '').trim();
  const email = String(body.email || '').trim();
  const attendanceStatus = String(body.attendanceStatus || '').trim();

  if (!invitationId || !contactName || !attendanceStatus) {
    return res.status(400).json({
      error: 'Missing required RSVP fields.'
    });
  }

  const guests = readJson(GUESTS_FILE, []);
  const invitation = guests.find((g) => g.id === invitationId);

  if (!invitation) {
    return res.status(404).json({
      error: 'This invitation was not found on the guest list.'
    });
  }

  const allowedNames = new Set((invitation.guests || []).map(normalize));
  const responses = Array.isArray(body.responses) ? body.responses : [];

  const cleanResponses = responses
    .map((response) => ({
      name: String(response.name || '').trim(),
      attending: Boolean(response.attending),
      firstCourse: String(response.firstCourse || '').trim(),
      mainCourse: String(response.mainCourse || '').trim()
    }))
    .filter((response) => {
      return (
        allowedNames.has(normalize(response.name)) ||
        invitation.guests.length === 0
      );
    });

  if (attendanceStatus === 'accepts' && cleanResponses.length === 0) {
    return res.status(400).json({
      error: 'Please select at least one attending guest.'
    });
  }

  if (
    attendanceStatus === 'accepts' &&
    cleanResponses.some(
      (response) => !response.firstCourse || !response.mainCourse
    )
  ) {
    return res.status(400).json({
      error:
        'Please choose a first course and main course for each attending guest.'
    });
  }

  const rsvps = readJson(RSVPS_FILE, []);

  const submission = {
    submittedAt: new Date().toISOString(),
    invitationId,
    invitationName: invitation.displayName,
    contactName,
    email,
    phone: String(body.phone || '').trim(),
    attendanceStatus,
    responses:
      attendanceStatus === 'declines'
        ? (invitation.guests || []).map((name) => ({
            name,
            attending: false,
            firstCourse: '',
            mainCourse: ''
          }))
        : cleanResponses,
    dietaryRestrictions: String(body.dietaryRestrictions || '').trim(),
    songRequest: String(body.songRequest || '').trim(),
    message: String(body.message || '').trim()
  };

  const existingIndex = rsvps.findIndex(
    (r) => r.invitationId === invitationId
  );

  if (existingIndex >= 0) {
    rsvps[existingIndex] = submission;
  } else {
    rsvps.push(submission);
  }

  writeJson(RSVPS_FILE, rsvps);
  writeCsv(rsvps);

  await sendToGoogleSheets(submission);

  res.json({
    ok: true,
    message: 'RSVP saved.',
    submission
  });
});

app.get('/api/rsvps', (req, res) => {
  if (req.query.adminKey !== ADMIN_KEY) {
    return res.status(401).json({
      error: 'Invalid admin key.'
    });
  }

  const rsvps = readJson(RSVPS_FILE, []);
  res.json(rsvps);
});

app.get('/api/rsvps/export', (req, res) => {
  if (req.query.adminKey !== ADMIN_KEY) {
    return res.status(401).json({
      error: 'Invalid admin key.'
    });
  }

  const rsvps = readJson(RSVPS_FILE, []);
  writeCsv(rsvps);

  res.download(RSVPS_CSV, 'kayla-noah-rsvps.csv');
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  ensureFiles();

  const existingRsvps = readJson(RSVPS_FILE, []);
  writeCsv(existingRsvps);

  console.log(`Kayla & Noah wedding site running on port ${PORT}`);
  console.log(`Admin key: ${ADMIN_KEY}`);
});
