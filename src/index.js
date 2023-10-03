require("dotenv/config");
const { Client, IntentsBitField, EmbedBuilder, time } = require("discord.js");
const cron = require("node-cron");
let scheduled = false;
let count = 0;
const delay = (duration) =>
  new Promise((resolve) => setTimeout(resolve, duration));

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.DirectMessages,
  ],
});

client.on("ready", async () => {
  console.log(`✅ ${client.user.username} is online.`);
  logsChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);
  logsChannel.send(embed(`✅ ${client.user.username} is online.`));
  const channel = client.channels.cache.find(
    (ch) => ch.name === process.env.INVITE_CHANNEL_NAME
  );
  const guild = client.guilds.cache.first();
  if (scheduled) return;
  cron.schedule("00 * * * *", async () => {
    console.log("Attempting to kick kids...");
    try {
      let members = await guild.members.fetch();
      await Promise.all(
        members.map(async (member) => {
          if (member.user.bot) return;
          if (member.roles.cache.has(process.env.VERIFIED_ROLE_ID)) return;
          if (!member.kickable) return;
          if (!isUserTooOld(member)) return;
          console.log(
            `No, the member ${member.user.tag} does not have the role with ID "${process.env.VERIFIED_ROLE_ID} and has not verified within the timeline".`
          );
          if (count > 4) {
            console.log("Reached 5 kicks, stopping.");
            await delay(10 * 60 * 1000); // 10 minutes
            count = 0;
            console.log("Resetting kick count.");
          }
          removeUser(member);
        })
      );
      console.log("Finished Attempting to kick kids.");
      scheduled = true;
    } catch (err) {
      console.error(err);
    }
  });
});

//Context menu command handler
client.on("interactionCreate", (interaction) => {
  try {
    if (!interaction.isMessageContextMenuCommand()) return;
    if (interaction.commandName === "TimeSinceJoined") {
      const member = interaction.targetMember;
      const currentTime = new Date();
      const memberJoinedAt = member.joinedAt;
      const timeDifference = currentTime - memberJoinedAt;
      const logsChannel = client.channels.cache.get(
        process.env.LOGS_CHANNEL_ID
      );

      timeSinceJoined = getFormatedTime(timeDifference);

      guild.channels.cache
        .get(logsChannel)
        .send(
          embed(`The user <@${member.user.id}> joined ${timeSinceJoined} ago.`)
        );
    }
  } catch (err) {
    console.error(err);
  }
});

//Slash command handler
client.on("interactionCreate", (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === "TimeSinceJoined") {
      const member = interaction.targetMember;
      const currentTime = new Date();
      const memberJoinedAt = member.joinedAt;
      const timeDifference = currentTime - memberJoinedAt;
      const logsChannel = client.channels.cache.get(
        process.env.LOGS_CHANNEL_ID
      );

      timeSinceJoined = getFormatedTime(timeDifference);

      guild.channels.cache
        .get(logsChannel)
        .send(
          embed(`The user <@${member.user.id}> joined ${timeSinceJoined} ago.`)
        );
    }
  } catch (err) {
    console.error(err);
  }
});

client.login(process.env.TOKEN);

function embed(m) {
  output = {
    embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(m)],
  };
  return output;
}

// Checks if user is too old
function isUserTooOld(member) {
  const currentTime = new Date();
  const memberJoinedAt = member.joinedAt;
  const timeDifference = currentTime - memberJoinedAt;
  const timeUntilKick = process.env.TIME_UNTIL_KICK;
  if (timeDifference > timeUntilKick) {
    return true;
  } else {
    return false;
  }
}

// Removes user from server
async function removeUser(member) {
  try {
    logsChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID);
    const channel = client.channels.cache.find(
      (ch) => ch.name === process.env.INVITE_CHANNEL_NAME
    );
    const invite = await channel.createInvite({
      maxAge: 60 * 60 * 24 * 3, // 3 days
      maxUses: 1, // 1 use
    });
    // Send a DM with the kick reason and invite link
    await member.send(
      `You have been kicked for the following reason: You did not join VC and verify as an adult with one of the staff within the ${
        process.env.VERIFIED_ROLE_ID / (1000 * 60 * 60 * 24)
      } day time period.\nIf you are an adult, you can rejoin using this link: ${
        invite.url
      }`
    );
    // Send a notification user was kicked to the logs channel
    await logsChannel.send(
      embed(`Kicked <@${member.user.id}> for being a kid.`)
    );
    // Kick the member with reason
    await member.kick("Kicked for not verifying within the timeline.");
    count++;
  } catch (err) {
    console.log("Cant kick: ", member.user.tag, err);
  }
}

// Gets the formated time
function getFormatedTime(time) {
  let remaining = timeDifference;

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  remaining %= 1000 * 60 * 60 * 24;

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  remaining %= 1000 * 60 * 60;

  const minutes = Math.floor(remaining / (1000 * 60));
  remaining %= 1000 * 60;

  const seconds = Math.floor(remaining / 1000);

  return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
}
