/* ============================================================
   TapTalk AAC — data-export.js
   Anderson-OS integration: builds a structured JSON payload
   from comm_events records for family-system ingestion.

   Payload schema:
     {
       source:     "TapTalk_AAC",
       version:    "1.0",
       exportDate: "<ISO timestamp>",
       metrics: {
         totalEvents,
         studentEvents,
         partnerModeEvents,
       },
       logs: [ ...all comm_events records ],
     }
   ============================================================ */

'use strict';

/**
 * Build and return the Anderson-OS payload object.
 * Fetches every record from the comm_events store, tallies the
 * per-user metrics, and wraps everything in the required schema.
 *
 * @returns {Promise<Object>}
 */
async function generateOSPayload() {
  const records           = await CommDB.getAll();
  const studentEvents     = records.filter((r) => r.user === 'student').length;
  const partnerModeEvents = records.filter((r) => r.user === 'partner').length;

  return {
    source:     'TapTalk_AAC',
    version:    '1.0',
    exportDate: new Date().toISOString(),
    metrics: {
      totalEvents: records.length,
      studentEvents,
      partnerModeEvents,
    },
    logs: records,
  };
}

window.generateOSPayload = generateOSPayload;
