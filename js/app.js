/* ─── State ──────────────────────────────────────────────────────────────────── */
const state = {
  sessions: [],          // all saved sessions
  activeSessionId: null, // currently selected session id
  selectedNodeId: null,  // currently selected tree node (tactic/technique/session)
  toolSearch: false,     // tool search mode (vs technique name search)
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
  // Migrate old sessions that predate these fields
  state.sessions.forEach(sess => {
    if (!sess.techProgress) sess.techProgress = {};
    if (!sess.cmdNotes) sess.cmdNotes = {};
    if (!sess.findings) sess.findings = [];
    // Migrate old flat findings (had .value field) to new tree format
    sess.findings = sess.findings.map(f => {
      if (f.value !== undefined && f.title === undefined) {
        return { id: f.id, title: f.value, type: f.type, note: f.note || '', values: [], children: [], addedAt: f.addedAt };
      }
      return f;
    });
  });
}

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function getAllCommands(tech) {
  if (tech.subtechniques) return tech.subtechniques.flatMap(st => st.commands);
  return tech.commands || [];
}

function renderCommandCardHtml(cmd, tacticId, techId) {
  const note = getCmdNote(cmd.id);
  return `
    <div class="command-card" data-cmd-id="${escHtml(cmd.id)}">
      <div class="command-card-header">
        <span class="command-label">${escHtml(cmd.label)}</span>
        ${cmd.os ? `<span class="command-os">${escHtml(cmd.os)}</span>` : ''}
      </div>
      <div class="command-body">${renderCommandText(cmd.command)}</div>
      <div class="cmd-note-preview"${note ? '' : ' style="display:none"'}>${escHtml(note)}</div>
      <div class="command-footer">
        <span class="command-notes">${escHtml(cmd.notes || '')}</span>
        <button class="btn-note${note ? ' has-note' : ''}" onclick="toggleCmdNote('${escHtml(cmd.id)}',this)" title="Output note">Note</button>
        <button class="btn-copy" onclick="copyCommand('${escHtml(cmd.id)}','${escHtml(tacticId)}','${escHtml(techId)}',this)">Copy</button>
      </div>
      <div class="cmd-note-editor" style="display:none">
        <textarea class="cmd-note-textarea" placeholder="Paste output or notes here…" onblur="saveCmdNote('${escHtml(cmd.id)}',this)"></textarea>
      </div>
    </div>`;
}

/* ─── Progress tracking ──────────────────────────────────────────────────────── */
function renderProgressBar(techId, status) {
  const btns = [
    { id: 'in-progress', label: '▶ In Progress', cls: 'prog-ip' },
    { id: 'done',        label: '✓ Done',        cls: 'prog-done' },
    { id: 'skipped',     label: '⏭ Skip',        cls: 'prog-skip' },
  ].map(s => {
    const active = status === s.id ? ' active' : '';
    const next = status === s.id ? '' : s.id;
    return `<button class="prog-btn ${s.cls}${active}" onclick="setTechProgress('${escHtml(techId)}','${next}')">${s.label}</button>`;
  }).join('');
  return `<div class="tech-progress-bar">${btns}</div>`;
}

function setTechProgress(techId, status) {
  const s = activeSession();
  if (!s) return;
  if (status) s.techProgress[techId] = status;
  else delete s.techProgress[techId];
  persist();
  const bar = document.querySelector('.tech-progress-bar');
  if (bar) bar.outerHTML = renderProgressBar(techId, status || null);
  buildSidebar();
}

/* ─── Command notes ──────────────────────────────────────────────────────────── */
function getCmdNote(cmdId) {
  const s = activeSession();
  return (s && s.cmdNotes && s.cmdNotes[cmdId]) || '';
}

function setCmdNote(cmdId, text) {
  const s = activeSession();
  if (!s) return;
  if (text && text.trim()) s.cmdNotes[cmdId] = text;
  else delete s.cmdNotes[cmdId];
  persist();
}

function toggleCmdNote(cmdId, btnEl) {
  const card = btnEl.closest('.command-card');
  if (!card) return;
  const editor = card.querySelector('.cmd-note-editor');
  if (!editor) return;
  const isOpen = editor.style.display !== 'none';
  editor.style.display = isOpen ? 'none' : '';
  btnEl.classList.toggle('active', !isOpen);
  if (!isOpen) {
    const ta = editor.querySelector('textarea');
    if (ta) { ta.value = getCmdNote(cmdId); ta.focus(); }
  }
}

