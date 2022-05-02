const { token, apiKeyCMC, urlCMC, database } = require('./config.json');
const { Client, Intents } = require('discord.js');
const fetch = require('node-fetch');
const keyV = require('keyv');
const storage = new keyV(database);
storage.on('error', err => console.error('KeyV connection error:', err));

const decimalToShow = 5;
const checkMinutes = 15;
const checkInterval = checkMinutes * 60 * 1000;
const supply = 565000000;
const keyStorageChannelId = 'channelId';
const keyStorageChannelMCId = 'channelMCId';

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
        storage.get(keyStorageChannelId + interaction.guild.id)
            .then((channelId) => {
                if (channelId) {
                    interaction.guild.channels.fetch(channelId)
                        .then(channel => channel.delete())
                }
            })
            .then(() => interaction.guild.channels.create(' | Price : initializing', {
                reason: 'vocal', type: 2, permissionOverwrites: [{
                    id: interaction.guild.roles.everyone,
                    deny: ['CONNECT'],
                }, {
                    id: client.user.id,
                    allow: ['CONNECT'],
                }]
            }))
            .then(e => storage.set(keyStorageChannelId+interaction.guild.id, e.id))
            .then(() => interaction.guild.channels.create(' | MC : initializing', {
                reason: 'vocal', type: 2, permissionOverwrites: [{
                    id: interaction.guild.roles.everyone,
                    deny: ['CONNECT'],
                }, {
                    id: client.user.id,
                    allow: ['CONNECT'],
                }]
            }))
            .then(e => storage.set(keyStorageChannelMCId+interaction.guild.id, e.id))
            .then(e => addGuildToActive(interaction.guild.id))
            .then(interaction.reply('Success!'))
            .catch(console.error);
    }
});

client.login(token);

function updateInterval() {
    return storage.get("activeGuilds")
        .then(e => {
            return e;
        })
        .then(activeGuilds => {
            for (let i = 0; i < activeGuilds.length; i++) {
                storage.get(keyStorageChannelId+activeGuilds[i])
                    .then(channelId => {
                        if (channelId === undefined) throw null
                        return getNewValue(channelId);
                    }).then(e => {
                        storage.get(keyStorageChannelMCId+activeGuilds[i])
                            .then(channelId => {
                                if (channelId === undefined) throw null
                                return client.channels.fetch(channelId);
                            })
                            .then(channel => {
                                let marketCap = JPEGValue * supply;
                                marketCap = marketCapFormatter(marketCap, 1);
                                return channel.setName(`｜MC: ${marketCap}$`);
                            })
                })
            }
        });
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
        .then(channel => channel.setName(`｜Price: ${JPEGValue}$`))
        .catch(console.error)
}

function addGuildToActive(guildId) {
    return storage.get("activeGuilds")
        .then(data => {
            if (!data) return [];
            return data;
        })
        .then(activeGuilds => {
            let guilds = activeGuilds.filter(item => item !== guildId);
            guilds.push(guildId);
            storage.set("activeGuilds", guilds).then(updateInterval)
        })
        .catch(console.error)
}

function marketCapFormatter(num, digits) {
    const lookup = [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "G" },
        { value: 1e12, symbol: "T" },
        { value: 1e15, symbol: "P" },
        { value: 1e18, symbol: "E" }
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    var item = lookup.slice().reverse().find(function(item) {
        return num >= item.value;
    });
    return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
}