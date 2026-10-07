"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ggSansFont = exports.revealSpoiler = exports.scrollToMessage = exports.mentionPopup = exports.mentionPopupStyles = exports.backToTop = exports.transcriptUtils = exports.searchBar = exports.searchBarStyles = exports.lightbox = exports.lightboxStyles = exports.toc = exports.tocStyles = exports.i18nSwitcher = exports.i18nStyles = exports.dateSeparatorStyles = exports.markdownStyles = exports.filterPanel = exports.filterPanelStyles = exports.userFlagBadges = exports.codeCopyButton = exports.permalinkButton = void 0;

// ===========================================================================
// scrollToMessage — uses composedPath() so clicks inside Web-Component shadow
// DOM (e.g. inside <discord-container>) still find the [data-goto] element.
// ===========================================================================
exports.scrollToMessage = `document.addEventListener('click',function(e){if(!e||e.defaultPrevented)return;
  var path=(typeof e.composedPath==='function')?e.composedPath():[];
  if(!path.length){var n=e.target;while(n){path.push(n);n=n.parentNode||(n.host);}}
  var g=null;
  for(var i=0;i<path.length;i++){var el=path[i];if(el&&el.getAttribute){var v=el.getAttribute('data-goto');if(v){g=v;break;}}}
  if(!g)return;
  var r=document.getElementById('m-'+g);
  if(r){r.scrollIntoView({behavior:'smooth',block:'center'});var prev=r.style.backgroundColor;r.style.transition='background-color 0.5s ease';r.style.backgroundColor='rgba(148,156,247,0.18)';setTimeout(function(){r.style.backgroundColor=prev||'transparent';},1200);}
  else{console.warn('Message '+g+' not found.');}
});`;

exports.revealSpoiler = `var s=document.querySelectorAll('.discord-spoiler');s.forEach(function(s){s.setAttribute('role','button');s.setAttribute('tabindex','0');s.setAttribute('aria-label','Reveal spoiler');function reveal(){if(s.classList.contains('discord-spoiler')){s.classList.add('discord-spoiler--revealing');setTimeout(function(){s.classList.remove('discord-spoiler');s.classList.add('discord-spoiler--revealed');s.classList.remove('discord-spoiler--revealing');},220);}}s.addEventListener('click',reveal);s.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();reveal();}});});`;

// ===========================================================================
// Code-block copy-button — hovers over any <pre>/.dht-codeblock/.discord-highlighted-code
// ===========================================================================
exports.codeCopyButton = `(function(){
  function attach(){
    var blocks=document.querySelectorAll('pre, .dht-codeblock, .discord-highlighted-code, .dht-inline-code');
    blocks.forEach(function(b){
      if(b.tagName==='CODE' && b.parentElement && b.parentElement.tagName==='PRE')return;
      if(b.dataset.dhtCopyAttached)return;
      b.dataset.dhtCopyAttached='1';
      b.style.position='relative';
      var btn=document.createElement('button');btn.type='button';btn.className='dht-copy-btn';btn.title='Copy code';btn.setAttribute('aria-label','Copy code');btn.innerHTML='&#x2398;';
      btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var text=b.innerText||b.textContent||'';try{navigator.clipboard.writeText(text);btn.classList.add('dht-copy-btn--ok');btn.innerHTML='&#x2713;';setTimeout(function(){btn.classList.remove('dht-copy-btn--ok');btn.innerHTML='&#x2398;';},1200);}catch(_){}});
      b.appendChild(btn);
    });
  }
  attach();
  if(typeof MutationObserver!=='undefined'){var mo=new MutationObserver(attach);mo.observe(document.body,{childList:true,subtree:true});}
})();`;

// ===========================================================================
// Per-message permalink button (top-right on hover)
// ===========================================================================
exports.permalinkButton = `(function(){
  document.addEventListener('mouseenter',function(e){
    if(!e.target||!e.target.tagName)return;
    var t=e.target;
    if(t.tagName!=='DISCORD-MESSAGE' && t.tagName!=='DISCORD-SYSTEM-MESSAGE')return;
    if(t.querySelector('.dht-permalink-btn'))return;
    var btn=document.createElement('button');btn.type='button';btn.className='dht-permalink-btn';btn.title='Copy permalink';btn.setAttribute('aria-label','Copy permalink');btn.innerHTML='&#x1F517;';
    btn.addEventListener('click',function(e2){e2.preventDefault();e2.stopPropagation();var url=location.href.split('#')[0]+'#'+t.id;try{navigator.clipboard.writeText(url);btn.classList.add('dht-permalink-btn--ok');setTimeout(function(){btn.classList.remove('dht-permalink-btn--ok');},1000);}catch(_){}});
    t.appendChild(btn);
  },true);
})();`;

// ===========================================================================
// i18n — default dictionaries, used by both server-side renderers and client-side scripts
// ===========================================================================
const defaultDicts = {
    en: {
        edited: 'edited',
        editedAt: 'Edited at {time}',
        yesterdayAt: 'Yesterday at {time}',
        joined: 'joined the server',
        pinned: 'pinned {message} to this channel.',
        pinnedLink: 'a message',
        boosted: 'boosted the server!',
        threadStarted: 'started a thread:',
        changedChannelName: 'changed the channel name:',
        changedChannelIcon: 'changed the channel icon.',
        usedCommand: 'used',
        startedCall: 'started a call.',
        addedFollow: 'added {target} to follow this channel.',
        left: 'left.',
        autoModBlocked: 'AutoMod blocked a message.',
        serverAlert: 'Server safety alert.',
        pollEnded: 'A poll ended.',
        roleSubPurchased: 'subscribed to {role}!',
        forwardedFrom: 'Forwarded from',
        forwardUnavailable: 'Forwarded message is unavailable',
        searchPlaceholder: 'Search transcript…',
        ofMatches: 'of',
        noMatches: 'no matches',
        backToTop: 'Back to top',
        tocTitle: 'Participants',
        statsMessages: '{n} messages',
        statsParticipants: '{n} participants',
        statsImages: '{n} images',
        statsMessage: '{n} message',
        statsParticipant: '{n} participant',
        statsImage: '{n} image',
        crossServerReply: 'Message from another server',
        appBadge: 'APP',
        botBadge: 'BOT',
        editHistoryTitle: 'Edit history',
        editHistoryAt: 'at',
        voiceMessage: 'Voice message',
        forwardedMessage: 'Forwarded',
        languageLabel: 'Language',
        threadArchived: 'Archived',
        threadLocked: 'Locked',
        suppressedEmbeds: '(embeds hidden)',
        filterPanel: 'Filter',
        filterKeyword: 'Keyword',
        filterAuthor: 'Author',
        filterRole: 'Role',
        filterFrom: 'From',
        filterTo: 'To',
        filterPinned: 'Pinned only',
        filterHasImage: 'Has image',
        filterHasEmbed: 'Has embed',
        filterHasAttachment: 'Has attachment',
        filterHasComponentV2: 'Has container',
        filterApply: 'Apply',
        filterReset: 'Reset',
        flags: 'Badges',
    },
    de: {
        edited: 'bearbeitet',
        editedAt: 'Bearbeitet am {time}',
        yesterdayAt: 'Gestern um {time}',
        joined: 'ist dem Server beigetreten',
        pinned: 'hat {message} in diesem Channel angepinnt.',
        pinnedLink: 'eine Nachricht',
        boosted: 'hat den Server geboostet!',
        threadStarted: 'hat einen Thread gestartet:',
        changedChannelName: 'hat den Channel-Namen geändert:',
        changedChannelIcon: 'hat das Channel-Icon geändert.',
        usedCommand: 'hat',
        startedCall: 'hat einen Anruf gestartet.',
        addedFollow: 'hat {target} hinzugefügt, um diesem Channel zu folgen.',
        left: 'hat den Channel verlassen.',
        autoModBlocked: 'AutoMod hat eine Nachricht blockiert.',
        serverAlert: 'Sicherheitswarnung.',
        pollEnded: 'Eine Umfrage wurde beendet.',
        roleSubPurchased: 'hat {role} abonniert!',
        forwardedFrom: 'Weitergeleitet von',
        forwardUnavailable: 'Weitergeleitete Nachricht ist nicht verfügbar',
        searchPlaceholder: 'Im Transcript suchen…',
        ofMatches: 'von',
        noMatches: 'keine Treffer',
        backToTop: 'Nach oben',
        tocTitle: 'Teilnehmer',
        statsMessages: '{n} Nachrichten',
        statsParticipants: '{n} Teilnehmer',
        statsImages: '{n} Bilder',
        statsMessage: '{n} Nachricht',
        statsParticipant: '{n} Teilnehmer',
        statsImage: '{n} Bild',
        crossServerReply: 'Nachricht von einem anderen Server',
        appBadge: 'APP',
        botBadge: 'BOT',
        editHistoryTitle: 'Bearbeitungs-Verlauf',
        editHistoryAt: 'am',
        voiceMessage: 'Sprachnachricht',
        forwardedMessage: 'Weitergeleitet',
        languageLabel: 'Sprache',
        threadArchived: 'Archiviert',
        threadLocked: 'Gesperrt',
        suppressedEmbeds: '(Embeds versteckt)',
        filterPanel: 'Filter',
        filterKeyword: 'Suchbegriff',
        filterAuthor: 'Author',
        filterRole: 'Rolle',
        filterFrom: 'Von',
        filterTo: 'Bis',
        filterPinned: 'Nur angepinnt',
        filterHasImage: 'Mit Bild',
        filterHasEmbed: 'Mit Embed',
        filterHasAttachment: 'Mit Anhang',
        filterHasComponentV2: 'Mit Container',
        filterApply: 'Anwenden',
        filterReset: 'Zurücksetzen',
        flags: 'Abzeichen',
    },
};

