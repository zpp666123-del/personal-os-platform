(function () {
  'use strict';

  const api = {};

  async function getClient() {
    const holder = window.AbilitySupabase;
    const client = holder && (holder.client || await holder.ready);
    if (!client) throw new Error('Supabase is not configured.');
    return client;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
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

  function profileMode(profile, fallback) {
    return profile.profileMode || profile.mode || fallback || 'job';
  }

  function normalizeDraft(draft, handle) {
    const profile = clone(draft);
    profile.identity = profile.identity || {};
    profile.identity.handle = slugifyHandle(profile.identity.handle || handle);
    return profile;
  }

  function makeDraft(defaultDraft, user, handle) {
    const draft = normalizeDraft(defaultDraft, handle);
    const name = (user.email || 'user').split('@')[0];
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
    const draft = normalizeDraft(row.draft_json || {}, row.handle);
    const publishedJson = published ? normalizeDraft(published.profile_json || {}, published.handle) : null;
    return {
      id: row.id,
      ownerId: row.user_id,
      userId: row.user_id,
      handle: row.handle,
      templateId: row.template_id || 'signal-light',
      mode: row.mode || profileMode(draft),
      draft,
      published: publishedJson,
      updatedAt: row.updated_at,
      publishedAt: published && published.published_at
    };
  }

  function toPublishedProfile(row) {
    const profile = normalizeDraft(row.profile_json || {}, row.handle);
    return {
      id: row.profile_id,
      ownerId: row.user_id,
      userId: row.user_id,
      handle: row.handle,
      templateId: row.template_id || 'signal-light',
      mode: row.mode || profileMode(profile),
      draft: profile,
      published: profile,
      updatedAt: row.updated_at,
      publishedAt: row.published_at
    };
  }

  function toLead(row) {
    return {
      id: row.id,
      profileId: row.profile_id,
      profileHandle: row.profile_handle,
      name: row.visitor_name || '',
      email: row.visitor_email || '',
      intent: row.intent || '',
      message: row.message || '',
      status: row.status || 'new',
      createdAt: row.created_at
    };
  }

  api.isEnabled = async function isEnabled() {
    try {
      return !!(await getClient());
    } catch (err) {
      return false;
    }
  };

  api.getUser = async function getUser() {
    const client = await getClient();
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user || null;
  };

  api.signInOrSignUp = async function signInOrSignUp(email, password) {
    const client = await getClient();
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (!signedIn.error) return signedIn.data;

    const message = String(signedIn.error.message || '').toLowerCase();
    if (!message.includes('invalid login credentials')) throw signedIn.error;

    const redirectTo = location.origin && location.origin !== 'null'
      ? `${location.origin}/#/dashboard`
      : undefined;
    const signedUp = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    if (signedUp.error) throw signedUp.error;
    return signedUp.data;
  };

  api.signOut = async function signOut() {
    const client = await getClient();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  };

  api.loadPublishedProfile = async function loadPublishedProfile(handle) {
    const client = await getClient();
    const { data, error } = await client
      .from('published_profiles')
      .select('*')
      .eq('handle', slugifyHandle(handle))
      .maybeSingle();
    if (error) throw error;
    return data ? toPublishedProfile(data) : null;
  };

  api.loadMyProfile = async function loadMyProfile(defaultDraft) {
    const client = await getClient();
    const user = await api.getUser();
    if (!user) throw new Error('Please sign in first.');

    let { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      const base = slugifyHandle((user.email || 'user').split('@')[0]);
      const attempts = [base, `${base}-${Math.random().toString(36).slice(2, 6)}`];
      for (const handle of attempts) {
        const draft = makeDraft(defaultDraft, user, handle);
        const inserted = await client
          .from('profiles')
          .insert({
            user_id: user.id,
            handle,
            template_id: 'signal-light',
            mode: profileMode(draft),
            draft_json: draft,
            visibility_json: draft.visibility || {},
            health_score: healthScore(draft)
          })
          .select('*')
          .single();
        if (!inserted.error) {
          data = inserted.data;
          break;
        }
        if (!String(inserted.error.message || '').toLowerCase().includes('duplicate')) throw inserted.error;
      }
    }

    if (!data) throw new Error('Could not create profile.');

    const published = await client
      .from('published_profiles')
      .select('*')
      .eq('profile_id', data.id)
      .maybeSingle();
    if (published.error) throw published.error;
    return toProfile(data, published.data);
  };

  api.saveDraft = async function saveDraft(profileRow, signal) {
    const client = await getClient();
    const draft = normalizeDraft(profileRow.draft, profileRow.handle);
    const handle = slugifyHandle(draft.identity.handle || profileRow.handle);
    draft.identity.handle = handle;

    let query = client
      .from('profiles')
      .update({
        handle,
        template_id: profileRow.templateId || 'signal-light',
        mode: profileMode(draft, profileRow.mode),
        draft_json: draft,
        visibility_json: draft.visibility || {},
        health_score: healthScore(draft)
      })
      .eq('id', profileRow.id)
      .select('*')
      .single();
    if (signal && typeof query.abortSignal === 'function') query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    return toProfile(data, null);
  };

  api.publishProfile = async function publishProfile(profileRow) {
    const client = await getClient();
    const saved = await api.saveDraft(profileRow);
    const draft = normalizeDraft(saved.draft, saved.handle);

    const payload = {
      profile_id: saved.id,
      user_id: saved.ownerId,
      handle: saved.handle,
      template_id: saved.templateId || 'signal-light',
      mode: profileMode(draft, saved.mode),
      profile_json: draft,
      health_score: healthScore(draft),
      published_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('published_profiles')
      .upsert(payload, { onConflict: 'profile_id' })
      .select('*')
      .single();
    if (error) throw error;

    const version = await client.from('profile_versions').insert({
      profile_id: saved.id,
      user_id: saved.ownerId,
      version_no: Date.now(),
      snapshot_json: draft,
      note: 'Published from Profile Studio'
    });
    if (version.error) console.warn('Profile version was not saved:', version.error.message);

    return toPublishedProfile(data);
  };

  api.createLead = async function createLead(handle, lead) {
    const client = await getClient();
    const published = await api.loadPublishedProfile(handle);
    if (!published) throw new Error('Published profile not found.');

    const { data, error } = await client
      .from('leads')
      .insert({
        profile_id: published.id,
        profile_handle: published.handle,
        visitor_name: lead.name,
        visitor_email: lead.email,
        intent: lead.intent,
        message: lead.message,
        source: lead.source || 'public_profile'
      })
      .select('*')
      .single();
    if (error) throw error;
    return toLead(data);
  };

  api.loadMyLeads = async function loadMyLeads(profileId) {
    const client = await getClient();
    const { data, error } = await client
      .from('leads')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(toLead);
  };

  window.AbilitySupabaseAPI = api;
}());
