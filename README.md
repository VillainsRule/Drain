<div align='center'>
    <img src='https://files.catbox.moe/qobaor.png' alt='Drain Preview' width='90%' />
    <h1>Drain</h1>
    <h3>a key storage tool designed for the paranoid</h3>
</div>

<br><br>

<h2 align='center'>Features</h2>

- Clean API Key management interface
- Key balance detection/validation
- Bulk imported keys
- Vast per-site permission system
- Instance-only API Keys
- Passkey/WebAuthn Login
- Global admin configuration
- Simple user management

<h2 align='center'>Setup</h2>

1. Install [Bun](https://bun.sh)
2. Clone the repo: `git clone https://github.com/VillainsRule/Drain && cd Drain`
3. Prepare for production: `bun prep`
4. Start the production server: `bun start`

> [!NOTE]
> Bun is required, thanks to the fast file streaming APIs and built-in proxy support.

To enable passkeys, you can additionally run `bun initpk` and edit the file onscreen.

<br><h2 align='center'>Useful Information</h2>

The core administrator account is named "admin" with the user ID "1". admin has access to all sites and all users. admin cannot be demoted or deleted. Only admin can change the admin account password. admin has access to all sites, forever. It is worth nothing that admin's access derives from its user ID (1) as opposed to the username, which can be changed with `bun cli/tools/renameAdmin`.

admin's default password is "admin". Change it immediately after your first login in the users button at the top right. If you accidentally forget the "admin" password, run `bun cli/tools/resetAdmin` to reset it back to "admin".

If you manually change any database files while Drain is running, Drain will automatically overwrite your changes. Turn off Drain to do any manual database changes.

There are two main concepts in Drain: users and sites. Users are people who can log into the Drain instance. Sites are collections of API keys with specific permissions.

Users can have 4 levels of access to a site:

- none - they cannot see it at all
- reader - they can read and copy all API keys, as well as add single API keys
- editor - they can recheck, sort, bulk add, and copy all API keys
- site admin - they can do everything, including controlling the other 3 user levels and rechecking ALL keys on a site

Users can have 3 levels of access to Drain:

- normal - their access to sites is managed per-site by admins
- site admin - they can see all sites and manage user access on all sites, as well as create users, change their passwords, delete them, and change their site access level. (admins can only change their own passwords or delete themselves)
- "admin" user - they are immune to the above management by "site admins", and have full access to everything. they are the ONLY admin that cannot be demoted by other admins or have its password changed by other admins.

This implementation is amazing for those with trust issues.

<br><br>
<h5 align='center'>made with ❤️ by <b>VillainsRule</b></h5>