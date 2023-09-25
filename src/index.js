require('dotenv/config')
const mongoose = require('mongoose')
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
});

(async () => {
    try{
        await mongoose.connect("mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.0.1")
        console.log(`✅ Database is connected at ${getDate()}`)
    }
    catch (error){
        console.error("error", error)
        throw error;
    }
})();

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    timeJoined: Date
  });
const User = mongoose.model('User', userSchema);

client.on('ready', async () => {  
    console.log(`✅ ${client.user.username} is online at ${getDate()}.`)
    logsChannel = client.channels.cache.get(process.env.LOGS_CHANNEL_ID)
    logsChannel.send(embed(`✅ ${client.user.username} is online.`))
    const channel = client.channels.cache.find(ch => ch.name === process.env.INVITE_CHANNEL_NAME)
    if (scheduled) {return}
    // Run every hour
    cron.schedule('00 * * * *', async () => {
    console.log('Attempting to kick kids...')
    const guild = client.guilds.cache.first();
    // Add all unverified users to the database
    try {
        let members = await guild.members.fetch();
        await Promise.all(members.map(async member => {
            if(member.user.bot) return
            if(member.roles.cache.has(process.env.VERIFIED_ROLE_ID)) return
            User.findOne({userId: member.user.id})
                .then(existingUser => {
                    if(existingUser){
                        console.log(`${member.user.tag},\n${member.user.id},\n${existingUser.userId}`)
                    }
                    else{
                        newUser = new User({
                            userId: member.user.id,
                            timeJoined: getDate()
                        })
                        newUser.save()
                        console.log(`${member.user.tag} saved successfully`)
                    }
                })
            .catch(err => console.error('Error saving user:', err));
        }));        
    } catch (err) {
        console.error(err);
    }
    // Kick all users who joined more than 48 hours ago and have not verified
    try {
        // Get all users from the database
        members = await fetchUsers()
        console.log(members)
        //let fortyEightHoursAgo = new Date(getDate() - 48*60*60*1000); // 48 hours ago
        let fortyEightHoursAgo = new Date(getDate() - 60 * 60 * 1000) //One hour ago
        await Promise.all(members.map(async member => {   
            // If the user joined more than 48 hours ago
            if(member.timeJoined <= fortyEightHoursAgo) {
                let m = await guild.members.fetch(member.userId);
                if(m.user.bot) {
                    removeUser(m.user.id)
                    return
                }
                if(m.roles.cache.has(process.env.VERIFIED_ROLE_ID)) {
                    removeUser(m.user.id)
                    return
                }
                console.log(`Yes, the member ${m.user.tag} has not verified within 2 days.`);
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
                    await m.send(`You have been kicked for the following reason: You did not join VC and verify as an adult with one of the staff within the 2 day time period.\nIf you are an adult, you can rejoin using this link: ${invite.url}`);
                    //Remove the user from the database
                    removeUser(m.user.id)
                    // Kick the member with reason
                    await m.kick('Kicked for not verifying within the timeline.')
                    // Send a notification user was kicked to the logs channel
                    await logsChannel.send(embed(`Kicked ${m.user.tag} for being a kid.`))
                    count++
                } catch (err) {
                    let m = await guild.members.fetch(member.userId);
                    console.error('Cant kick: ', m.user.tag, err)
                } 
            }
        }))
  
        console.log('Finished Attempting to kick kids.')
        scheduled = true
    } catch (err) {
        if (err.code === 10013) {
            console.error(`User with ID ${member.userId} not found in the guild. Removing from the database.`);
            // Code to remove the user from the database
            removeUser(m.user.id)
        } else {
            console.error('An unknown error occurred:', err);
        }
    }

    })
})

client.on('guildMemberRemove', async member => {
    removeUser(member.user.id);
});

//Function to add a member along with the time they joined to the database when they join
client.on('guildMemberAdd', async(m) => {
    //wait 5 minutes before adding the user to the database
    await delay(5 * 60 * 1000);
    if(m.user.bot) return
    if(m.roles.cache.has(process.env.VERIFIED_ROLE_ID)) return
    writeUser(m.user.id)
})

//When verfied role is added to a user, remove them from the database
client.on('guildMemberRoleAdd', async(member, role) => {
    if(role.id === process.env.VERIFIED_ROLE_ID){
        removeUser(member.user.id)
    }
})

//When verfied role is removed from a user, add them to the database
client.on('guildMemberRoleRemove', async(member, role) => {
    if(role.id === process.env.VERIFIED_ROLE_ID){
        writeUser(member.user.id)
    }
})

client.login(process.env.TOKEN)

function embed(m) {
    output = {embeds: [new EmbedBuilder()
        .setColor(0xFFA500)
        .setDescription(m)
    ]}
    return output
}

async function fetchUsers() {
    try {
      const users = await User.find({})
      return users
    } catch (error) {
      console.error('Error retrieving users:', error);
    }
  }

async function fetchUser(userId) {
    try{
        return User.findOne({ userId: userId })
    }
    catch (error){
        console.error('Error retrieving user:', error);
    }
    
}

async function removeUser(userId) {
    try {
      await User.findOneAndDelete({ userId: userId });
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }

async function writeUser(userId){
    try {
        const newUser = new User({
            userId: userId,
            timeJoined: getDate()
          });
          
          newUser.save()
            .then(() => console.log('User saved successfully'))
            .catch(err => console.error('Error saving user:', err));
    } catch (error) {
        console.error('Error writing user:', error);
    }
}

function getDate(){
    var easternTime = new Date().toLocaleString("en-US", {timeZone: "America/New_York"});
    return easternTime
}