// User flag emoji map (Discord badge names → emoji approximation)
const FLAG_BADGES = {
    Staff: { emoji: '🛡', label: 'Discord Staff', color: '#5865F2' },
    Partner: { emoji: '🤝', label: 'Partnered Server Owner', color: '#5865F2' },
    Hypesquad: { emoji: '🎉', label: 'HypeSquad Events', color: '#FBB848' },
    BugHunterLevel1: { emoji: '🐛', label: 'Bug Hunter', color: '#3E70DD' },
    BugHunterLevel2: { emoji: '🐞', label: 'Bug Hunter Gold', color: '#FFD700' },
    HypeSquadOnlineHouse1: { emoji: '💜', label: 'HypeSquad Bravery', color: '#9C84EF' },
    HypeSquadOnlineHouse2: { emoji: '💙', label: 'HypeSquad Brilliance', color: '#F47B67' },
    HypeSquadOnlineHouse3: { emoji: '💚', label: 'HypeSquad Balance', color: '#45DDC0' },
    PremiumEarlySupporter: { emoji: '⭐', label: 'Early Supporter', color: '#FF73FA' },
    VerifiedBot: { emoji: '✓', label: 'Verified Bot', color: '#5865F2' },
    VerifiedDeveloper: { emoji: '✅', label: 'Early Verified Developer', color: '#5865F2' },
    CertifiedModerator: { emoji: '🎖', label: 'Certified Moderator', color: '#5865F2' },
    BotHTTPInteractions: { emoji: '🔗', label: 'HTTP Interactions', color: '#5865F2' },
    ActiveDeveloper: { emoji: '🔧', label: 'Active Developer', color: '#3BA55D' },
    Spammer: { emoji: '🚫', label: 'Spammer', color: '#ED4245' },
    Quarantined: { emoji: '⚠', label: 'Quarantined', color: '#ED4245' },
};
exports.userFlagBadges = FLAG_BADGES;

function getDict(lang) {
    if (lang && defaultDicts[lang]) return defaultDicts[lang];
    return defaultDicts.en;
}
exports.getDict = getDict;
exports.defaultDicts = defaultDicts;

