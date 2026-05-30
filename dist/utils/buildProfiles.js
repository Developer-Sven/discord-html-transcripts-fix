"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProfiles = buildProfiles;
exports.buildExtendedContext = buildExtendedContext;
exports.buildAllContext = buildAllContext;
const discord_js_1 = require("discord.js");

/**
 * Backwards compatible: returns the profile dict used by <discord-mention> web components.
 */
async function buildProfiles(messages) {
    const { profiles } = await buildAllContext(messages, null);
    return profiles;
}

/**
 * Backwards compatible: returns extended users/roles/channels.
 */
async function buildExtendedContext(messages, channel) {
    const { users, roles, channels } = await buildAllContext(messages, channel);
    return { users, roles, channels };
}

/**
 * Single-pass collector — builds the legacy `profiles` dict AND the extended
 * users/roles/channels dicts in one go (saves an O(n) pass for big tickets).
 */
async function buildAllContext(messages, channel) {
    const profiles = {};
    const users = {};
    const roles = {};
    const channels = {};

    // FIX: previous version was `!channel.isDMBased && !channel.isDMBased()`
    // which is always false (isDMBased is a truthy function reference).
    const guild = channel && typeof channel.isDMBased === 'function' && !channel.isDMBased()
        ? channel.guild
        : null;

    const seenUserIds = new Set();
    const seenRoleIds = new Set();
    const seenChannelIds = new Set();

    const includeRoleFromGuild = (roleId) => {
        if (!guild || !roleId || seenRoleIds.has(roleId)) return;
        const role = guild.roles.cache.get(roleId);
        if (!role) return;
        seenRoleIds.add(roleId);
        roles[roleId] = {
            id: role.id,
            name: role.name,
            color: role.hexColor && role.hexColor !== '#000000' ? role.hexColor : null,
            position: role.position,
            hoist: role.hoist,
            mentionable: role.mentionable,
            memberCount: typeof role.members?.size === 'number' ? role.members.size : null,
            managed: role.managed,
        };
    };

    const includeChannelFromGuild = (channelId) => {
        if (!guild || !channelId || seenChannelIds.has(channelId)) return;
        const ch = guild.channels.cache.get(channelId);
        if (!ch) return;
        seenChannelIds.add(channelId);
        channels[channelId] = {
            id: ch.id,
            name: ch.name,
            type: ch.type,
            parent: ch.parent ? ch.parent.name : null,
            topic: 'topic' in ch && typeof ch.topic === 'string' ? ch.topic : null,
            nsfw: 'nsfw' in ch ? !!ch.nsfw : false,
        };
    };

    const includeUser = (member, author) => {
        if (!author) return;
        const id = author.id;
        if (seenUserIds.has(id)) return;
        seenUserIds.add(id);

        // Compute member roles first so we can derive the name color from the
        // highest *listed* role (top of the role list), matching how Discord
        // colors usernames. Falls back to displayHexColor (highest *colored*
        // role) and finally to null.
        const memberRoles = member && member.roles && member.roles.cache
            ? Array.from(member.roles.cache.values())
                .filter((r) => r.id !== guild?.id)
                .sort((a, b) => b.position - a.position)
            : [];
        for (const r of memberRoles) includeRoleFromGuild(r.id);

        const topRoleHex = memberRoles[0]?.hexColor;
        const displayHex = member?.displayHexColor;
        const effectiveColor = (topRoleHex && topRoleHex !== '#000000')
            ? topRoleHex
            : (displayHex && displayHex !== '#000000' ? displayHex : null);

        // legacy profile (used by <discord-mention>)
        //
        // forceStatic: Discord CDN returns HTTP 415 for `.gif` on some animated
        // avatar hashes (commonly bot avatars whose animation was removed but
        // whose hash still carries the `a_` prefix). The static variant (.webp
        // or .png) always works, so render avatars as static in transcripts.
        // Avatars in a historical archive don't gain much from being animated.
        profiles[id] = {
            author: member?.nickname ?? author.displayName ?? author.username,
            avatar: member?.displayAvatarURL?.({ size: 64, forceStatic: true }) ?? author.displayAvatarURL?.({ size: 64, forceStatic: true }),
            roleColor: effectiveColor,
            roleIcon: member?.roles?.icon?.iconURL?.() ?? undefined,
            roleName: member?.roles?.hoist?.name ?? undefined,
            bot: !!author.bot,
            verified: author.flags?.has?.(discord_js_1.UserFlags.VerifiedBot) ?? false,
        };

        // Collect user flag names (Staff, Partner, HypeSquad…)
        const flagNames = [];
        if (author.flags && typeof author.flags.has === 'function' && discord_js_1.UserFlags) {
            for (const flagName of Object.keys(discord_js_1.UserFlags)) {
                // Filter out numeric reverse-lookups
                if (/^\d+$/.test(flagName)) continue;
                try {
                    if (author.flags.has(discord_js_1.UserFlags[flagName])) flagNames.push(flagName);
                } catch (_e) { /* ignore unknown flag */ }
            }
        }

        users[id] = {
            id,
            username: author.username,
            displayName: member?.nickname || author.displayName || author.username,
            globalName: author.globalName || null,
            avatar: member?.displayAvatarURL?.({ size: 128, forceStatic: true }) || author.displayAvatarURL?.({ size: 128, forceStatic: true }) || null,
            bannerColor: effectiveColor,
            bot: !!author.bot,
            system: !!author.system,
            verifiedBot: flagNames.includes('VerifiedBot'),
            flags: flagNames,
            joinedAt: member?.joinedAt ? member.joinedAt.toISOString() : null,
            createdAt: author.createdAt ? author.createdAt.toISOString() : null,
            roles: memberRoles.map((r) => ({
                id: r.id,
                name: r.name,
                color: r.hexColor && r.hexColor !== '#000000' ? r.hexColor : null,
                position: r.position,
            })),
            highestRole: memberRoles[0]
                ? { name: memberRoles[0].name, color: memberRoles[0].hexColor }
                : null,
        };
    };

    for (const message of messages) {
        if (message.author) includeUser(message.member, message.author);
        if (message.interaction?.user) {
            // FIX: try to find a member object for this user from later messages (interaction user may have authored their own messages elsewhere).
            const memberMatch = message.interaction.member || (message.mentions?.members?.get?.(message.interaction.user.id)) || null;
            includeUser(memberMatch, message.interaction.user);
        }
        if (message.thread?.lastMessage?.author) {
            includeUser(message.thread.lastMessage.member, message.thread.lastMessage.author);
        }
        if (message.mentions) {
            if (message.mentions.users) {
                for (const [uid, u] of message.mentions.users) {
                    const member = message.mentions.members?.get?.(uid) || null;
                    includeUser(member, u);
                }
            }
            if (message.mentions.roles) {
                for (const [rid] of message.mentions.roles) includeRoleFromGuild(rid);
            }
            if (message.mentions.channels) {
                for (const [cid] of message.mentions.channels) includeChannelFromGuild(cid);
            }
        }
        // also include authors of forwarded snapshots
        if (Array.isArray(message.messageSnapshots)) {
            for (const snap of message.messageSnapshots) {
                if (snap?.author) includeUser(null, snap.author);
            }
        }
    }

    return { profiles, users, roles, channels };
}
//# sourceMappingURL=buildProfiles.js.map
