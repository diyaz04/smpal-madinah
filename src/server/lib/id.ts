import { customAlphabet } from "nanoid";

// Alfabet URL-safe tanpa karakter ambigu, 21 karakter ~ setara UUID v4 di entropi.
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const generateId = customAlphabet(alphabet, 21);