function saveCmdNote(cmdId, taEl) {
  setCmdNote(cmdId, taEl.value);
  const card = taEl.closest('.command-card');
  if (!card) return;
  const preview = card.querySelector('.cmd-note-preview');
  if (!preview) return;
  const text = taEl.value.trim();
  preview.textContent = text;
  preview.style.display = text ? '' : 'none';
  card.querySelector('.btn-note').classList.toggle('has-note', !!text);
}

/* ─── Findings log ───────────────────────────────────────────────────────────── */
const FINDING_TYPES = {
  cred:  { icon: '🔑', label: 'Credential' },
  hash:  { icon: '#️⃣', label: 'Hash' },
  user:  { icon: '👤', label: 'User' },
  share: { icon: '📁', label: 'Share' },
  host:  { icon: '🖥', label: 'Host' },
  flag:  { icon: '🚩', label: 'Flag' },
  note:  { icon: '📝', label: 'Note' },
};

const collapsedFindings = new Set();

function _findById(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = _findById(n.children || [], id);
    if (found) return found;
  }
  return null;
}

function _removeById(nodes, id) {
  const idx = nodes.findIndex(n => n.id === id);
  if (idx !== -1) { nodes.splice(idx, 1); return true; }
  for (const n of nodes) {
    if (_removeById(n.children || [], id)) return true;
  }
  return false;
}

function _refreshFindingsPane() {
  const s = activeSession();
  if (!s) return;
  const pane = document.querySelector('[data-pane="findings"]');
  if (pane) pane.innerHTML = renderFindingsPane(s);
}

function toggleFindingNode(id) {
  if (collapsedFindings.has(id)) collapsedFindings.delete(id);
  else collapsedFindings.add(id);
  const body = document.getElementById('fnb-' + id);
  const chevron = document.getElementById('fnc-' + id);
  if (body) body.classList.toggle('finding-collapsed', collapsedFindings.has(id));
  if (chevron) chevron.classList.toggle('collapsed', collapsedFindings.has(id));
}

function showFindingForm(formId) {
  const el = document.getElementById(formId);
  if (!el) return;
  const wasHidden = el.style.display === 'none' || !el.style.display;
  el.style.display = wasHidden ? '' : 'none';
  if (wasHidden) el.querySelector('input,select') && el.querySelector('input').focus();
}

function submitFinding() {
  const s = activeSession();
  if (!s) return;
  const typeEl  = document.getElementById('finding-type');
  const titleEl = document.getElementById('finding-title');
  const noteEl  = document.getElementById('finding-note');
  const title = titleEl ? titleEl.value.trim() : '';
  if (!title) { toast('Name required', 'error'); return; }
  s.findings.push({ id: uid(), title, type: typeEl ? typeEl.value : 'note', note: noteEl ? noteEl.value.trim() : '', values: [], children: [], addedAt: Date.now() });
  persist();
  if (titleEl) titleEl.value = '';
  if (noteEl) noteEl.value = '';
  toast('Finding created', 'success');
  _refreshFindingsPane();
}

function submitSubFinding(parentId) {
  const s = activeSession();
  if (!s) return;
  const typeEl  = document.getElementById('fas-type-' + parentId);
  const titleEl = document.getElementById('fas-title-' + parentId);
  const noteEl  = document.getElementById('fas-note-' + parentId);
  const title = titleEl ? titleEl.value.trim() : '';
  if (!title) { toast('Name required', 'error'); return; }
  const parent = _findById(s.findings, parentId);
  if (!parent) return;
  if (!parent.children) parent.children = [];
  parent.children.push({ id: uid(), title, type: typeEl ? typeEl.value : 'note', note: noteEl ? noteEl.value.trim() : '', values: [], children: [], addedAt: Date.now() });
  persist();
  toast('Sub-finding created', 'success');
  _refreshFindingsPane();
}

function submitFindingValue(findingId) {
  const s = activeSession();
  if (!s) return;
  const valEl  = document.getElementById('fav-val-' + findingId);
  const noteEl = document.getElementById('fav-note-' + findingId);
  const value = valEl ? valEl.value.trim() : '';
  if (!value) { toast('Value required', 'error'); return; }
  const f = _findById(s.findings, findingId);
  if (!f) return;
  if (!f.values) f.values = [];
  f.values.push({ id: uid(), value, note: noteEl ? noteEl.value.trim() : '' });
  persist();
  toast('Value added', 'success');
  _refreshFindingsPane();
}

