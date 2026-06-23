/* ─── State ──────────────────────────────────────────────────────────────────── */
const state = {
  sessions: [],          // all saved sessions
  activeSessionId: null, // currently selected session id
  selectedNodeId: null,  // currently selected tree node (tactic/technique/session)
  filterReady: false,    // show only ready techniques
  searchQuery: '',       // sidebar search string
  activeTags: [],        // active tag-filter chips
  sessionTab: 'ready',   // last active session detail tab
};

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function activeSession() {
  return state.sessions.find(s => s.id === state.activeSessionId) || null;
}

function getVar(name) {
  const s = activeSession();
  return (s && s.vars[name]) ? s.vars[name] : null;
}

function setVar(name, value) {
  const s = activeSession();
  if (!s) return;
  if (value && value.trim()) {
    s.vars[name] = value.trim();
  } else {
    delete s.vars[name];
  }
  persist();
}

function persist() {
  localStorage.setItem('penotes_sessions', JSON.stringify(state.sessions));
  localStorage.setItem('penotes_activeId', state.activeSessionId || '');
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem('penotes_sessions');
    if (raw) state.sessions = JSON.parse(raw);
  } catch (e) { state.sessions = []; }
  state.activeSessionId = localStorage.getItem('penotes_activeId') || null;
  if (state.activeSessionId && !activeSession()) state.activeSessionId = null;
}

/* ─── Readiness ──────────────────────────────────────────────────────────────── */
function techniqueReadiness(technique) {
  const s = activeSession();
  if (!s) return { status: 'missing', filled: 0, total: 0 };

  const vars = new Set();
  technique.commands.forEach(cmd => {
    const matches = cmd.command.match(/\$\$[A-Z0-9_]+/g);
    if (matches) matches.forEach(v => vars.add(v));
  });

  const total = vars.size;
  if (total === 0) return { status: 'ready', filled: 0, total: 0 };

  let filled = 0;
  vars.forEach(v => { if (s.vars[v]) filled++; });

  if (filled === total) return { status: 'ready', filled, total };
  if (filled > 0)       return { status: 'partial', filled, total };
  return { status: 'missing', filled, total };
}

/* ─── Toast ──────────────────────────────────────────────────────────────────── */
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = '', 2400);
}

/* ─── Command rendering ──────────────────────────────────────────────────────── */
function renderCommandText(rawCommand) {
  const parts = rawCommand.split(/(\$\$[A-Z0-9_]+)/g);
  return parts.map(part => {
    if (/^\$\$[A-Z0-9_]+$/.test(part)) {
      const val = getVar(part);
      if (val) {
        return `<span class="var-filled" title="${escHtml(part)} = ${escHtml(val)}">${escHtml(val)}</span>`;
      } else {
        return `<span class="var-missing" data-var="${escHtml(part)}" title="Click to learn how to get ${escHtml(part)}">${escHtml(part)}</span>`;
      }
    }
    return escHtml(part);
  }).join('');
}

function getCommandCopyText(rawCommand) {
  const s = activeSession();
  if (!s) return rawCommand;
  return rawCommand.replace(/\$\$[A-Z0-9_]+/g, match => s.vars[match] || match);
}

/* ─── Collapse / Expand all ──────────────────────────────────────────────────── */
function collapseAll() {
  TACTIC_GROUPS.forEach(g => g._collapsed = true);
  TACTICS.forEach(t => t._collapsed = true);
  buildSidebar();
}
function expandAll() {
  TACTIC_GROUPS.forEach(g => g._collapsed = false);
  TACTICS.forEach(t => t._collapsed = false);
  buildSidebar();
}
function toggleAll() {
  const anyExpanded = TACTIC_GROUPS.some(g => g._collapsed === false);
  anyExpanded ? collapseAll() : expandAll();
}
function collapseAllCWE() {
  CWE_TOPICS.forEach(t => t._collapsed = true);
  buildSidebar();
}
function expandAllCWE() {
  CWE_TOPICS.forEach(t => t._collapsed = false);
  buildSidebar();
}
function toggleAllCWE() {
  const anyExpanded = CWE_TOPICS.some(t => t._collapsed === false);
  anyExpanded ? collapseAllCWE() : expandAllCWE();
}

