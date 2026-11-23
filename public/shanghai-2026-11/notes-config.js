/**
 * Shanghai trip notes → Google Sheet (Apps Script web app).
 * When the /exec URL is rotated, change ONLY NOTES_ENDPOINT below.
 * Do not put passcodes here.
 */
(function (global) {
  "use strict";
  // TODO: replace with the new /exec URL when issued (old AKfycbzISu… is retired).
  var NOTES_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbwoQysQAkHAZ0rwUV76Wj5FV4n4Kxq4ZPU07Mkp6r2gMtwDfjgI3yKNmC1JC4DM5QbDjQ/exec";

  global.ShanghaiNotesConfig = {
    endpoint: NOTES_ENDPOINT,
  };
})(typeof window !== "undefined" ? window : globalThis);