// ===========================================================================
// mentionPopup — clickable user/role/channel pills
// Reads from window.$discordMessage.{users,roles,channels,profiles}.
// Uses safe color validation to block CSS injection.
// ===========================================================================
exports.mentionPopup = `(function(){
  function DATA(){return (typeof globalThis!=='undefined' && globalThis.$discordMessage)||{};}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function safeColor(c,fb){fb=fb||'#5865F2';return typeof c==='string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : fb;}
  function t(key){var d=DATA();var lang=d.lang||'en';var dict=(d.i18n&&d.i18n[lang])||(d.i18n&&d.i18n.en)||{};return dict[key]||key;}
  function fmt(iso){if(!iso)return '';try{var d=new Date(iso);return isNaN(d.getTime())?'':d.toLocaleString(DATA().lang==='de'?'de-DE':'en-US',{dateStyle:'medium',timeStyle:'short'});}catch(_){return '';}}
  function copyBtn(text,label){if(text==null||text==='')return '';return '<button type="button" class="dht-popup-copy" data-copy="'+esc(text)+'" title="Copy '+esc(label||'value')+'" aria-label="Copy '+esc(label||'value')+'"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>';}
  var popup=null;
  function isTriggerInPath(path){
    for(var i=0;i<path.length;i++){
      var x=path[i];if(!x)continue;
      if(x.getAttribute && x.getAttribute('data-mention-id'))return true;
      if(x.tagName && typeof x.tagName==='string'){var tn=x.tagName.toLowerCase();if(tn==='discord-command')return true;}
      if(x.classList){
        if(x.classList.contains('discord-author-info')||x.classList.contains('discord-author-username')||x.classList.contains('discord-author-avatar')||x.classList.contains('discord-application-tag'))return true;
      }
    }
    return false;
  }
  function ensure(){
    if(popup)return popup;
    popup=document.createElement('div');popup.className='dht-popup';popup.setAttribute('role','dialog');
    popup.innerHTML='<div class="dht-popup-body"></div><button type="button" class="dht-popup-close" aria-label="Close">&times;</button>';
    document.body.appendChild(popup);
    popup.querySelector('.dht-popup-close').addEventListener('click',hide);
    document.addEventListener('click',function(e){
      if(!e||e.defaultPrevented)return;
      if(!popup||popup.style.display!=='block')return;
      if(popup.contains(e.target))return;
      var path=(typeof e.composedPath==='function')?e.composedPath():[];
      if(isTriggerInPath(path))return;
      hide();
    });
    document.addEventListener('keydown',function(e){if(e.key==='Escape')hide();});
    window.addEventListener('resize',hide);
    return popup;
  }
  function hide(){if(popup)popup.style.display='none';}
  function showAt(el,html){var p=ensure();p.querySelector('.dht-popup-body').innerHTML=html;p.style.display='block';var r=el.getBoundingClientRect();var pr=p.getBoundingClientRect();var pad=8;var top=r.bottom+6;var left=r.left;if(top+pr.height>window.innerHeight-pad)top=Math.max(pad,r.top-pr.height-6);if(left+pr.width>window.innerWidth-pad)left=Math.max(pad,window.innerWidth-pr.width-pad);if(left<pad)left=pad;p.style.top=top+'px';p.style.left=left+'px';}
  function rolePill(role){var c=safeColor(role&&role.color);return '<span class="dht-role-pill" style="--dht-role:'+c+';">'+esc(role&&role.name?role.name:'@role')+'</span>';}
  function flagBadgeHtml(flagName){try{var dh=globalThis.__DHT_FLAG_BADGES__||{};var b=dh[flagName];if(b)return '<span class="dht-flag" title="'+esc(b.label)+'" style="color:'+safeColor(b.color)+';">'+esc(b.emoji)+'</span>';}catch(_){};return '<span class="dht-flag" title="'+esc(flagName)+'">'+esc(flagName)+'</span>';}
  function userHtml(id){
    var d=DATA();
    var u=(d.users&&d.users[id])||null;
    var p=(d.profiles&&d.profiles[id])||null;
    if(!u&&!p)return '<i>?</i><div class="dht-popup-id">ID: <code>'+esc(id)+'</code>'+copyBtn(id,'user ID')+'</div>';
    var name=(u&&(u.displayName||u.username))||(p&&p.author)||'Unknown';
    var username=u&&u.username?'@'+u.username:'';
    var avatar=(u&&u.avatar)||(p&&p.avatar)||'';
    var color=safeColor((u&&u.bannerColor)||(p&&p.roleColor),'#dbdee1');
    var bot=(u&&u.bot)||(p&&p.bot);
    var verifiedBot=u&&u.verifiedBot;
    var roles=u&&Array.isArray(u.roles)&&u.roles.length?u.roles.map(rolePill).join(''):'';
    var flags=u&&Array.isArray(u.flags)&&u.flags.length?u.flags.filter(function(f){return f!=='VerifiedBot';}).map(flagBadgeHtml).join(''):'';
    var joinedAt=u&&u.joinedAt?fmt(u.joinedAt):'';
    var createdAt=u&&u.createdAt?fmt(u.createdAt):'';
    var botBadge=bot?(' <span class="dht-popup-badge">'+esc(t('botBadge'))+(verifiedBot?' ✓':'')+'</span>'):'';
    return ''
      +'<div class="dht-popup-head">'
        +(avatar?'<img class="dht-popup-avatar" src="'+esc(avatar)+'" alt="">':'<div class="dht-popup-avatar dht-popup-avatar--ph"></div>')
        +'<div class="dht-popup-headtext">'
          +'<div class="dht-popup-name" style="color:'+color+';">'+esc(name)+botBadge+copyBtn(name,'name')+'</div>'
          +(username?'<div class="dht-popup-sub">'+esc(username)+copyBtn(username,'username')+'</div>':'')
        +'</div>'
      +'</div>'
      +(flags?'<div class="dht-popup-section"><div class="dht-popup-label">'+esc(t('flags'))+'</div><div class="dht-popup-flags">'+flags+'</div></div>':'')
      +(roles?'<div class="dht-popup-section"><div class="dht-popup-label">Roles</div><div class="dht-popup-roles">'+roles+'</div></div>':'')
      +(joinedAt?'<div class="dht-popup-row"><span class="dht-popup-label">Server</span><span>'+esc(joinedAt)+'</span></div>':'')
      +(createdAt?'<div class="dht-popup-row"><span class="dht-popup-label">Account</span><span>'+esc(createdAt)+'</span></div>':'')
      +'<div class="dht-popup-id">ID: <code>'+esc(id)+'</code>'+copyBtn(id,'user ID')+'</div>';
  }
  function roleHtml(id){
    var r=(DATA().roles||{})[id];
    if(!r)return '<i>?</i><div class="dht-popup-id">ID: <code>'+esc(id)+'</code>'+copyBtn(id,'role ID')+'</div>';
    var color=safeColor(r.color,'#dbdee1');
    return '<div class="dht-popup-head"><div class="dht-popup-rolemark" style="background:'+color+';"></div><div class="dht-popup-headtext"><div class="dht-popup-name" style="color:'+color+';">@'+esc(r.name)+copyBtn('@'+r.name,'role name')+'</div>'+(r.color?'<div class="dht-popup-sub"><code>'+esc(r.color)+'</code>'+copyBtn(r.color,'color')+'</div>':'')+'</div></div>'
      +(r.memberCount!=null?'<div class="dht-popup-row"><span class="dht-popup-label">Members</span><span>'+esc(r.memberCount)+'</span></div>':'')
      +(r.position!=null?'<div class="dht-popup-row"><span class="dht-popup-label">Position</span><span>'+esc(r.position)+'</span></div>':'')
      +(r.hoist?'<div class="dht-popup-row"><span class="dht-popup-label">Hoisted</span><span>Yes</span></div>':'')
      +(r.mentionable?'<div class="dht-popup-row"><span class="dht-popup-label">Mentionable</span><span>Yes</span></div>':'')
      +(r.managed?'<div class="dht-popup-row"><span class="dht-popup-label">Managed</span><span>Bot/Integration</span></div>':'')
      +'<div class="dht-popup-id">ID: <code>'+esc(id)+'</code>'+copyBtn(id,'role ID')+'</div>';
  }
  function channelHtml(id){
    var c=(DATA().channels||{})[id];
    if(!c)return '<i>Channel</i><div class="dht-popup-id">ID: <code>'+esc(id)+'</code>'+copyBtn(id,'channel ID')+'</div>';
    return '<div class="dht-popup-head"><div class="dht-popup-rolemark" style="background:#5865F2;">#</div><div class="dht-popup-headtext"><div class="dht-popup-name">#'+esc(c.name)+copyBtn('#'+c.name,'channel')+'</div>'+(c.parent?'<div class="dht-popup-sub">in '+esc(c.parent)+'</div>':'')+'</div></div>'
      +(c.topic?'<div class="dht-popup-section"><div class="dht-popup-label">Topic</div><div>'+esc(c.topic)+'</div></div>':'')
      +(c.nsfw?'<div class="dht-popup-row"><span class="dht-popup-label">NSFW</span><span>Yes</span></div>':'')
      +'<div class="dht-popup-id">ID: <code>'+esc(id)+'</code>'+copyBtn(id,'channel ID')+'</div>';
  }
  function slashHtml(el){
    var cmd=el.getAttribute('data-slash-cmd')||el.getAttribute('command')||'/?';
    var by=el.getAttribute('data-slash-by')||'';
    var byId=el.getAttribute('data-slash-by-id')||el.getAttribute('profile')||'';
    var optsJson=el.getAttribute('data-slash-options')||'[]';
    var opts;
    try{opts=JSON.parse(optsJson);}catch(_){opts=[];}
    if(!Array.isArray(opts))opts=[];
    var paramsHtml=opts.length
      ? '<div class="dht-popup-section"><div class="dht-popup-label">Parameters</div><div class="dht-slash-params">'
        +opts.map(function(o){return '<div class="dht-slash-param"><span class="dht-slash-param-name">'+esc(o.name)+'</span><span class="dht-slash-param-val">'+esc(o.value)+'</span>'+copyBtn(o.value,o.name)+'</div>';}).join('')
        +'</div></div>'
      : '<div class="dht-popup-sub" style="margin-top:8px">No parameters</div>';
    return '<div class="dht-popup-head">'
      +'<div class="dht-popup-rolemark" style="background:#5865F2;font-family:Consolas,Menlo,monospace;font-size:18px;">/</div>'
      +'<div class="dht-popup-headtext">'
        +'<div class="dht-popup-name" style="font-family:Consolas,Menlo,monospace;color:#5865F2">'+esc(cmd)+copyBtn(cmd,'command')+'</div>'
        +(by?'<div class="dht-popup-sub">used by '+esc(by)+'</div>':'')
      +'</div>'
      +'</div>'
      +paramsHtml
      +(byId?'<div class="dht-popup-id">User ID: <code>'+esc(byId)+'</code>'+copyBtn(byId,'user ID')+'</div>':'');
  }
  function findAncestor(path,pred){for(var i=0;i<path.length;i++){if(pred(path[i]))return path[i];}return null;}
  function isAuthorPath(path){
    for(var i=0;i<path.length;i++){
      var x=path[i];if(!x||!x.classList)continue;
      if(x.classList.contains('discord-author-info')||x.classList.contains('discord-author-username')||x.classList.contains('discord-author-avatar')||x.classList.contains('discord-application-tag'))return true;
    }
    return false;
  }
  // Copy-button delegated handler (any .dht-popup-copy click — inside popup or anywhere else)
  document.addEventListener('click',function(e){
    var t=e.target;
    if(!t)return;
    var btn=null;
    if(t.closest)btn=t.closest('.dht-popup-copy');
    if(!btn)return;
    var text=btn.getAttribute('data-copy')||'';
    if(!text)return;
    e.preventDefault();e.stopPropagation();
    function done(){btn.classList.add('dht-popup-copy--ok');setTimeout(function(){btn.classList.remove('dht-popup-copy--ok');},900);}
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,function(){fallback();});}
      else fallback();
    }catch(_){fallback();}
    function fallback(){try{var ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);done();}catch(_2){}}
  },true);
  // Main trigger handler
  document.addEventListener('click',function(e){
    if(!e||e.defaultPrevented)return;
    var path=(typeof e.composedPath==='function')?e.composedPath():[];
    if(!path.length){var n=e.target;while(n){path.push(n);n=n.parentNode||(n.host);}}
    // 0) skip if click is on a copy button (handled in capture phase above)
    for(var z=0;z<path.length;z++){var zz=path[z];if(zz&&zz.classList&&zz.classList.contains('dht-popup-copy'))return;}
    // 1) explicit mention pills with data-mention-id (users/roles/channels via markdown)
    var pill=findAncestor(path,function(x){return x&&x.getAttribute&&x.getAttribute('data-mention-id');});
    if(pill){
      var tp=pill.getAttribute('data-mention-type');var id=pill.getAttribute('data-mention-id');
      if(!tp||!id)return;
      e.preventDefault();e.stopPropagation();
      var html='';
      if(tp==='user')html=userHtml(id);
      else if(tp==='role')html=roleHtml(id);
      else if(tp==='channel')html=channelHtml(id);
      else return;
      showAt(pill,html);return;
    }
    // 2) slash command pill — discord-command web component
    var cmdEl=findAncestor(path,function(x){return x&&x.tagName&&typeof x.tagName==='string'&&x.tagName.toLowerCase()==='discord-command';});
    if(cmdEl){
      e.preventDefault();e.stopPropagation();
      showAt(cmdEl,slashHtml(cmdEl));return;
    }
    // 3) author area inside <discord-message> shadow DOM (avatar, name, BOT/APP tag)
    if(isAuthorPath(path)){
      var msgEl=findAncestor(path,function(x){return x&&x.tagName&&typeof x.tagName==='string'&&x.tagName.toLowerCase()==='discord-message';});
      if(msgEl){
        var uid=msgEl.getAttribute('profile')||msgEl.getAttribute('data-author-id');
        if(uid){e.preventDefault();e.stopPropagation();showAt(msgEl,userHtml(uid));return;}
      }
    }
  });
})();`;

