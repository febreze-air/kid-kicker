require("dotenv/config");
const {
  Client,
  IntentsBitField,
  ContextMenuCommandBuilder,
  SlashCommandBuilder,
  ApplicationCommandType,
  REST,
  Routes,
  APIApplicationCommandPermissionsConstant,
} = require("discord.js");
const rest = new REST().setToken(process.env.TOKEN);
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds, 
    ],
});

const commandsData = [
  new ContextMenuCommandBuilder()
    .setName("TimeSinceJoined")
    .setDescription("Get the time since a user joined the server")
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(0),
  new SlashCommandBuilder()
    .setName("TimeSinceJoined")
    .setDescription("Get the time since a user joined the server")
    .setType(ApplicationCommandType.ChatInput)
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to get the time for")
    .setRequired(true)
    )
    .setDefaultMemberPermissions(0), 
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
