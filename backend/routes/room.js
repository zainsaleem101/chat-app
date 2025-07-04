const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../utils/supabase');
const router = express.Router();

router.post('/create-room', async (req, res) => {
  const { token } = req.body;
  console.log('Creating room with token:', token);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !user.email_confirmed_at) {
    console.error('Room creation error: Authentication failed or email not verified');
    return res.status(401).json({ error: 'Authentication failed or email not verified' });
  }

  const roomId = uuidv4();
  console.log('Room created with ID:', roomId);
  res.json({ roomId });
});

module.exports = router;