function deleteFindingValue(findingId, valueId) {
  const s = activeSession();
  if (!s) return;
  const f = _findById(s.findings, findingId);
  if (!f || !f.values) return;
  f.values = f.values.filter(v => v.id !== valueId);
  persist();
  _refreshFindingsPane();
}

function deleteFinding(id) {
  const s = activeSession();
  if (!s) return;
  _removeById(s.findings, id);
  collapsedFindings.delete(id);
  persist();
  _refreshFindingsPane();
}

function _countFindings(nodes) {
  return (nodes || []).reduce((n, f) => n + 1 + _countFindings(f.children), 0);
}

function _typeOptions(selectedKey) {
  return Object.entries(FINDING_TYPES)
    .map(([k, v]) => `<option value="${k}"${k === selectedKey ? ' selected' : ''}>${v.icon} ${v.label}</option>`)
    .join('');
}

function renderFindingItem(f, depth) {
  const ft = FINDING_TYPES[f.type] || { icon: '📋', label: 'Note' };
  const isCollapsed = collapsedFindings.has(f.id);
  const hdrPad = 10 + depth * 20;
  const bodyPad = 30 + depth * 20;

  const valuesHtml = (f.values || []).map(v => `
    <div class="finding-val-row" style="padding-left:${bodyPad}px">
      <span class="finding-val-dot">·</span>
      <span class="finding-val-text">${escHtml(v.value)}</span>
      ${v.note ? `<span class="finding-val-note">— ${escHtml(v.note)}</span>` : ''}
      <button class="finding-del" onclick="deleteFindingValue('${escHtml(f.id)}','${escHtml(v.id)}')">✕</button>
    </div>`).join('');

  const childrenHtml = (f.children || []).map(c => renderFindingItem(c, depth + 1)).join('');

  return `
    <div class="finding-node" id="fn-${escHtml(f.id)}">
      <div class="finding-node-hdr" style="padding-left:${hdrPad}px">
        <button class="finding-chevron${isCollapsed ? ' collapsed' : ''}" id="fnc-${escHtml(f.id)}" onclick="toggleFindingNode('${escHtml(f.id)}')">▼</button>
        <span class="finding-node-icon">${ft.icon}</span>
        <span class="finding-node-title">${escHtml(f.title)}</span>
        ${f.note ? `<span class="finding-node-note">${escHtml(f.note)}</span>` : ''}
        <div class="finding-node-acts">
          <button class="finding-act-btn" onclick="showFindingForm('fav-${escHtml(f.id)}')">+ Value</button>
          <button class="finding-act-btn" onclick="showFindingForm('fas-${escHtml(f.id)}')">+ Sub</button>
          <button class="finding-del" onclick="deleteFinding('${escHtml(f.id)}')">✕</button>
        </div>
      </div>
      <div class="finding-node-body${isCollapsed ? ' finding-collapsed' : ''}" id="fnb-${escHtml(f.id)}">
        ${valuesHtml}
        <div class="finding-inline-form" id="fav-${escHtml(f.id)}" style="display:none;padding-left:${bodyPad}px">
          <input class="form-input mono" id="fav-val-${escHtml(f.id)}" placeholder="Value…" onkeydown="if(event.key==='Enter')submitFindingValue('${escHtml(f.id)}')" />
          <input class="form-input" id="fav-note-${escHtml(f.id)}" placeholder="Note (optional)" onkeydown="if(event.key==='Enter')submitFindingValue('${escHtml(f.id)}')" />
          <div class="finding-form-btns">
            <button class="btn btn-primary btn-sm" onclick="submitFindingValue('${escHtml(f.id)}')">Add</button>
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('fav-${escHtml(f.id)}').style.display='none'">Cancel</button>
          </div>
        </div>
        <div class="finding-inline-form" id="fas-${escHtml(f.id)}" style="display:none;padding-left:${bodyPad}px">
          <select class="form-select" id="fas-type-${escHtml(f.id)}">${_typeOptions(f.type)}</select>
          <input class="form-input" id="fas-title-${escHtml(f.id)}" placeholder="Sub-finding name…" onkeydown="if(event.key==='Enter')submitSubFinding('${escHtml(f.id)}')" />
          <input class="form-input" id="fas-note-${escHtml(f.id)}" placeholder="Note (optional)" onkeydown="if(event.key==='Enter')submitSubFinding('${escHtml(f.id)}')" />
          <div class="finding-form-btns">
            <button class="btn btn-primary btn-sm" onclick="submitSubFinding('${escHtml(f.id)}')">Create</button>
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('fas-${escHtml(f.id)}').style.display='none'">Cancel</button>
          </div>
        </div>
        ${childrenHtml}
      </div>
    </div>`;
}

