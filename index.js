const { token, apiKeyCMC, urlCMC, database } = require('./config.json');
const { Client, Intents } = require('discord.js');
const fetch = require('node-fetch');
const keyV = require('keyv');
const storage = new keyV(database);
storage.on('error', err => console.error('KeyV connection error:', err));

const decimalToShow = 5;
const checkMinutes = 15;
const checkInterval = checkMinutes * 60 * 1000;
const keyStorageChannelId = 'channelId';

let JPEGValue = -1;

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
    console.log('Ready!')
    setInterval(updateInterval, checkInterval);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'init') {
        storage.get(keyStorageChannelId)
            .then((channelId) => {
                if (channelId) {
                    interaction.guild.channels.fetch(channelId)
                        .then(channel => channel.delete())
                }
            })
            .then(() => interaction.guild.channels.create('JPEG:', {
                reason: 'vocal', type: 2, permissionOverwrites: [{
                    id: interaction.guild.roles.everyone,
                    deny: ['CONNECT'],
                }, {
                    id: client.user.id,
                    allow: ['CONNECT'],
                }]
            }))
            .then(e => storage.set(keyStorageChannelId, e.id))
            .then(updateInterval)
            .then(interaction.reply('Success!'))
            .catch(console.error);
    }
});

client.login(token);

function updateInterval() {
    return storage.get(keyStorageChannelId).then(channelId => {
        if (channelId === undefined) throw null
        return getNewValue(channelId);
    })
}

function getNewValue(channelId) {
    return fetch(urlCMC, {
        method: 'GET',
        headers: {
            'X-CMC_PRO_API_KEY': apiKeyCMC,
        }})
        .then(response => response.json())
        .then(data => {
            JPEGValue = data.data.quote.USD.price;
            JPEGValue = JPEGValue.toFixed(decimalToShow);
            return client.channels.fetch(channelId);
        })
        .then(channel => channel.setName(`Value: ${JPEGValue}`))
        .catch(console.error)
}

