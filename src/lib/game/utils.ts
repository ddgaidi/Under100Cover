// Generate a 6-digit code
export function generateGameCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Calculate max undercovers based on player count
export function getMaxUndercovers(playerCount: number): number {
  if (playerCount <= 3) return 1
  if (playerCount <= 6) return 2
  if (playerCount <= 9) return 3
  return Math.floor(playerCount / 3)
}

// Calculate max mister whites based on player count
export function getMaxMisterWhites(playerCount: number, undercoverCount: number): number {
  const remaining = playerCount - undercoverCount
  if (remaining <= 3) return 0
  return 1
}

// Word pairs for the game
export const WORD_PAIRS = [
  { civilian: 'Lion', undercover: 'Tigre' },
  { civilian: 'Pizza', undercover: 'Tarte flambée' },
  { civilian: 'Plage', undercover: 'Piscine' },
  { civilian: 'Chat', undercover: 'Lynx' },
  { civilian: 'Cinéma', undercover: 'Théâtre' },
  { civilian: 'Café', undercover: 'Thé' },
  { civilian: 'Soleil', undercover: 'Lampe' },
  { civilian: 'Voiture', undercover: 'Moto' },
  { civilian: 'Pomme', undercover: 'Poire' },
  { civilian: 'Livre', undercover: 'Magazine' },
  { civilian: 'Football', undercover: 'Rugby' },
  { civilian: 'Piano', undercover: 'Synthétiseur' },
  { civilian: 'Prison', undercover: 'Hôpital' },
  { civilian: 'Mariage', undercover: 'PACS' },
  { civilian: 'Avion', undercover: 'Hélicoptère' },
  { civilian: 'Paris', undercover: 'Lyon' },
  { civilian: 'Chocolat', undercover: 'Caramel' },
  { civilian: 'Noel', undercover: 'Pâques' },
  { civilian: 'Vampire', undercover: 'Zombie' },
  { civilian: 'Guitare', undercover: 'Ukulélé' },
]

// Get a random word pair
export function getRandomWordPair() {
  return WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)]
}

// Generate turn order: civilians first (more likely to start), then undercovers, mister white never first
export function generateTurnOrder(players: Array<{ user_id: string; role: string }>): string[] {
  const civilians = players.filter(p => p.role === 'civilian')
  const undercovers = players.filter(p => p.role === 'undercover')
  const misterWhites = players.filter(p => p.role === 'mister_white')

  // Shuffle each group
  const shuffleCivilians = [...civilians].sort(() => Math.random() - 0.5)
  const shuffleUndercovers = [...undercovers].sort(() => Math.random() - 0.5)
  const shuffleMisterWhites = [...misterWhites].sort(() => Math.random() - 0.5)

  // Build turn order: civilians first weighted, then undercovers, mister white last
  // We interleave to avoid obvious patterns but ensure mister white never goes first
  const ordered: Array<{ user_id: string; role: string; weight: number }> = [
    ...shuffleCivilians.map((p, i) => ({ ...p, weight: i * 1 })),
    ...shuffleUndercovers.map((p, i) => ({ ...p, weight: shuffleCivilians.length * 0.5 + i * 1.2 })),
    ...shuffleMisterWhites.map((p, i) => ({ ...p, weight: 999 + i })),
  ]

  ordered.sort((a, b) => a.weight - b.weight)
  return ordered.map(p => p.user_id)
}

export const AVATAR_EMOJIS = ['🦊', '🐼', '🦁', '🐸', '🦋', '🐙', '🦄', '🐯', '🦊', '🐻', '🐺', '🦝', '🐮', '🐷', '🐸', '🐵']

export function getRandomEmoji(): string {
  return AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)]
}