exports.mentionPopupStyles = `
  /* Mention pills — Discord-style. Always render correctly (no web component dependency). */
  .dht-mention{
    display:inline-block;
    background-color:rgba(88,101,242,.18);
    color:#c9cdfb;
    padding:0 4px;
    border-radius:3px;
    font-weight:500;
    cursor:pointer;
    text-decoration:none;
    border:1px solid transparent;
    transition:filter .15s ease,background-color .15s ease;
    white-space:nowrap;
  }
  .dht-mention:hover{filter:brightness(1.25);background-color:rgba(88,101,242,.32)}
  .dht-mention--user{background-color:rgba(88,101,242,.18);color:#c9cdfb}
  .dht-mention--channel{background-color:rgba(88,101,242,.15);color:#c9cdfb}
  .dht-mention--command{background-color:rgba(88,101,242,.22);color:#c9cdfb;font-family:Consolas,Menlo,monospace}
  .dht-mention--highlight{background-color:rgba(255,212,0,.25);color:#f9d949}
  /* Role mentions carry inline style (role color + faded bg) — leave their color/background alone, only set base shape */
  .dht-mention--role{font-weight:500}
  /* Legacy <discord-mention> styling (in case some old code still emits it) */
  discord-mention{display:inline-block;background-color:rgba(88,101,242,.3);color:#c9cdfb;padding:0 4px;border-radius:3px;font-weight:500;cursor:pointer}
  discord-mention:not(:defined)[type="user"]::before,
  discord-mention:not(:defined)[type="role"]::before,
  discord-mention:not(:defined)[highlight]::before{content:"@"}
  discord-mention:not(:defined)[type="channel"]::before{content:"#"}
  discord-mention:not(:defined)[type="command"]::before{content:"/"}
  .dht-popup{position:fixed;display:none;max-width:340px;min-width:240px;max-height:80vh;overflow-y:auto;background:#1e1f22;color:#dbdee1;border:1px solid #2b2d31;border-radius:10px;padding:14px 16px 12px;box-shadow:0 12px 32px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.35);font-family:"gg sans","Helvetica Neue",Helvetica,Arial,sans-serif;font-size:14px;line-height:1.4;z-index:99999}
  .dht-popup-headtext{min-width:0}
  .dht-popup-close{position:absolute;top:6px;right:8px;background:none;border:none;color:#949ba4;cursor:pointer;font-size:20px;line-height:1;padding:4px 8px;border-radius:4px}
  .dht-popup-close:hover{background:rgba(255,255,255,.06);color:#dbdee1}
  .dht-popup-head{display:flex;align-items:center;gap:10px;margin-right:18px}
  .dht-popup-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;flex:none}
  .dht-popup-avatar--ph{background:#313338}
  .dht-popup-rolemark{width:32px;height:32px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff}
  .dht-popup-headtext{min-width:0}
  .dht-popup-name{font-weight:600;font-size:16px;word-break:break-word}
  .dht-popup-sub{font-size:12px;color:#949ba4;word-break:break-all}
  .dht-popup-badge{background:#5865F2;color:#fff;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px;vertical-align:middle}
  .dht-popup-section{margin-top:10px}
  .dht-popup-row{display:flex;justify-content:space-between;gap:12px;margin-top:6px;font-size:13px}
  .dht-popup-label{color:#949ba4;font-size:11px;text-transform:uppercase;letter-spacing:.04em;font-weight:700}
  .dht-popup-roles{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
  .dht-role-pill{display:inline-flex;align-items:center;background:color-mix(in srgb,var(--dht-role) 18%,transparent);color:var(--dht-role);border:1px solid color-mix(in srgb,var(--dht-role) 40%,transparent);padding:1px 8px;border-radius:999px;font-size:11px;line-height:1.5}
  .dht-popup-id{margin-top:10px;padding-top:8px;border-top:1px solid #2b2d31;font-size:11px;color:#6e727a;display:flex;align-items:center;gap:6px}
  .dht-popup-id code{background:rgba(255,255,255,.05);padding:1px 4px;border-radius:3px}
  /* Copy buttons inside the popup */
  .dht-popup-copy{display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06);color:#b5bac1;border-radius:4px;width:22px;height:22px;padding:0;margin-left:6px;cursor:pointer;vertical-align:middle;transition:background .15s ease,color .15s ease,border-color .15s ease;flex:none}
  .dht-popup-copy:hover{background:rgba(255,255,255,.1);color:#fff}
  .dht-popup-copy:focus-visible{outline:2px solid #5865F2;outline-offset:2px}
  .dht-popup-copy--ok{background:#3ba55d!important;color:#fff!important;border-color:#3ba55d!important}
  .dht-popup-copy svg{display:block}
  .dht-popup-name{display:flex;align-items:center;gap:0;flex-wrap:wrap}
  .dht-popup-sub{display:flex;align-items:center;gap:0;flex-wrap:wrap}
  /* Slash command popup — parameter list */
  .dht-slash-params{display:flex;flex-direction:column;gap:4px;margin-top:4px}
  .dht-slash-param{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.04);padding:4px 8px;border-radius:4px;font-size:12px}
  .dht-slash-param-name{color:#949ba4;font-family:Consolas,Menlo,monospace}
  .dht-slash-param-name::after{content:":"}
  .dht-slash-param-val{color:#dbdee1;font-family:Consolas,Menlo,monospace;word-break:break-all;flex:1}
  /* Make message author area look clickable (skyra shadow DOM elements bubble into the host) */
  discord-message .discord-author-username,
  discord-message .discord-author-info,
  discord-message [slot="author-image"],
  discord-message .discord-author-avatar,
  discord-message .discord-application-tag{cursor:pointer}
  discord-message .discord-author-username:hover,
  discord-message .discord-author-info:hover{text-decoration:underline}
  /* Slash command pill — clickable affordance */
  discord-command.dht-slash-clickable,
  discord-command{cursor:pointer;transition:filter .15s ease}
  discord-command.dht-slash-clickable:hover,
  discord-command:hover{filter:brightness(1.2)}
`;

// ===========================================================================
// Back-to-top
// ===========================================================================
exports.backToTop = `(function(){var btn=document.createElement('button');btn.className='dht-back-top';btn.type='button';var DATA=globalThis.$discordMessage||{};var dict=(DATA.i18n&&(DATA.i18n[DATA.lang]||DATA.i18n.en))||{};btn.title=dict.backToTop||'Back to top';btn.setAttribute('aria-label',dict.backToTop||'Back to top');btn.innerHTML='&#x25B2;';document.body.appendChild(btn);btn.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});function toggle(){btn.style.opacity=window.scrollY>400?'1':'0';btn.style.pointerEvents=window.scrollY>400?'auto':'none';}window.addEventListener('scroll',toggle,{passive:true});toggle();})();`;
exports.transcriptUtils = `.dht-back-top{position:fixed;bottom:24px;right:24px;width:44px;height:44px;border-radius:50%;border:none;background:#5865F2;color:#fff;font-size:16px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease;z-index:9999}.dht-back-top:hover{transform:translateY(-2px)}`;

// ===========================================================================
// Search — handled inside the unified TOC panel (see exports.toc).
// These exports stay for backwards compatibility with anyone wiring them
// individually; both are inert (no DOM injection). Search-hit styles still
// live here because the TOC IIFE creates <mark class="dht-hit"> nodes.
// ===========================================================================
exports.searchBar = '/* searchBar: merged into TOC */';
exports.searchBarStyles = `.dht-hit{background:rgba(255,228,0,.35);color:inherit;border-radius:2px}.dht-hit--active{background:rgba(255,140,0,.7);color:#000}`;

// ===========================================================================
// Image lightbox — click images to fullscreen, arrow keys to navigate
// ===========================================================================
exports.lightbox = `(function(){
  var overlay=null,images=[],idx=0;
  function collect(){images=Array.from(document.querySelectorAll('img')).filter(function(i){return !i.closest('.dht-popup')&&!i.classList.contains('dht-popup-avatar')&&i.naturalWidth>40;});}
  function build(){overlay=document.createElement('div');overlay.className='dht-lightbox';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('tabindex','-1');overlay.innerHTML='<button class="dht-lb-close" aria-label="Close">&times;</button><button class="dht-lb-prev" aria-label="Previous">&#x2039;</button><img class="dht-lb-img" alt=""><button class="dht-lb-next" aria-label="Next">&#x203A;</button><div class="dht-lb-caption"></div>';document.body.appendChild(overlay);overlay.addEventListener('click',function(e){if(e.target===overlay||e.target.classList.contains('dht-lb-close'))close();else if(e.target.classList.contains('dht-lb-prev'))nav(-1);else if(e.target.classList.contains('dht-lb-next'))nav(1);});}
  var imagesCacheDirty=true;
  function open(src,alt){if(!overlay)build();if(imagesCacheDirty){collect();imagesCacheDirty=false;}idx=images.findIndex(function(i){return i.src===src;});if(idx<0)idx=0;render();overlay.style.display='flex';}
  function nav(d){if(!images.length)return;idx=(idx+d+images.length)%images.length;render();}
  function render(){var img=images[idx];if(!img)return;overlay.querySelector('.dht-lb-img').src=img.src;overlay.querySelector('.dht-lb-caption').textContent=img.alt||'';}
  function close(){if(overlay)overlay.style.display='none';}
  document.addEventListener('click',function(e){if(!e||e.defaultPrevented)return;var img=e.target;if(img&&img.tagName==='IMG'&&img.naturalWidth>40&&!img.closest('.dht-popup')&&!img.classList.contains('dht-popup-avatar')&&!img.closest('.dht-toc')&&!img.closest('.dht-search')&&!img.closest('.dht-filter')&&!img.closest('discord-message-reply')&&!img.closest('discord-thread')&&!img.classList.contains('dht-emoji')){e.preventDefault();open(img.src,img.alt);}});
  document.addEventListener('keydown',function(e){if(!overlay||overlay.style.display!=='flex')return;if(e.key==='Escape')close();else if(e.key==='ArrowLeft')nav(-1);else if(e.key==='ArrowRight')nav(1);});
})();`;
exports.lightboxStyles = `.dht-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);display:none;align-items:center;justify-content:center;z-index:100000;flex-direction:column}.dht-lb-img{max-width:90vw;max-height:80vh;object-fit:contain;box-shadow:0 4px 20px rgba(0,0,0,.6);border-radius:6px}.dht-lb-close,.dht-lb-prev,.dht-lb-next{position:absolute;background:rgba(0,0,0,.4);color:#fff;border:none;cursor:pointer;font-size:28px;width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center}.dht-lb-close:hover,.dht-lb-prev:hover,.dht-lb-next:hover{background:rgba(255,255,255,.15)}.dht-lb-close{top:20px;right:20px}.dht-lb-prev{left:20px;top:50%;transform:translateY(-50%)}.dht-lb-next{right:20px;top:50%;transform:translateY(-50%)}.dht-lb-caption{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:#dbdee1;font-family:"gg sans",sans-serif;font-size:14px;padding:6px 14px;background:rgba(0,0,0,.5);border-radius:4px;max-width:80%}`;

