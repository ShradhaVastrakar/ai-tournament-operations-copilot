import fs from 'fs';
import path from 'path';
import type { Venue } from '../types';

const DATA_PATH = path.join(__dirname, '../../../../data/venues.json');

export function getVenues(): Venue[] {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  return JSON.parse(raw) as Venue[];
}
