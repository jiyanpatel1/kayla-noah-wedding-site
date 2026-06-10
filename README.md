# Kayla & Noah Wedding Website

A black-and-white minimalist wedding website for Kayla Sanders and Noah Johnson with a working RSVP backend.

## What's included

- Editorial black-and-white design inspired by the supplied mood board
- Hero photo and live countdown tracker
- Schedule, wedding party, Q+A, dress code, dinner menu, and RSVP sections
- Guest-list lookup based on `data/guest-list.json`
- RSVP collection with first-course and main-course selections
- Admin page for viewing and exporting RSVP responses

## Dinner selections on RSVP

First course options:
- Baby Gem Caesar Salad
- Tomato Bisque Soup

Main course options:
- Grilled Rib-eye
- Herb Roasted Chicken with Pan Jus

The RSVP page also notes that higher-price plated dinner additions are not included.

## Run locally

Open the unzipped folder in VS Code, then run:

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

Admin page:

```text
http://localhost:3000/admin.html
```

Default admin key:

```text
kayla-noah-2026
```

## RSVP data

RSVP submissions are saved to:

```text
data/rsvps.json
data/rsvps.csv
```

The CSV can also be downloaded from the admin page after loading responses.

## Guest list

The current guest list is stored in:

```text
data/guest-list.json
```

Each guest is currently set up as a single-person invitation so they can search their own name and submit their RSVP individually.