// ===========================================================================
// TOC / Sidebar — list participants, click jumps to their first message
// ===========================================================================
exports.toc = `(function(){
  var DATA=globalThis.$discordMessage||{};
  var dict=(DATA.i18n&&(DATA.i18n[DATA.lang]||DATA.i18n.en))||{};
  var users=DATA.users||DATA.profiles||{};
  var roles=DATA.roles||{};
  var userIds=Object.keys(users).filter(function(x){return /^\\d+$/.test(x);}).sort(function(a,b){var na=(users[a].displayName||users[a].author||users[a].username||'').toLowerCase();var nb=(users[b].displayName||users[b].author||users[b].username||'').toLowerCase();return na.localeCompare(nb);});
  var roleIds=Object.keys(roles).filter(function(x){return /^\\d+$/.test(x);});

  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function safeColor(c,fb){fb=fb||'#dbdee1';return typeof c==='string' && /^#[0-9a-fA-F]{3,8}$/.test(c) ? c : fb;}
  function safeUrl(u){if(typeof u!=='string'||!u)return '';if(/^https?:\\/\\//i.test(u))return u;return '';}
  function firstMessageOf(uid){var m=document.querySelector('discord-message[profile="'+uid+'"],[data-profile="'+uid+'"]');return m?m.id:null;}
  function parseId(v){if(!v)return null;var t=v.trim();if(/^\\d{15,21}$/.test(t))return t;var m=t.match(/\\((\\d{15,21})\\)/);return m?m[1]:null;}
  function authorHasRole(authorId,roleId){var u=users[authorId];if(!u||!Array.isArray(u.roles))return false;for(var i=0;i<u.roles.length;i++){if(u.roles[i].id===roleId)return true;}return false;}

  var btn=document.createElement('button');btn.className='dht-toc-toggle';btn.type='button';btn.title=dict.tocTitle||'Participants';btn.setAttribute('aria-label',dict.tocTitle||'Participants');btn.innerHTML='&#x2630;';document.body.appendChild(btn);

  var panel=document.createElement('aside');panel.className='dht-toc';panel.setAttribute('aria-hidden','true');

  // Header
  var headerHtml='<header><h3>'+esc(dict.tocTitle||'Participants')+'</h3><button class="dht-toc-close" type="button" aria-label="Close">&times;</button></header>';
  // Search field — keyword highlight + participant name filter
  var searchHtml='<div class="dht-toc-search-wrap"><span class="dht-toc-search-icon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></span><input type="search" class="dht-toc-search" placeholder="'+esc(dict.searchPlaceholder||'Search…')+'"><span class="dht-toc-counter" aria-live="polite"></span><button class="dht-toc-srch-btn" type="button" data-act="prev" title="Previous" aria-label="Previous match">&#x25B2;</button><button class="dht-toc-srch-btn" type="button" data-act="next" title="Next" aria-label="Next match">&#x25BC;</button></div>';
  // Participants list — collapsible, open by default
  var listHtml='<details class="dht-toc-section" open><summary>'+esc(dict.tocTitle||'Participants')+'</summary><ul class="dht-toc-list" role="list">';
  if(userIds.length>0){
    userIds.forEach(function(id){
      var u=users[id];var name=u.displayName||u.author||u.username||'Unknown';var avatar=safeUrl(u.avatar||'');var color=safeColor(u.bannerColor||u.roleColor,'#dbdee1');
      listHtml+='<li data-uid="'+esc(id)+'" data-name="'+esc(String(name).toLowerCase())+'" tabindex="0" role="button">'+(avatar?'<img src="'+esc(avatar)+'" alt="" loading="lazy">':'<span class="dht-toc-ph"></span>')+'<span class="dht-toc-name" style="color:'+color+'">'+esc(name)+'</span></li>';
    });
  }
  listHtml+='</ul></details>';
  // Filter form — replaces the standalone bottom-right magnifying glass. Open by default.
  var filterHtml='<details class="dht-toc-section dht-toc-filter-details" open><summary>'+esc(dict.filterPanel||'Filter')+'</summary><div class="dht-toc-filter-body">';
  filterHtml+='<label class="dht-f-field">'+esc(dict.filterAuthor||'Author')+'<input list="dht-f-authors" class="dht-f-author" placeholder="@user / ID / name"></label>';
  filterHtml+='<datalist id="dht-f-authors">'+userIds.map(function(id){var u=users[id];return '<option value="'+esc(u.displayName||u.author||u.username||'')+' ('+esc(id)+')">';}).join('')+'</datalist>';
  filterHtml+='<label class="dht-f-field">'+esc(dict.filterRole||'Role')+'<input list="dht-f-roles" class="dht-f-role" placeholder="@role / ID / name"></label>';
  filterHtml+='<datalist id="dht-f-roles">'+roleIds.map(function(id){var r=roles[id];return '<option value="'+esc(r.name||'')+' ('+esc(id)+')">';}).join('')+'</datalist>';
  filterHtml+='<div class="dht-f-grid"><label class="dht-f-field">'+esc(dict.filterFrom||'From')+'<input type="datetime-local" class="dht-f-from"></label><label class="dht-f-field">'+esc(dict.filterTo||'To')+'<input type="datetime-local" class="dht-f-to"></label></div>';
  filterHtml+='<div class="dht-f-checks">';
  filterHtml+='<label><input type="checkbox" class="dht-f-pinned"> '+esc(dict.filterPinned||'Pinned only')+'</label>';
  filterHtml+='<label><input type="checkbox" class="dht-f-image"> '+esc(dict.filterHasImage||'Has image')+'</label>';
  filterHtml+='<label><input type="checkbox" class="dht-f-embed"> '+esc(dict.filterHasEmbed||'Has embed')+'</label>';
  filterHtml+='<label><input type="checkbox" class="dht-f-attach"> '+esc(dict.filterHasAttachment||'Has attachment')+'</label>';
  filterHtml+='<label><input type="checkbox" class="dht-f-v2"> '+esc(dict.filterHasComponentV2||'Has container')+'</label>';
  filterHtml+='</div>';
  filterHtml+='<div class="dht-f-actions"><button type="button" class="dht-f-apply">'+esc(dict.filterApply||'Apply')+'</button><button type="button" class="dht-f-reset">'+esc(dict.filterReset||'Reset')+'</button></div>';
  filterHtml+='</div></details>';

  panel.innerHTML=headerHtml+searchHtml+listHtml+filterHtml;document.body.appendChild(panel);

  function syncToggleVisibility(open){btn.style.opacity=open?'0':'1';btn.style.pointerEvents=open?'none':'auto';btn.setAttribute('aria-expanded',open?'true':'false');}
  function openPanel(){panel.classList.add('dht-toc--open');panel.setAttribute('aria-hidden','false');syncToggleVisibility(true);}
  function closePanel(){panel.classList.remove('dht-toc--open');panel.setAttribute('aria-hidden','true');syncToggleVisibility(false);}
  btn.addEventListener('click',function(){if(panel.classList.contains('dht-toc--open'))closePanel();else openPanel();});
  panel.querySelector('.dht-toc-close').addEventListener('click',closePanel);

  function activate(li){var uid=li.getAttribute('data-uid');if(!uid||!/^\\d+$/.test(uid))return;var mid=firstMessageOf(uid);if(mid){var el=document.getElementById(mid);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});var prev=el.style.backgroundColor;el.style.backgroundColor='rgba(148,156,247,0.18)';setTimeout(function(){el.style.backgroundColor=prev||'transparent';},1500);}}}
  panel.querySelectorAll('.dht-toc-list li').forEach(function(li){li.addEventListener('click',function(){activate(li);});li.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();activate(li);}});});

  // Keyword highlight + participant filter (driven by the top search input)
  var input=panel.querySelector('.dht-toc-search');
  var counter=panel.querySelector('.dht-toc-counter');
  var matches=[],idx=-1;
  function clearMatches(){matches.forEach(function(m){var p=m.parentNode;if(!p)return;var tn=document.createTextNode(m.textContent);p.replaceChild(tn,m);p.normalize();});matches=[];idx=-1;counter.textContent='';}
  function walk(node,re,acc){if(node.nodeType===3){var text=node.nodeValue;if(!re.test(text))return;re.lastIndex=0;var frag=document.createDocumentFragment();var last=0;var m;while((m=re.exec(text))!==null){if(m.index>last)frag.appendChild(document.createTextNode(text.slice(last,m.index)));var span=document.createElement('mark');span.className='dht-hit';span.textContent=m[0];frag.appendChild(span);acc.push(span);last=re.lastIndex;}if(last<text.length)frag.appendChild(document.createTextNode(text.slice(last)));node.parentNode.replaceChild(frag,node);}else if(node.nodeType===1){if(node.classList&&(node.classList.contains('dht-toc')||node.classList.contains('dht-popup')||node.tagName==='SCRIPT'||node.tagName==='STYLE'))return;for(var i=node.childNodes.length-1;i>=0;i--)walk(node.childNodes[i],re,acc);}}
  function goTo(){matches.forEach(function(m,i){m.classList.toggle('dht-hit--active',i===idx);});if(idx>=0&&matches[idx]){matches[idx].scrollIntoView({behavior:'smooth',block:'center'});counter.textContent=(idx+1)+' '+(dict.ofMatches||'of')+' '+matches.length;}}
  function applySearch(q){
    clearMatches();
    var lowerQ=(q||'').trim().toLowerCase();
    panel.querySelectorAll('.dht-toc-list li').forEach(function(li){var n=li.getAttribute('data-name')||'';li.style.display=(!lowerQ||n.indexOf(lowerQ)!==-1)?'':'none';});
    if(!lowerQ||lowerQ.length<2){counter.textContent='';return;}
    var re=new RegExp(lowerQ.replace(/[.*+?^\${}()|[\\]\\\\]/g,function(c){return '\\\\'+c;}),'gi');
    walk(document.body,re,matches);
    if(matches.length){idx=0;goTo();}else{counter.textContent=dict.noMatches||'no matches';}
  }
  input.addEventListener('input',function(){applySearch(input.value);});
  panel.querySelectorAll('.dht-toc-srch-btn').forEach(function(b){b.addEventListener('click',function(){var act=b.getAttribute('data-act');if(!matches.length)return;if(act==='next')idx=(idx+1)%matches.length;else if(act==='prev')idx=(idx-1+matches.length)%matches.length;goTo();});});
  input.addEventListener('keydown',function(e){if(e.key==='Enter'){if(matches.length){idx=(idx+(e.shiftKey?-1:1)+matches.length)%matches.length;goTo();}e.preventDefault();}});

  // Filter form — author / role / date / has-flags. Replaces the old standalone .dht-filter aside.
  function applyFilter(){
    var authorIdRaw=parseId(panel.querySelector('.dht-f-author').value);
    var authorTextRaw=(panel.querySelector('.dht-f-author').value||'').trim().toLowerCase();
    var roleIdRaw=parseId(panel.querySelector('.dht-f-role').value);
    var roleTextRaw=(panel.querySelector('.dht-f-role').value||'').trim().toLowerCase();
    var fromVal=panel.querySelector('.dht-f-from').value;
    var toVal=panel.querySelector('.dht-f-to').value;
    var fromMs=fromVal?new Date(fromVal).getTime():null;
    var toMs=toVal?new Date(toVal).getTime():null;
    var needPinned=panel.querySelector('.dht-f-pinned').checked;
    var needImage=panel.querySelector('.dht-f-image').checked;
    var needEmbed=panel.querySelector('.dht-f-embed').checked;
    var needAttach=panel.querySelector('.dht-f-attach').checked;
    var needV2=panel.querySelector('.dht-f-v2').checked;
    var matchedRoleId=null;
    if(roleIdRaw){matchedRoleId=roleIdRaw;}
    else if(roleTextRaw){var exact=null,sub=null;for(var rid in roles){if(Object.prototype.hasOwnProperty.call(roles,rid)){var rn=(roles[rid].name||'').toLowerCase();if(rn===roleTextRaw){exact=rid;break;}else if(!sub && rn.indexOf(roleTextRaw)!==-1){sub=rid;}}}matchedRoleId=exact||sub;}
    var matchedAuthorId=authorIdRaw||null;
    var msgs=document.querySelectorAll('discord-message, discord-system-message');
    for(var i=0;i<msgs.length;i++){
      var m=msgs[i];var ok=true;
      var authorId=m.getAttribute('data-author-id')||'';
      var authorName=(m.getAttribute('data-author-name')||'').toLowerCase();
      var rolesAttr=m.getAttribute('data-roles')||'';
      var tsStr=m.getAttribute('data-timestamp');
      var ts=tsStr?parseInt(tsStr,10):0;
      var pinned=m.getAttribute('data-pinned')==='true';
      var hasImg=m.getAttribute('data-has-image')==='true';
      var hasEmb=m.getAttribute('data-has-embed')==='true';
      var hasAtt=m.getAttribute('data-has-attachment')==='true';
      var hasV2=m.getAttribute('data-has-component-v2')==='true';
      if(matchedAuthorId && authorId!==matchedAuthorId)ok=false;
      if(ok && !matchedAuthorId && !authorIdRaw && authorTextRaw && authorName.indexOf(authorTextRaw)===-1)ok=false;
      if(ok && matchedRoleId){var rIds=rolesAttr.split(',');if(rIds.indexOf(matchedRoleId)===-1 && !authorHasRole(authorId,matchedRoleId))ok=false;}
      if(ok && fromMs){if(!ts || ts<fromMs)ok=false;}
      if(ok && toMs){if(!ts || ts>toMs)ok=false;}
      if(ok && needPinned && !pinned)ok=false;
      if(ok && needImage && !hasImg)ok=false;
      if(ok && needEmbed && !hasEmb)ok=false;
      if(ok && needAttach && !hasAtt)ok=false;
      if(ok && needV2 && !hasV2)ok=false;
      m.style.display=ok?'':'none';
    }
    var seps=document.querySelectorAll('.dht-date-sep');
    for(var s=0;s<seps.length;s++){var sep=seps[s];var next=sep.nextElementSibling;var hasVis=false;while(next && !next.classList.contains('dht-date-sep')){if(next.style.display!=='none' && (next.tagName==='DISCORD-MESSAGE' || next.tagName==='DISCORD-SYSTEM-MESSAGE')){hasVis=true;break;}next=next.nextElementSibling;}sep.style.display=hasVis?'':'none';}
  }
  function resetFilter(){panel.querySelectorAll('.dht-toc-filter-body input').forEach(function(i){if(i.type==='checkbox')i.checked=false;else i.value='';});document.querySelectorAll('discord-message, discord-system-message, .dht-date-sep').forEach(function(m){m.style.display='';});}
  panel.querySelector('.dht-f-apply').addEventListener('click',applyFilter);
  panel.querySelector('.dht-f-reset').addEventListener('click',resetFilter);
  panel.querySelector('.dht-toc-filter-body').addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();applyFilter();}});
  try{globalThis.__DHT_FLAG_BADGES__=${JSON.stringify(FLAG_BADGES)};}catch(_){}

  // Ctrl+F / Cmd+F opens the panel and focuses the search input
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f'){
      e.preventDefault();openPanel();setTimeout(function(){input.focus();input.select();},20);
    }else if(e.key==='Escape'&&panel.classList.contains('dht-toc--open')){
      if(document.activeElement===input&&input.value){input.value='';applySearch('');}
      else closePanel();
    }
  });
})();`;
exports.tocStyles = `.dht-toc-toggle{position:fixed;top:16px;right:16px;width:40px;height:40px;border-radius:50%;border:none;background:#2b2d31;color:#fff;font-size:16px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.4);z-index:9998}.dht-toc-toggle:hover{background:#5865F2}
.dht-toc{position:fixed;top:0;right:-340px;left:auto;width:320px;height:100vh;background:#1e1f22;border-left:1px solid #2b2d31;transition:right .25s ease;z-index:9997;overflow-y:auto;font-family:"gg sans",sans-serif;color:#dbdee1;padding:16px;box-sizing:border-box}
.dht-toc--open{right:0}
.dht-toc header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #2b2d31}
.dht-toc h3{margin:0;font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#949ba4}
.dht-toc-close{background:none;border:none;color:#949ba4;cursor:pointer;font-size:22px;line-height:1}
.dht-toc-search-wrap{display:flex;align-items:center;gap:6px;margin-bottom:14px;background:#2b2d31;border:1px solid #2b2d31;border-radius:6px;padding:4px 8px;transition:border-color .15s ease}
.dht-toc-search-wrap:focus-within{border-color:#5865F2}
.dht-toc-search-icon{color:#949ba4;display:inline-flex;align-items:center;flex:none}
.dht-toc-search{flex:1;min-width:0;background:transparent;color:#dbdee1;border:none;font-size:13px;outline:none;font-family:inherit;padding:4px 0}
.dht-toc-counter{font-size:11px;color:#949ba4;min-width:46px;text-align:right;white-space:nowrap}
.dht-toc-srch-btn{background:none;border:none;color:#dbdee1;cursor:pointer;padding:2px 4px;border-radius:3px;font-size:11px;line-height:1;flex:none}
.dht-toc-srch-btn:hover{background:rgba(255,255,255,.06)}
.dht-toc-section-label{font-size:11px;color:#949ba4;text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin:0 0 6px}
.dht-toc-list{list-style:none;padding:0;margin:0}
.dht-toc-list li{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:14px}
.dht-toc-list li:hover{background:rgba(255,255,255,.04)}
.dht-toc-list li img,.dht-toc-ph{width:28px;height:28px;border-radius:50%;flex:none}
.dht-toc-ph{background:#313338}
.dht-toc-name{flex:1;font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media (max-width:640px){.dht-toc{width:85vw;right:-85vw}.dht-toc--open{right:0}.dht-toc-toggle{top:12px;right:12px}}`;

