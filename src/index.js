require('../dotenv/config')
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js')
const cron = require('node-cron')
let scheduled = false
let count = 0
const delay = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.DirectMessages,
    ],
})

client.on('ready', async () => {
    console.log(`✅ ${client.user.username} is online.`)
    logsChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID)
    logsChannel.send(embed(`✅ ${client.user.username} is online.`))
    const channel = client.channels.cache.find(ch => ch.name === process.env.INVITE_CHANNEL_NAME);  // Replace 'general' with your channel
    if (scheduled) {return}
    cron.schedule('00 * * * *', async () => {
    console.log('Attempting to kick kids...')
    const guild = client.guilds.cache.first();
    try {
        let members = await guild.members.fetch();
        await Promise.all(members.map(async member => {
            if(member.user.bot) return
            if(member.roles.cache.has(process.env.ROLE_TO_KICK_ID)) {
                console.log(`Yes, the member ${member.user.tag} has the role with ID "${process.env.KID_ROLE_ID}".`);
                if(count > 4) {
                    console.log('Reached 5 kicks, stopping.')
                    await delay(10 * 60 * 1000);
                    count = 0
                    console.log('Resetting kick count.')
                }
                try {
                    const invite = await channel.createInvite({
                        maxAge: 60 * 60 * 24 * 3,  // 3 days
                        maxUses: 1  // 1 use
                      });
                    // Send a DM with the kick reason and invite link
                    await member.send(`You have been kicked for the following reason: You did not join VC and verify as an adult with one of the staff within the 2 day time period.\nIf you are an adult, you can rejoin using this link: ${invite.url}`);
                    await member.kick('Kicked for not verifying within the timeline.')
                    await logsChannel.send(embed(`Kicked ${member.user.tag} for being a kid.`))
                    count++
                } catch (err) {
                    console.log('Cant kick: ', member.user.tag, err)
                }
            }
        }));
        console.log('Finished Attempting to kick kids.')
        scheduled = true
    } catch (err) {
        console.error(err);
    }
    })
})

client.login(process.env.TOKEN)

function embed(m) {
    output = {embeds: [new EmbedBuilder()
        .setColor(0xFFA500)
        .setDescription(m)
    ]}
    return output
}

