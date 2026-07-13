@ECHO OFF
node init.mjs
node encrypt_keys.js
node beatify.js
node make_bin_batchnotes.js
node run.js
pause