// ===========================================================================
// Language switcher
// ===========================================================================
exports.i18nSwitcher = `(function(){
  var DATA=globalThis.$discordMessage||{};
  if(!DATA.i18n)return;
  var langs=Object.keys(DATA.i18n);
  if(langs.length<2)return;
  var current=DATA.lang||'en';
  function apply(lang){DATA.lang=lang;var dict=DATA.i18n[lang]||DATA.i18n.en||{};document.querySelectorAll('[data-i18n]').forEach(function(el){var key=el.getAttribute('data-i18n');var raw=dict[key];if(typeof raw!=='string')return;var params=el.getAttribute('data-i18n-params');if(params){try{var obj=JSON.parse(params);Object.keys(obj).forEach(function(k){raw=raw.replace('{'+k+'}',obj[k]);});}catch(_){}}el.textContent=raw;});}
  var wrap=document.createElement('div');wrap.className='dht-langs';langs.forEach(function(l){var b=document.createElement('button');b.type='button';b.textContent=l.toUpperCase();b.className='dht-lang'+(l===current?' dht-lang--active':'');b.addEventListener('click',function(){wrap.querySelectorAll('.dht-lang').forEach(function(x){x.classList.remove('dht-lang--active');});b.classList.add('dht-lang--active');apply(l);});wrap.appendChild(b);});document.body.appendChild(wrap);
})();`;
exports.i18nStyles = `.dht-langs{position:fixed;bottom:24px;left:24px;display:flex;gap:4px;background:#1e1f22;border:1px solid #2b2d31;border-radius:6px;padding:4px;z-index:9998;font-family:"gg sans",sans-serif}.dht-lang{background:none;border:none;color:#949ba4;cursor:pointer;padding:4px 10px;border-radius:4px;font-size:12px;font-weight:600}.dht-lang:hover{color:#dbdee1}.dht-lang--active{background:#5865F2;color:#fff}`;

