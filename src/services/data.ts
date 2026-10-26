/**
 * Barrel re-export for modular services:
 * - classes: teacher profiles & class management
 * - students: student CRUD & resequencing
 * - attendance: attendance session records
 * - grades: formative/summative grades & columns
 * - agendas: teaching agendas & auto-sync
 * - savings: class cash & student savings
 * - shares: hardened public shares with cryptographic tokens & expiry
 * - common: pagination helpers
 */

export * from './common';
export * from './classes';
export * from './students';
export * from './attendance';
export * from './grades';
export * from './agendas';
export * from './savings';
export * from './shares';