function renderFindingsPane(sess) {
  const findings = sess.findings || [];

  const listHtml = findings.length === 0
    ? `<div class="empty-state" style="padding:20px 0">
        <div style="font-size:28px;margin-bottom:6px">📋</div>
        <div>No findings yet.</div>
        <div style="color:var(--text-muted);font-size:12px;margin-top:4px">Create a finding to start logging credentials, hashes, users, and loot.</div>
      </div>`
    : findings.map(f => renderFindingItem(f, 0)).join('');

  return `
    <div class="finding-add-form">
      <select class="form-select" id="finding-type">${_typeOptions('cred')}</select>
      <input class="form-input" id="finding-title" placeholder="Finding name (e.g. Domain Users, NTLM Hashes)" onkeydown="if(event.key==='Enter')submitFinding()" />
      <input class="form-input" id="finding-note" placeholder="Note (optional)" onkeydown="if(event.key==='Enter')submitFinding()" />
      <button class="btn btn-primary btn-sm" onclick="submitFinding()">Create</button>
    </div>
    <div class="finding-list">${listHtml}</div>`;
}

/* ─── Readiness ──────────────────────────────────────────────────────────────── */
function techniqueReadiness(technique) {
  const s = activeSession();
  if (!s) return { status: 'missing', filled: 0, total: 0 };

  const vars = new Set();
  getAllCommands(technique).forEach(cmd => {
    const matches = (cmd.command || '').match(/\$\$[A-Z0-9_]+/g);
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
            (t.tags || []).some(tag => tag.toLowerCase().includes(q)) ||
            (t.description || '').toLowerCase().includes(q) ||
            getAllCommands(t).some(cmd =>
              cmd.label.toLowerCase().includes(q) ||
              cmd.command.toLowerCase().includes(q)
            )
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
            !(t.tags || []).some(tag => tag.toLowerCase().includes(q)) &&
            !(t.description || '').toLowerCase().includes(q) &&
            !(t.subtechniques || []).some(st => st.name.toLowerCase().includes(q))
            ) return false;
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
        const sess = activeSession();
        const prog = sess ? sess.techProgress[tech.id] : null;
        const progIcon = { 'in-progress': '▶', 'done': '✅', 'skipped': '⏭' }[prog] || '📄';
        html += `
          <div class="tree-item tree-technique grouped${isActive}" data-technique="${escHtml(tech.id)}" data-tactic="${escHtml(tactic.id)}">
            <span>${progIcon} ${escHtml(tech.name)}</span>
            ${badge}
          </div>
        `;
      });

      html += `</div>`;
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

