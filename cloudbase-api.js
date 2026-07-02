(function () {
  'use strict';

  const api = {};
  let lastAccount = '';

  async function getCloudBase() {
    const holder = window.AbilityCloudBase;
    if (holder && !holder.app) await holder.ready;
    if (!holder || !holder.app || !holder.auth || !holder.db) throw new Error('CloudBase is not configured.');
    return holder;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function fail(error, fallback) {
    if (!error) return;
    const err = new Error(error.message || error.errMsg || fallback || 'CloudBase request failed.');
    err.code = error.code || error.errCode;
    throw err;
  }

  function abortIfNeeded(signal) {
    if (!signal || !signal.aborted) return;
    const err = typeof DOMException === 'function'
      ? new DOMException('Aborted', 'AbortError')
      : new Error('Aborted');
    err.name = 'AbortError';
    throw err;
  }

  function slugifyHandle(value) {
    let handle = String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 31);
    if (handle.length < 2) handle = `user-${Math.random().toString(36).slice(2, 8)}`;
    return handle;
  }

  function usernameFromAccount(account) {
    const input = String(account || 'user').toLowerCase().trim();
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) hash = ((hash << 5) - hash) + input.charCodeAt(i);
    const suffix = Math.abs(hash).toString(36).slice(0, 5) || '0';
    const base = (input.split('@')[0] || 'user').replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '') || 'user';
    return `${base.slice(0, Math.max(5, 23 - suffix.length))}_${suffix}`.slice(0, 24);
  }

  function profileMode(profile, fallback) {
    return profile.profileMode || profile.mode || fallback || 'job';
  }

  function normalizeDraft(draft, handle) {
    const profile = clone(draft);
    profile.identity = profile.identity || {};
    profile.identity.handle = slugifyHandle(profile.identity.handle || handle);
    return profile;
  }

  function userEmail(user) {
    return user.email || (user.user_metadata && (user.user_metadata.email || user.user_metadata.username)) || '';
  }

  function normalizeUser(user) {
    if (!user || user.is_anonymous) return null;
    const email = userEmail(user) || lastAccount;
    const name = (user.user_metadata && (user.user_metadata.nickName || user.user_metadata.nickname || user.user_metadata.username))
      || (email ? email.split('@')[0] : 'user');
    return {
      id: user.id || user.uid || (user.user_metadata && user.user_metadata.uid) || email || name,
      name,
      email,
      created_at: user.created_at || user.createdAt || new Date().toISOString()
    };
  }

  function makeDraft(defaultDraft, user, handle) {
    const draft = normalizeDraft(defaultDraft, handle);
    const name = user.name || (user.email || 'user').split('@')[0];
    draft.identity.name = name;
    draft.identity.email = user.email || draft.identity.email || '';
    draft.identity.handle = handle;
    return draft;
  }

  function healthScore(profile) {
    return Math.min(100, 44
      + ((profile.projects || []).length * 6)
      + ((profile.assets || []).length * 3)
      + (profile.resume && profile.resume.summary ? 8 : 0)
      + (profile.contact && profile.contact.note ? 6 : 0));
  }

  function toProfile(row, published) {
    const draft = normalizeDraft(row.draft || {}, row.handle);
    const publishedJson = published ? normalizeDraft(published.profile || {}, published.handle) : null;
    return {
      id: row._id || row.id,
      ownerId: row.ownerId,
      userId: row.ownerId,
      handle: row.handle,
      templateId: row.templateId || 'signal-light',
      mode: row.mode || profileMode(draft),
      draft,
      published: publishedJson,
      updatedAt: row.updatedAt,
      publishedAt: published && published.publishedAt
    };
  }

  function toPublishedProfile(row) {
    const profile = normalizeDraft(row.profile || {}, row.handle);
    return {
      id: row.profileId,
      ownerId: row.ownerId,
      userId: row.ownerId,
      handle: row.handle,
      templateId: row.templateId || 'signal-light',
      mode: row.mode || profileMode(profile),
      draft: profile,
      published: profile,
      updatedAt: row.updatedAt,
      publishedAt: row.publishedAt
    };
  }

  function toLead(row) {
    return {
      id: row._id || row.id,
      profileId: row.profileId,
      profileHandle: row.profileHandle,
      name: row.visitorName || '',
      email: row.visitorEmail || '',
      intent: row.intent || '',
      message: row.message || '',
      note: row.note || '',
      status: row.status || 'new',
      createdAt: row.createdAt
    };
  }

  function toView(row) {
    return {
      id: row._id || row.id,
      profileId: row.profileId,
      profileHandle: row.profileHandle,
      source: row.source || 'public_profile',
      createdAt: row.createdAt
    };
  }

  async function first(collection, where) {
    const { db } = await getCloudBase();
    const result = await db.collection(collection).where(where).limit(1).get();
    return (result.data || [])[0] || null;
  }

  async function currentUser() {
    const { auth } = await getCloudBase();
    const session = await auth.getSession();
    fail(session.error, 'Failed to read CloudBase session.');
    return normalizeUser(session.data && session.data.session && session.data.session.user);
  }

  api.isEnabled = async function isEnabled() {
    try {
      await getCloudBase();
      return true;
    } catch (err) {
      return false;
    }
  };

  api.getUser = currentUser;

  api.signInOrSignUp = async function signInOrSignUp(email, password) {
    try {
      return await api.signIn(email, password);
    } catch (err) {
      return api.signUp(email, password);
    }
  };

  api.signIn = async function signIn(email, password) {
    const { auth } = await getCloudBase();
    lastAccount = String(email || '').trim();
    let result = await auth.signInWithPassword({ email, password });
    if (result.error) result = await auth.signInWithPassword({ username: usernameFromAccount(email), password });
    fail(result.error, 'CloudBase login failed.');
    return result.data;
  };

  api.signUp = async function signUp(email, password) {
    const { auth } = await getCloudBase();
    lastAccount = String(email || '').trim();
    const nickname = String(email || 'user').split('@')[0];
    let result = await auth.signUp({ email, password, nickname });
    if (result.error) result = await auth.signUp({ username: usernameFromAccount(email), password, nickname });
    fail(result.error, 'CloudBase signup failed.');
    return result.data;
  };

  api.signOut = async function signOut() {
    const { auth } = await getCloudBase();
    const result = await auth.signOut();
    fail(result && result.error, 'CloudBase sign out failed.');
  };

  api.loadPublishedProfile = async function loadPublishedProfile(handle) {
    const row = await first('published_profiles', { handle: slugifyHandle(handle) });
    return row ? toPublishedProfile(row) : null;
  };

  api.loadMyProfile = async function loadMyProfile(defaultDraft) {
    const { db } = await getCloudBase();
    const user = await api.getUser();
    if (!user) throw new Error('Please sign in first.');

    let row = await first('profiles', { ownerId: user.id });
    if (!row) {
      const base = slugifyHandle((user.email || user.name || 'user').split('@')[0]);
      const handle = base;
      const draft = makeDraft(defaultDraft, user, handle);
      const now = new Date().toISOString();
      const payload = {
        ownerId: user.id,
        handle,
        templateId: 'signal-light',
        mode: profileMode(draft),
        draft,
        visibility: draft.visibility || {},
        healthScore: healthScore(draft),
        createdAt: now,
        updatedAt: now
      };
      const inserted = await db.collection('profiles').add(payload);
      row = { ...payload, _id: inserted._id || inserted.id };
    }

    const published = await first('published_profiles', { profileId: row._id || row.id });
    return toProfile(row, published);
  };

  api.saveDraft = async function saveDraft(profileRow, signal) {
    abortIfNeeded(signal);
    const { db } = await getCloudBase();
    const draft = normalizeDraft(profileRow.draft, profileRow.handle);
    const handle = slugifyHandle(draft.identity.handle || profileRow.handle);
    draft.identity.handle = handle;

    const conflict = await api.loadPublishedProfile(handle);
    if (conflict && conflict.ownerId !== profileRow.ownerId) throw new Error('duplicate handle');

    const payload = {
      handle,
      templateId: profileRow.templateId || 'signal-light',
      mode: profileMode(draft, profileRow.mode),
      draft,
      visibility: draft.visibility || {},
      healthScore: healthScore(draft),
      updatedAt: new Date().toISOString()
    };
    abortIfNeeded(signal);
    const result = await db.collection('profiles')
      .where({ _id: profileRow.id, ownerId: profileRow.ownerId })
      .update(payload);
    if (result.code || result.updated === 0) throw new Error(result.message || 'CloudBase draft update was rejected.');
    abortIfNeeded(signal);
    return toProfile({ ...profileRow, ...payload, _id: profileRow.id }, null);
  };

  api.publishProfile = async function publishProfile(profileRow) {
    const { db } = await getCloudBase();
    const saved = await api.saveDraft(profileRow);
    const draft = normalizeDraft(saved.draft, saved.handle);
    const now = new Date().toISOString();
    const payload = {
      profileId: saved.id,
      ownerId: saved.ownerId,
      handle: saved.handle,
      templateId: saved.templateId || 'signal-light',
      mode: profileMode(draft, saved.mode),
      profile: draft,
      healthScore: healthScore(draft),
      publishedAt: now,
      updatedAt: now
    };

    const existing = await first('published_profiles', { profileId: saved.id });
    if (existing) {
      const result = await db.collection('published_profiles')
        .where({ _id: existing._id, ownerId: saved.ownerId })
        .update(payload);
      if (result.code || result.updated === 0) throw new Error(result.message || 'CloudBase publish update was rejected.');
      return toPublishedProfile({ ...existing, ...payload });
    }

    const inserted = await db.collection('published_profiles').add(payload);
    return toPublishedProfile({ ...payload, _id: inserted._id || inserted.id });
  };

  api.createLead = async function createLead(handle, lead) {
    const { app } = await getCloudBase();
    const result = await app.callFunction({
      name: 'submitLead',
      data: { handle: slugifyHandle(handle), lead }
    });
    const body = result.result || result;
    if (!body || body.code !== 0) throw new Error((body && body.message) || 'Lead submit failed.');
    return toLead(body.data);
  };

  api.trackVisit = async function trackVisit(handle, source) {
    const { app } = await getCloudBase();
    const result = await app.callFunction({
      name: 'trackVisit',
      data: { handle: slugifyHandle(handle), source: source || 'public_profile' }
    });
    const body = result.result || result;
    if (!body || body.code !== 0) throw new Error((body && body.message) || 'Visit tracking failed.');
    return toView(body.data);
  };

  api.loadMyLeads = async function loadMyLeads(profileId) {
    const { db } = await getCloudBase();
    const user = await api.getUser();
    if (!user) return [];
    const result = await db.collection('leads')
      .where({ ownerId: user.id, profileId })
      .orderBy('createdAt', 'desc')
      .get();
    return (result.data || []).map(toLead);
  };

  api.loadMyViews = async function loadMyViews(profileId) {
    const { db } = await getCloudBase();
    const user = await api.getUser();
    if (!user) return [];
    const result = await db.collection('profile_views')
      .where({ ownerId: user.id, profileId })
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();
    return (result.data || []).map(toView);
  };

  api.updateLeadStatus = async function updateLeadStatus(leadId, status) {
    if (!['new', 'contacted', 'archived'].includes(status)) throw new Error('Invalid lead status.');
    const { db } = await getCloudBase();
    const user = await api.getUser();
    if (!user) throw new Error('Please sign in first.');
    const result = await db.collection('leads')
      .where({ _id: leadId, ownerId: user.id })
      .update({ status, updatedAt: new Date().toISOString() });
    if (result.code || result.updated === 0) throw new Error(result.message || 'CloudBase lead update was rejected.');
    return { id: leadId, status };
  };

  api.updateLeadNote = async function updateLeadNote(leadId, note) {
    const safeNote = String(note || '').trim().slice(0, 500);
    const { db } = await getCloudBase();
    const user = await api.getUser();
    if (!user) throw new Error('Please sign in first.');
    const result = await db.collection('leads')
      .where({ _id: leadId, ownerId: user.id })
      .update({ note: safeNote, updatedAt: new Date().toISOString() });
    if (result.code || result.updated === 0) throw new Error(result.message || 'CloudBase lead note update was rejected.');
    return { id: leadId, note: safeNote };
  };

  window.AbilityCloudBaseAPI = api;
}());