// ===========================================================================
// Date separators (server renders <div class="dht-date-sep">…</div>)
// ===========================================================================
exports.dateSeparatorStyles = `.dht-date-sep{display:flex;align-items:center;gap:12px;margin:24px 16px 8px;color:#b5bac1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}.dht-date-sep::before,.dht-date-sep::after{content:"";flex:1;height:1px;background:#3f4248}`;

// ===========================================================================
// Markdown rendering styles — headings, subtext, inline code, emoji, separators.
// Applied directly on the elements we emit (no web-component dependency).
// ===========================================================================
exports.markdownStyles = `
  .dht-heading{
    font-weight:700;
    color:#fff;
    line-height:1.3;
    margin:8px 0 4px;
    font-family:inherit;
  }
  .dht-heading-1{font-size:1.5rem}
  .dht-heading-2{font-size:1.25rem}
  .dht-heading-3{font-size:1rem}
  .dht-subtext{
    color:#949ba4;
    font-size:.85em;
    display:block;
    margin:2px 0;
  }
  .dht-inline-code{
    font-family:Consolas,Menlo,Monaco,"Courier New",monospace;
    background:rgba(0,0,0,.35);
    padding:1px 4px;
    border-radius:3px;
    font-size:.875em;
    color:#dbdee1;
    white-space:pre-wrap;
  }
  .dht-emoji{
    width:1.375em;
    height:1.375em;
    vertical-align:bottom;
    margin:0 .05em;
  }
  .dht-emoji--jumbo{width:3em;height:3em}
  .dht-timestamp{
    background:rgba(255,255,255,.06);
    padding:0 4px;
    border-radius:3px;
    font-size:.85em;
    color:#dbdee1;
    cursor:help;
  }
  .dht-v2-separator{box-sizing:border-box}
  /* Tidy up <discord-message> children spacing inside Components V2 containers */
  discord-message strong{font-weight:700;color:#fff}
  discord-message em{font-style:italic;font-display:swap}
  discord-message u{text-decoration:underline}
  discord-message s{text-decoration:line-through;opacity:.75}
  discord-message blockquote,discord-quote{
    border-left:4px solid #4f5359;padding-left:10px;margin:4px 0;color:#dbdee1;
  }
  /* Make code blocks readable */
  .discord-highlighted-code, pre.dht-codeblock{
    background:#1e1f22;
    border-radius:6px;
    padding:8px 12px;
    margin:6px 0;
    overflow-x:auto;
    font-family:Consolas,Menlo,Monaco,"Courier New",monospace;
    font-size:.875em;
    color:#dbdee1;
    white-space:pre-wrap;
    word-break:break-word;
    width:100%;
    align-self:stretch;
    box-sizing:border-box;
  }
  /* Jump link affordance */
  .dht-jump{cursor:pointer;color:#7289da;font-style:italic;text-decoration:underline;text-decoration-color:rgba(114,137,218,.4)}
  .dht-jump:hover{color:#a3c0ff}
  /* Focus rings — keyboard accessibility */
  .dht-mention:focus-visible,
  .dht-jump:focus-visible,
  .dht-back-top:focus-visible,
  .dht-toc-toggle:focus-visible,
  .dht-toc li:focus-visible,
  .dht-search-btn:focus-visible,
  .dht-search-input:focus-visible,
  .dht-popup-close:focus-visible,
  .dht-lb-close:focus-visible,
  .dht-lb-prev:focus-visible,
  .dht-lb-next:focus-visible,
  [data-goto]:focus-visible{outline:2px solid #5865F2;outline-offset:2px;border-radius:3px}
  /* Higher-contrast subtle text (was failing WCAG AA) */
  .dht-subtext,.dht-popup-sub,.dht-stats,.dht-poll-foot,.dht-voice-dur,.dht-forwarded-head{color:#b5bac1}
  /* Search hit visibility on any background */
  .dht-hit{background:rgba(255,228,0,.45);color:#000;box-shadow:0 0 0 1px rgba(0,0,0,.4)}
  .dht-hit--active{background:rgba(255,140,0,.85);color:#000}
  /* Body fallback when web components fail to load from CDN */
  body{background:#313338;color:#dbdee1;font-family:"gg sans","Helvetica Neue",Helvetica,Arial,sans-serif}
  discord-messages{background:#313338;display:block}
  /* CRITICAL: ensure regular message hosts are block-level. Without this, two
     consecutive messages collapse onto the same line in some browser states.
     discord-system-message is intentionally NOT forced to block — skyra's
     shadow DOM uses display:grid to lay out icon / content / timestamp; if we
     override it, the pin icon ends up floating to the far right instead of
     sitting to the left of the author. */
  discord-message{display:block;position:relative}
  discord-system-message{position:relative}
  /* Fallback layout when @skyra Web Components fail to register (offline viewer). */
  discord-message:not(:defined),discord-system-message:not(:defined){padding:6px 16px 6px 16px;min-height:32px;color:#dbdee1;font-size:14px;border-top:1px solid rgba(255,255,255,0.04);margin-top:0}
  discord-message:not(:defined)::before{content:attr(profile);display:block;font-weight:600;color:#fff;font-size:13px;margin-bottom:2px;opacity:.7}
  /* Date separator divider — more visible */
  .dht-date-sep::before,.dht-date-sep::after{background:rgba(255,255,255,.1)}
  /* Reduce motion */
  @media (prefers-reduced-motion:reduce){
    *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}
  }
  /* Mobile responsiveness */
  @media (max-width:640px){
    .dht-search{left:8px!important;right:8px!important;width:auto!important;top:8px!important}
    .dht-search-input{width:100%!important}
    .dht-toc{width:85vw!important}
    .dht-langs{bottom:80px!important}
    .dht-back-top{bottom:16px!important;right:16px!important;width:40px;height:40px}
  }
  /* Print: hide all floating UI, light theme */
  @media print{
    .dht-back-top,.dht-search,.dht-toc-toggle,.dht-toc,.dht-langs,.dht-popup,.dht-lightbox,.dht-stats,.dht-filter,.dht-filter-toggle,.dht-copy-btn,.dht-permalink-btn{display:none!important}
    body,discord-messages{background:#fff!important;color:#000!important}
    .discord-header{background:#fff!important;color:#000!important;border-color:#ccc!important}
    discord-message,discord-system-message{break-inside:avoid;color:#000}
    a::after{content:" (" attr(href) ")";font-size:10px;color:#666}
    .dht-mention{background:rgba(0,0,0,.06)!important;color:#000!important;border-color:#999!important}
    .dht-heading{color:#000!important}
  }
  /* Spoiler reveal fade */
  .discord-spoiler{cursor:pointer;transition:opacity .2s ease, filter .2s ease}
  .discord-spoiler--revealing{opacity:.3;filter:blur(0)}
  .discord-spoiler--revealed{opacity:1;filter:none;background:transparent!important}
  /* Code copy button */
  pre.dht-codeblock,.discord-highlighted-code{position:relative}
  .dht-copy-btn{position:absolute;top:6px;right:6px;background:rgba(255,255,255,.06);color:#dbdee1;border:1px solid rgba(255,255,255,.08);border-radius:4px;width:28px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;opacity:0;transition:opacity .15s ease,background .15s ease}
  pre.dht-codeblock:hover .dht-copy-btn,.discord-highlighted-code:hover .dht-copy-btn{opacity:1}
  .dht-copy-btn:hover{background:rgba(255,255,255,.12)}
  .dht-copy-btn--ok{background:#3ba55d!important;color:#fff}
  /* Permalink button on message hover */
  discord-message,discord-system-message{position:relative}
  .dht-permalink-btn{position:absolute;top:6px;right:8px;background:rgba(255,255,255,.06);color:#b5bac1;border:none;border-radius:4px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;opacity:0;transition:opacity .15s ease,background .15s ease;z-index:5}
  discord-message:hover .dht-permalink-btn,discord-system-message:hover .dht-permalink-btn{opacity:.7}
  .dht-permalink-btn:hover{background:rgba(255,255,255,.12);opacity:1!important}
  .dht-permalink-btn--ok{background:#3ba55d!important;color:#fff;opacity:1!important}
  /* Avatar role-color ring (Discord 2024+ style) */
  discord-message[data-role-color] [slot="author-image"],discord-message[data-role-color] img.discord-author-avatar{box-shadow:0 0 0 2px var(--dht-role,#5865F2)}
  /* Applied forum tags */
  .dht-applied-tags{display:flex;flex-wrap:wrap;gap:4px;margin:2px 0 4px}
  .dht-tag-pill{display:inline-flex;align-items:center;background:rgba(88,101,242,.18);color:#c9cdfb;border-radius:10px;padding:1px 8px;font-size:11px;border:1px solid rgba(88,101,242,.32)}
  .dht-tag-emoji{margin-right:2px}
  /* Additional badges */
  .dht-badge{display:inline-block;font-size:10px;padding:1px 6px;border-radius:4px;margin-left:6px;vertical-align:middle;font-weight:600}
  .dht-badge-crosspost{background:rgba(88,101,242,.25);color:#c9cdfb}
  .dht-badge-silent{background:rgba(255,255,255,.06);color:#949ba4}
  /* Activity card */
  .dht-activity{display:inline-flex;align-items:center;gap:6px;background:rgba(88,101,242,.12);border:1px solid rgba(88,101,242,.2);padding:4px 10px;border-radius:6px;font-size:12px;color:#dbdee1;margin-top:4px}
  .dht-activity-icon{font-size:14px}
  /* Embed image-only / GIFV / video variants */
  .dht-embed--image,.dht-embed--gifv,.dht-embed--video{max-width:500px;border-radius:6px;overflow:hidden;margin-top:4px;position:relative}
  .dht-embed-image,.dht-embed-gifv,.dht-embed-video-thumb{max-width:100%;height:auto;display:block;border-radius:6px}
  .dht-embed-video-wrap{display:block;position:relative;cursor:pointer}
  .dht-embed-video-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:48px;color:#fff;background:rgba(0,0,0,.35);text-shadow:0 2px 8px rgba(0,0,0,.6)}
  .dht-embed--video .dht-embed-title{display:block;color:#8ab4ff;margin-top:6px;font-weight:600}
  /* Stickers — Lottie placeholder */
  .dht-sticker--lottie{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;width:160px;height:160px;background:rgba(255,255,255,.04);border-radius:8px;color:#dbdee1;font-size:12px;text-align:center;padding:8px;box-sizing:border-box}
  .dht-sticker-placeholder{font-size:48px;margin-bottom:8px}
  .dht-sticker-name{color:#b5bac1;font-size:11px;word-break:break-word}
`;

