const { onRequest } = require("firebase-functions/v2/https");

exports.callClaude = onRequest({ cors: true }, (req, res) => {
  return res.status(410).json({ error: "Prompt Builder has been retired." });
});
