const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();

function text(value, max) {
  return String(value || '').trim().slice(0, max);
}

function ok(data) {
  return { code: 0, data };
}

function fail(code, message) {
  return { code, message };
}

exports.main = async (event) => {
  try {
    const handle = text(event.handle, 31).toLowerCase().replace(/[^a-z0-9-]/g, '');
    const source = text(event.source, 24) || 'public_profile';
    if (!handle) return fail(400, 'Invalid visit payload.');

    const published = await db.collection('published_profiles').where({ handle }).limit(1).get();
    const profile = (published.data || [])[0];
    if (!profile) return fail(404, 'Published profile not found.');

    const now = new Date().toISOString();
    const payload = {
      profileId: profile.profileId,
      ownerId: profile.ownerId,
      profileHandle: profile.handle,
      source,
      createdAt: now
    };
    const inserted = await db.collection('profile_views').add(payload);
    return ok({ ...payload, _id: inserted._id || inserted.id });
  } catch (err) {
    return fail(500, err.message || 'Track visit failed.');
  }
};
