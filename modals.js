
const { insertUsernameQuery,getUserResponses } = require('./db');
const { WebClient } = require('@slack/web-api');

// Function to create Slack client
function createClient() {
  
  const client = new WebClient(process.env.SLACK_TOKEN);
  return client;
}

async function sendDailyMessage() {

  client = await createClient();
  try {
    await client.chat.postMessage({
      channel: "testing-space", 
      text: "Good Morning! Please update your work location for today.",
      attachments: [
        {
          text: "Where will you be working?",
          callback_id: "work_location_selection",
          actions: [
            {
              name: "work_location",
              text: "Update Location",
              type: "button",
              value: "update_location"
            }
          ]
        }
      ]
    });
    console.log("Message sent successfully");
  } catch (error) {
    console.error("Error sending message:", error);
  }

}

async function modalToGetDailyLocation(trigger_id) {

  client = await createClient();
    try {
      await client.views.open({
        trigger_id: trigger_id,
        view: {
          type: "modal",
          callback_id: "work_location_form",
          title: {
            type: "plain_text",
            text: "Daily Work Location",
          },
          blocks: [
            {
              type: "section",
              block_id: "location_section",
              text: {
                type: "mrkdwn",
                text: "Please select your work location for today.",
              },
              accessory: {
                type: "static_select",
                action_id: "location_select",
                placeholder: {
                  type: "plain_text",
                  text: "Select an option",
                },
                options: [
                  {
                    text: {
                      type: "plain_text",
                      text: "Work From Office",
                    },
                    value: "office",
                  },
                  {
                    text: {
                      type: "plain_text",
                      text: "Work From Home",
                    },
                    value: "home",
                  },
                ],
              },
            },
          ],
          submit: {
            type: "plain_text",
            text: "Submit",
          },
        },
      });
      console.log("Modal opened successfully");
    } catch (error) {
      console.error("Error opening modal:", error);
    }
  }

 async function modalToSaveLocation(payload,res){

  client = await createClient();

  const selectedOption = payload.view.state.values.location_section.location_select.selected_option.value;
      const username = payload.user.username;
      const today = new Date().toISOString().split('T')[0];
      const userId = payload.user.id;

      await insertUsernameQuery(username, today, selectedOption);

    
      await client.chat.postMessage({
        channel: userId,
        text: `Your work location has been updated to: ${selectedOption}`,
      });

      return res.send({ response_action: 'clear' });

 } 

async function generateAndSendReport(){

  try {
    client = await createClient();

    activeMembers = []
    next_cursor = null;
    do{

      if(next_cursor)
        result = await client.users.list({"limit":50});
      else
        result = await client.users.list({"cursor":next_cursor,"limit":50});

        Array.prototype.push.apply(activeMembers,result.members.filter(member => !member.deleted && !member.is_bot && 
          member.id !== "USLACKBOT").map(member => member.name))

        next_cursor = result.response_metadata.next_cursor;


    }while(next_cursor != "");

    
    userResponses = await getUserResponses();
    wfhMembers = userResponses.filter(user => user.location == "office").map(user => user.name)
    wfoMembers = userResponses.filter(user => user.location == "home").map(user => user.name)
    nonResponders = activeMembers.filter(member => !userResponses.map(user => user.name).includes(member));

    messageblocks = createMessageBlocks(wfhMembers,wfoMembers,nonResponders)

    await client.chat.postMessage({
      channel: 'all-testing-space', 
      blocks: messageblocks,
    });

    console.log("Report sent successfully!");
  }
  catch (error) {
    console.error(error);
  }


  }

  function createTableRows(members) {
    return members.map(member => ({
      type: 'section',
      block_id: member,
      text: {
        type: 'mrkdwn',
        text: `• ${member}`,
      },
    }));
  }


  function createMessageBlocks(wfhMembers,wfoMembers,nonResponders){
    const messageBlocks = [];

    messageBlocks.push({
      type: 'section',
      block_id: 'header',
      text: {
        type: 'mrkdwn',
        text: '*Daily Report:*\n',
      },
    });

    if (wfhMembers.length > 0) {
      messageBlocks.push({
        type: 'section',
        block_id: 'wfh_header',
        text: {
          type: 'mrkdwn',
          text: '*Work From Home Members:*',
        },
      });
      messageBlocks.push(...createTableRows(wfhMembers));
    } else {
      messageBlocks.push({
        type: 'section',
        block_id: 'wfh_none',
        text: {
          type: 'mrkdwn',
          text: '*Work From Home Members:*\nNone',
        },
      });
    }

    if (wfoMembers.length > 0) {
      messageBlocks.push({
        type: 'section',
        block_id: 'wfo_header',
        text: {
          type: 'mrkdwn',
          text: '*Work From Office Members:*',
        },
      });
      messageBlocks.push(...createTableRows(wfoMembers));
    } else {
      messageBlocks.push({
        type: 'section',
        block_id: 'wfo_none',
        text: {
          type: 'mrkdwn',
          text: '*Work From Office Members:*\nNone',
        },
      });
    }

    if (nonResponders.length > 0) {
      messageBlocks.push({
        type: 'section',
        block_id: 'non_responders_header',
        text: {
          type: 'mrkdwn',
          text: '*Non-Responders:*',
        },
      });
      messageBlocks.push(...createTableRows(nonResponders));
    } else {
      messageBlocks.push({
        type: 'section',
        block_id: 'non_responders_none',
        text: {
          type: 'mrkdwn',
          text: '*Non-Responders:*\nNone',
        },
      });
    }

    return messageBlocks;
  }


  
module.exports = {sendDailyMessage,modalToGetDailyLocation,modalToSaveLocation,generateAndSendReport};