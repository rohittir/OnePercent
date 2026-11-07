// @ts-check
// Player IDs: easy to say and type, such as brave-otter-27. 128 × 128 × 90 ≈ 1.47 million.

export const ADJECTIVES = [
  'able', 'bold', 'brave', 'bright', 'bouncy', 'bubbly', 'busy', 'calm', 'cheery', 'chirpy', 'clever', 'cool', 'cosy', 'crisp', 'curious', 'daring',
  'dreamy', 'eager', 'epic', 'fair', 'fancy', 'fast', 'fearless', 'fine', 'fizzy', 'fluffy', 'friendly', 'frosty', 'funny', 'fuzzy', 'gentle', 'giant',
  'glad', 'gleeful', 'golden', 'grand', 'great', 'groovy', 'happy', 'hearty', 'helpful', 'honest', 'humble', 'jazzy', 'jolly', 'joyful', 'keen', 'kind',
  'lively', 'loyal', 'lucky', 'magic', 'mellow', 'merry', 'mighty', 'minty', 'misty', 'neat', 'nifty', 'nimble', 'noble', 'peppy', 'perky', 'plucky',
  'polite', 'proud', 'quick', 'quiet', 'quirky', 'radiant', 'rapid', 'ready', 'rosy', 'royal', 'sandy', 'secret', 'sharp', 'shiny', 'silly', 'sleepy',
  'smart', 'smiley', 'snappy', 'snowy', 'soft', 'sparkly', 'speedy', 'spicy', 'splendid', 'sporty', 'steady', 'stormy', 'strong', 'sturdy', 'sunny', 'super',
  'sweet', 'swift', 'tall', 'tidy', 'tiny', 'true', 'trusty', 'upbeat', 'valiant', 'vivid', 'warm', 'wise', 'witty', 'wobbly', 'zany', 'zesty',
  'zippy', 'amber', 'azure', 'coral', 'crimson', 'emerald', 'indigo', 'lemon', 'lilac', 'olive', 'scarlet', 'silver', 'violet', 'cosmic', 'lunar', 'solar',
]

export const ANIMALS = [
  'ant', 'bat', 'bear', 'bee', 'beetle', 'bison', 'boar', 'bunny', 'camel', 'cat', 'cheetah', 'chick', 'cobra', 'cougar', 'cow', 'crab',
  'crane', 'cricket', 'crow', 'deer', 'dingo', 'dog', 'dolphin', 'donkey', 'dove', 'duck', 'eagle', 'eel', 'elk', 'emu', 'falcon', 'ferret',
  'finch', 'fish', 'flamingo', 'fox', 'frog', 'gecko', 'gerbil', 'giraffe', 'goat', 'goose', 'gorilla', 'hamster', 'hare', 'hawk', 'hedgehog', 'heron',
  'hippo', 'horse', 'husky', 'ibis', 'iguana', 'impala', 'jackal', 'jaguar', 'jay', 'kangaroo', 'kitten', 'koala', 'lamb', 'lemur', 'leopard', 'lion',
  'lizard', 'llama', 'lobster', 'lynx', 'macaw', 'magpie', 'manatee', 'meerkat', 'mole', 'monkey', 'moose', 'mouse', 'newt', 'octopus', 'orca', 'otter',
  'owl', 'ox', 'panda', 'panther', 'parrot', 'peacock', 'pelican', 'penguin', 'pig', 'pigeon', 'pony', 'poodle', 'puffin', 'puma', 'puppy', 'quail',
  'rabbit', 'raccoon', 'raven', 'robin', 'salmon', 'seal', 'shark', 'sheep', 'skunk', 'sloth', 'snail', 'sparrow', 'squid', 'squirrel', 'stork', 'swan',
  'tapir', 'tiger', 'toad', 'toucan', 'trout', 'turkey', 'turtle', 'walrus', 'kiwi', 'weasel', 'whale', 'wolf', 'wombat', 'yak', 'zebra', 'beaver',
]

export const CODE_PATTERN = /^[a-z]{2,10}-[a-z]{2,10}-[1-9]\d$/

/**
 * @param {(n: number) => number} rand an integer below n
 * @returns {string} a new player ID; the server checks it is free
 */
export const makeCode = (rand) => `${ADJECTIVES[rand(ADJECTIVES.length)]}-${ANIMALS[rand(ANIMALS.length)]}-${10 + rand(90)}`

/**
 * What a child types, as an ID: "Brave Otter 27" → "brave-otter-27".
 * @param {string} input
 */
export const normalizeCode = (input) => input.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-')
