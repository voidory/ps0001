# Known limitations and acceptance gaps

This is a working, tested implementation, not a claim that every line of the build specification is complete.

- Firefox and WebKit could not start in the constrained build host because native GTK/media libraries were missing. Install Playwright's OS dependencies and run the full three-browser gate before claiming cross-engine floating-point approval.
- No human manual accessibility audit or physical-device testing has been completed; keyboard and doubled-font checks are automated, not a substitute for that audit.
- Catalogue chunks are separate hashed files but are currently all fetched and verified on initial launch, rather than truly lazy-loaded by family. Production compression depends on the host.
- Adaptive selection implements initial coverage, repair/weak-area/coverage rotation and repeat avoidance. The full transfer-eligibility/least-recent tie-break policy, configurable session size, explicit home/setup screens and periodic backup reminders are not complete.
- Progress currently aggregates family evidence (with an internal band filter), not the complete per-band/form/session reporting interface. Repair feedback is separate from full-question evidence, but a durable independent repair history is not implemented.
- Content is original and automatically independently checked. Human review of all hints/structural variants and rejection of every uninteresting constant/cyclic parameter domain remains future editorial QA.
- IndexedDB version 1 has transaction, lease, restore and rollback tests. There is no shipped historical schema migration yet; blocked-upgrade and quota-failure recovery need additional real-browser fixtures.
- A crashed/closed tab's lease can remain until its 30-second expiry. Other tabs become writable after takeover, but do not live-refresh state; stale revisions are rejected safely and the user must reload.
- Imported content is strictly validated JSON with hashes and referential/transition/grade checks. Hashes provide integrity, not a signature or trusted author identity. Imported text is never executed.
- Timers use the local device clock. Expiry preserves raw malformed input and marks it incorrect; empty input remains unanswered.
- No offline cold-start guarantee, service worker, account, backend, cloud sync or browser Python runtime. Browser clearing/eviction can remove local work; download JSON backups.
- Static assets expose expected answers to inspection. This is a study tool, not tamper-proof assessment, and numerical correctness cannot prove code proficiency.
