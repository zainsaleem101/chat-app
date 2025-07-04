const express = require('express');
const { supabase } = require('../utils/supabase');
const router = express.Router();

router.post('/verify', async (req, res) => {
  const { token } = req.body;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return res.status(401).json({ error: 'Invalid token' });
  res.json({ user: data.user });
});

module.exports = router;