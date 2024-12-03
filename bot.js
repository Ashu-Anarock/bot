const { App } = require('@slack/bolt');
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cron = require('node-cron');
const { sendDailyMessage, modalToGetDailyLocation,modalToSaveLocation,generateAndSendReport } = require('./modals');

dotenv.config();

// Express app setup
const expressApp = express();
expressApp.use(bodyParser.urlencoded({ extended: true }));
expressApp.use(bodyParser.json());

// Slack commands endpoint
expressApp.post('/slack/commands', async (req, res) => { 
  await sendDailyMessage();
  res.sendStatus(200);
});

// Handle Slack interactions
expressApp.post('/slack/interactions', async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);

    const { type, callback_id } = payload;
    

    if (callback_id === 'work_location_selection') {
      const triggerId = payload.trigger_id;
      await modalToGetDailyLocation(triggerId); 
      return res.sendStatus(200);
    }

    if(type == 'block_actions')
        return res.sendStatus(200);


    if (type === 'view_submission') 
      return modalToSaveLocation(payload,res);

    return res.status(400).send({ error: 'Unhandled interaction type' });

  } catch (err) {
    console.error('Error handling interaction:', err);
    res.status(500).send({ error: err.message });
  }
});

// Schedule daily message
cron.schedule('40 14 * * 1-5', async () => {
  await sendDailyMessage();
});

cron.schedule('27 13 * * 1-5', async () => {
  await generateAndSendReport();
});

// Start Express app
expressApp.listen(process.env.PORT || 3000, () => {
  console.log('Express app is running!');
});
