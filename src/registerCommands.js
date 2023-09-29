require("dotenv/config");
const {
  Client,
  IntentsBitField,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  REST,
  Routes,
} = require("discord.js");
const rest = new REST().setToken(process.env.TOKEN);
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds, 
    ],
});

const commandsData = [
  new ContextMenuCommandBuilder()
    .setName("Time Since Joined")
    .setType(ApplicationCommandType.User),
];

client.on("ready", async () => {
  const clientId = client.user.id;
  const guildId = client.guilds.cache.first().id;
  console.log(`Logged in as ${client.user.tag}! Client ID: ${clientId}`);

  try {
    console.log("Refreashing Context Menu Commands");

    // Register Commands Globally
    // await rest.put(Routes.applicationCommands(clientId), {
    //   body: commandsData,
    // });

    // Register Commands Per Guild
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commandsData,
    });

    console.log("Successfully refreashed Context Menu Commands");

    client.destroy();  // Log the client off
    process.exit();    // End the script
  } catch (error) {
    console.error(error);
  }
});

client.login(process.env.TOKEN);