/* ─── Theory page ───────────────────────────────────────────────────────────── */
function renderTheoryBody(theory) {
  const phasesHtml = (theory.phases || []).map((p, i) => `
    <div class="theory-phase">
      <div class="theory-phase-num">${i + 1}</div>
      <div class="theory-phase-content">
        <div class="theory-phase-head">
          <span class="theory-phase-icon">${p.icon}</span>
          <span class="theory-phase-name">${escHtml(p.name)}</span>
        </div>
        <div class="theory-phase-desc">${escHtml(p.description)}</div>
        <div class="theory-phase-items">${(p.items || []).map((it, i) => {
          const lnk = p.itemLinks && p.itemLinks[i];
          if (lnk) return `<span class="theory-tag theory-tag-link" onclick="goToTechnique('${escHtml(lnk.tacticId)}','${escHtml(lnk.techId)}')">${escHtml(it)}</span>`;
          return `<span class="theory-tag">${escHtml(it)}</span>`;
        }).join('')}</div>
      </div>
    </div>`).join('');

  const conceptsHtml = (theory.concepts || []).map(c => {
    const flowHtml = c.flow ? `<div class="theory-flow">${c.flow.map(f => `<span class="theory-flow-step">${escHtml(f)}</span>`).join('<span class="theory-flow-arrow">→</span>')}</div>` : '';
    const itemsHtml = c.items ? `<div class="theory-concept-items">${c.items.map(it => `<span class="theory-tag theory-tag-sm">${escHtml(it)}</span>`).join('')}</div>` : '';
    return `
      <div class="theory-concept">
        <div class="theory-concept-name">${escHtml(c.name)}</div>
        <div class="theory-concept-desc">${escHtml(c.description)}</div>
        ${flowHtml}${itemsHtml}
      </div>`;
  }).join('');

  const toolsHtml = (theory.tools || []).map(t => `
    <div class="theory-tool">
      <div class="theory-tool-name">${escHtml(t.name)}</div>
      <div class="theory-tool-purpose">${escHtml(t.purpose)}</div>
      <div class="theory-tool-tags">${(t.tags || []).map(tag => `<span class="theory-tag theory-tag-sm">${escHtml(tag)}</span>`).join('')}</div>
    </div>`).join('');

  return `
    ${theory.intro ? `<p class="theory-intro">${escHtml(theory.intro)}</p>` : ''}
    <div class="theory-section">
      <div class="theory-section-title">⚔️ Attack Chain</div>
      <div class="theory-phases">${phasesHtml}</div>
    </div>
    <div class="theory-section">
      <div class="theory-section-title">🧠 Key Concepts</div>
      <div class="theory-concepts">${conceptsHtml}</div>
    </div>
    <div class="theory-section">
      <div class="theory-section-title">🔧 Tools</div>
      <div class="theory-tools">${toolsHtml}</div>
    </div>`;
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
  const sess = activeSession();
  const progress = sess ? sess.techProgress[tech.id] : null;
  const progressHtml = sess ? renderProgressBar(tech.id, progress) : '';

  let commandsHtml = '';
  if (tech.subtechniques) {
    tech.subtechniques.forEach(sub => {
      const cmdsHtml = sub.commands.map(cmd => renderCommandCardHtml(cmd, tactic.id, tech.id)).join('');
      commandsHtml += `
        <div class="subtechnique" id="sub-${escHtml(sub.id)}">
          <div class="subtechnique-header" onclick="toggleSubtechnique('${escHtml(sub.id)}')">
            <span class="subtechnique-chevron">▼</span>
            <span class="subtechnique-name">${escHtml(sub.name)}</span>
            <span class="subtechnique-count">${sub.commands.length}</span>
          </div>
          <div class="subtechnique-body">${cmdsHtml}</div>
        </div>`;
    });
  } else {
    tech.commands.forEach(cmd => {
      commandsHtml += renderCommandCardHtml(cmd, tactic.id, tech.id);
    });
  }

  const bodyHtml = tech.theory
    ? renderTheoryBody(tech.theory)
    : `${tech.subtechniques ? '' : '<div class="commands-label">Commands</div>'}${commandsHtml}`;

  document.getElementById('content').innerHTML = `
    <div class="technique-header">
      <div class="technique-title">${escHtml(tech.name)}</div>
      ${tech.theory ? '' : `<span class="readiness-badge ${escHtml(readinessBadgeClass)}">${readinessLabel}</span>`}
    </div>
    <div class="technique-tags">${tagsHtml}</div>
    ${tech.theory ? '' : progressHtml}
    ${tech.description && !tech.theory ? `<div class="technique-desc">${escHtml(tech.description)}</div>` : ''}
    ${bodyHtml}
  `;

  // Bind variable click handlers
  document.querySelectorAll('.var-missing').forEach(el => {
    el.addEventListener('click', () => openVarModal(el.dataset.var));
  });
}

