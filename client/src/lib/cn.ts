import { clsx, type ClassValue } from 'clsx'

/** Join conditional class names. Components avoid conflicting utilities instead of merging them. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