/* ─── Sidebar rendering ──────────────────────────────────────────────────────── */
function buildSidebar() {
  const tree = document.getElementById('tree-container');
  const q = state.searchQuery.toLowerCase();

  let html = '';

  // Library section header with collapse/expand all buttons
  html += `
    <div class="sidebar-section-header">
      <span>Library</span>
      <button class="btn-tree-action" onclick="toggleAll()" title="Expand / Collapse all">${TACTIC_GROUPS.some(g => g._collapsed === false) ? '⊖' : '⊕'}</button>
    </div>`;

  TACTIC_GROUPS.forEach(group => {
    // Find tactics in this group, apply tag + search filters
    const visibleTactics = group.tacticIds
      .map(id => TACTICS.find(t => t.id === id))
      .filter(tactic => {
        if (!tactic) return false;
        // Tag filter
        if (state.activeTags.length > 0) {
          const tacticTags = TACTIC_TAGS[tactic.id] || [];
          if (!state.activeTags.some(t => tacticTags.includes(t))) return false;
        }
        // Search filter: include tactic if at least one technique matches
        if (q) {
          const hasMatch = tactic.techniques.some(t =>
            t.name.toLowerCase().includes(q) ||
            tactic.name.toLowerCase().includes(q) ||
            (t.tags || []).some(tag => tag.toLowerCase().includes(q))
          );
          if (!hasMatch) return false;
        }
        return true;
      });

    // Skip group entirely if nothing visible
    if (visibleTactics.length === 0) return;

    const groupIsCollapsed = group._collapsed !== false;
    const groupChildrenId = 'group-children-' + group.id;

    html += `
      <div class="tree-item tree-group ${groupIsCollapsed ? 'collapsed' : ''}" data-group="${escHtml(group.id)}">
        <span class="tree-icon">▼</span>
        <span>${escHtml(group.icon)} ${escHtml(group.name)}</span>
        <span class="group-count">${visibleTactics.length}</span>
      </div>
      <div class="tree-children" id="${escHtml(groupChildrenId)}"${groupIsCollapsed ? ' style="display:none"' : ''}>
    `;

    visibleTactics.forEach(tactic => {
      let matchingTechs = tactic.techniques.filter(t => {
        if (q && !t.name.toLowerCase().includes(q) &&
            !tactic.name.toLowerCase().includes(q) &&
            !(t.tags || []).some(tag => tag.toLowerCase().includes(q))) return false;
        if (state.filterReady && activeSession()) {
          const r = techniqueReadiness(t);
          if (r.status !== 'ready') return false;
        }
        return true;
      });

      if (q && matchingTechs.length === 0) return;

      const folderId = 'folder-' + tactic.id;
      const isCollapsed = tactic._collapsed !== false;

      html += `
        <div class="tree-item tree-folder grouped ${isCollapsed ? 'collapsed' : ''}" data-folder="${escHtml(tactic.id)}">
          <span class="tree-icon">▼</span>
          <span>${escHtml(tactic.icon)} ${escHtml(tactic.name)}</span>
        </div>
        <div class="tree-children" id="${escHtml(folderId)}"${isCollapsed ? ' style="display:none"' : ''}>
      `;

      matchingTechs.forEach(tech => {
        const r = activeSession() ? techniqueReadiness(tech) : null;
        const isActive = state.selectedNodeId === tech.id ? ' active' : '';
        const badge = r ? `<span class="tree-badge ${r.status}"></span>` : '';
        html += `
          <div class="tree-item tree-technique grouped${isActive}" data-technique="${escHtml(tech.id)}" data-tactic="${escHtml(tactic.id)}">
            <span>📄 ${escHtml(tech.name)}</span>
            ${badge}
          </div>
        `;
      });

      html += `</div>`;
    });

    html += `</div>`;
  });

  // CWE Topics section
  html += `<hr class="divider"><div class="sidebar-section-header">
    <span>CWE Topics</span>
    <button class="btn-tree-action" onclick="toggleAllCWE()" title="Expand / Collapse all">${CWE_TOPICS.some(t => t._collapsed === false) ? '⊖' : '⊕'}</button>
  </div>`;

  CWE_TOPICS.forEach(topic => {
    let matchingTechs = topic.techniques.filter(t => {
      if (q && !t.name.toLowerCase().includes(q) &&
          !topic.name.toLowerCase().includes(q) &&
          !(t.tags || []).some(tag => tag.includes(q))) return false;
      return true;
    });

    if (q && matchingTechs.length === 0) return;

    const folderId = 'cwe-folder-' + topic.id;
    const isCollapsed = topic._collapsed !== false;

    html += `
      <div class="tree-item tree-folder ${isCollapsed ? 'collapsed' : ''}" data-cwe-folder="${escHtml(topic.id)}">
        <span class="tree-icon">▼</span>
        <span>${escHtml(topic.icon)} ${escHtml(topic.name)}</span>
      </div>
      <div class="tree-children" id="${escHtml(folderId)}"${isCollapsed ? ' style="display:none"' : ''}>
    `;

    matchingTechs.forEach(tech => {
      const isSelected = state.selectedNodeId === 'cwe-' + tech.id ? ' active' : '';
      html += `
        <div class="tree-item tree-technique${isSelected}" data-cwe="${escHtml(tech.id)}" data-topic="${escHtml(topic.id)}">
          <span>📄 ${escHtml(tech.name)}</span>
        </div>
      `;
    });

    html += `</div>`;
  });

  // Sessions section
  html += `<hr class="divider"><div class="sidebar-section-header">Sessions</div>`;
  if (state.sessions.length === 0) {
    html += `<div style="padding:6px 16px;font-size:12px;color:var(--text-muted)">No sessions yet</div>`;
  } else {
    state.sessions.forEach(sess => {
      const isActive = sess.id === state.activeSessionId ? ' active' : '';
      const isSelected = state.selectedNodeId === 'session-' + sess.id ? ' active' : '';
      html += `
        <div class="tree-item${isSelected || isActive ? ' active' : ''}" data-session="${escHtml(sess.id)}">
          🗂️ ${escHtml(sess.name)}
        </div>
      `;
    });
  }

  tree.innerHTML = html;

  // Group toggle
  tree.querySelectorAll('[data-group]').forEach(el => {
    el.addEventListener('click', e => {
      const gId = el.dataset.group;
      const group = TACTIC_GROUPS.find(g => g.id === gId);
      if (group) group._collapsed = (group._collapsed !== false) ? false : true;
      el.classList.toggle('collapsed');
      const children = document.getElementById('group-children-' + gId);
      if (children) children.style.display = group._collapsed ? 'none' : '';
    });
  });

  // Folder toggle (TACTICS)
  tree.querySelectorAll('[data-folder]').forEach(el => {
    el.addEventListener('click', e => {
      const tId = el.dataset.folder;
      const tactic = TACTICS.find(t => t.id === tId);
      if (tactic) tactic._collapsed = (tactic._collapsed !== false) ? false : true;
      el.classList.toggle('collapsed');
      const children = document.getElementById('folder-' + tId);
      if (children) children.style.display = tactic._collapsed ? 'none' : '';
    });
  });

  // Folder toggle (CWE)
  tree.querySelectorAll('[data-cwe-folder]').forEach(el => {
    el.addEventListener('click', e => {
      const tId = el.dataset.cweFolder;
      const topic = CWE_TOPICS.find(t => t.id === tId);
      if (topic) topic._collapsed = (topic._collapsed !== false) ? false : true;
      el.classList.toggle('collapsed');
      const children = document.getElementById('cwe-folder-' + tId);
      if (children) children.style.display = topic._collapsed ? 'none' : '';
    });
  });

  // Technique click (TACTICS)
  tree.querySelectorAll('[data-technique]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const techId = el.dataset.technique;
      const tacticId = el.dataset.tactic;
      state.selectedNodeId = techId;
      selectTechnique(tacticId, techId);
      closeSidebarIfMobile();
    });
  });

  // Technique click (CWE)
  tree.querySelectorAll('[data-cwe]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const techId = el.dataset.cwe;
      const topicId = el.dataset.topic;
      state.selectedNodeId = 'cwe-' + techId;
      selectCWETechnique(topicId, techId);
      closeSidebarIfMobile();
    });
  });

  // Session click
  tree.querySelectorAll('[data-session]').forEach(el => {
    el.addEventListener('click', () => {
      const sid = el.dataset.session;
      state.selectedNodeId = 'session-' + sid;
      renderSessionDetail(sid);
      buildSidebar();
      closeSidebarIfMobile();
    });
  });
}