// ===========================================================================
// Advanced filter panel — keyword + author + role + date range + has-image/embed/attachment + pinned-only
// Hides non-matching messages, respects date separators
// ===========================================================================
exports.filterPanel = '/* filterPanel merged into TOC; see exports.toc */';

exports.filterPanelStyles = `
/* Filter form lives inside the TOC panel — only the form-field styles remain.
   The old floating .dht-filter-toggle (magnifying-glass button) and standalone
   .dht-filter aside are gone. */
/* Collapsible sections inside the TOC (participants + filter) */
.dht-toc-section{margin-top:12px;border-top:1px solid #2b2d31;padding-top:10px}
.dht-toc-section:first-of-type{margin-top:0;border-top:none;padding-top:0}
.dht-toc-section>summary{cursor:pointer;font-size:11px;color:#949ba4;text-transform:uppercase;letter-spacing:.04em;font-weight:700;padding:4px 0;list-style:none;display:flex;align-items:center;justify-content:space-between}
.dht-toc-section>summary::-webkit-details-marker{display:none}
.dht-toc-section>summary::after{content:'\\25BC';font-size:9px;color:#6e727a;transition:transform .15s ease}
.dht-toc-section[open]>summary::after{transform:rotate(180deg)}
.dht-toc-section>summary:hover{color:#dbdee1}
.dht-toc-filter-body{display:flex;flex-direction:column;gap:10px;margin-top:8px}
.dht-f-field{display:flex;flex-direction:column;gap:4px;font-size:11px;color:#b5bac1;text-transform:uppercase;letter-spacing:.04em;font-weight:600}
.dht-f-field input{background:#2b2d31;color:#dbdee1;border:1px solid #2b2d31;border-radius:4px;padding:6px 8px;font-size:13px;outline:none;font-family:inherit;text-transform:none;letter-spacing:0;font-weight:400}
.dht-f-field input:focus{border-color:#5865F2}
.dht-f-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dht-f-checks{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#dbdee1;font-weight:400}
.dht-f-checks label{display:flex;align-items:center;gap:6px;cursor:pointer}
.dht-f-actions{display:flex;gap:8px;margin-top:8px}
.dht-f-actions button{flex:1;padding:8px;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:13px}
.dht-f-apply{background:#5865F2;color:#fff}.dht-f-apply:hover{background:#4752c4}
.dht-f-reset{background:#3f4248;color:#dbdee1}.dht-f-reset:hover{background:#4a4d54}
.dht-flag{display:inline-flex;align-items:center;background:rgba(255,255,255,.06);border-radius:4px;padding:2px 6px;font-size:12px;margin:2px 2px 0 0}
.dht-popup-flags{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
/* Pinned background — Discord-style amber tint */
.dht-msg-pinned, discord-message[data-pinned="true"]{background:rgba(255,180,73,.06);border-left:2px solid rgba(255,180,73,.5);padding-left:6px;box-sizing:border-box}
/* Verified bot checkmark */
.dht-verified-check{color:#fff;font-weight:bold;margin-left:2px}
/* Slash command options line */
.dht-slash-options{display:flex;flex-wrap:wrap;gap:4px;font-size:12px;background:rgba(88,101,242,.08);padding:4px 8px;border-radius:4px;margin:2px 0;color:#b5bac1}
.dht-slash-cmd-name{color:#5865F2;font-weight:600;font-family:Consolas,Menlo,monospace}
.dht-slash-opt{display:inline-flex;gap:4px;background:rgba(255,255,255,.05);padding:1px 6px;border-radius:3px}
.dht-slash-opt-name{color:#949ba4}
.dht-slash-opt-val{color:#dbdee1;font-family:Consolas,Menlo,monospace}
/* Forwarded message nesting — depth shows via margin AND border-color shading */
.dht-forwarded[data-depth="0"]{border-left-color:#5865F2}
.dht-forwarded[data-depth="1"]{margin-left:12px;border-left-color:#4752c4}
.dht-forwarded[data-depth="2"]{margin-left:24px;border-left-color:#3a44a3}
.dht-forwarded[data-depth="3"]{margin-left:36px;border-left-color:#2c3680}
.dht-forwarded[data-depth="4"]{margin-left:48px;border-left-color:#1f275f}
.dht-forwarded-embeds{font-size:11px;color:#949ba4;margin-top:2px}
`;

exports.ggSansFont = '@font-face{src:url(https://cdn.jsdelivr.net/gh/Tyrrrz/DiscordFonts@master/ggsans-normal-400.woff2);font-family:"gg sans";font-weight:400;font-style:normal;font-display:swap}@font-face{src:url(https://cdn.jsdelivr.net/gh/Tyrrrz/DiscordFonts@master/ggsans-normal-500.woff2);font-family:"gg sans";font-weight:500;font-style:normal;font-display:swap}@font-face{src:url(https://cdn.jsdelivr.net/gh/Tyrrrz/DiscordFonts@master/ggsans-normal-600.woff2);font-family:"gg sans";font-weight:600;font-style:normal;font-display:swap}@font-face{src:url(https://cdn.jsdelivr.net/gh/Tyrrrz/DiscordFonts@master/ggsans-normal-700.woff2);font-family:"gg sans";font-weight:700;font-style:normal;font-display:swap}@font-face{src:url(https://cdn.jsdelivr.net/gh/Tyrrrz/DiscordFonts@master/ggsans-normal-800.woff2);font-family:"gg sans";font-weight:800;font-style:normal;font-display:swap}@font-face{src:url(https://cdn.jsdelivr.net/gh/Tyrrrz/DiscordFonts@master/ggsans-italic-400.woff2);font-family:"gg sans";font-weight:400;font-style:italic;font-display:swap}@font-face{src:url(https://cdn.jsdelivr.net/gh/Tyrrrz/DiscordFonts@master/ggsans-italic-500.woff2);font-family:"gg sans";font-weight:500;font-style:italic;font-display:swap}@font-face{src:url(https://cdn.jsdelivr.net/gh/Tyrrrz/DiscordFonts@master/ggsans-italic-600.woff2);font-family:"gg sans";font-weight:600;font-style:italic;font-display:swap}@font-face{src:url(https://cdn.jsdelivr.net/gh/Tyrrrz/DiscordFonts@master/ggsans-italic-700.woff2);font-family:"gg sans";font-weight:700;font-style:italic;font-display:swap}@font-face{src:url(https://cdn.jsdelivr.net/gh/Tyrrrz/DiscordFonts@master/ggsans-italic-800.woff2);font-family:"gg sans";font-weight:800;font-style:italic;font-display:swap}';
//# sourceMappingURL=client.js.map
