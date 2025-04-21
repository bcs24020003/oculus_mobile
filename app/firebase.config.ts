// This file now re-exports Firebase instance from AuthContext
// to avoid duplicate initialization

// Re-export from centralized config
export { auth, db, storage, app } from '../src/config/firebase';

// Add a default export to silence the missing default export warning
import { app } from '../src/config/firebase';
export default app; 