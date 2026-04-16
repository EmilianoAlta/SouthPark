import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock de las variables de entorno de Supabase para que supabaseClient.js no explote
if (!import.meta.env.VITE_SUPABASE_URL) {
  import.meta.env.VITE_SUPABASE_URL = "https://test.supabase.co";
}
if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
  import.meta.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
}

// Silenciar console.error de React en tests a menos que DEBUG_TESTS esté seteado
const originalError = console.error;
console.error = (...args) => {
  if (process.env.DEBUG_TESTS) originalError(...args);
};

// Placeholder para futuros mocks globales
globalThis.__testUtils__ = { vi };
