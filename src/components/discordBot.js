//Requires
const fs = require('fs');
const Discord = require('discord.js');
const { dir, log, logOk, logWarn, logError, cleanTerminal } = require('../extras/console');
const context = 'DiscordBot';


module.exports = class DiscordBot {
    constructor(config) {
        this.config = config;
        if(!this.config.enabled){
            logOk('::Disabled by the config file.', context);
            return;
        }    
        this.client = new Discord.Client({autoReconnect:true});
        this.messages = [];

        this.refreshStaticMessages();
        this.startBot();

        //Cron Function
        setInterval(() => {
            this.refreshStaticMessages();
        }, this.config.refreshInterval);
    }


    //================================================================
    async startBot(){
        //Setup event listeners
        this.client.on('ready', () => {
            logOk(`::Started and logged in as '${this.client.user.tag}'`, context);
            this.client.user.setActivity(globals.config.serverName, {type: 'WATCHING'});
            // let chan = this.client.channels.find(u => u.name === 'general');
            // chan.send('Hello, chat!');
        });
        this.client.on('message', this.handleMessage.bind(this));
        this.client.on('error', (error) => {
            logError(error.message, context);
        });
        this.client.on('resume', (error) => {
            logOk('Connection resumed', context);
        });

        //Start bot
        try {
            await this.client.login(this.config.token);
        } catch (error) {
            logError(error.message, context);
            process.exit();
        }
    }
    

    //================================================================
    async handleMessage(message){
        if(message.author.bot) return;
        let out = '';

        //Checking if message is a command
        if(message.content.startsWith(this.config.statusCommand)){
            //Prepare message's data
            let dataServer = globals.monitor.statusServer; //shorthand much!?
            let color = (dataServer.online)? 0x74EE15 : 0xF000FF;
            let title = (dataServer.online)
                ? `${globals.config.serverName} is currently **Online**!` 
                : `${globals.config.serverName} is currently **Offline**!`;
            let players = (dataServer.online && typeof dataServer.players !== 'undefined')? dataServer.players.length : '--';
            let desc = '';
            desc += `**IP:** ${globals.config.publicIP}:${globals.config.fxServerPort}\n`;
            desc += `**Players:** ${players}\n`;
            
            //Prepare object
            out = new Discord.RichEmbed();
            out.setTitle(title);
            out.setColor(color);
            out.setDescription(desc); 

        }else if(message.content.startsWith('/fxadmin') || message.content.startsWith('/txadmin')){
            //Prepare object
            out = new Discord.RichEmbed();
            out.setTitle(`${globals.config.serverName} uses txAdmin v${globals.version.current}!`);
            out.setColor(0x4DEEEA);
            out.setDescription(`Checkout the project:\n Forum: https://forum.fivem.net/t/530475\n Discord: https://discord.gg/f3TsfvD`); 

        }else{
            let msg = this.messages.find((staticMessage) => {return message.content.startsWith(staticMessage.trigger)});
            if(!msg) return;
            out = msg.message;

        }

        //Sending message
        try {
            await message.channel.send(out);
        } catch (error) {
            logError(`Failed to send message with error: ${error.message}`, context);
        }
        /*
            message.content
            message.author.username
            message.author.id
            message.guild.name //servername
            message.channel.name

            message.reply('pong'); //<<reply directly to the user mentioning him
            message.channel.send('Pong.');
        */
    }


    //================================================================
    async refreshStaticMessages(){
        let raw = null;
        let jsonData = null;

        try {
            raw = fs.readFileSync(this.config.messagesFilePath, 'utf8');  
        } catch (error) {
            logError('Unable to load discord messages. (cannot read file, please read the documentation)', context);
            logError(error.message, context);
            this.messages = [];
            return;
        }

        try {
            jsonData = JSON.parse(raw);
        } catch (error) {
            logError('Unable to load discord messages. (json parse error, please read the documentation)', context);
            this.messages = [];
            return;
        }

        let structureIntegrityTest = jsonData.some((x) =>{
            if(typeof x.trigger === 'undefined' || typeof x.trigger !== 'string') return true;
            if(typeof x.message === 'undefined' || typeof x.message !== 'string') return true;
            return false;
        });
        if(structureIntegrityTest){
            logError('Unable to load discord messages. (invalid data in the messages file, please read the documentation)', context);
            this.messages = [];
            return;
        }

        this.messages = jsonData;
        if(globals.config.verbose) log(`Discord messages file loaded. Found: ${this.messages.length}`, context);
    }

} //Fim DiscordBot()
