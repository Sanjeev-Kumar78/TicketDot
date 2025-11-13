// Polyfills for Node.js modules in browser
import { Buffer } from "buffer";

// Make Buffer available globally
window.Buffer = Buffer;