/* ─── Content rendering ──────────────────────────────────────────────────────── */
function selectTechnique(tacticId, techId) {
  const tactic = TACTICS.find(t => t.id === tacticId);
  if (!tactic) return;
  const tech = tactic.techniques.find(t => t.id === techId);
  if (!tech) return;

  buildSidebar();

  const r = techniqueReadiness(tech);
  const readinessLabel = {
    ready:   '✅ Ready',
    partial: `⚠️ Partial (${r.filled}/${r.total})`,
    missing: activeSession() ? '❌ Missing info' : '— No active session',
  }[r.status];

  const tagsHtml = (tech.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');
  const readinessBadgeClass = activeSession() ? r.status : 'missing';

  let commandsHtml = '';
  tech.commands.forEach(cmd => {
    const copyId = 'copy-' + cmd.id;
    commandsHtml += `
      <div class="command-card">
        <div class="command-card-header">
          <span class="command-label">${escHtml(cmd.label)}</span>
          ${cmd.os ? `<span class="command-os">${escHtml(cmd.os)}</span>` : ''}
        </div>
        <div class="command-body">${renderCommandText(cmd.command)}</div>
        <div class="command-footer">
          <span class="command-notes">${escHtml(cmd.notes || '')}</span>
          <button class="btn-copy" id="${escHtml(copyId)}" onclick="copyCommand('${escHtml(cmd.id)}','${escHtml(tactic.id)}','${escHtml(tech.id)}',this)">Copy</button>
        </div>
      </div>
    `;
  });

  document.getElementById('content').innerHTML = `
    <div class="technique-header">
      <div class="technique-title">${escHtml(tech.name)}</div>
      <span class="readiness-badge ${escHtml(readinessBadgeClass)}">${readinessLabel}</span>
    </div>
    <div class="technique-tags">${tagsHtml}</div>
    <div class="technique-desc">${escHtml(tech.description)}</div>
    <div class="commands-label">Commands</div>
    ${commandsHtml}
  `;

  // Bind variable click handlers
  document.querySelectorAll('.var-missing').forEach(el => {
    el.addEventListener('click', () => openVarModal(el.dataset.var));
  });
}

function selectCWETechnique(topicId, techId) {
  const topic = CWE_TOPICS.find(t => t.id === topicId);
  if (!topic) return;
  const tech = topic.techniques.find(t => t.id === techId);
  if (!tech) return;

  buildSidebar();

  const tagsHtml = (tech.tags || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('');

  let commandsHtml = '';
  tech.commands.forEach(cmd => {
    const copyId = 'copy-' + cmd.id;
    commandsHtml += `
      <div class="command-card">
        <div class="command-card-header">
          <span class="command-label">${escHtml(cmd.label)}</span>
          ${cmd.os ? `<span class="command-os">${escHtml(cmd.os)}</span>` : ''}
        </div>
        <div class="command-body">${renderCommandText(cmd.command)}</div>
        <div class="command-footer">
          <span class="command-notes">${escHtml(cmd.notes || '')}</span>
          <button class="btn-copy" id="${escHtml(copyId)}" onclick="copyCWECommand('${escHtml(cmd.id)}','${escHtml(topic.id)}','${escHtml(tech.id)}',this)">Copy</button>
        </div>
      </div>
    `;
  });

  document.getElementById('content').innerHTML = `
    <div class="technique-header">
      <div class="technique-title">${topic.icon} ${escHtml(tech.name)}</div>
    </div>
    <div class="technique-tags">${tagsHtml}</div>
    <div class="technique-desc">${escHtml(tech.description)}</div>
    <div class="commands-label">Tools & Techniques</div>
    ${commandsHtml}
  `;

  // Bind variable click handlers
  document.querySelectorAll('.var-missing').forEach(el => {
    el.addEventListener('click', () => openVarModal(el.dataset.var));
  });
}

function renderSessionDetail(sid) {
  const sess = state.sessions.find(s => s.id === sid);
  if (!sess) return;

  const created = new Date(sess.createdAt).toLocaleDateString();
  const filledCount = Object.values(sess.vars).filter(v => v && v.trim()).length;

  document.getElementById('content').innerHTML = `
    <div class="session-detail-header">
      <div class="session-detail-title">🗂️ ${escHtml(sess.name)}</div>
      ${sess.target ? `<span class="session-target">${escHtml(sess.target)}</span>` : ''}
    </div>
    <div class="session-meta">Created ${created} · ${filledCount} variables filled</div>
    <div class="stab-bar">
      <button class="stab-btn" data-tab="ready" onclick="switchSessionTab('ready')">▶ Ready</button>
      <button class="stab-btn" data-tab="discover" onclick="switchSessionTab('discover')">🔍 Discover</button>
      <button class="stab-btn stab-btn-vars-only" data-tab="vars" onclick="switchSessionTab('vars')">⚙ Vars</button>
    </div>
    <div class="stab-pane" data-pane="ready">${renderReadyPane(sess)}</div>
    <div class="stab-pane" data-pane="discover" style="display:none">${renderDiscoverPane(sess)}</div>
    <div class="stab-pane" data-pane="vars" style="display:none">${renderVarsPane(sess)}</div>
    <div style="padding:4px 0 16px;display:flex;gap:8px">
      <button class="btn btn-ghost btn-sm" onclick="openAddVarModal()">+ Add Variable</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="confirmDeleteSession('${escHtml(sid)}')">Delete Session</button>
    </div>
  `;
  switchSessionTab(state.sessionTab || 'ready');
}

function switchSessionTab(tab) {
  state.sessionTab = tab;
  document.querySelectorAll('.stab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.stab-pane').forEach(p =>
    p.style.display = p.dataset.pane === tab ? '' : 'none');
}

function copyRawCommand(rawCmd, btnEl) {
  const text = getCommandCopyText(rawCmd);
  navigator.clipboard.writeText(text).then(() => {
    btnEl.textContent = 'Copied!';
    btnEl.classList.add('copied');
    setTimeout(() => { btnEl.textContent = 'Copy'; btnEl.classList.remove('copied'); }, 1800);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    btnEl.textContent = 'Copied!';
    setTimeout(() => { btnEl.textContent = 'Copy'; }, 1800);
  });
}

function renderReadyPane(sess) {
  const groups = [];
  TACTICS.forEach(tactic => {
    tactic.techniques.forEach(tech => {
      const readyCmds = tech.commands.filter(cmd => {
        const vars = cmd.command.match(/\$\$[A-Z0-9_]+/g) || [];
        return vars.length > 0 && vars.every(v => sess.vars[v] && sess.vars[v].trim());
      });
      if (readyCmds.length > 0) {
        groups.push({ techName: tech.name, tacticName: tactic.name, cmds: readyCmds });
      }
    });
  });

  if (groups.length === 0) {
    return `<div class="empty-state">
      <div style="font-size:32px;margin-bottom:8px">🔒</div>
      <div>No commands fully unlocked yet.</div>
      <div style="margin-top:4px;color:var(--text-muted);font-size:12px">Fill in variables using the ⚙ Vars tab or the right panel.</div>
    </div>`;
  }

  const total = groups.reduce((n, g) => n + g.cmds.length, 0);
  let html = `<div class="ready-count">${total} command${total !== 1 ? 's' : ''} ready across ${groups.length} technique${groups.length !== 1 ? 's' : ''}</div>`;

  groups.forEach(group => {
    html += `<div class="ready-tech-header">${escHtml(group.tacticName)} › ${escHtml(group.techName)}</div>`;
    group.cmds.forEach(cmd => {
      html += `
        <div class="command-card" data-raw-cmd="${escHtml(cmd.command)}">
          <div class="command-card-header">
            <span class="command-label">${escHtml(cmd.label)}</span>
            ${cmd.os ? `<span class="command-os">${escHtml(cmd.os)}</span>` : ''}
            <button class="btn-copy" onclick="copyRawCommand(this.closest('[data-raw-cmd]').dataset.rawCmd, this)">Copy</button>
          </div>
          <div class="command-body">${renderCommandText(cmd.command)}</div>
          ${cmd.notes ? `<div class="command-notes">${escHtml(cmd.notes)}</div>` : ''}
        </div>`;
    });
  });

  return html;
}

function renderDiscoverPane(sess) {
  let html = '';
  let anyMissing = false;

  VAR_GROUPS.forEach(group => {
    const missingVars = group.vars.filter(v => !(sess.vars[v] && sess.vars[v].trim()));
    if (missingVars.length === 0) return;

    let groupHtml = '';
    missingVars.forEach(varName => {
      const varDef = VARIABLES[varName];
      if (!varDef || !varDef.howToGet || varDef.howToGet.length === 0) return;
      anyMissing = true;

      groupHtml += `<div class="discover-var-header">${escHtml(varName)}</div>`;

      const entries = varDef.howToGet.map(entry => {
        const neededVars = (entry.command || '').match(/\$\$[A-Z0-9_]+/g) || [];
        const runnable = !!entry.command && (neededVars.length === 0 || neededVars.every(v => sess.vars[v] && sess.vars[v].trim()));
        return { entry, runnable };
      }).sort((a, b) => b.runnable - a.runnable);

      entries.forEach(({ entry, runnable }) => {
        groupHtml += `
          <div class="howtoget-card${runnable ? '' : ' dimmed'}" ${entry.command ? `data-raw-cmd="${escHtml(entry.command)}"` : ''}>
            <div class="howtoget-method">${escHtml(entry.method)}</div>
            ${entry.command ? `<div class="command-body">${renderCommandText(entry.command)}</div>` : ''}
            ${entry.notes ? `<div class="command-notes">${escHtml(entry.notes)}</div>` : ''}
            ${runnable ? `<button class="btn-copy" onclick="copyRawCommand(this.closest('[data-raw-cmd]').dataset.rawCmd, this)">Copy</button>` : ''}
          </div>`;
      });
    });

    if (groupHtml) {
      html += `<div class="discover-group-label">${escHtml(group.name)}</div>${groupHtml}`;
    }
  });

  if (!anyMissing) {
    return `<div class="empty-state">
      <div style="font-size:32px;margin-bottom:8px">✅</div>
      <div>All variables are filled!</div>
    </div>`;
  }

  return html;
}

/* ─── Shared var-row renderer (used by right panel + mobile vars pane) ──────── */
function varRowHtml(name, sess) {
  const val = sess.vars[name];
  const hasVal = val && val.trim();
  return `
    <div class="var-row" onclick="openVarModal('${escHtml(name)}')">
      <div class="var-row-name">
        <span class="var-row-dot ${hasVal ? 'dot-filled' : 'dot-missing'}"></span>${escHtml(name)}
      </div>
      ${hasVal
        ? `<div class="var-row-value">${escHtml(val)}</div>`
        : `<div class="var-row-empty">unknown</div>`}
    </div>`;
}

function buildVarListHtml(sess) {
  const groupedVarNames = new Set(VAR_GROUPS.flatMap(g => g.vars));
  const extraVarNames = Object.keys(sess.vars).filter(n => !groupedVarNames.has(n));
  let html = '';
  VAR_GROUPS.forEach(group => {
    html += `<div class="var-group-label">${escHtml(group.name)}</div>`;
    group.vars.forEach(name => { html += varRowHtml(name, sess); });
  });
  if (extraVarNames.length > 0) {
    html += `<div class="var-group-label">Custom</div>`;
    extraVarNames.forEach(name => { html += varRowHtml(name, sess); });
  }
  return html;
}

/* ─── Right Panel ────────────────────────────────────────────────────────────── */
function buildRightPanel() {
  const panel = document.getElementById('right-panel');
  const sess = activeSession();

  if (!sess) {
    panel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">Session Variables</span>
      </div>
      <div class="no-session-msg">
        No active session.<br>Create one to track your findings.
      </div>
      <div class="panel-footer">
        <button class="btn btn-primary btn-sm btn-full" onclick="openNewSessionModal()">+ New Session</button>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <div class="panel-header">
      <span class="panel-title">Session Variables</span>
    </div>
    <div class="session-name-display">${escHtml(sess.name)}</div>
    <div id="var-list">${buildVarListHtml(sess)}</div>
    <div class="panel-footer">
      <button class="btn btn-ghost btn-sm btn-full" onclick="openAddVarModal()">+ Add Variable</button>
    </div>
  `;
}

/* ─── Mobile Vars Pane (shown as ⚙ Vars tab on mobile) ─────────────────────── */
function renderVarsPane(sess) {
  return `
    <div style="padding-bottom:8px">${buildVarListHtml(sess)}</div>
  `;
}

/* ─── Variable Modal ─────────────────────────────────────────────────────────── */
function openVarModal(varName) {
  const varDef = VARIABLES[varName];
  const currentVal = getVar(varName);

  let howToHtml = '';
  if (varDef && varDef.howToGet && varDef.howToGet.length > 0) {
    howToHtml = `<div class="howto-label">How to get this</div>`;
    varDef.howToGet.forEach(item => {
      howToHtml += `
        <div class="howto-card">
          <div class="howto-method">${escHtml(item.method)}</div>
          ${item.command ? `<div class="howto-command">${renderCommandText(item.command)}</div>` : ''}
          ${item.notes ? `<div class="howto-notes">${escHtml(item.notes)}</div>` : ''}
        </div>
      `;
    });
  } else {
    howToHtml = `<div style="color:var(--text-muted);font-size:13px">No automated how-to available. Enter the value manually.</div>`;
  }

  document.getElementById('var-modal-content').innerHTML = `
    <div class="var-info-name">${escHtml(varName)}</div>
    <div class="var-info-desc">${varDef ? escHtml(varDef.description || varDef.name) : 'Custom variable'}</div>
    ${howToHtml}
    <div class="var-set-section">
      <div class="var-set-label">${activeSession() ? 'Set value for active session:' : 'No active session'}</div>
      ${activeSession() ? `
        <div class="var-set-row">
          <input class="form-input mono" id="var-set-input" placeholder="Enter value…" value="${escHtml(currentVal || '')}" />
          <button class="btn btn-primary btn-sm" onclick="saveVarFromModal('${escHtml(varName)}')">Save</button>
          ${currentVal ? `<button class="btn btn-ghost btn-sm" onclick="clearVarFromModal('${escHtml(varName)}')">Clear</button>` : ''}
        </div>
      ` : ''}
    </div>
  `;

  // Bind var-missing clicks inside howto cards
  document.querySelectorAll('#var-modal-content .var-missing').forEach(el => {
    el.addEventListener('click', () => {
      closeModal('var-modal');
      setTimeout(() => openVarModal(el.dataset.var), 200);
    });
  });

  const input = document.getElementById('var-set-input');
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') saveVarFromModal(varName);
    });
    setTimeout(() => input.focus(), 100);
  }

  openModal('var-modal');
}

function saveVarFromModal(varName) {
  const input = document.getElementById('var-set-input');
  if (!input) return;
  setVar(varName, input.value);
  toast(`${varName} saved`, 'success');
  closeModal('var-modal');
  refreshAll();
}

function clearVarFromModal(varName) {
  setVar(varName, '');
  toast(`${varName} cleared`, 'info');
  closeModal('var-modal');
  refreshAll();
}

/* ─── Add Variable Modal ─────────────────────────────────────────────────────── */
function openAddVarModal() {
  const knownOptions = KNOWN_VAR_NAMES.map(n =>
    `<option value="${escHtml(n)}">${escHtml(n)}</option>`
  ).join('');

  document.getElementById('add-var-modal-content').innerHTML = `
    <div class="form-group">
      <label class="form-label">Variable Name</label>
      <input class="form-input mono" id="add-var-name" placeholder="$$VARNAME or custom name" list="known-vars" />
      <datalist id="known-vars">${knownOptions}</datalist>
    </div>
    <div class="form-group">
      <label class="form-label">Value</label>
      <input class="form-input mono" id="add-var-value" placeholder="Enter the value" />
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost btn-sm" onclick="closeModal('add-var-modal')">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="saveAddVar()">Add</button>
    </div>
  `;

  openModal('add-var-modal');
  setTimeout(() => document.getElementById('add-var-name').focus(), 100);
}

function saveAddVar() {
  const nameEl = document.getElementById('add-var-name');
  const valueEl = document.getElementById('add-var-value');
  if (!nameEl || !valueEl) return;
  let name = nameEl.value.trim().toUpperCase();
  if (!name) { toast('Variable name required', 'error'); return; }
  if (!name.startsWith('$$')) name = '$$' + name;
  const value = valueEl.value.trim();
  if (!value) { toast('Value required', 'error'); return; }
  setVar(name, value);
  toast(`${name} added`, 'success');
  closeModal('add-var-modal');
  refreshAll();
}

/* ─── New Session Modal ──────────────────────────────────────────────────────── */
function openNewSessionModal() {
  document.getElementById('new-session-name').value = '';
  document.getElementById('new-session-target').value = '';
  document.getElementById('new-session-domain').value = '';
  closeSessionMenu();
  openModal('new-session-modal');
  setTimeout(() => document.getElementById('new-session-name').focus(), 100);
}

function createSession() {
  const name   = document.getElementById('new-session-name').value.trim();
  const target = document.getElementById('new-session-target').value.trim();
  const domain = document.getElementById('new-session-domain').value.trim();

  if (!name) { toast('Session name required', 'error'); return; }

  const sess = {
    id: uid(),
    name,
    target,
    createdAt: Date.now(),
    vars: {}
  };

  if (target) sess.vars['$$IP'] = target;
  if (domain) sess.vars['$$DOMAIN'] = domain;

  state.sessions.push(sess);
  state.activeSessionId = sess.id;
  persist();

  closeModal('new-session-modal');
  toast(`Session "${name}" created`, 'success');

  state.selectedNodeId = 'session-' + sess.id;
  buildSidebar();
  buildRightPanel();
  renderSessionDetail(sess.id);
}

/* ─── Session menu ───────────────────────────────────────────────────────────── */
function toggleSessionMenu() {
  const menu = document.getElementById('session-menu');
  menu.classList.toggle('show');
  rebuildSessionMenu();
}

function closeSessionMenu() {
  document.getElementById('session-menu').classList.remove('show');
}

function rebuildSessionMenu() {
  const menu = document.getElementById('session-menu');
  let html = `<div class="session-menu-item new-session-btn" onclick="openNewSessionModal()">＋ New Session</div>`;

  if (state.sessions.length > 0) {
    html += `<hr class="divider" style="margin:0">`;
    state.sessions.forEach(sess => {
      const isActive = sess.id === state.activeSessionId ? ' active-session' : '';
      html += `
        <div class="session-menu-item${isActive}" onclick="switchSession('${escHtml(sess.id)}')">
          🗂️ ${escHtml(sess.name)}
          ${sess.target ? `<span style="margin-left:auto;font-size:11px;color:var(--text-muted)">${escHtml(sess.target)}</span>` : ''}
        </div>
      `;
    });
  }

  menu.innerHTML = html;
}

function switchSession(sid) {
  state.activeSessionId = sid;
  persist();
  closeSessionMenu();
  toast('Session switched', 'info');
  refreshAll();
  state.selectedNodeId = 'session-' + sid;
  renderSessionDetail(sid);
  buildSidebar();
}

function confirmDeleteSession(sid) {
  const sess = state.sessions.find(s => s.id === sid);
  if (!sess) return;
  if (!confirm(`Delete session "${sess.name}"? This cannot be undone.`)) return;
  state.sessions = state.sessions.filter(s => s.id !== sid);
  if (state.activeSessionId === sid) {
    state.activeSessionId = state.sessions[0]?.id || null;
  }
  persist();
  toast('Session deleted', 'info');
  state.selectedNodeId = null;
  document.getElementById('content').innerHTML = welcomeHtml();
  buildSidebar();
  buildRightPanel();
}

/* ─── Modal helpers ──────────────────────────────────────────────────────────── */
function openModal(id) {
  document.getElementById(id).classList.add('show');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

/* ─── Copy command ───────────────────────────────────────────────────────────── */
function copyCommand(cmdId, tacticId, techId, btnEl) {
  const tactic = TACTICS.find(t => t.id === tacticId);
  const tech = tactic && tactic.techniques.find(t => t.id === techId);
  const cmd = tech && tech.commands.find(c => c.id === cmdId);
  if (!cmd) return;

  const text = getCommandCopyText(cmd.command);
  navigator.clipboard.writeText(text).then(() => {
    btnEl.textContent = 'Copied!';
    btnEl.classList.add('copied');
    setTimeout(() => {
      btnEl.textContent = 'Copy';
      btnEl.classList.remove('copied');
    }, 1800);
  }).catch(() => {
    // Fallback for file:// without permissions
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    btnEl.textContent = 'Copied!';
    setTimeout(() => { btnEl.textContent = 'Copy'; }, 1800);
  });
}

function copyCWECommand(cmdId, topicId, techId, btnEl) {
  const topic = CWE_TOPICS.find(t => t.id === topicId);
  const tech = topic && topic.techniques.find(t => t.id === techId);
  const cmd = tech && tech.commands.find(c => c.id === cmdId);
  if (!cmd) return;

  const text = getCommandCopyText(cmd.command);
  navigator.clipboard.writeText(text).then(() => {
    btnEl.textContent = 'Copied!';
    btnEl.classList.add('copied');
    setTimeout(() => {
      btnEl.textContent = 'Copy';
      btnEl.classList.remove('copied');
    }, 1800);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    btnEl.textContent = 'Copied!';
    setTimeout(() => { btnEl.textContent = 'Copy'; }, 1800);
  });
}

/* ─── Sidebar toggle ─────────────────────────────────────────────────────────── */
function closeSidebarIfMobile() {
  if (window.innerWidth > 700) return;
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.style.left = -sidebar.offsetWidth + 'px';
  overlay.classList.remove('show');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isMobile = window.innerWidth <= 700;

  if (isMobile) {
    // Use inline left style — avoids class/transition interception issues
    const currentLeft = parseFloat(sidebar.style.left || '0');
    const isHidden = currentLeft < -10;
    sidebar.style.left = isHidden ? '0px' : -sidebar.offsetWidth + 'px';
    overlay.classList.toggle('show', isHidden);   // show overlay when revealing
  } else {
    sidebar.classList.toggle('sidebar-hidden');
    overlay.classList.remove('show');
  }
}

/* ─── Filter ─────────────────────────────────────────────────────────────────── */
function toggleFilter(checked) {
  state.filterReady = checked;
  buildSidebar();
}

/* ─── Tag filter ─────────────────────────────────────────────────────────────── */
function buildTagBar() {
  const bar = document.getElementById('tag-bar');
  if (!bar) return;

  const tagSlug = t => t.toLowerCase().replace(/\s+/g, '-');

  const chipsHtml = ALL_FILTER_TAGS.map(tag => {
    const active = state.activeTags.includes(tag) ? ' active' : '';
    return `<button class="tag-chip tag-${tagSlug(tag)}${active}" onclick="toggleTag('${escHtml(tag)}')">${escHtml(tag)}</button>`;
  }).join('');

  const clearHtml = state.activeTags.length > 0
    ? `<button class="tag-chip tag-clear" onclick="clearTags()" title="Clear all filters">✕ clear</button>`
    : '';

  bar.innerHTML = chipsHtml + clearHtml;
}

function toggleTag(tag) {
  const idx = state.activeTags.indexOf(tag);
  if (idx === -1) state.activeTags.push(tag);
  else state.activeTags.splice(idx, 1);
  buildTagBar();
  buildSidebar();
}

function clearTags() {
  state.activeTags = [];
  buildTagBar();
  buildSidebar();
}

/* ─── Welcome screen ─────────────────────────────────────────────────────────── */
function welcomeHtml() {
  return `
    <div class="welcome-screen">
      <div style="font-size:48px">🔒</div>
      <h2>penotes</h2>
      <p>Select a technique from the sidebar to view commands, or create a new pentest session to start tracking your variables.</p>
      <button class="btn btn-primary" onclick="openNewSessionModal()">+ New Session</button>
    </div>
  `;
}

/* ─── Refresh everything ─────────────────────────────────────────────────────── */
function refreshAll() {
  // Re-render whatever is currently selected
  if (state.selectedNodeId) {
    if (state.selectedNodeId.startsWith('session-')) {
      const sid = state.selectedNodeId.replace('session-', '');
      renderSessionDetail(sid);
    } else if (state.selectedNodeId.startsWith('cwe-')) {
      // It's a CWE technique id — find its topic
      const techId = state.selectedNodeId.replace('cwe-', '');
      for (const topic of CWE_TOPICS) {
        const tech = topic.techniques.find(t => t.id === techId);
        if (tech) {
          selectCWETechnique(topic.id, techId);
          break;
        }
      }
    } else {
      // It's a TACTICS technique id — find its tactic
      for (const tactic of TACTICS) {
        const tech = tactic.techniques.find(t => t.id === state.selectedNodeId);
        if (tech) {
          selectTechnique(tactic.id, state.selectedNodeId);
          break;
        }
      }
    }
  }
  buildSidebar();
  buildRightPanel();
}

/* ─── Init ───────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadPersisted();

  // On mobile: hide sidebar instantly at load (no flash), then restore CSS transition
  if (window.innerWidth <= 700) {
    const sb = document.getElementById('sidebar');
    sb.style.transition = 'none';
    sb.style.left = -sb.offsetWidth + 'px';
    void sb.offsetWidth;
    sb.style.transition = '';   // fall back to CSS rule (left 0.25s ease)
  }

  // Render initial state
  document.getElementById('content').innerHTML = welcomeHtml();
  buildTagBar();
  buildSidebar();
  buildRightPanel();

  // Sidebar search
  const searchInput = document.querySelector('.header-search');
  searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value;
    buildSidebar();
  });

  // Filter checkbox
  document.getElementById('filter-ready').addEventListener('change', e => {
    toggleFilter(e.target.checked);
  });

  // Session button
  document.getElementById('btn-session').addEventListener('click', e => {
    e.stopPropagation();
    toggleSessionMenu();
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.session-switcher')) closeSessionMenu();
  });

  // New session form submit
  document.getElementById('btn-create-session').addEventListener('click', createSession);
  document.getElementById('new-session-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') createSession();
  });

  // Modal overlay click closes
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('show');
    });
  });

  // ESC key closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
      closeSessionMenu();
    }
  });
});
