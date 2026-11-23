/**
 * Shanghai trip notes → Google Sheet (Apps Script web app).
 * When the /exec URL is rotated, change ONLY NOTES_ENDPOINT below.
 * Do not put passcodes here.
 */
(function (global) {
  "use strict";
  // TODO: replace with the new /exec URL when issued (old AKfycbzISu… is retired).
  var NOTES_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbzISu20C4SV_LGGFE48BB8n9wDaZxToZDheY1l6lGp2rJPs7YLAaxq6LX0LHdom_JTrlA/exec";

  global.ShanghaiNotesConfig = {
    endpoint: NOTES_ENDPOINT,
  };
})(typeof window !== "undefined" ? window : globalThis);
