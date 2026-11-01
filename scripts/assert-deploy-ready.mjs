// Deployment must remain disabled while production routes use local-only adapters.
// Replace this guard only when persistent auth, storage, payment, and migrations
// are integrated and verified in a reviewable change.
console.error('Deployment disabled: production adapters and verified database migrations are not available.');
process.exitCode = 1;