function toggleSubtechnique(subId) {
  const el = document.getElementById('sub-' + subId);
  if (el) el.classList.toggle('collapsed');
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
      <button class="stab-btn" data-tab="findings" onclick="switchSessionTab('findings')">📋 Findings${sess.findings && sess.findings.length > 0 ? ` <span class="stab-count">${_countFindings(sess.findings)}</span>` : ''}</button>
      <button class="stab-btn stab-btn-vars-only" data-tab="vars" onclick="switchSessionTab('vars')">⚙ Vars</button>
    </div>
    <div class="stab-pane" data-pane="ready">${renderReadyPane(sess)}</div>
    <div class="stab-pane" data-pane="discover" style="display:none">${renderDiscoverPane(sess)}</div>
    <div class="stab-pane" data-pane="findings" style="display:none">${renderFindingsPane(sess)}</div>
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
      const readyCmds = getAllCommands(tech).filter(cmd => {
        const vars = cmd.command.match(/\$\$[A-Z0-9_]+/g) || [];
        return vars.length > 0 && vars.every(v => sess.vars[v] && sess.vars[v].trim());
      });
      if (readyCmds.length > 0) {
        groups.push({ techName: tech.name, tacticName: tactic.name, tacticId: tactic.id, techId: tech.id, cmds: readyCmds });
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
    html += `<div class="ready-tech-header tech-link" onclick="goToTechnique('${escHtml(group.tacticId)}','${escHtml(group.techId)}')">${escHtml(group.tacticName)} › ${escHtml(group.techName)} <span class="tech-link-arrow">↗</span></div>`;
    group.cmds.forEach(cmd => {
      html += renderCommandCardHtml(cmd, group.tacticId, group.techId);
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
    vars: {},
    techProgress: {},
    cmdNotes: {},
    findings: [],
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
  const cmd = tech && getAllCommands(tech).find(c => c.id === cmdId);
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
function toggleFilterBtn(btnEl) {
  state.toolSearch = !state.toolSearch;
  btnEl.classList.toggle('active', state.toolSearch);
  const searchInput = document.querySelector('.header-search');
  searchInput.placeholder = state.toolSearch ? 'Search tools & commands...' : 'Search techniques...';
  const q = state.searchQuery;
  if (state.toolSearch && q.length >= 2) {
    renderToolPage(q);
  } else if (!state.toolSearch) {
    if (state.selectedNodeId) refreshAll();
    else document.getElementById('content').innerHTML = welcomeHtml();
  }
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

/* ─── Navigation helper ──────────────────────────────────────────────────────── */
function goToTechnique(tacticId, techId) {
  const searchInput = document.querySelector('.header-search');
  if (searchInput) searchInput.value = '';
  state.searchQuery = '';
  state.selectedNodeId = techId;
  selectTechnique(tacticId, techId);
  closeSidebarIfMobile();
}

/* ─── Tool / Search page ─────────────────────────────────────────────────────── */
function renderToolPage(q) {
  const ql = q.toLowerCase();
  const groups = [];

  TACTICS.forEach(tactic => {
    tactic.techniques.forEach(tech => {
      const cmds = getAllCommands(tech).filter(cmd =>
        cmd.command.toLowerCase().includes(ql) ||
        cmd.label.toLowerCase().includes(ql) ||
        (cmd.notes || '').toLowerCase().includes(ql)
      );
      if (cmds.length > 0) groups.push({ tactic, tech, cmds });
    });
  });

  const content = document.getElementById('content');

  if (groups.length === 0) {
    content.innerHTML = `
      <div class="tool-page-header">
        <div class="tool-page-title">🔍 "${escHtml(q)}"</div>
        <div class="tool-page-count">No commands found</div>
      </div>
      <div class="empty-state">
        <div style="font-size:32px;margin-bottom:8px">🔍</div>
        <div>No commands match "<strong>${escHtml(q)}</strong>".</div>
        <div style="color:var(--text-muted);font-size:12px;margin-top:4px">Try the tool name, a flag, or a keyword.</div>
      </div>`;
    return;
  }

  const totalCmds = groups.reduce((n, g) => n + g.cmds.length, 0);

  let html = `
    <div class="tool-page-header">
      <div class="tool-page-title">🔍 "${escHtml(q)}"</div>
      <div class="tool-page-count">${totalCmds} command${totalCmds !== 1 ? 's' : ''} across ${groups.length} technique${groups.length !== 1 ? 's' : ''}</div>
    </div>`;

  groups.forEach(({ tactic, tech, cmds }) => {
    html += `<div class="ready-tech-header tech-link" onclick="goToTechnique('${escHtml(tactic.id)}','${escHtml(tech.id)}')">${escHtml(tactic.name)} › ${escHtml(tech.name)} <span class="tech-link-arrow">↗</span></div>`;
    cmds.forEach(cmd => { html += renderCommandCardHtml(cmd, tactic.id, tech.id); });
  });

  content.innerHTML = html;

  content.querySelectorAll('.var-missing').forEach(el => {
    el.addEventListener('click', () => openVarModal(el.dataset.var));
  });
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

  // Sidebar search + tool page
  const searchInput = document.querySelector('.header-search');
  searchInput.addEventListener('input', e => {
    const q = e.target.value.trim();
    state.searchQuery = q;
    buildSidebar();
    if (state.toolSearch && q.length >= 2) {
      renderToolPage(q);
    } else if (q.length === 0) {
      if (state.selectedNodeId) refreshAll();
      else document.getElementById('content').innerHTML = welcomeHtml();
    }
  });

  // Filter button
  document.getElementById('btn-filter-ready').addEventListener('click', function() {
    toggleFilterBtn(this);
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
